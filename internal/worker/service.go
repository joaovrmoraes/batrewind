package worker

import (
	"context"
	"encoding/json"
	"log/slog"
	"math"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/joaovrmoraes/batrewind/internal/queue"
	"github.com/joaovrmoraes/batrewind/internal/session"
)

type Service struct {
	cfg            Config
	svc            *session.Service
	q              *queue.Stream
	activeWorkers  int
	workerChannels map[int]chan bool
	workerMutex    sync.Mutex
	lastScaleTime  time.Time
}

func New(cfg Config, svc *session.Service, q *queue.Stream) *Service {
	return &Service{
		cfg:            cfg,
		svc:            svc,
		q:              q,
		workerChannels: make(map[int]chan bool),
		lastScaleTime:  time.Now(),
	}
}

func (s *Service) Start(ctx context.Context) {
	var wg sync.WaitGroup

	slog.Info("Starting workers",
		"initial", s.cfg.InitialWorkerCount,
		"min", s.cfg.MinWorkerCount,
		"max", s.cfg.MaxWorkerCount,
	)

	// Retention purge runs independently of ingest — start it first so a backlog
	// of pending messages can't delay or starve it.
	if s.cfg.RetentionDays > 0 {
		wg.Add(1)
		go s.purgeLoop(ctx, &wg)
	}

	// Reclaim any pending messages from a previous crashed run.
	s.reclaimPending(ctx)

	wg.Add(1)
	go s.monitor(ctx, &wg)

	s.scaleWorkers(ctx, &wg, s.cfg.InitialWorkerCount)

	wg.Wait()
	slog.Info("All workers stopped")
}

// purgeLoop periodically deletes sessions older than the retention window.
func (s *Service) purgeLoop(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()
	retention := time.Duration(s.cfg.RetentionDays) * 24 * time.Hour
	slog.Info("Retention purge enabled", "days", s.cfg.RetentionDays, "interval", s.cfg.PurgeInterval)

	ticker := time.NewTicker(s.cfg.PurgeInterval)
	defer ticker.Stop()

	purge := func() {
		deleted, err := s.svc.PurgeOlderThan(retention)
		if err != nil {
			slog.Error("Retention purge failed", "error", err)
			return
		}
		if deleted > 0 {
			slog.Info("Retention purge removed sessions", "count", deleted)
		}
	}

	purge() // run once at startup
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			purge()
		}
	}
}

func (s *Service) reclaimPending(ctx context.Context) {
	msgs, err := s.q.ReclaimPending(ctx)
	if err != nil {
		slog.Warn("Failed to reclaim pending messages", "error", err)
		return
	}
	if len(msgs) == 0 {
		return
	}
	slog.Info("Reclaiming pending messages", "count", len(msgs))
	for _, m := range msgs {
		var req session.IngestRequest
		if err := json.Unmarshal(m.Data, &req); err != nil {
			_ = s.q.Ack(ctx, m.ID)
			continue
		}
		s.process(ctx, 0, m.ID, req)
	}
}

func (s *Service) monitor(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if !s.cfg.EnableAutoscaling {
				continue
			}
			pendingCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			pending, err := s.q.PendingCount(pendingCtx)
			cancel()
			if err != nil {
				slog.Error("Failed to get pending count", "error", err)
				continue
			}

			s.workerMutex.Lock()
			active := s.activeWorkers
			s.workerMutex.Unlock()

			slog.Info("Queue status", "pending", pending, "active_workers", active)

			if time.Since(s.lastScaleTime) > s.cfg.CooldownPeriod {
				s.evaluateScaling(ctx, wg, pending)
			} else if pending > s.cfg.ScaleUpThreshold*5 && active < s.cfg.MaxWorkerCount {
				slog.Warn("Emergency scale: pending exceeds 5x threshold")
				s.evaluateScaling(ctx, wg, pending)
			}
		}
	}
}

func (s *Service) runWorker(ctx context.Context, id int, wg *sync.WaitGroup, stop <-chan bool) {
	defer wg.Done()
	slog.Info("Worker started", "id", id)

	for {
		select {
		case <-ctx.Done():
			slog.Info("Worker stopped", "id", id, "reason", "context")
			return
		case <-stop:
			slog.Info("Worker stopped", "id", id, "reason", "autoscale")
			return
		default:
			readCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			msg, err := s.q.Read(readCtx)
			cancel()

			if err != nil {
				slog.Error("Read error", "id", id, "error", err)
				continue
			}
			if msg == nil {
				continue
			}

			var req session.IngestRequest
			if err := json.Unmarshal(msg.Data, &req); err != nil {
				slog.Error("Unmarshal error", "id", id, "error", err)
				_ = s.q.Ack(context.Background(), msg.ID)
				continue
			}

			s.process(ctx, id, msg.ID, req)
		}
	}
}

// process runs ingest with exponential backoff. On permanent failure saves to failed_ingest.
func (s *Service) process(ctx context.Context, workerID int, msgID string, req session.IngestRequest) {
	delays := []time.Duration{0, 2 * time.Second, 8 * time.Second, 32 * time.Second}

	for attempt, delay := range delays {
		if delay > 0 {
			time.Sleep(delay)
		}
		if err := s.svc.Ingest(req); err == nil {
			slog.Info("Batch processed", "worker", workerID, "session", req.SessionID, "events", len(req.Events))
			_ = s.q.Ack(context.Background(), msgID)
			return
		} else {
			slog.Warn("Processing attempt failed", "worker", workerID, "attempt", attempt+1, "error", err)
			if attempt == len(delays)-1 {
				s.saveFailed(req, err.Error(), attempt+1)
				_ = s.q.Ack(context.Background(), msgID) // ack to remove from stream
			}
		}
	}
}

func (s *Service) saveFailed(req session.IngestRequest, errMsg string, retries int) {
	payload, _ := json.Marshal(req)
	f := &session.FailedIngest{
		ID:         uuid.New().String(),
		SessionID:  req.SessionID,
		Payload:    string(payload),
		Error:      errMsg,
		RetryCount: retries,
	}
	if err := s.svc.SaveFailed(f); err != nil {
		slog.Error("Failed to save failed_ingest record", "session", req.SessionID, "error", err)
	} else {
		slog.Error("Batch saved to failed_ingest", "session", req.SessionID, "retries", retries)
	}
}

// --- Autoscaling ---

func (s *Service) scaleWorkers(ctx context.Context, wg *sync.WaitGroup, target int) {
	s.workerMutex.Lock()
	defer s.workerMutex.Unlock()

	if target < s.cfg.MinWorkerCount {
		target = s.cfg.MinWorkerCount
	}
	if target > s.cfg.MaxWorkerCount {
		target = s.cfg.MaxWorkerCount
	}
	if target == s.activeWorkers {
		return
	}
	if target > s.activeWorkers {
		s.scaleUp(ctx, wg, target)
	} else {
		s.scaleDown(target)
	}
}

func (s *Service) scaleUp(ctx context.Context, wg *sync.WaitGroup, target int) {
	slog.Info("Scaling up", "from", s.activeWorkers, "to", target)
	nextID := 0
	for id := range s.workerChannels {
		if id >= nextID {
			nextID = id + 1
		}
	}
	for s.activeWorkers < target {
		stop := make(chan bool, 1)
		s.workerChannels[nextID] = stop
		wg.Add(1)
		go s.runWorker(ctx, nextID, wg, stop)
		nextID++
		s.activeWorkers++
	}
	s.lastScaleTime = time.Now()
}

func (s *Service) scaleDown(target int) {
	if s.activeWorkers <= s.cfg.MinWorkerCount {
		return
	}
	slog.Info("Scaling down", "from", s.activeWorkers, "to", target)
	toStop := s.activeWorkers - target
	for id, ch := range s.workerChannels {
		if toStop == 0 {
			break
		}
		ch <- true
		close(ch)
		delete(s.workerChannels, id)
		s.activeWorkers--
		toStop--
	}
	s.lastScaleTime = time.Now()
}

func (s *Service) evaluateScaling(ctx context.Context, wg *sync.WaitGroup, pending int64) {
	s.workerMutex.Lock()
	active := s.activeWorkers
	s.workerMutex.Unlock()

	if pending > s.cfg.ScaleUpThreshold && active < s.cfg.MaxWorkerCount {
		var target int
		switch {
		case pending > s.cfg.ScaleUpThreshold*5:
			target = s.cfg.MaxWorkerCount
		case pending > s.cfg.ScaleUpThreshold*3:
			target = int(math.Ceil(float64(active) * s.cfg.WorkerScaleFactor * 1.5))
		default:
			target = int(math.Ceil(float64(active) * s.cfg.WorkerScaleFactor))
		}
		if target <= active {
			target = active + 1
		}
		s.scaleWorkers(ctx, wg, target)
		return
	}

	if pending < s.cfg.ScaleDownThreshold && active > s.cfg.MinWorkerCount {
		target := int(math.Floor(float64(active) / s.cfg.WorkerScaleFactor))
		if target < s.cfg.MinWorkerCount {
			target = s.cfg.MinWorkerCount
		}
		s.scaleWorkers(ctx, wg, target)
	}
}
