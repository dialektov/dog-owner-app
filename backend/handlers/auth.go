package handlers

import (
	"net/http"
	"strings"

	"github.com/dogowner/backend/db"
	"github.com/dogowner/backend/models"
	"github.com/dogowner/backend/services"
	"github.com/gin-gonic/gin"
)

type authUserResponse struct {
	ID      string `json:"id"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	IsAdmin bool   `json:"is_admin"`
}

const ownerEmail = "idialektov@gmail.com"

func Register(c *gin.Context) {
	var input struct {
		Email    string `json:"email" binding:"required,email"`
		Name     string `json:"name" binding:"required"`
		Password string `json:"password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	hash, err := services.HashPassword(input.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "cannot hash password"})
		return
	}
	user := models.User{
		Email:        strings.TrimSpace(strings.ToLower(input.Email)),
		Name:         strings.TrimSpace(input.Name),
		PasswordHash: hash,
		IsAdmin:      strings.TrimSpace(strings.ToLower(input.Email)) == ownerEmail,
	}
	if err := db.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email already exists"})
		return
	}
	token, err := services.GenerateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "cannot generate token"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"token": token,
		"user": authUserResponse{
			ID:      user.ID,
			Email:   user.Email,
			Name:    user.Name,
			IsAdmin: user.IsAdmin,
		},
	})
}

func Login(c *gin.Context) {
	var input struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var user models.User
	if err := db.DB.First(&user, "email = ?", strings.TrimSpace(strings.ToLower(input.Email))).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	if !services.CheckPassword(user.PasswordHash, input.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	if strings.ToLower(user.Email) == ownerEmail && !user.IsAdmin {
		user.IsAdmin = true
		_ = db.DB.Save(&user).Error
	}
	token, err := services.GenerateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "cannot generate token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": authUserResponse{
			ID:      user.ID,
			Email:   user.Email,
			Name:    user.Name,
			IsAdmin: user.IsAdmin,
		},
	})
}

func Me(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	var user models.User
	if err := db.DB.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	if strings.ToLower(user.Email) == ownerEmail && !user.IsAdmin {
		user.IsAdmin = true
		_ = db.DB.Save(&user).Error
	}
	c.JSON(http.StatusOK, authUserResponse{
		ID:      user.ID,
		Email:   user.Email,
		Name:    user.Name,
		IsAdmin: user.IsAdmin,
	})
}

func GrantAdmin(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	var owner models.User
	if err := db.DB.First(&owner, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	if strings.ToLower(owner.Email) != ownerEmail {
		c.JSON(http.StatusForbidden, gin.H{"error": "only owner can grant admin"})
		return
	}
	var input struct {
		FriendID    string `json:"friend_id"`
		FriendEmail string `json:"friend_email"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	friendID := strings.TrimSpace(input.FriendID)
	if friendID == "" && strings.TrimSpace(input.FriendEmail) != "" {
		var u models.User
		if err := db.DB.First(&u, "email = ?", strings.ToLower(strings.TrimSpace(input.FriendEmail))).Error; err == nil {
			friendID = u.ID
		}
	}
	if friendID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "friend_id or friend_email required"})
		return
	}
	var fr models.Friendship
	if err := db.DB.Where(
		"(user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
		userID, friendID, friendID, userID,
	).First(&fr).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "can grant only to your friend"})
		return
	}
	var target models.User
	if err := db.DB.First(&target, "id = ?", friendID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	target.IsAdmin = true
	if err := db.DB.Save(&target).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"granted_to": target.ID})
}
