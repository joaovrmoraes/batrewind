package middleware

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() { gin.SetMode(gin.TestMode) }

func TestRateLimiterAllowsBurstThenBlocks(t *testing.T) {
	rl := NewRateLimiter(1, 3) // 1 rps, burst 3
	for i := 0; i < 3; i++ {
		if !rl.Allow("k") {
			t.Fatalf("request %d should be allowed within burst", i)
		}
	}
	if rl.Allow("k") {
		t.Fatal("4th request should be blocked")
	}
	// A different key has its own bucket.
	if !rl.Allow("other") {
		t.Fatal("distinct key should be allowed")
	}
}

func TestRateLimiterDisabledWhenRateZero(t *testing.T) {
	rl := NewRateLimiter(0, 0)
	for i := 0; i < 100; i++ {
		if !rl.Allow("k") {
			t.Fatal("limiter should be disabled when rate <= 0")
		}
	}
}

func TestBodyLimitRejectsOversizedContentLength(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := strings.Repeat("x", 100)
	c.Request = httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(body))
	c.Request.ContentLength = int64(len(body))

	BodyLimit(10)(c)

	if w.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected 413, got %d", w.Code)
	}
	if !c.IsAborted() {
		t.Fatal("expected request to be aborted")
	}
}

func TestBodyLimitAllowsSmallBody(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString("ok"))
	c.Request.ContentLength = 2

	BodyLimit(10)(c)

	if c.IsAborted() {
		t.Fatal("small body should not be aborted")
	}
}
