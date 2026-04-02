package handlers

import (
	"errors"
	"net/http"

	"github.com/dogowner/backend/db"
	"github.com/dogowner/backend/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetWalks(c *gin.Context) {
	petID := c.Param("id")
	var walks []models.Walk
	if err := db.DB.Where("pet_id = ?", petID).Order("started_at DESC").Find(&walks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, walks)
}

func CreateWalk(c *gin.Context) {
	var input models.Walk
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := db.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, input)
}

func DeleteWalk(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	walkID := c.Param("id")
	var walk models.Walk
	if err := db.DB.First(&walk, "id = ?", walkID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "walk not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var pet models.Pet
	if err := db.DB.First(&pet, "id = ?", walk.PetID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if pet.OwnerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	if err := db.DB.Delete(&walk).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"deleted": walkID})
}
