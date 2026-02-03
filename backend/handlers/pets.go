package handlers

import (
	"net/http"

	"github.com/dogowner/backend/db"
	"github.com/dogowner/backend/models"
	"github.com/gin-gonic/gin"
)

func GetPet(c *gin.Context) {
	id := c.Param("id")
	var pet models.Pet
	if err := db.DB.First(&pet, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "pet not found"})
		return
	}
	c.JSON(http.StatusOK, pet)
}

func GetPetByQR(c *gin.Context) {
	qr := c.Param("qr")
	var pet models.Pet
	if err := db.DB.First(&pet, "qr_code_data = ?", qr).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "pet not found"})
		return
	}
	c.JSON(http.StatusOK, pet)
}

func CreatePet(c *gin.Context) {
	var input models.Pet
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

func UpdatePet(c *gin.Context) {
	id := c.Param("id")
	var pet models.Pet
	if err := db.DB.First(&pet, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "pet not found"})
		return
	}
	if err := c.ShouldBindJSON(&pet); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	db.DB.Save(&pet)
	c.JSON(http.StatusOK, pet)
}
