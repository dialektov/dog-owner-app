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
	"sync"
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

func SearchNearbyDogFriendly(lat, lng float64, radiusKm float64, limit int, categories []models.PlaceCategory) ([]models.Place, error) {
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

	queries := make([]string, 0, 6)
	for _, c := range categories {
		switch c {
		case models.PlaceVet:
			queries = append(queries, "ветклиника")
		case models.PlacePetShop:
			queries = append(queries, "зоомагазин")
		case models.PlaceGroomer:
			queries = append(queries, "груминг собак")
		case models.PlacePark:
			queries = append(queries, "парк для собак", "площадка для выгула собак")
		}
	}
	if len(queries) == 0 {
		queries = []string{"ветклиника", "зоомагазин", "груминг собак", "парк для собак"}
	}

	seen := map[string]bool{}
	var placesMu sync.Mutex
	places := make([]models.Place, 0, limit)
	var wg sync.WaitGroup
	var errOnce sync.Once
	var firstErr error

	for _, q := range queries {
		q := q
		wg.Add(1)
		go func() {
			defer wg.Done()
			found, err := searchYandex(apiKey, q, lat, lng, radiusKm, limit)
			if err != nil {
				errOnce.Do(func() { firstErr = err })
				return
			}
			placesMu.Lock()
			defer placesMu.Unlock()
			for _, p := range found {
				key := strings.ToLower(strings.TrimSpace(p.Name + "|" + p.Address))
				if key == "|" || seen[key] {
					continue
				}
				seen[key] = true
				places = append(places, p)
				if len(places) >= limit {
					return
				}
			}
		}()
	}
	wg.Wait()

	if len(places) > limit {
		places = places[:limit]
	}
	if len(places) == 0 && firstErr != nil {
		return nil, firstErr
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

	client := &http.Client{Timeout: 25 * time.Second}
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
		category, ok := detectCategory(query, name, address, f.Properties.CompanyMetaData.Categories)
		if !ok {
			continue
		}
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

func detectCategory(query, name, address string, categories []yandexCategory) (models.PlaceCategory, bool) {
	q := strings.ToLower(query)
	nm := strings.ToLower(name + " " + address)
	if strings.Contains(q, "вет") {
		return models.PlaceVet, true
	}
	if strings.Contains(q, "зоомагазин") {
		return models.PlacePetShop, true
	}
	if strings.Contains(q, "грум") {
		return models.PlaceGroomer, true
	}
	for _, c := range categories {
		n := strings.ToLower(c.Name)
		switch {
		case strings.Contains(n, "вет"):
			return models.PlaceVet, true
		case strings.Contains(n, "зоомагаз"):
			return models.PlacePetShop, true
		case strings.Contains(n, "грум"):
			return models.PlaceGroomer, true
		case strings.Contains(n, "парк"):
			return models.PlacePark, true
		}
	}
	if strings.Contains(nm, "парк") || strings.Contains(nm, "сквер") || strings.Contains(nm, "площадка для выгула") {
		return models.PlacePark, true
	}
	return "", false
}
