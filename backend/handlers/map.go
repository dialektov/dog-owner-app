package handlers

import (
	"net/http"
	"time"

	"github.com/dogowner/backend/db"
	"github.com/dogowner/backend/models"
	"github.com/gin-gonic/gin"
)

func GetUserLocations(c *gin.Context) {
	var locations []models.UserLocation
	if err := db.DB.Find(&locations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, locations)
}

func UpdateMyLocation(c *gin.Context) {
	var input struct {
		UserID    string  `json:"user_id" binding:"required"`
		PetID     string  `json:"pet_id"`
		Latitude  float64 `json:"latitude" binding:"required"`
		Longitude float64 `json:"longitude" binding:"required"`
		Status    string  `json:"status"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	status := models.WalkStatus(input.Status)
	if status == "" {
		status = models.StatusLookingForCompany
	}

	var loc models.UserLocation
	err := db.DB.Where("user_id = ?", input.UserID).First(&loc).Error
	if err != nil {
		loc = models.UserLocation{
			UserID:      input.UserID,
			PetID:       input.PetID,
			Latitude:    input.Latitude,
			Longitude:   input.Longitude,
			Status:      status,
			LastUpdated: time.Now(),
		}
		db.DB.Create(&loc)
	} else {
		loc.PetID = input.PetID
		loc.Latitude = input.Latitude
		loc.Longitude = input.Longitude
		loc.Status = status
		loc.LastUpdated = time.Now()
		db.DB.Save(&loc)
	}
	c.JSON(http.StatusOK, loc)
}
