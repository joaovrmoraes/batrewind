package session

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func init() { gin.SetMode(gin.TestMode) }

func postRecord(t *testing.T, body string) *httptest.ResponseRecorder {
	t.Helper()
	// q is nil: the UUID guard runs before Enqueue, so a rejected request never
	// touches the queue. (A valid request would, hence those cases live in the
	// integration test against a real stream.)
	h := NewWriterHandler(nil)
	r := gin.New()
	h.RegisterRoutes(r.Group(""))

	req := httptest.NewRequest(http.MethodPost, "/record", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func TestIngest_RejectsNonUUIDSessionID(t *testing.T) {
	body := `{"session_id":"rl","identifier":"u","service_name":"web","events":[{"type":2,"data":{},"timestamp":1}]}`
	w := postRecord(t, body)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", w.Code)
	}
	if !strings.Contains(w.Body.String(), "session_id must be a valid UUID") {
		t.Fatalf("body = %q, want UUID error", w.Body.String())
	}
}

func TestIngest_RejectsMissingRequiredFields(t *testing.T) {
	// No events — binding:"required,min=1" should fail before the UUID check.
	body := `{"session_id":"` + uuid.NewString() + `","identifier":"u","service_name":"web"}`
	w := postRecord(t, body)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", w.Code)
	}
}
