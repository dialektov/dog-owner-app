package handlers

import (
	"net/http"

	"github.com/dogowner/backend/db"
	"github.com/dogowner/backend/models"
	"github.com/gin-gonic/gin"
)

func GetLostAlerts(c *gin.Context) {
	status := c.DefaultQuery("status", "active")
	var alerts []models.LostPetAlert
	q := db.DB.Order("created_at desc")
	if status != "all" {
		q = q.Where("status = ?", status)
	}
	if err := q.Find(&alerts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, alerts)
}

func CreateLostAlert(c *gin.Context) {
	var input struct {
		PetID       string  `json:"pet_id" binding:"required"`
		PetName     string  `json:"pet_name" binding:"required"`
		Breed       string  `json:"breed"`
		Description string  `json:"description"`
		Contact     string  `json:"contact"`
		Latitude    float64 `json:"latitude" binding:"required"`
		Longitude   float64 `json:"longitude" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	alert := models.LostPetAlert{
		PetID:       input.PetID,
		UserID:      userID,
		PetName:     input.PetName,
		Breed:       input.Breed,
		Description: input.Description,
		Contact:     input.Contact,
		Latitude:    input.Latitude,
		Longitude:   input.Longitude,
		Status:      "active",
	}
	if err := db.DB.Create(&alert).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, alert)
}

func MarkLostAlertFound(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	id := c.Param("id")
	var alert models.LostPetAlert
	if err := db.DB.First(&alert, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "alert not found"})
		return
	}
	if alert.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	alert.Status = "found"
	if err := db.DB.Save(&alert).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, alert)
}
