package handlers

import (
	"net/http"
	"strings"

	"github.com/dogowner/backend/db"
	"github.com/dogowner/backend/models"
	"github.com/gin-gonic/gin"
)

type FeedPostResponse struct {
	ID            string                `json:"id"`
	UserID        string                `json:"user_id"`
	AuthorName    string                `json:"author_name"`
	PetID         string                `json:"pet_id"`
	Text          string                `json:"text"`
	MediaURL      string                `json:"media_url,omitempty"`
	Likes         int                   `json:"likes"`
	CommentsCount int                   `json:"comments_count"`
	Comments      []FeedCommentResponse `json:"comments"`
	CreatedAt     string                `json:"created_at"`
}

type FeedCommentResponse struct {
	ID         string `json:"id"`
	UserID     string `json:"user_id"`
	AuthorName string `json:"author_name"`
	Text       string `json:"text"`
	CreatedAt  string `json:"created_at"`
}

func GetFeed(c *gin.Context) {
	var posts []models.FeedPost
	if err := db.DB.Order("created_at DESC").Limit(100).Find(&posts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	out := make([]FeedPostResponse, 0, len(posts))
	for _, p := range posts {
		var author models.User
		_ = db.DB.First(&author, "id = ?", p.UserID).Error
		var comments []models.FeedComment
		_ = db.DB.Where("post_id = ?", p.ID).Order("created_at ASC").Find(&comments).Error
		commentResp := make([]FeedCommentResponse, 0, len(comments))
		for _, cm := range comments {
			var cu models.User
			_ = db.DB.First(&cu, "id = ?", cm.UserID).Error
			commentResp = append(commentResp, FeedCommentResponse{
				ID:         cm.ID,
				UserID:     cm.UserID,
				AuthorName: cu.Name,
				Text:       cm.Text,
				CreatedAt:  cm.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			})
		}
		out = append(out, FeedPostResponse{
			ID:            p.ID,
			UserID:        p.UserID,
			AuthorName:    author.Name,
			PetID:         p.PetID,
			Text:          p.Text,
			MediaURL:      p.MediaURL,
			Likes:         p.Likes,
			CommentsCount: len(commentResp),
			Comments:      commentResp,
			CreatedAt:     p.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}
	sortMode := strings.ToLower(strings.TrimSpace(c.DefaultQuery("sort", "interesting")))
	switch sortMode {
	case "new", "newest":
		// already sorted by created_at desc from query
	case "likes":
		sortFeed(out, func(a, b FeedPostResponse) bool { return a.Likes > b.Likes })
	case "comments":
		sortFeed(out, func(a, b FeedPostResponse) bool { return a.CommentsCount > b.CommentsCount })
	default: // interesting
		sortFeed(out, func(a, b FeedPostResponse) bool {
			ai := a.Likes*3 + a.CommentsCount*2
			bi := b.Likes*3 + b.CommentsCount*2
			if ai == bi {
				return a.CreatedAt > b.CreatedAt
			}
			return ai > bi
		})
	}
	c.JSON(http.StatusOK, out)
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

func ToggleFeedLike(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	postID := c.Param("id")
	var post models.FeedPost
	if err := db.DB.First(&post, "id = ?", postID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
		return
	}
	var existing models.FeedLike
	if err := db.DB.Where("post_id = ? AND user_id = ?", postID, userID).First(&existing).Error; err == nil {
		_ = db.DB.Delete(&existing).Error
		if post.Likes > 0 {
			post.Likes--
			_ = db.DB.Save(&post).Error
		}
		c.JSON(http.StatusOK, gin.H{"liked": false, "likes": post.Likes})
		return
	}
	like := models.FeedLike{PostID: postID, UserID: userID}
	if err := db.DB.Create(&like).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	post.Likes++
	_ = db.DB.Save(&post).Error
	c.JSON(http.StatusOK, gin.H{"liked": true, "likes": post.Likes})
}

func AddFeedComment(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	postID := c.Param("id")
	var input struct {
		Text string `json:"text" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var post models.FeedPost
	if err := db.DB.First(&post, "id = ?", postID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
		return
	}
	comment := models.FeedComment{PostID: postID, UserID: userID, Text: strings.TrimSpace(input.Text)}
	if err := db.DB.Create(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, comment)
}

func DeleteFeedPost(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	var u models.User
	if err := db.DB.First(&u, "id = ?", userID).Error; err != nil || !u.IsAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin required"})
		return
	}
	postID := c.Param("id")
	_ = db.DB.Where("post_id = ?", postID).Delete(&models.FeedLike{}).Error
	_ = db.DB.Where("post_id = ?", postID).Delete(&models.FeedComment{}).Error
	if err := db.DB.Delete(&models.FeedPost{}, "id = ?", postID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"deleted": postID})
}

func sortFeed(items []FeedPostResponse, less func(a, b FeedPostResponse) bool) {
	for i := 0; i < len(items); i++ {
		for j := i + 1; j < len(items); j++ {
			if !less(items[i], items[j]) {
				items[i], items[j] = items[j], items[i]
			}
		}
	}
}
