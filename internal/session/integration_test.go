//go:build integration

package session_test

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/google/uuid"
	"github.com/joaovrmoraes/batrewind/internal/db"
	"github.com/joaovrmoraes/batrewind/internal/session"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// migrationsDir resolves the absolute migrations path from this test file's
// location, so migrations load regardless of `go test`'s working directory.
func migrationsDir() string {
	_, file, _, _ := runtime.Caller(0) // .../internal/session/integration_test.go
	root := filepath.Dir(filepath.Dir(filepath.Dir(file)))
	return filepath.Join(root, "internal", "db", "migrations")
}

func testDB(t *testing.T) *gorm.DB {
	t.Helper()
	host := os.Getenv("TEST_DB_HOST")
	if host == "" {
		host = "localhost"
	}
	port := os.Getenv("TEST_DB_PORT")
	if port == "" {
		port = "5433"
	}

	t.Setenv("DB_DRIVER", "postgres")
	t.Setenv("DB_HOST", host)
	t.Setenv("DB_PORT", port)
	t.Setenv("DB_USER", "batrewind")
	t.Setenv("DB_PASSWORD", "batrewind")
	t.Setenv("DB_NAME", "batrewind_test")
	t.Setenv("MIGRATIONS_DIR", migrationsDir())

	conn, err := db.Init()
	require.NoError(t, err, "failed to connect to test DB")
	return conn
}

func cleanup(t *testing.T, conn *gorm.DB) {
	t.Helper()
	tables := []string{"failed_ingest", "replay_events", "replay_sessions"}
	for _, table := range tables {
		conn.Exec(fmt.Sprintf("DELETE FROM %s", table))
	}
}

func newSvc(t *testing.T) (*session.Service, *gorm.DB) {
	t.Helper()
	conn := testDB(t)
	repo := session.NewRepository(conn)
	return session.NewService(repo), conn
}

func validReq(sessionID string) session.IngestRequest {
	data, _ := json.Marshal(map[string]string{"key": "val"})
	return session.IngestRequest{
		SessionID:   sessionID,
		Identifier:  "user@test.com",
		ServiceName: "my-app",
		Environment: "production",
		Events: []session.RawEvent{
			{Type: 2, Data: data, Timestamp: 1000},
			{Type: 3, Data: data, Timestamp: 2000},
		},
	}
}

// --- Ingest ---

func TestIntegration_Ingest_PersistsSessionAndEvents(t *testing.T) {
	svc, conn := newSvc(t)
	defer cleanup(t, conn)

	sid := uuid.NewString()
	err := svc.Ingest(validReq(sid))
	require.NoError(t, err)

	sess, err := svc.GetByID(sid)
	require.NoError(t, err)
	assert.Equal(t, "user@test.com", sess.Identifier)
	assert.Equal(t, "production", sess.Environment)
	assert.Equal(t, 2, sess.EventCount)

	events, err := svc.GetEvents(sid)
	require.NoError(t, err)
	assert.Len(t, events, 2)
	assert.Equal(t, 0, events[0].Seq)
	assert.Equal(t, 1, events[1].Seq)
}

func TestIntegration_Ingest_Idempotent_UpsertsSameSession(t *testing.T) {
	svc, conn := newSvc(t)
	defer cleanup(t, conn)

	// Two batches for the same session
	sid := uuid.NewString()
	err := svc.Ingest(validReq(sid))
	require.NoError(t, err)
	err = svc.Ingest(validReq(sid))
	require.NoError(t, err)

	// Events should accumulate (4 total), session should exist once
	events, err := svc.GetEvents(sid)
	require.NoError(t, err)
	assert.Len(t, events, 4)
}

// --- FinalizeSession ---

func TestIntegration_FinalizeSession_SetsEndedAt(t *testing.T) {
	svc, conn := newSvc(t)
	defer cleanup(t, conn)

	sid := uuid.NewString()
	require.NoError(t, svc.Ingest(validReq(sid)))

	err := svc.FinalizeSession(sid)
	require.NoError(t, err)

	sess, err := svc.GetByID(sid)
	require.NoError(t, err)
	assert.NotNil(t, sess.EndedAt)
	assert.NotNil(t, sess.DurationMs)
	assert.GreaterOrEqual(t, *sess.DurationMs, int64(0))
}

// --- List ---

func TestIntegration_List_FiltersAndPaginates(t *testing.T) {
	svc, conn := newSvc(t)
	defer cleanup(t, conn)

	r1 := validReq(uuid.NewString())
	r1.Identifier = "alice@test.com"
	r1.Environment = "staging"
	require.NoError(t, svc.Ingest(r1))

	r2 := validReq(uuid.NewString())
	r2.Identifier = "bob@test.com"
	r2.Environment = "production"
	require.NoError(t, svc.Ingest(r2))

	sessions, total, err := svc.List(session.ListFilter{Identifier: "alice@test.com"})
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, sessions, 1)
	assert.Equal(t, "alice@test.com", sessions[0].Identifier)

	all, total2, err := svc.List(session.ListFilter{})
	require.NoError(t, err)
	assert.GreaterOrEqual(t, total2, int64(2))
	_ = all
}

// --- FailedIngest ---

func TestIntegration_FailedIngest_SaveAndRetry(t *testing.T) {
	svc, conn := newSvc(t)
	defer cleanup(t, conn)

	sid := uuid.NewString()
	fid := uuid.NewString()
	req := validReq(sid)
	payload, _ := json.Marshal(req)

	repo := session.NewRepository(conn)
	err := repo.SaveFailed(&session.FailedIngest{
		ID:         fid,
		SessionID:  req.SessionID,
		Payload:    string(payload),
		Error:      "db timeout",
		RetryCount: 4,
	})
	require.NoError(t, err)

	items, err := svc.ListFailed(true)
	require.NoError(t, err)
	require.Len(t, items, 1)
	assert.Equal(t, sid, items[0].SessionID)

	err = svc.RetryFailed(fid)
	require.NoError(t, err)

	// After retry, session and events should exist
	_, err = svc.GetByID(sid)
	require.NoError(t, err)

	// And the failed_ingest should be resolved
	resolved, err := svc.ListFailed(true) // onlyUnresolved=true
	require.NoError(t, err)
	assert.Len(t, resolved, 0)
}
