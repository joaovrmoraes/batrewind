package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
)

const (
	DefaultStreamName = "batrewind:events"
	DefaultGroupName  = "workers"
	DefaultDLQStream  = "batrewind:events:dead"
)

type Message struct {
	ID   string
	Data []byte
}

type Stream struct {
	client     *redis.Client
	stream     string
	group      string
	consumer   string
}

func New(addr, streamName, groupName, consumerName string) (*Stream, error) {
	client := redis.NewClient(&redis.Options{Addr: addr})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if _, err := client.Ping(ctx).Result(); err != nil {
		return nil, fmt.Errorf("redis ping failed: %w", err)
	}

	q := &Stream{
		client:   client,
		stream:   streamName,
		group:    groupName,
		consumer: consumerName,
	}

	// Create consumer group (idempotent — ignores BUSYGROUP error)
	err := client.XGroupCreateMkStream(ctx, streamName, groupName, "$").Err()
	if err != nil && err.Error() != "BUSYGROUP Consumer Group name already exists" {
		return nil, fmt.Errorf("failed to create consumer group: %w", err)
	}

	return q, nil
}

// Enqueue adds a payload to the stream.
func (q *Stream) Enqueue(ctx context.Context, item interface{}) error {
	data, err := json.Marshal(item)
	if err != nil {
		return err
	}
	return q.client.XAdd(ctx, &redis.XAddArgs{
		Stream: q.stream,
		Values: map[string]interface{}{"payload": string(data)},
	}).Err()
}

// Read fetches the next undelivered message for this consumer.
// Returns nil message (no error) when the stream is empty.
func (q *Stream) Read(ctx context.Context) (*Message, error) {
	res, err := q.client.XReadGroup(ctx, &redis.XReadGroupArgs{
		Group:    q.group,
		Consumer: q.consumer,
		Streams:  []string{q.stream, ">"},
		Count:    1,
		Block:    time.Second,
	}).Result()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if len(res) == 0 || len(res[0].Messages) == 0 {
		return nil, nil
	}

	msg := res[0].Messages[0]
	payload, ok := msg.Values["payload"].(string)
	if !ok {
		_ = q.Ack(ctx, msg.ID) // discard malformed
		return nil, nil
	}
	return &Message{ID: msg.ID, Data: []byte(payload)}, nil
}

// ReclaimPending reclaims messages that were delivered but not acked
// (e.g. worker crashed). Should be called on worker startup.
func (q *Stream) ReclaimPending(ctx context.Context) ([]Message, error) {
	res, err := q.client.XReadGroup(ctx, &redis.XReadGroupArgs{
		Group:    q.group,
		Consumer: q.consumer,
		Streams:  []string{q.stream, "0"}, // 0 = fetch pending for this consumer
		Count:    100,
	}).Result()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if len(res) == 0 {
		return nil, nil
	}

	var msgs []Message
	for _, m := range res[0].Messages {
		payload, ok := m.Values["payload"].(string)
		if !ok {
			_ = q.Ack(ctx, m.ID)
			continue
		}
		msgs = append(msgs, Message{ID: m.ID, Data: []byte(payload)})
	}
	return msgs, nil
}

// Ack acknowledges a successfully processed message.
func (q *Stream) Ack(ctx context.Context, msgID string) error {
	return q.client.XAck(ctx, q.stream, q.group, msgID).Err()
}

// PendingCount returns the number of messages pending acknowledgment.
func (q *Stream) PendingCount(ctx context.Context) (int64, error) {
	info, err := q.client.XPending(ctx, q.stream, q.group).Result()
	if err != nil {
		return 0, err
	}
	return info.Count, nil
}

// StreamLength returns the total number of messages in the stream.
func (q *Stream) StreamLength(ctx context.Context) (int64, error) {
	return q.client.XLen(ctx, q.stream).Result()
}

func (q *Stream) Close() error {
	return q.client.Close()
}
