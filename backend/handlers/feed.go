package handlers

import (
	"net/http"

	"github.com/dogowner/backend/db"
	"github.com/dogowner/backend/models"
	"github.com/gin-gonic/gin"
)

func GetFeed(c *gin.Context) {
	var posts []models.FeedPost
	if err := db.DB.Order("created_at DESC").Limit(50).Find(&posts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, posts)
}

func CreateFeedPost(c *gin.Context) {
	var input struct {
		PetID    string `json:"pet_id"`
		Text     string `json:"text" binding:"required"`
		MediaURL string `json:"media_url"`
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
	post := models.FeedPost{
		UserID:   userID,
		PetID:    input.PetID,
		Text:     input.Text,
		MediaURL: input.MediaURL,
	}
	if err := db.DB.Create(&post).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, post)
}
