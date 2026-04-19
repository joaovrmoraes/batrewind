package db

import (
	"os"

	"github.com/joho/godotenv"
)

type DatabaseDriver string

const (
	Postgres DatabaseDriver = "postgres"
	SQLite   DatabaseDriver = "sqlite"
)

type Database struct {
	Driver     DatabaseDriver
	User       string
	Password   string
	Name       string
	Host       string
	Port       string
	SQLitePath string
}

func LoadConfig() Database {
	_ = godotenv.Load()

	driver := os.Getenv("DB_DRIVER")
	if driver == "" {
		driver = "sqlite"
	}

	sqlitePath := os.Getenv("SQLITE_PATH")
	if sqlitePath == "" {
		sqlitePath = "batrewind.db"
	}

	return Database{
		Driver:     DatabaseDriver(driver),
		User:       os.Getenv("DB_USER"),
		Password:   os.Getenv("DB_PASSWORD"),
		Name:       os.Getenv("DB_NAME"),
		Host:       os.Getenv("DB_HOST"),
		Port:       os.Getenv("DB_PORT"),
		SQLitePath: sqlitePath,
	}
}
