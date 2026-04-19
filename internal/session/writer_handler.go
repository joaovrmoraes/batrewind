package session

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
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

	if err := h.q.Enqueue(context.Background(), req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to enqueue events"})
		return
	}

	c.Status(http.StatusNoContent)
}
