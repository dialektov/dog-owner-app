package handlers

import (
	"net/http"
	"strconv"

	"github.com/dogowner/backend/db"
	"github.com/dogowner/backend/models"
	"github.com/dogowner/backend/services"
	"github.com/gin-gonic/gin"
)

func GetPlaces(c *gin.Context) {
	category := c.Query("category")
	var places []models.Place
	q := db.DB
	if category != "" {
		q = q.Where("category = ?", category)
	}
	if err := q.Preload("Reviews").Find(&places).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, places)
}

func GetPlace(c *gin.Context) {
	id := c.Param("id")
	var place models.Place
	if err := db.DB.Preload("Reviews").First(&place, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "place not found"})
		return
	}
	c.JSON(http.StatusOK, place)
}

func CreatePlace(c *gin.Context) {
	var input models.Place
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

func CreateReview(c *gin.Context) {
	placeID := c.Param("id")
	var input models.Review
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	input.PlaceID = placeID
	if err := db.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, input)
}

func SearchPlaces(c *gin.Context) {
	lat, err := strconv.ParseFloat(c.Query("lat"), 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid lat"})
		return
	}
	lng, err := strconv.ParseFloat(c.Query("lng"), 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid lng"})
		return
	}

	radiusKm := 3.0
	if v := c.Query("radius_km"); v != "" {
		if parsed, parseErr := strconv.ParseFloat(v, 64); parseErr == nil && parsed > 0 {
			radiusKm = parsed
		}
	}
	limit := 30
	if v := c.Query("limit"); v != "" {
		if parsed, parseErr := strconv.Atoi(v); parseErr == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}
	save := c.DefaultQuery("save", "true") != "false"

	places, err := services.SearchNearbyDogFriendly(lat, lng, radiusKm, limit)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}

	if save {
		for i := range places {
			var existing models.Place
			findErr := db.DB.Where("name = ? AND address = ?", places[i].Name, places[i].Address).First(&existing).Error
			if findErr == nil {
				existing.Category = places[i].Category
				existing.Latitude = places[i].Latitude
				existing.Longitude = places[i].Longitude
				if existing.Rating == 0 {
					existing.Rating = places[i].Rating
				}
				_ = db.DB.Save(&existing).Error
				places[i] = existing
				continue
			}
			_ = db.DB.Create(&places[i]).Error
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"count":  len(places),
		"saved":  save,
		"places": places,
	})
}
