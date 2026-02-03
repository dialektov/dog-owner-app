package handlers

import (
	"net/http"

	"github.com/dogowner/backend/db"
	"github.com/dogowner/backend/models"
	"github.com/gin-gonic/gin"
)

func GetArticles(c *gin.Context) {
	category := c.Query("category")
	var articles []models.Article
	q := db.DB
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
