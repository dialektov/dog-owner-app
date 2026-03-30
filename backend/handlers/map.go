package handlers

import (
	"net/http"
	"time"

	"github.com/dogowner/backend/db"
	"github.com/dogowner/backend/models"
	"github.com/gin-gonic/gin"
)

// UserLocationResponse — ответ с именем пользователя для умной карты
type UserLocationResponse struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	UserName    string    `json:"user_name"`
	PetID       string    `json:"pet_id"`
	Latitude    float64   `json:"latitude"`
	Longitude   float64   `json:"longitude"`
	Status      string    `json:"status"`
	LastUpdated time.Time `json:"last_updated"`
}

func GetUserLocations(c *gin.Context) {
	var locations []models.UserLocation
	if err := db.DB.Find(&locations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	resp := make([]UserLocationResponse, 0, len(locations))
	for _, loc := range locations {
		var u models.User
		name := ""
		if db.DB.First(&u, "id = ?", loc.UserID).Error == nil {
			name = u.Name
		}
		resp = append(resp, UserLocationResponse{
			ID:          loc.ID,
			UserID:      loc.UserID,
			UserName:    name,
			PetID:       loc.PetID,
			Latitude:    loc.Latitude,
			Longitude:   loc.Longitude,
			Status:      string(loc.Status),
			LastUpdated: loc.LastUpdated,
		})
	}
	c.JSON(http.StatusOK, resp)
}

func UpdateMyLocation(c *gin.Context) {
	var input struct {
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
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var loc models.UserLocation
	err := db.DB.Where("user_id = ?", userID).First(&loc).Error
	if err != nil {
		loc = models.UserLocation{
			UserID:      userID,
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
