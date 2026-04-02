package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port         string
	DatabasePath string
}

func Load() *Config {
	// Try both backend/.env and project-root .env
	_ = godotenv.Load(".env", "../.env")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		dbPath = "./data/dogowner.db"
	}

	cfg := &Config{
		Port:         port,
		DatabasePath: dbPath,
	}
	return cfg
}
