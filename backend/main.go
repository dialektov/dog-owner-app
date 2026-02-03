package main

import (
	"log"
	"os"

	"github.com/dogowner/backend/config"
	"github.com/dogowner/backend/db"
	"github.com/dogowner/backend/router"
)

func main() {
	cfg := config.Load()

	if err := db.Init(cfg.DatabasePath); err != nil {
		log.Fatalf("database init: %v", err)
	}

	r := router.Setup(cfg)

	addr := ":" + cfg.Port
	if port := os.Getenv("PORT"); port != "" {
		addr = ":" + port
	}

	log.Printf("Server starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("server: %v", err)
	}
}
