# DogPaw Backend (Go)

REST API для приложения DogPaw.

## Запуск

```bash
cd backend
go mod tidy
go run .
```

Сервер будет доступен на `http://localhost:8080`.

## API Endpoints

### Пользователи
- `GET /api/v1/users/:id` — получить пользователя
- `POST /api/v1/users` — создать пользователя

### Питомцы
- `GET /api/v1/pets/:id` — получить питомца
- `GET /api/v1/pets/qr/:qr` — получить питомца по QR-коду
- `POST /api/v1/pets` — создать питомца
- `PUT /api/v1/pets/:id` — обновить питомца

### Прогулки
- `GET /api/v1/pets/:petId/walks` — история прогулок
- `POST /api/v1/walks` — создать запись о прогулке

### Места
- `GET /api/v1/places?category=vet` — список мест
- `GET /api/v1/places/:id` — место с отзывами
- `POST /api/v1/places` — добавить место
- `POST /api/v1/places/:id/reviews` — оставить отзыв

### Умная карта
- `GET /api/v1/map/users` — локации пользователей
- `PUT /api/v1/map/me` — обновить свою локацию

### Друзья
- `GET /api/v1/users/:id/friends` — список друзей
- `POST /api/v1/friends` — добавить друга

### Лента
- `GET /api/v1/feed` — лента постов
- `POST /api/v1/feed` — создать пост

### Энциклопедия
- `GET /api/v1/articles?category=Здоровье` — статьи
- `GET /api/v1/articles/:id` — статья

## База данных

По умолчанию используется SQLite (`./data/dogowner.db`). Для PostgreSQL можно заменить драйвер в `db/db.go`.

## Демо-данные

```bash
go run ./cmd/seed
```
