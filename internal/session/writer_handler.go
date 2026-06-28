package session

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/joaovrmoraes/batrewind/internal/queue"
)

type WriterHandler struct {
	q *queue.Stream
}

func NewWriterHandler(q *queue.Stream) *WriterHandler {
	return &WriterHandler{q: q}
}

func (h *WriterHandler) RegisterRoutes(r *gin.RouterGroup) {
	r.POST("/record", h.Ingest)
}

// Ingest receives a batch of rrweb events and enqueues them for processing.
func (h *WriterHandler) Ingest(c *gin.Context) {
	var req IngestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// session_id is the UUID primary key of replay_sessions — reject non-UUID
	// values at the door so a malformed batch can't poison the queue and end up
	// in failed_ingest with an error no retry will ever clear. bat_session_id is
	// an external correlation id and is intentionally left unconstrained.
	if _, err := uuid.Parse(req.SessionID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_id must be a valid UUID"})
		return
	}

	if err := h.q.Enqueue(context.Background(), req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to enqueue events"})
		return
	}

	c.Status(http.StatusNoContent)
}
