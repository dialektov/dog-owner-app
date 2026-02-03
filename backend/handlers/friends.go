package handlers

import (
	"net/http"

	"github.com/dogowner/backend/db"
	"github.com/dogowner/backend/models"
	"github.com/gin-gonic/gin"
)

func GetFriends(c *gin.Context) {
	userID := c.Param("id")
	var friendships []models.Friendship
	if err := db.DB.Where("user_id = ? OR friend_id = ?", userID, userID).Find(&friendships).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var friendIDs []string
	for _, f := range friendships {
		if f.UserID == userID {
			friendIDs = append(friendIDs, f.FriendID)
		} else {
			friendIDs = append(friendIDs, f.UserID)
		}
	}
	var users []models.User
	if len(friendIDs) > 0 {
		db.DB.Where("id IN ?", friendIDs).Find(&users)
	}
	c.JSON(http.StatusOK, users)
}

func AddFriend(c *gin.Context) {
	var input struct {
		UserID   string `json:"user_id" binding:"required"`
		FriendID string `json:"friend_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	f := models.Friendship{
		UserID:   input.UserID,
		FriendID: input.FriendID,
	}
	if err := db.DB.Create(&f).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, f)
}
