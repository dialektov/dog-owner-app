package handlers

import (
	"net/http"
	"strings"

	"github.com/dogowner/backend/db"
	"github.com/dogowner/backend/models"
	"github.com/gin-gonic/gin"
)

func GetArticles(c *gin.Context) {
	userID := c.GetString("user_id")
	isAdmin := false
	if userID != "" {
		var u models.User
		if db.DB.First(&u, "id = ?", userID).Error == nil && u.IsAdmin {
			isAdmin = true
		}
	}
	category := c.Query("category")
	status := strings.TrimSpace(c.Query("status"))
	var articles []models.Article
	q := db.DB
	if !isAdmin {
		q = q.Where("status = ?", "published")
	} else if status != "" && status != "all" {
		q = q.Where("status = ?", status)
	}
	if category != "" {
		q = q.Where("category = ?", category)
	}
	if err := q.Order("created_at DESC").Find(&articles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, articles)
}

func GetArticle(c *gin.Context) {
	id := c.Param("id")
	var article models.Article
	if err := db.DB.First(&article, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "article not found"})
		return
	}
	c.JSON(http.StatusOK, article)
}

func SubmitArticle(c *gin.Context) {
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
	var input struct {
		Title    string `json:"title" binding:"required"`
		Content  string `json:"content" binding:"required"`
		Category string `json:"category" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	article := models.Article{
		Title:       strings.TrimSpace(input.Title),
		Content:     strings.TrimSpace(input.Content),
		Category:    strings.TrimSpace(input.Category),
		Author:      user.Name,
		Status:      "pending",
		SubmittedBy: userID,
	}
	if user.IsAdmin {
		article.Status = "published"
		article.ApprovedBy = userID
	}
	if err := db.DB.Create(&article).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, article)
}

func ModerateArticle(c *gin.Context) {
	userID := c.GetString("user_id")
	var admin models.User
	if err := db.DB.First(&admin, "id = ?", userID).Error; err != nil || !admin.IsAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin required"})
		return
	}
	id := c.Param("id")
	var input struct {
		Action string `json:"action" binding:"required"` // approve, reject
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var article models.Article
	if err := db.DB.First(&article, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "article not found"})
		return
	}
	switch strings.ToLower(strings.TrimSpace(input.Action)) {
	case "approve":
		article.Status = "published"
	case "reject":
		article.Status = "rejected"
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid action"})
		return
	}
	article.ApprovedBy = userID
	if err := db.DB.Save(&article).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, article)
}

func DeleteArticle(c *gin.Context) {
	userID := c.GetString("user_id")
	var admin models.User
	if err := db.DB.First(&admin, "id = ?", userID).Error; err != nil || !admin.IsAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin required"})
		return
	}
	id := c.Param("id")
	if err := db.DB.Delete(&models.Article{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"deleted": id})
}
