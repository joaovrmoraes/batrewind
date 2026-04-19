package main

import (
	"log/slog"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joaovrmoraes/batrewind/internal/auth"
	"github.com/joaovrmoraes/batrewind/internal/config"
	"github.com/joaovrmoraes/batrewind/internal/db"
	"github.com/joaovrmoraes/batrewind/internal/health"
	"github.com/joaovrmoraes/batrewind/internal/session"
	"gorm.io/gorm"
)

func main() {
	setupLogger()

	conn := connectDB()
	sqlDB, err := conn.DB()
	if err != nil {
		slog.Error("Failed to get underlying DB connection", "error", err)
		os.Exit(1)
	}
	defer sqlDB.Close()

	jwtSecret := config.GetEnv("JWT_SECRET", "change-me-in-production")
	authRepo := auth.NewRepository(conn)
	authSvc := auth.NewService(authRepo, jwtSecret)

	r := gin.Default()
	r.Use(cors.Default())

	// Auth routes (public: login)
	authHandler := auth.NewHandler(authSvc)
	authHandler.RegisterPublicRoutes(r.Group("/v1/auth"))

	// Auth protected routes
	protectedAuth := r.Group("/v1/auth")
	protectedAuth.Use(authSvc.JWTMiddleware())
	authHandler.RegisterProtectedRoutes(protectedAuth)

	// Session routes (protected)
	v1 := r.Group("/v1")
	v1.Use(authSvc.JWTMiddleware())
	repo := session.NewRepository(conn)
	svc := session.NewService(repo)
	session.NewReaderHandler(svc).RegisterRoutes(v1)

	health.NewHandler(conn).RegisterRoutes(r.Group("/"))

	port := config.GetEnv("READER_PORT", "8081")
	slog.Info("BatRewind Reader running", "port", port)
	if err := r.Run(":" + port); err != nil {
		slog.Error("Reader failed", "error", err)
	}
}

func connectDB() *gorm.DB {
	const maxRetries = 5
	var conn *gorm.DB
	var err error
	for i := range maxRetries {
		slog.Info("Connecting to database", "attempt", i+1)
		conn, err = db.Init()
		if err == nil {
			return conn
		}
		slog.Warn("DB connection failed", "error", err)
		if i < maxRetries-1 {
			time.Sleep(5 * time.Second)
		}
	}
	slog.Error("Could not connect to database", "error", err)
	os.Exit(1)
	return nil
}

func setupLogger() {
	level := slog.LevelInfo
	switch config.GetEnv("LOG_LEVEL", "info") {
	case "debug":
		level = slog.LevelDebug
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	}
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level})))
}
