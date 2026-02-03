package router

import (
	"github.com/dogowner/backend/config"
	"github.com/dogowner/backend/handlers"
	"github.com/gin-gonic/gin"
)

func Setup(cfg *config.Config) *gin.Engine {
	r := gin.Default()

	r.Use(gin.Logger())
	r.Use(corsMiddleware())

	api := r.Group("/api/v1")
	{
		// Users
		api.GET("/users/:id", handlers.GetUser)
		api.POST("/users", handlers.CreateUser)

		// Pets
		api.GET("/pets/:id", handlers.GetPet)
		api.GET("/pets/qr/:qr", handlers.GetPetByQR)
		api.POST("/pets", handlers.CreatePet)
		api.PUT("/pets/:id", handlers.UpdatePet)

		// Walks
		api.GET("/pets/:petId/walks", handlers.GetWalks)
		api.POST("/walks", handlers.CreateWalk)

		// Places
		api.GET("/places", handlers.GetPlaces)
		api.GET("/places/:id", handlers.GetPlace)
		api.POST("/places", handlers.CreatePlace)
		api.POST("/places/:id/reviews", handlers.CreateReview)

		// Smart map - user locations
		api.GET("/map/users", handlers.GetUserLocations)
		api.PUT("/map/me", handlers.UpdateMyLocation)

		// Friends
		api.GET("/users/:id/friends", handlers.GetFriends)
		api.POST("/friends", handlers.AddFriend)

		// Feed
		api.GET("/feed", handlers.GetFeed)
		api.POST("/feed", handlers.CreateFeedPost)

		// Encyclopedia
		api.GET("/articles", handlers.GetArticles)
		api.GET("/articles/:id", handlers.GetArticle)
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
