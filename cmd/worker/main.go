package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joaovrmoraes/batrewind/internal/config"
	"github.com/joaovrmoraes/batrewind/internal/db"
	"github.com/joaovrmoraes/batrewind/internal/queue"
	"github.com/joaovrmoraes/batrewind/internal/session"
	"github.com/joaovrmoraes/batrewind/internal/worker"
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

	redisAddr := config.GetEnv("REDIS_ADDR", "localhost:6379")
	q, err := queue.New(redisAddr, queue.DefaultStreamName, queue.DefaultGroupName, "worker")
	if err != nil {
		slog.Error("Failed to connect to Redis", "error", err)
		os.Exit(1)
	}
	defer q.Close()

	repo := session.NewRepository(conn)
	svc := session.NewService(repo)
	cfg := worker.DefaultConfig()
	w := worker.New(cfg, svc, q)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	slog.Info("BatRewind Worker starting")
	w.Start(ctx)
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
