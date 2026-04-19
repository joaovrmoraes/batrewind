package health

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	db *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler {
	return &Handler{db: db}
}

func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	r.GET("/health", h.Health)
}

func (h *Handler) Health(c *gin.Context) {
	start := time.Now()
	dbStatus := "ok"
	var dbDurationMs int64

	if sqlDB, err := h.db.DB(); err != nil {
		dbStatus = "error"
	} else {
		dbStart := time.Now()
		if err := sqlDB.Ping(); err != nil {
			dbStatus = "error"
		}
		dbDurationMs = time.Since(dbStart).Milliseconds()
	}

	c.JSON(http.StatusOK, gin.H{
		"status":          "ok",
		"message":         "BatRewind API is healthy",
		"api_response_ms": time.Since(start).Milliseconds(),
		"db_status":       dbStatus,
		"db_response_ms":  dbDurationMs,
	})
}
