package main

import (
	"log/slog"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joaovrmoraes/batrewind/internal/auth"
	"github.com/joaovrmoraes/batrewind/internal/config"
	"github.com/joaovrmoraes/batrewind/internal/db"
	"github.com/joaovrmoraes/batrewind/internal/health"
	"github.com/joaovrmoraes/batrewind/internal/middleware"
	"github.com/joaovrmoraes/batrewind/internal/queue"
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

	redisAddr := config.GetEnv("REDIS_ADDR", "localhost:6379")
	q, err := queue.New(redisAddr, queue.DefaultStreamName, queue.DefaultGroupName, "writer")
	if err != nil {
		slog.Error("Failed to connect to Redis", "error", err)
		os.Exit(1)
	}
	defer q.Close()

	jwtSecret := config.GetEnv("JWT_SECRET", config.DefaultJWTSecret)
	assertSecureSecret(jwtSecret)
	authRepo := auth.NewRepository(conn)
	authSvc := auth.NewService(authRepo, jwtSecret)

	ownerEmail := config.GetEnv("INITIAL_OWNER_EMAIL", "")
	ownerPassword := config.GetEnv("INITIAL_OWNER_PASSWORD", "")
	ownerName := config.GetEnv("INITIAL_OWNER_NAME", "Admin")
	if ownerEmail != "" && ownerPassword != "" {
		if _, err := authSvc.SetupOwner(ownerName, ownerEmail, ownerPassword); err != nil {
			if err != auth.ErrOwnerAlreadyExists {
				slog.Error("Failed to create initial owner", "error", err)
			}
		} else {
			slog.Info("Initial owner created", "email", ownerEmail)
		}
	}

	if initialAPIKey := config.GetEnv("INITIAL_API_KEY", ""); initialAPIKey != "" {
		if err := authSvc.EnsureAPIKey(initialAPIKey, "Demo"); err != nil {
			slog.Error("Failed to ensure initial API key", "error", err)
		} else {
			slog.Info("Initial API key ready")
		}
	}

	r := gin.Default()
	// Ingest is authenticated by API key (no cookies), so allowing any origin is
	// safe by default; lock it down with WRITER_CORS_ORIGINS when desired.
	r.Use(middleware.CORS(config.GetEnv("WRITER_CORS_ORIGINS", "*")))

	maxBody := int64(config.GetEnvAsInt("WRITER_MAX_BODY_BYTES", 5_000_000)) // 5 MB
	rateRPS := config.GetEnvAsInt("WRITER_RATE_LIMIT_RPS", 20)
	rateBurst := config.GetEnvAsInt("WRITER_RATE_LIMIT_BURST", 40)
	limiter := middleware.NewRateLimiter(float64(rateRPS), rateBurst)

	v1 := r.Group("/v1")
	ingest := v1.Group("")
	ingest.Use(middleware.BodyLimit(maxBody))
	ingest.Use(authSvc.APIKeyMiddleware())
	ingest.Use(limiter.Middleware())
	session.NewWriterHandler(q).RegisterRoutes(ingest)

	health.NewHandler(conn).RegisterRoutes(r.Group("/"))

	port := config.GetEnv("WRITER_PORT", "8080")
	slog.Info("BatRewind Writer running", "port", port)
	if err := r.Run(":" + port); err != nil {
		slog.Error("Writer failed", "error", err)
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

// assertSecureSecret refuses to boot in production with the default JWT secret,
// and warns otherwise so dev keeps working.
func assertSecureSecret(secret string) {
	if secret != config.DefaultJWTSecret {
		return
	}
	if config.IsProduction() {
		slog.Error("JWT_SECRET is the insecure default in production — refusing to start. Set a strong JWT_SECRET.")
		os.Exit(1)
	}
	slog.Warn("JWT_SECRET is the insecure default — set a strong secret before deploying to production")
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
