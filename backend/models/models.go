package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID        string         `gorm:"primaryKey" json:"id"`
	Email     string         `gorm:"uniqueIndex" json:"email"`
	Name      string         `json:"name"`
	Avatar    string         `json:"avatar,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Pets []Pet `gorm:"foreignKey:OwnerID" json:"pets,omitempty"`
}

type Pet struct {
	ID           string    `gorm:"primaryKey" json:"id"`
	OwnerID      string    `gorm:"index" json:"owner_id"`
	Name         string    `json:"name"`
	Breed        string    `json:"breed"`
	Age          int       `json:"age"`
	Weight       float64   `json:"weight"`
	Photos       string    `json:"photos"` // JSON array of URLs
	Allergies    string    `json:"allergies,omitempty"`
	Vaccinations string    `json:"vaccinations,omitempty"`
	VetContacts  string    `json:"vet_contacts,omitempty"`
	QRCodeData   string    `gorm:"uniqueIndex" json:"qr_code_data"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Walk struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	PetID     string    `gorm:"index" json:"pet_id"`
	Distance  float64   `json:"distance"`  // km
	Duration  int       `json:"duration"`  // minutes
	Calories  int       `json:"calories"`
	Route     string    `json:"route"` // JSON array of {lat, lng}
	StartedAt time.Time `json:"started_at"`
	EndedAt   time.Time `json:"ended_at"`
}

type PlaceCategory string

const (
	PlaceVet      PlaceCategory = "vet"
	PlacePetShop  PlaceCategory = "pet_shop"
	PlaceGroomer  PlaceCategory = "groomer"
	PlacePark     PlaceCategory = "park"
	PlaceCafe     PlaceCategory = "cafe"
)

type Place struct {
	ID        string        `gorm:"primaryKey" json:"id"`
	Name      string        `json:"name"`
	Address   string        `json:"address"`
	Category  PlaceCategory `gorm:"index" json:"category"`
	Latitude  float64       `json:"latitude"`
	Longitude float64       `json:"longitude"`
	Rating    float64       `json:"rating"`
	CreatedAt time.Time     `json:"created_at"`

	Reviews []Review `gorm:"foreignKey:PlaceID" json:"reviews,omitempty"`
}

type Review struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	PlaceID   string    `gorm:"index" json:"place_id"`
	UserID    string    `gorm:"index" json:"user_id"`
	Rating    int       `json:"rating"`
	Text      string    `json:"text"`
	CreatedAt time.Time `json:"created_at"`
}

type WalkStatus string

const (
	StatusLookingForCompany WalkStatus = "looking_for_company"
	StatusTraining          WalkStatus = "training"
	StatusDoNotDisturb      WalkStatus = "do_not_disturb"
)

type UserLocation struct {
	ID          string     `gorm:"primaryKey" json:"id"`
	UserID      string     `gorm:"uniqueIndex" json:"user_id"`
	PetID       string     `json:"pet_id"`
	Latitude    float64    `json:"latitude"`
	Longitude   float64    `json:"longitude"`
	Status      WalkStatus `json:"status"`
	LastUpdated time.Time  `json:"last_updated"`
}

type Friendship struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	UserID    string    `gorm:"index:idx_friendship" json:"user_id"`
	FriendID  string    `gorm:"index:idx_friendship" json:"friend_id"`
	CreatedAt time.Time `json:"created_at"`
}

type FeedPost struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	UserID    string    `gorm:"index" json:"user_id"`
	PetID     string    `json:"pet_id"`
	Text      string    `json:"text"`
	MediaURL  string    `json:"media_url,omitempty"`
	Likes     int       `json:"likes"`
	CreatedAt time.Time `json:"created_at"`
}

type Article struct {
	ID       string    `gorm:"primaryKey" json:"id"`
	Title    string    `json:"title"`
	Content  string    `json:"content"`
	Category string    `gorm:"index" json:"category"`
	Author   string    `json:"author"`
	CreatedAt time.Time `json:"created_at"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	return nil
}

func (p *Pet) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	if p.QRCodeData == "" {
		p.QRCodeData = "pet-" + p.ID
	}
	return nil
}

func (w *Walk) BeforeCreate(tx *gorm.DB) error {
	if w.ID == "" {
		w.ID = uuid.New().String()
	}
	return nil
}

func (pl *Place) BeforeCreate(tx *gorm.DB) error {
	if pl.ID == "" {
		pl.ID = uuid.New().String()
	}
	return nil
}

func (r *Review) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	return nil
}

func (ul *UserLocation) BeforeCreate(tx *gorm.DB) error {
	if ul.ID == "" {
		ul.ID = uuid.New().String()
	}
	return nil
}

func (f *Friendship) BeforeCreate(tx *gorm.DB) error {
	if f.ID == "" {
		f.ID = uuid.New().String()
	}
	return nil
}

func (fp *FeedPost) BeforeCreate(tx *gorm.DB) error {
	if fp.ID == "" {
		fp.ID = uuid.New().String()
	}
	return nil
}

func (a *Article) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	return nil
}
