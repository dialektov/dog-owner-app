package db

import (
	"os"
	"path/filepath"

	"github.com/dogowner/backend/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Init(path string) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	var err error
	DB, err = gorm.Open(sqlite.Open(path), &gorm.Config{})
	if err != nil {
		return err
	}

	return DB.AutoMigrate(
		&models.User{},
		&models.Pet{},
		&models.Walk{},
		&models.Place{},
		&models.Review{},
		&models.Friendship{},
		&models.UserLocation{},
		&models.Article{},
		&models.FeedPost{},
	)
}
