package auth

import (
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"
)

var ErrNotFound = errors.New("record not found")
var ErrEmailTaken = errors.New("email already in use")
var ErrSlugTaken = errors.New("slug already in use")

type Repository interface {
	CreateUser(user *User) error
	GetUserByEmail(email string) (*User, error)
	CountUsers() (int64, error)
	CreateProject(project *Project) error
	GetProjectBySlug(slug string) (*Project, error)
	ListAllProjects() ([]Project, error)
	CreateProjectMember(member *ProjectMember) error
	CreateAPIKey(key *APIKey) error
	GetAPIKeyByHash(keyHash string) (*APIKey, error)
	GetAPIKeyByID(id string) (*APIKey, error)
	ListAPIKeysByProject(projectID string) ([]APIKey, error)
	RevokeAPIKey(id string) error
	UpdateAPIKeyProject(keyID, projectID string) error
}

type repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) Repository { return &repository{db: db} }

func (r *repository) CreateUser(user *User) error {
	if err := r.db.Create(user).Error; err != nil {
		if strings.Contains(err.Error(), "23505") || strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "UNIQUE constraint") {
			return ErrEmailTaken
		}
		return err
	}
	return nil
}

func (r *repository) GetUserByEmail(email string) (*User, error) {
	var user User
	if err := r.db.First(&user, "email = ?", email).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *repository) CountUsers() (int64, error) {
	var count int64
	return count, r.db.Model(&User{}).Count(&count).Error
}

func (r *repository) CreateProject(project *Project) error {
	db := r.db
	if project.CreatedBy == "" {
		db = db.Omit("CreatedBy")
	}
	if err := db.Create(project).Error; err != nil {
		if strings.Contains(err.Error(), "23505") || strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "UNIQUE constraint") {
			return ErrSlugTaken
		}
		return err
	}
	return nil
}

func (r *repository) GetProjectBySlug(slug string) (*Project, error) {
	var project Project
	if err := r.db.First(&project, "slug = ?", slug).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &project, nil
}

func (r *repository) ListAllProjects() ([]Project, error) {
	var projects []Project
	return projects, r.db.Find(&projects).Error
}

func (r *repository) CreateProjectMember(member *ProjectMember) error {
	return r.db.Create(member).Error
}

func (r *repository) CreateAPIKey(key *APIKey) error {
	db := r.db
	if key.ProjectID == "" {
		db = db.Omit("ProjectID")
	}
	return db.Create(key).Error
}

func (r *repository) GetAPIKeyByHash(keyHash string) (*APIKey, error) {
	var key APIKey
	if err := r.db.First(&key, "key_hash = ? AND active = true", keyHash).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if key.ExpiresAt != nil && key.ExpiresAt.Before(time.Now()) {
		return nil, ErrNotFound
	}
	return &key, nil
}

func (r *repository) GetAPIKeyByID(id string) (*APIKey, error) {
	var key APIKey
	if err := r.db.First(&key, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &key, nil
}

func (r *repository) ListAPIKeysByProject(projectID string) ([]APIKey, error) {
	var keys []APIKey
	return keys, r.db.Where("project_id = ?", projectID).Find(&keys).Error
}

func (r *repository) RevokeAPIKey(id string) error {
	return r.db.Model(&APIKey{}).Where("id = ?", id).Update("active", false).Error
}

func (r *repository) UpdateAPIKeyProject(keyID, projectID string) error {
	return r.db.Model(&APIKey{}).Where("id = ?", keyID).Update("project_id", projectID).Error
}
