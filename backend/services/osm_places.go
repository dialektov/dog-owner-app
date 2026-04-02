package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/dogowner/backend/models"
)

type overpassResponse struct {
	Elements []struct {
		Type   string            `json:"type"`
		ID     int64             `json:"id"`
		Lat    float64           `json:"lat"`
		Lon    float64           `json:"lon"`
		Center *overpassPoint    `json:"center"`
		Tags   map[string]string `json:"tags"`
	} `json:"elements"`
}

type overpassPoint struct {
	Lat float64 `json:"lat"`
	Lon float64 `json:"lon"`
}

// Public Overpass API mirrors (online-only; no API key).
var overpassEndpoints = []string{
	"https://overpass-api.de/api/interpreter",
	"https://overpass.kumi.systems/api/interpreter",
	"https://overpass.openstreetmap.ru/cgi/interpreter",
}

func SearchNearbyOpenStreetMap(lat, lng, radiusKm float64, limit int, categories []models.PlaceCategory) ([]models.Place, error) {
	query, err := buildOverpassQuery(lat, lng, radiusKm, limit, categories)
	if err != nil {
		return nil, err
	}

	var lastErr error
	for _, endpoint := range overpassEndpoints {
		for attempt := 0; attempt < 2; attempt++ {
			places, err := postOverpass(endpoint, query, limit, categories)
			if err == nil {
				return places, nil
			}
			lastErr = err
			time.Sleep(200 * time.Millisecond)
		}
	}
	if lastErr != nil {
		return nil, fmt.Errorf("overpass: all mirrors failed: %w", lastErr)
	}
	return nil, fmt.Errorf("overpass: no endpoints configured")
}

func buildOverpassQuery(lat, lng float64, radiusKm float64, limit int, categories []models.PlaceCategory) (string, error) {
	if radiusKm <= 0 {
		radiusKm = 3
	}
	if limit <= 0 {
		limit = 30
	}
	radiusMeters := int(radiusKm * 1000)
	if radiusMeters < 200 {
		radiusMeters = 200
	}

	parts := make([]string, 0, 16)
	for _, c := range categories {
		switch c {
		case models.PlaceVet:
			parts = append(parts,
				fmt.Sprintf(`node["amenity"="veterinary"](around:%d,%.6f,%.6f);`, radiusMeters, lat, lng),
				fmt.Sprintf(`way["amenity"="veterinary"](around:%d,%.6f,%.6f);`, radiusMeters, lat, lng),
				fmt.Sprintf(`relation["amenity"="veterinary"](around:%d,%.6f,%.6f);`, radiusMeters, lat, lng),
			)
		case models.PlacePetShop:
			parts = append(parts,
				fmt.Sprintf(`node["shop"="pet"](around:%d,%.6f,%.6f);`, radiusMeters, lat, lng),
				fmt.Sprintf(`way["shop"="pet"](around:%d,%.6f,%.6f);`, radiusMeters, lat, lng),
				fmt.Sprintf(`relation["shop"="pet"](around:%d,%.6f,%.6f);`, radiusMeters, lat, lng),
			)
		case models.PlaceGroomer:
			parts = append(parts,
				fmt.Sprintf(`node["shop"="pet_grooming"](around:%d,%.6f,%.6f);`, radiusMeters, lat, lng),
				fmt.Sprintf(`way["shop"="pet_grooming"](around:%d,%.6f,%.6f);`, radiusMeters, lat, lng),
				fmt.Sprintf(`relation["shop"="pet_grooming"](around:%d,%.6f,%.6f);`, radiusMeters, lat, lng),
				fmt.Sprintf(`node["craft"="pet_grooming"](around:%d,%.6f,%.6f);`, radiusMeters, lat, lng),
			)
		case models.PlacePark:
			parts = append(parts,
				fmt.Sprintf(`node["leisure"="park"](around:%d,%.6f,%.6f);`, radiusMeters, lat, lng),
				fmt.Sprintf(`way["leisure"="park"](around:%d,%.6f,%.6f);`, radiusMeters, lat, lng),
				fmt.Sprintf(`relation["leisure"="park"](around:%d,%.6f,%.6f);`, radiusMeters, lat, lng),
				fmt.Sprintf(`node["leisure"="dog_park"](around:%d,%.6f,%.6f);`, radiusMeters, lat, lng),
				fmt.Sprintf(`way["leisure"="dog_park"](around:%d,%.6f,%.6f);`, radiusMeters, lat, lng),
			)
		}
	}
	if len(parts) == 0 {
		return "", fmt.Errorf("no categories for overpass query")
	}

	return fmt.Sprintf("[out:json][timeout:18];(%s);out center tags;", strings.Join(parts, "")), nil
}

func postOverpass(endpoint, query string, limit int, categories []models.PlaceCategory) ([]models.Place, error) {
	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewBufferString(query))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "text/plain; charset=utf-8")
	req.Header.Set("User-Agent", "DogPaw/1.0")

	client := &http.Client{Timeout: 32 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("status %d", resp.StatusCode)
	}

	var data overpassResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	seen := map[string]bool{}
	places := make([]models.Place, 0, limit)
	for _, el := range data.Elements {
		name := strings.TrimSpace(el.Tags["name"])
		if name == "" {
			continue
		}

		pLat, pLon := el.Lat, el.Lon
		if el.Center != nil {
			pLat, pLon = el.Center.Lat, el.Center.Lon
		}
		if pLat == 0 && pLon == 0 {
			continue
		}

		category, ok := categoryFromOSMTags(el.Tags)
		if !ok || !containsCategory(categories, category) {
			continue
		}

		address := osmAddress(el.Tags)
		key := strings.ToLower(strings.TrimSpace(name + "|" + address))
		if seen[key] {
			continue
		}
		seen[key] = true

		places = append(places, models.Place{
			ID:        fmt.Sprintf("osm-%s-%d", el.Type, el.ID),
			Name:      name,
			Address:   address,
			Category:  category,
			Latitude:  pLat,
			Longitude: pLon,
			Rating:    0,
		})
		if len(places) >= limit {
			break
		}
	}

	return places, nil
}

func categoryFromOSMTags(tags map[string]string) (models.PlaceCategory, bool) {
	switch {
	case tags["amenity"] == "veterinary":
		return models.PlaceVet, true
	case tags["shop"] == "pet":
		return models.PlacePetShop, true
	case tags["shop"] == "pet_grooming" || tags["craft"] == "pet_grooming":
		return models.PlaceGroomer, true
	case tags["leisure"] == "park" || tags["leisure"] == "dog_park":
		return models.PlacePark, true
	}
	return "", false
}

func containsCategory(categories []models.PlaceCategory, target models.PlaceCategory) bool {
	for _, c := range categories {
		if c == target {
			return true
		}
	}
	return false
}

func osmAddress(tags map[string]string) string {
	parts := make([]string, 0, 3)
	if street := strings.TrimSpace(tags["addr:street"]); street != "" {
		if house := strings.TrimSpace(tags["addr:housenumber"]); house != "" {
			parts = append(parts, street+" "+house)
		} else {
			parts = append(parts, street)
		}
	}
	if city := strings.TrimSpace(tags["addr:city"]); city != "" {
		parts = append(parts, city)
	}
	if len(parts) == 0 {
		if v := strings.TrimSpace(tags["addr:full"]); v != "" {
			return v
		}
		return ""
	}
	return strings.Join(parts, ", ")
}
