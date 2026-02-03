package main

import (
	"log"

	"github.com/dogowner/backend/db"
	"github.com/dogowner/backend/models"
)

func main() {
	if err := db.Init("./data/dogowner.db"); err != nil {
		log.Fatal(err)
	}

	// Demo user
	u := models.User{ID: "user-demo", Email: "demo@dogpaw.app", Name: "Демо Пользователь"}
	db.DB.Save(&u)

	// Demo pet
	p := models.Pet{
		OwnerID:      u.ID,
		Name:         "Барсик",
		Breed:        "Лабрадор",
		Age:          3,
		Weight:       28,
		Allergies:    "Курица",
		Vaccinations: "Все прививки актуальны",
		VetContacts:  "+7 (999) 123-45-67",
		QRCodeData:   "pet-dogowner-001",
	}
	db.DB.Save(&p)

	// Demo places
	places := []models.Place{
		{Name: "Ветклиника Друг", Address: "ул. Примерная, 1", Category: models.PlaceVet, Latitude: 55.7558, Longitude: 37.6173, Rating: 4.5},
		{Name: "Парк Собачий", Address: "ул. Парковая, 5", Category: models.PlacePark, Latitude: 55.7620, Longitude: 37.6150, Rating: 4.8},
		{Name: "Зоомагазин Лапа", Address: "ул. Зоологическая, 10", Category: models.PlacePetShop, Latitude: 55.7580, Longitude: 37.6120, Rating: 4.2},
	}
	for _, pl := range places {
		db.DB.Save(&pl)
	}

	// Demo articles
	articles := []models.Article{
		{Title: "Как приучить щенка к туалету", Content: "Статья о приучении...", Category: "Воспитание", Author: "Ветеринар"},
		{Title: "Уход за шерстью", Content: "Советы по грумингу...", Category: "Уход", Author: "Грумер"},
		{Title: "Когда делать прививки", Content: "График прививок...", Category: "Здоровье", Author: "Ветеринар"},
	}
	for _, a := range articles {
		db.DB.Save(&a)
	}

	log.Println("Seed completed")
}
