package router

import (
	"errors"
	"net/http"
	"strings"

	"github.com/dogowner/backend/services"
	"github.com/gin-gonic/gin"
)

var (
	errMissingAuthHeader = errors.New("missing authorization header")
	errInvalidAuthHeader = errors.New("invalid authorization header")
	errInvalidToken      = errors.New("invalid token")
)

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := parseBearerUserID(c.GetHeader("Authorization"))
		if errors.Is(err, errMissingAuthHeader) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
			return
		}
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.Set("user_id", userID)
		c.Next()
	}
}

func optionalAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := parseBearerUserID(c.GetHeader("Authorization"))
		if err == nil && userID != "" {
			c.Set("user_id", userID)
		}
		c.Next()
	}
}

func parseBearerUserID(authHeader string) (string, error) {
	if authHeader == "" {
		return "", errMissingAuthHeader
	}
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return "", errInvalidAuthHeader
	}
	userID, err := services.ParseToken(parts[1])
	if err != nil {
		return "", errInvalidToken
	}
	return userID, nil
}
