package auth

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

// --- Mock Repository ---

type mockRepo struct {
	createUserFn          func(user *User) error
	getUserByEmailFn      func(email string) (*User, error)
	countUsersFn          func() (int64, error)
	createProjectFn       func(project *Project) error
	getProjectBySlugFn    func(slug string) (*Project, error)
	listAllProjectsFn     func() ([]Project, error)
	createProjectMemberFn func(member *ProjectMember) error
	createAPIKeyFn        func(key *APIKey) error
	getAPIKeyByHashFn     func(keyHash string) (*APIKey, error)
	getAPIKeyByIDFn       func(id string) (*APIKey, error)
	listAPIKeysByProjectFn func(projectID string) ([]APIKey, error)
	revokeAPIKeyFn        func(id string) error
	updateAPIKeyProjectFn func(keyID, projectID string) error
}

func (m *mockRepo) CreateUser(user *User) error {
	if m.createUserFn != nil {
		return m.createUserFn(user)
	}
	return nil
}
func (m *mockRepo) GetUserByEmail(email string) (*User, error) {
	if m.getUserByEmailFn != nil {
		return m.getUserByEmailFn(email)
	}
	return nil, ErrNotFound
}
func (m *mockRepo) CountUsers() (int64, error) {
	if m.countUsersFn != nil {
		return m.countUsersFn()
	}
	return 0, nil
}
func (m *mockRepo) CreateProject(project *Project) error {
	if m.createProjectFn != nil {
		return m.createProjectFn(project)
	}
	return nil
}
func (m *mockRepo) GetProjectBySlug(slug string) (*Project, error) {
	if m.getProjectBySlugFn != nil {
		return m.getProjectBySlugFn(slug)
	}
	return nil, ErrNotFound
}
func (m *mockRepo) ListAllProjects() ([]Project, error) {
	if m.listAllProjectsFn != nil {
		return m.listAllProjectsFn()
	}
	return nil, nil
}
func (m *mockRepo) CreateProjectMember(member *ProjectMember) error {
	if m.createProjectMemberFn != nil {
		return m.createProjectMemberFn(member)
	}
	return nil
}
func (m *mockRepo) CreateAPIKey(key *APIKey) error {
	if m.createAPIKeyFn != nil {
		return m.createAPIKeyFn(key)
	}
	return nil
}
func (m *mockRepo) GetAPIKeyByHash(keyHash string) (*APIKey, error) {
	if m.getAPIKeyByHashFn != nil {
		return m.getAPIKeyByHashFn(keyHash)
	}
	return nil, ErrNotFound
}
func (m *mockRepo) GetAPIKeyByID(id string) (*APIKey, error) {
	if m.getAPIKeyByIDFn != nil {
		return m.getAPIKeyByIDFn(id)
	}
	return nil, ErrNotFound
}
func (m *mockRepo) ListAPIKeysByProject(projectID string) ([]APIKey, error) {
	if m.listAPIKeysByProjectFn != nil {
		return m.listAPIKeysByProjectFn(projectID)
	}
	return nil, nil
}
func (m *mockRepo) RevokeAPIKey(id string) error {
	if m.revokeAPIKeyFn != nil {
		return m.revokeAPIKeyFn(id)
	}
	return nil
}
func (m *mockRepo) UpdateAPIKeyProject(keyID, projectID string) error {
	if m.updateAPIKeyProjectFn != nil {
		return m.updateAPIKeyProjectFn(keyID, projectID)
	}
	return nil
}

// --- Helpers ---

const testSecret = "test-secret"

func newAuthSvc(repo *mockRepo) *Service {
	return NewService(repo, testSecret)
}

func hashedPassword(t *testing.T, plain string) string {
	t.Helper()
	h, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.MinCost)
	require.NoError(t, err)
	return string(h)
}

// --- Login ---

func TestLogin_ValidCredentials_ReturnsToken(t *testing.T) {
	repo := &mockRepo{
		getUserByEmailFn: func(email string) (*User, error) {
			return &User{
				ID:           "user-1",
				Email:        email,
				PasswordHash: hashedPassword(t, "secret"),
				Role:         RoleOwner,
			}, nil
		},
	}

	token, user, err := newAuthSvc(repo).Login("admin@example.com", "secret")
	require.NoError(t, err)
	assert.NotEmpty(t, token)
	assert.Equal(t, "admin@example.com", user.Email)
}

func TestLogin_WrongPassword_ReturnsError(t *testing.T) {
	repo := &mockRepo{
		getUserByEmailFn: func(email string) (*User, error) {
			return &User{PasswordHash: hashedPassword(t, "correct")}, nil
		},
	}

	_, _, err := newAuthSvc(repo).Login("admin@example.com", "wrong")
	assert.ErrorIs(t, err, ErrInvalidCredentials)
}

func TestLogin_UserNotFound_ReturnsInvalidCredentials(t *testing.T) {
	repo := &mockRepo{
		getUserByEmailFn: func(email string) (*User, error) {
			return nil, ErrNotFound
		},
	}

	_, _, err := newAuthSvc(repo).Login("nobody@example.com", "anything")
	assert.ErrorIs(t, err, ErrInvalidCredentials)
}

// --- SetupOwner ---

func TestSetupOwner_CreatesFirstUser(t *testing.T) {
	var created *User
	repo := &mockRepo{
		countUsersFn: func() (int64, error) { return 0, nil },
		createUserFn: func(user *User) error {
			created = user
			return nil
		},
	}

	user, err := newAuthSvc(repo).SetupOwner("Admin", "admin@example.com", "password123")
	require.NoError(t, err)
	require.NotNil(t, created)
	assert.Equal(t, RoleOwner, created.Role)
	assert.Equal(t, "admin@example.com", user.Email)
}

func TestSetupOwner_UsersExist_ReturnsError(t *testing.T) {
	repo := &mockRepo{
		countUsersFn: func() (int64, error) { return 1, nil },
	}

	_, err := newAuthSvc(repo).SetupOwner("Admin", "admin@example.com", "password123")
	assert.ErrorIs(t, err, ErrOwnerAlreadyExists)
}

func TestSetupOwner_CountError_ReturnsError(t *testing.T) {
	repo := &mockRepo{
		countUsersFn: func() (int64, error) { return 0, errors.New("db error") },
	}

	_, err := newAuthSvc(repo).SetupOwner("Admin", "admin@example.com", "pass")
	assert.Error(t, err)
}

// --- ValidateToken ---

func TestValidateToken_ValidToken_ReturnsClaims(t *testing.T) {
	repo := &mockRepo{
		getUserByEmailFn: func(email string) (*User, error) {
			return &User{ID: "u1", Email: email, PasswordHash: hashedPassword(t, "pass"), Role: RoleAdmin}, nil
		},
	}
	svc := newAuthSvc(repo)

	token, _, err := svc.Login("admin@example.com", "pass")
	require.NoError(t, err)

	claims, err := svc.ValidateToken(token)
	require.NoError(t, err)
	assert.Equal(t, "admin@example.com", claims.Email)
	assert.Equal(t, RoleAdmin, claims.Role)
}

func TestValidateToken_InvalidToken_ReturnsError(t *testing.T) {
	svc := newAuthSvc(&mockRepo{})
	_, err := svc.ValidateToken("not.a.valid.token")
	assert.Error(t, err)
}

func TestValidateToken_WrongSecret_ReturnsError(t *testing.T) {
	repo := &mockRepo{
		getUserByEmailFn: func(email string) (*User, error) {
			return &User{ID: "u1", Email: email, PasswordHash: hashedPassword(t, "pass"), Role: RoleOwner}, nil
		},
	}
	svc1 := newAuthSvc(repo)
	token, _, err := svc1.Login("admin@example.com", "pass")
	require.NoError(t, err)

	svc2 := NewService(&mockRepo{}, "different-secret")
	_, err = svc2.ValidateToken(token)
	assert.Error(t, err)
}

// --- CreateAPIKey ---

func TestCreateAPIKey_ReturnsRawKeyWithPrefix(t *testing.T) {
	svc := newAuthSvc(&mockRepo{})
	rawKey, err := svc.CreateAPIKey("project-1", "my key")
	require.NoError(t, err)
	assert.Contains(t, rawKey, "rew_")
	assert.Greater(t, len(rawKey), 10)
}

func TestCreateAPIKey_StoresHashNotRaw(t *testing.T) {
	var storedKey *APIKey
	repo := &mockRepo{
		createAPIKeyFn: func(key *APIKey) error {
			storedKey = key
			return nil
		},
	}

	rawKey, err := newAuthSvc(repo).CreateAPIKey("project-1", "sdk key")
	require.NoError(t, err)
	require.NotNil(t, storedKey)
	assert.NotEqual(t, rawKey, storedKey.KeyHash)
}

// --- ValidateAPIKey ---

func TestValidateAPIKey_ValidKey_ReturnsAPIKey(t *testing.T) {
	svc := newAuthSvc(&mockRepo{})
	rawKey, err := svc.CreateAPIKey("proj-1", "test")
	require.NoError(t, err)

	// rebuild svc with repo that returns the stored key
	var storedHash string
	repo := &mockRepo{
		createAPIKeyFn: func(key *APIKey) error {
			storedHash = key.KeyHash
			return nil
		},
		getAPIKeyByHashFn: func(keyHash string) (*APIKey, error) {
			if keyHash == storedHash {
				return &APIKey{ID: "key-1", Active: true}, nil
			}
			return nil, ErrNotFound
		},
	}
	svc2 := newAuthSvc(repo)
	rawKey2, err := svc2.CreateAPIKey("proj-1", "test")
	require.NoError(t, err)

	key, err := svc2.ValidateAPIKey(rawKey2)
	require.NoError(t, err)
	assert.Equal(t, "key-1", key.ID)

	_ = rawKey // suppress unused warning
}

func TestValidateAPIKey_InvalidKey_ReturnsError(t *testing.T) {
	repo := &mockRepo{
		getAPIKeyByHashFn: func(keyHash string) (*APIKey, error) {
			return nil, ErrNotFound
		},
	}
	_, err := newAuthSvc(repo).ValidateAPIKey("rew_invalid")
	assert.Error(t, err)
}

func TestValidateAPIKey_ExpiredKey_ReturnsError(t *testing.T) {
	// Expiry is enforced by the repository layer. The mock simulates
	// the real repository returning ErrNotFound for expired keys.
	repo := &mockRepo{
		getAPIKeyByHashFn: func(keyHash string) (*APIKey, error) {
			return nil, ErrNotFound
		},
	}
	_, err := newAuthSvc(repo).ValidateAPIKey("rew_somekey")
	assert.Error(t, err)
}
