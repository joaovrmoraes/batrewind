// Package middleware holds HTTP middleware shared across the BatRewind services.
package middleware

import (
	"math"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// CORS builds a CORS middleware from a comma-separated origins string. An empty
// string or "*" allows any origin (suitable for the API-key-authenticated ingest
// endpoint, which sends no cookies); a list locks access to those origins.
func CORS(originsCSV string) gin.HandlerFunc {
	cfg := cors.Config{
		AllowMethods:     []string{"GET", "POST", "DELETE", "PUT", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-API-Key"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	}

	trimmed := strings.TrimSpace(originsCSV)
	if trimmed == "" || trimmed == "*" {
		cfg.AllowAllOrigins = true
		return cors.New(cfg)
	}

	for _, o := range strings.Split(trimmed, ",") {
		if o = strings.TrimSpace(o); o != "" {
			cfg.AllowOrigins = append(cfg.AllowOrigins, o)
		}
	}
	return cors.New(cfg)
}

// BodyLimit rejects requests whose body exceeds maxBytes. It both fast-fails on
// an oversized Content-Length and wraps the reader with http.MaxBytesReader so
// chunked/unknown-length bodies can't blow past the limit while streaming.
func BodyLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if maxBytes <= 0 {
			c.Next()
			return
		}
		if c.Request.ContentLength > maxBytes {
			c.AbortWithStatusJSON(http.StatusRequestEntityTooLarge, gin.H{"error": "payload too large"})
			return
		}
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}

// tokenBucket is a single rate-limited identity. Not safe for concurrent use on
// its own — the registry guards access while refilling and consuming.
type tokenBucket struct {
	tokens float64
	last   time.Time
}

// RateLimiter is a per-key in-memory token-bucket limiter. Keys are typically
// API key IDs (falling back to client IP). Bounded by the number of distinct
// callers, which is small for an ingest endpoint.
type RateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*tokenBucket
	rate    float64 // tokens per second
	burst   float64 // max tokens
}

// NewRateLimiter builds a limiter allowing `rate` requests/sec with a `burst`
// ceiling. A non-positive rate disables limiting (Allow always returns true).
func NewRateLimiter(rate float64, burst int) *RateLimiter {
	return &RateLimiter{
		buckets: make(map[string]*tokenBucket),
		rate:    rate,
		burst:   float64(burst),
	}
}

// Allow consumes one token for key, returning false when the bucket is empty.
func (rl *RateLimiter) Allow(key string) bool {
	if rl.rate <= 0 {
		return true
	}
	now := time.Now()

	rl.mu.Lock()
	defer rl.mu.Unlock()

	b, ok := rl.buckets[key]
	if !ok {
		// New caller starts with a full burst, minus this request.
		rl.buckets[key] = &tokenBucket{tokens: rl.burst - 1, last: now}
		return true
	}

	elapsed := now.Sub(b.last).Seconds()
	b.last = now
	b.tokens = math.Min(rl.burst, b.tokens+elapsed*rl.rate)
	if b.tokens >= 1 {
		b.tokens--
		return true
	}
	return false
}

// Middleware enforces the limiter, keying on api_key_id (set by the API-key
// middleware) and falling back to the client IP.
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.GetString("api_key_id")
		if key == "" {
			key = c.ClientIP()
		}
		if !rl.Allow(key) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			return
		}
		c.Next()
	}
}
