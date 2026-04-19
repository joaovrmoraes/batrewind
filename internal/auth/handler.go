package auth

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterPublicRoutes(r *gin.RouterGroup) {
	r.POST("/login", h.Login)
}

func (h *Handler) RegisterProtectedRoutes(r *gin.RouterGroup) {
	r.POST("/api-keys", h.CreateAPIKey)
	r.GET("/api-keys", h.ListAPIKeys)
	r.DELETE("/api-keys/:id", h.RevokeAPIKey)
	r.GET("/projects", h.ListProjects)
}

func (h *Handler) Login(c *gin.Context) {
	var body struct {
		Email    string `json:"email"    binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token, user, err := h.svc.Login(body.Email, body.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  user,
	})
}

func (h *Handler) CreateAPIKey(c *gin.Context) {
	var body struct {
		ProjectID string `json:"project_id" binding:"required"`
		Name      string `json:"name"       binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	rawKey, err := h.svc.CreateAPIKey(body.ProjectID, body.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"key":  rawKey,
		"note": "Store this key securely — it will not be shown again.",
	})
}

func (h *Handler) ListAPIKeys(c *gin.Context) {
	projectID := c.Query("project_id")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "project_id is required"})
		return
	}
	keys, err := h.svc.repo.ListAPIKeysByProject(projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, keys)
}

func (h *Handler) RevokeAPIKey(c *gin.Context) {
	if err := h.svc.repo.RevokeAPIKey(c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) ListProjects(c *gin.Context) {
	projects, err := h.svc.repo.ListAllProjects()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, projects)
}
