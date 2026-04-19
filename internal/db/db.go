package db

import (
	"fmt"
	"log/slog"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/database/sqlite3"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	_ "modernc.org/sqlite"
)

func RunMigrations(config *Database) error {
	var dsn, migrationsPath string
	switch config.Driver {
	case Postgres:
		dsn = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
			config.User, config.Password, config.Host, config.Port, config.Name)
		migrationsPath = "file://internal/db/migrations"
	case SQLite:
		dsn = "sqlite3://" + config.SQLitePath
		migrationsPath = "file://internal/db/migrations/sqlite"
	default:
		return fmt.Errorf("unsupported driver: %s", config.Driver)
	}

	m, err := migrate.New(migrationsPath, dsn)
	if err != nil {
		return fmt.Errorf("failed to initialize migrations: %w", err)
	}
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to run migrations: %w", err)
	}
	return nil
}

func Init() (*gorm.DB, error) {
	config := LoadConfig()

	if err := RunMigrations(&config); err != nil {
		return nil, fmt.Errorf("migration error: %w", err)
	}

	var db *gorm.DB
	var err error

	switch config.Driver {
	case Postgres:
		dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
			config.Host, config.User, config.Password, config.Name, config.Port)
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err != nil {
			return nil, fmt.Errorf("failed to connect to postgres: %w", err)
		}
	case SQLite:
		db, err = gorm.Open(sqlite.Open("file:"+config.SQLitePath+"?_pragma=foreign_keys(1)"), &gorm.Config{})
		if err != nil {
			return nil, fmt.Errorf("failed to connect to sqlite: %w", err)
		}
		if err := db.Exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;").Error; err != nil {
			return nil, fmt.Errorf("failed to configure sqlite pragmas: %w", err)
		}
	default:
		return nil, fmt.Errorf("unsupported database driver: %s", config.Driver)
	}

	slog.Info("Database connected", "driver", config.Driver)
	return db, nil
}
