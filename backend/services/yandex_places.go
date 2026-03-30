package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/dogowner/backend/models"
)

type yandexSearchResponse struct {
	Features []struct {
		Geometry struct {
			Coordinates []float64 `json:"coordinates"`
		} `json:"geometry"`
		Properties struct {
			Name            string `json:"name"`
			Description     string `json:"description"`
			CompanyMetaData struct {
				Name       string           `json:"name"`
				Categories []yandexCategory `json:"Categories"`
			} `json:"CompanyMetaData"`
		} `json:"properties"`
	} `json:"features"`
}

type yandexCategory struct {
	Name string `json:"name"`
}

func SearchNearbyDogFriendly(lat, lng float64, radiusKm float64, limit int) ([]models.Place, error) {
	apiKey := os.Getenv("YANDEX_MAPS_API_KEY")
	if apiKey == "" {
		return nil, errors.New("YANDEX_MAPS_API_KEY is not set")
	}
	if radiusKm <= 0 {
		radiusKm = 3
	}
	if limit <= 0 {
		limit = 30
	}

	queries := []string{
		"ветклиника",
		"зоомагазин",
		"парк для собак",
		"площадка для выгула собак",
		"dog friendly cafe",
		"груминг собак",
	}

	seen := map[string]bool{}
	places := make([]models.Place, 0, limit)

	for _, q := range queries {
		found, err := searchYandex(apiKey, q, lat, lng, radiusKm, limit)
		if err != nil {
			return nil, err
		}
		for _, p := range found {
			key := strings.ToLower(strings.TrimSpace(p.Name + "|" + p.Address))
			if key == "|" || seen[key] {
				continue
			}
			seen[key] = true
			places = append(places, p)
			if len(places) >= limit {
				return places, nil
			}
		}
	}

	return places, nil
}

func searchYandex(apiKey, query string, lat, lng float64, radiusKm float64, limit int) ([]models.Place, error) {
	u, err := url.Parse("https://search-maps.yandex.ru/v1/")
	if err != nil {
		return nil, err
	}

	spnLat := radiusKm / 111.0
	cosLat := math.Cos(lat * math.Pi / 180)
	if cosLat == 0 {
		cosLat = 0.0001
	}
	spnLng := radiusKm / (111.0 * cosLat)

	params := url.Values{}
	params.Set("apikey", apiKey)
	params.Set("text", query)
	params.Set("lang", "ru_RU")
	params.Set("type", "biz")
	params.Set("results", strconv.Itoa(limit))
	params.Set("ll", fmt.Sprintf("%.6f,%.6f", lng, lat))
	params.Set("spn", fmt.Sprintf("%.6f,%.6f", spnLng, spnLat))
	params.Set("rspn", "1")
	u.RawQuery = params.Encode()

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(u.String())
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("yandex api returned status %d", resp.StatusCode)
	}

	var data yandexSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	places := make([]models.Place, 0, len(data.Features))
	for _, f := range data.Features {
		if len(f.Geometry.Coordinates) < 2 {
			continue
		}
		lon := f.Geometry.Coordinates[0]
		latVal := f.Geometry.Coordinates[1]
		name := strings.TrimSpace(f.Properties.CompanyMetaData.Name)
		if name == "" {
			name = strings.TrimSpace(f.Properties.Name)
		}
		if name == "" {
			continue
		}
		address := strings.TrimSpace(f.Properties.Description)
		category := detectCategory(query, f.Properties.CompanyMetaData.Categories)
		places = append(places, models.Place{
			Name:      name,
			Address:   address,
			Category:  category,
			Latitude:  latVal,
			Longitude: lon,
			Rating:    4.0,
		})
	}

	return places, nil
}

func detectCategory(query string, categories []yandexCategory) models.PlaceCategory {
	q := strings.ToLower(query)
	if strings.Contains(q, "вет") {
		return models.PlaceVet
	}
	if strings.Contains(q, "зоомагазин") {
		return models.PlacePetShop
	}
	if strings.Contains(q, "грум") {
		return models.PlaceGroomer
	}
	if strings.Contains(q, "cafe") || strings.Contains(q, "кафе") {
		return models.PlaceCafe
	}
	for _, c := range categories {
		n := strings.ToLower(c.Name)
		switch {
		case strings.Contains(n, "вет"):
			return models.PlaceVet
		case strings.Contains(n, "зоомагаз"):
			return models.PlacePetShop
		case strings.Contains(n, "грум"):
			return models.PlaceGroomer
		case strings.Contains(n, "кафе"), strings.Contains(n, "ресторан"):
			return models.PlaceCafe
		case strings.Contains(n, "парк"):
			return models.PlacePark
		}
	}
	return models.PlacePark
}
