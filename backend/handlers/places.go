package handlers

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/dogowner/backend/db"
	"github.com/dogowner/backend/models"
	"github.com/dogowner/backend/services"
	"github.com/gin-gonic/gin"
)

type placesSearchCacheEntry struct {
	places  []models.Place
	source  string
	expires time.Time
}

var (
	placesSearchCacheMu sync.RWMutex
	placesSearchCache   = make(map[string]placesSearchCacheEntry)
	placesSearchTTL     = 5 * time.Minute
)

func placesSearchCacheKey(lat, lng, radiusKm float64, limit int, categories []models.PlaceCategory, save bool) string {
	var b strings.Builder
	fmt.Fprintf(&b, "%.3f|%.3f|%.1f|%d|%t|", lat, lng, radiusKm, limit, save)
	for _, c := range categories {
		b.WriteString(string(c))
		b.WriteByte('|')
	}
	return b.String()
}

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

// SearchPlaces: при наличии YANDEX_MAPS_API_KEY сначала Яндекс (параллельные запросы), иначе или при пустом ответе — Overpass OSM.
// Кэш в памяти ~5 мин на ключ области. Офлайн-кэша в БД для этого запроса нет.
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
	categories := []models.PlaceCategory{models.PlaceVet, models.PlacePetShop, models.PlaceGroomer, models.PlacePark}
	if raw := strings.TrimSpace(c.Query("categories")); raw != "" {
		parts := strings.Split(raw, ",")
		filtered := make([]models.PlaceCategory, 0, len(parts))
		for _, p := range parts {
			switch models.PlaceCategory(strings.TrimSpace(p)) {
			case models.PlaceVet, models.PlacePetShop, models.PlaceGroomer, models.PlacePark:
				filtered = append(filtered, models.PlaceCategory(strings.TrimSpace(p)))
			}
		}
		if len(filtered) > 0 {
			categories = filtered
		}
	}

	cacheKey := placesSearchCacheKey(lat, lng, radiusKm, limit, categories, save)
	placesSearchCacheMu.RLock()
	ent, cacheHit := placesSearchCache[cacheKey]
	placesSearchCacheMu.RUnlock()
	if cacheHit && time.Now().Before(ent.expires) {
		c.JSON(http.StatusOK, gin.H{
			"count":  len(ent.places),
			"saved":  save,
			"places": ent.places,
			"source": ent.source,
			"online": true,
			"cached": true,
		})
		return
	}

	var places []models.Place
	source := "openstreetmap"

	hasYandex := strings.TrimSpace(os.Getenv("YANDEX_MAPS_API_KEY")) != ""
	if hasYandex {
		yPlaces, yErr := services.SearchNearbyDogFriendly(lat, lng, radiusKm, limit, categories)
		if yErr == nil && len(yPlaces) > 0 {
			places = yPlaces
			source = "yandex"
		}
	}
	if len(places) == 0 {
		osmPlaces, osmErr := services.SearchNearbyOpenStreetMap(lat, lng, radiusKm, limit, categories)
		if osmErr != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": osmErr.Error()})
			return
		}
		places = osmPlaces
		source = "openstreetmap"
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
			if strings.HasPrefix(places[i].ID, "osm-") {
				places[i].ID = ""
			}
			_ = db.DB.Create(&places[i]).Error
		}
	}

	placesSearchCacheMu.Lock()
	placesSearchCache[cacheKey] = placesSearchCacheEntry{
		places:  places,
		source:  source,
		expires: time.Now().Add(placesSearchTTL),
	}
	if len(placesSearchCache) > 400 {
		placesSearchCache = make(map[string]placesSearchCacheEntry)
	}
	placesSearchCacheMu.Unlock()

	c.JSON(http.StatusOK, gin.H{
		"count":  len(places),
		"saved":  save,
		"places": places,
		"source": source,
		"online": true,
		"cached": false,
	})
}
