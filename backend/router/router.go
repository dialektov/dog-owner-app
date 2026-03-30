package router

import (
	"sync"
	"time"

	"github.com/dogowner/backend/config"
	"github.com/dogowner/backend/handlers"
	"github.com/gin-gonic/gin"
)

func Setup(cfg *config.Config) *gin.Engine {
	r := gin.Default()

	r.Use(gin.Logger())
	r.Use(corsMiddleware())
	r.Use(rateLimitMiddleware())

	api := r.Group("/api/v1")
	{
		// Auth
		api.POST("/auth/register", handlers.Register)
		api.POST("/auth/login", handlers.Login)

		// Users
		api.GET("/users/:id", handlers.GetUser)
		api.POST("/users", handlers.CreateUser) // legacy endpoint

		// Pets
		api.GET("/pets/:id", handlers.GetPet)
		api.GET("/pets/qr/:qr", handlers.GetPetByQR)
		api.POST("/pets", handlers.CreatePet)
		api.PUT("/pets/:id", handlers.UpdatePet)

		// Walks
		api.GET("/pets/:id/walks", handlers.GetWalks)
		api.POST("/walks", handlers.CreateWalk)

		// Places
		api.GET("/places", handlers.GetPlaces)
		api.GET("/places/search", handlers.SearchPlaces)
		api.GET("/places/:id", handlers.GetPlace)
		api.POST("/places", handlers.CreatePlace)
		api.POST("/places/:id/reviews", handlers.CreateReview)

		// Smart map - user locations
		api.GET("/map/users", handlers.GetUserLocations)
		api.PUT("/map/me", authMiddleware(), handlers.UpdateMyLocation)

		// Friends
		api.GET("/users/:id/friends", handlers.GetFriends)
		api.POST("/friends", authMiddleware(), handlers.AddFriend)

		// Feed
		api.GET("/feed", handlers.GetFeed)
		api.POST("/feed", authMiddleware(), handlers.CreateFeedPost)

		// Encyclopedia
		api.GET("/articles", handlers.GetArticles)
		api.GET("/articles/:id", handlers.GetArticle)

		// Lost & Found
		api.GET("/lost", handlers.GetLostAlerts)
		api.POST("/lost", authMiddleware(), handlers.CreateLostAlert)
		api.PUT("/lost/:id/found", authMiddleware(), handlers.MarkLostAlertFound)

		// Session
		api.GET("/auth/me", authMiddleware(), handlers.Me)
	}

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	return r
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

func rateLimitMiddleware() gin.HandlerFunc {
	const maxPerMinute = 120
	type entry struct {
		count  int
		window time.Time
	}
	var (
		mu    sync.Mutex
		store = map[string]entry{}
	)
	return func(c *gin.Context) {
		ip := c.ClientIP()
		now := time.Now()
		window := now.Truncate(time.Minute)

		mu.Lock()
		e := store[ip]
		if e.window != window {
			e = entry{count: 0, window: window}
		}
		e.count++
		store[ip] = e
		mu.Unlock()

		if e.count > maxPerMinute {
			c.AbortWithStatusJSON(429, gin.H{"error": "too many requests"})
			return
		}
		c.Next()
	}
}
