package session

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type ReaderHandler struct {
	svc *Service
}

func NewReaderHandler(svc *Service) *ReaderHandler {
	return &ReaderHandler{svc: svc}
}

func (h *ReaderHandler) RegisterRoutes(r *gin.RouterGroup) {
	r.GET("/stats", h.GetStats)
	r.GET("/sessions", h.List)
	r.GET("/sessions/:id", h.GetByID)
	r.GET("/sessions/:id/events", h.GetEvents)
	r.DELETE("/sessions/:id", h.Delete)
	r.POST("/sessions/:id/share", h.CreateShareLink)
	r.GET("/failed-ingest", h.ListFailed)
	r.POST("/failed-ingest/:id/retry", h.RetryFailed)
	r.POST("/failed-ingest/retry-all", h.RetryAll)
}

// RegisterPublicRoutes mounts the unauthenticated share endpoints.
// These return a redacted session and console-stripped events.
func (h *ReaderHandler) RegisterPublicRoutes(r *gin.RouterGroup) {
	r.GET("/sessions/:token", h.GetPublicSession)
	r.GET("/sessions/:token/events", h.GetPublicEvents)
}

func (h *ReaderHandler) GetStats(c *gin.Context) {
	stats, err := h.svc.GetStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *ReaderHandler) List(c *gin.Context) {
	f := ListFilter{
		Identifier:  c.Query("identifier"),
		ServiceName: c.Query("service_name"),
		Environment: c.Query("environment"),
	}
	if s := c.Query("start_date"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			f.StartDate = &t
		}
	}
	if s := c.Query("end_date"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			f.EndDate = &t
		}
	}
	if s := c.Query("limit"); s != "" {
		if v, err := strconv.Atoi(s); err == nil {
			f.Limit = v
		}
	}
	if s := c.Query("offset"); s != "" {
		if v, err := strconv.Atoi(s); err == nil {
			f.Offset = v
		}
	}

	sessions, total, err := h.svc.List(f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":   sessions,
		"total":  total,
		"limit":  f.Limit,
		"offset": f.Offset,
	})
}

func (h *ReaderHandler) GetByID(c *gin.Context) {
	sess, err := h.svc.GetByID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
		return
	}
	c.JSON(http.StatusOK, sess)
}

func (h *ReaderHandler) GetEvents(c *gin.Context) {
	events, err := h.svc.GetEvents(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, events)
}

func (h *ReaderHandler) Delete(c *gin.Context) {
	if err := h.svc.Delete(c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *ReaderHandler) CreateShareLink(c *gin.Context) {
	token, err := h.svc.CreateShareToken(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token})
}

func (h *ReaderHandler) GetPublicSession(c *gin.Context) {
	sess, err := h.svc.GetPublicSession(c.Param("token"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, sess)
}

func (h *ReaderHandler) GetPublicEvents(c *gin.Context) {
	events, err := h.svc.GetPublicEvents(c.Param("token"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, events)
}

func (h *ReaderHandler) ListFailed(c *gin.Context) {
	onlyUnresolved := c.Query("resolved") != "true"
	items, err := h.svc.ListFailed(onlyUnresolved)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *ReaderHandler) RetryFailed(c *gin.Context) {
	if err := h.svc.RetryFailed(c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *ReaderHandler) RetryAll(c *gin.Context) {
	count, err := h.svc.RetryAllFailed()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"retried": count})
}
