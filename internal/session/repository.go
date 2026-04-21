package session

import (
	"time"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) UpsertSession(s *ReplaySession) error {
	return r.db.Save(s).Error
}

func (r *Repository) IncrementEventCount(sessionID string, delta int) error {
	return r.db.Model(&ReplaySession{}).
		Where("id = ?", sessionID).
		UpdateColumn("event_count", gorm.Expr("event_count + ?", delta)).
		Error
}

func (r *Repository) UpdateSessionEnd(s *ReplaySession) error {
	return r.db.Model(s).Updates(map[string]interface{}{
		"ended_at":    s.EndedAt,
		"duration_ms": s.DurationMs,
	}).Error
}

func (r *Repository) InsertEvents(events []ReplayEvent) error {
	return r.db.CreateInBatches(events, 100).Error
}

func (r *Repository) List(f ListFilter) ([]ReplaySession, int64, error) {
	q := r.db.Model(&ReplaySession{})
	if f.Identifier != "" {
		q = q.Where("identifier = ?", f.Identifier)
	}
	if f.ServiceName != "" {
		q = q.Where("service_name = ?", f.ServiceName)
	}
	if f.Environment != "" {
		q = q.Where("environment = ?", f.Environment)
	}
	if f.StartDate != nil {
		q = q.Where("started_at >= ?", f.StartDate)
	}
	if f.EndDate != nil {
		q = q.Where("started_at <= ?", f.EndDate)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	limit := f.Limit
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	var sessions []ReplaySession
	err := q.Order("started_at DESC").Limit(limit).Offset(f.Offset).Find(&sessions).Error
	return sessions, total, err
}

func (r *Repository) GetByID(id string) (*ReplaySession, error) {
	var s ReplaySession
	err := r.db.First(&s, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *Repository) GetEvents(sessionID string) ([]ReplayEvent, error) {
	var events []ReplayEvent
	err := r.db.Where("session_id = ?", sessionID).Order("seq ASC").Find(&events).Error
	return events, err
}

func (r *Repository) GetStats() (*Stats, error) {
	var stats Stats

	now := time.Now().UTC()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	weekStart := todayStart.AddDate(0, 0, -6)

	if err := r.db.Model(&ReplaySession{}).Count(&stats.TotalSessions).Error; err != nil {
		return nil, err
	}
	if err := r.db.Model(&ReplaySession{}).
		Where("started_at >= ?", todayStart).
		Count(&stats.SessionsToday).Error; err != nil {
		return nil, err
	}
	if err := r.db.Model(&ReplaySession{}).
		Where("started_at >= ?", weekStart).
		Count(&stats.SessionsThisWeek).Error; err != nil {
		return nil, err
	}
	if err := r.db.Model(&FailedIngest{}).
		Where("resolved = false").
		Count(&stats.FailedIngestCount).Error; err != nil {
		return nil, err
	}

	var services []string
	if err := r.db.Model(&ReplaySession{}).
		Distinct("service_name").
		Pluck("service_name", &services).Error; err != nil {
		return nil, err
	}
	stats.ActiveServices = services

	if err := r.db.Model(&ReplaySession{}).
		Order("started_at DESC").
		Limit(5).
		Find(&stats.RecentSessions).Error; err != nil {
		return nil, err
	}

	return &stats, nil
}

// --- FailedIngest ---

func (r *Repository) SaveFailed(f *FailedIngest) error {
	return r.db.Create(f).Error
}

func (r *Repository) ListFailed(onlyUnresolved bool) ([]FailedIngest, error) {
	var items []FailedIngest
	q := r.db.Order("created_at DESC")
	if onlyUnresolved {
		q = q.Where("resolved = false")
	}
	return items, q.Find(&items).Error
}

func (r *Repository) GetFailed(id string) (*FailedIngest, error) {
	var f FailedIngest
	if err := r.db.First(&f, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *Repository) MarkFailedResolved(id string) error {
	now := time.Now().UTC()
	return r.db.Model(&FailedIngest{}).Where("id = ?", id).Updates(map[string]interface{}{
		"resolved":    true,
		"resolved_at": now,
	}).Error
}
