package config

import (
	"os"
	"strconv"
)

func GetEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func GetEnvAsInt(key string, defaultValue int) int {
	if valueStr := GetEnv(key, ""); valueStr != "" {
		if value, err := strconv.Atoi(valueStr); err == nil {
			return value
		}
	}
	return defaultValue
}

// DefaultJWTSecret is the placeholder secret shipped for local/dev use. The
// services refuse to start with it when ENVIRONMENT is production.
const DefaultJWTSecret = "change-me-in-production"

// IsProduction reports whether the service is running in a production environment.
func IsProduction() bool {
	switch GetEnv("ENVIRONMENT", "") {
	case "production", "prod":
		return true
	}
	return false
}

func GetEnvAsBool(key string, defaultValue bool) bool {
	if valueStr := GetEnv(key, ""); valueStr != "" {
		switch valueStr {
		case "true", "1", "yes", "y":
			return true
		case "false", "0", "no", "n":
			return false
		}
	}
	return defaultValue
}
