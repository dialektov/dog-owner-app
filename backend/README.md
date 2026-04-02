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

### Авторизация
- `POST /api/v1/auth/register` — регистрация (email, name, password)
- `POST /api/v1/auth/login` — вход (email, password)
- `GET /api/v1/auth/me` — текущий профиль (Bearer token)

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
- `GET /api/v1/places/search?lat=55.75&lng=37.61&radius_km=3&limit=30&save=true` — **онлайн**-поиск мест: сначала OpenStreetMap (Overpass, без ключа), при пустом результате и наличии `YANDEX_MAPS_API_KEY` — дополнительно Яндекс; кэш для этого запроса не используется
- `GET /api/v1/places/:id` — место с отзывами
- `POST /api/v1/places` — добавить место
- `POST /api/v1/places/:id/reviews` — оставить отзыв

### Умная карта
- `GET /api/v1/map/users` — локации пользователей
- `PUT /api/v1/map/me` — обновить свою локацию

### Lost & Found
- `GET /api/v1/lost?status=active` — список объявлений о пропавших питомцах
- `POST /api/v1/lost` — создать объявление «потерялся питомец»
- `PUT /api/v1/lost/:id/found` — отметить питомца найденным

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

## Внешние API

Для автопоиска мест по Яндекс Картам задайте переменную окружения:

```bash
set YANDEX_MAPS_API_KEY=ваш_ключ
```

Или добавьте в `.env` (в `backend/.env` или в корне проекта):

```env
YANDEX_MAPS_API_KEY=ваш_ключ
```

Без ключа Яндекса поиск всё равно работает через OpenStreetMap. Ключ нужен только как дополнительный источник, если в зоне нет данных в OSM.

Для авторизации задайте (рекомендуется в production):

```bash
set JWT_SECRET=очень_сложный_секрет
```

## Нефункциональные улучшения

- Добавлен простой rate limit middleware: до 120 запросов в минуту на IP (429 при превышении).
- Для клиентских API-запросов добавлены таймаут и повторная попытка при временных сетевых сбоях.

## Демо-данные

```bash
go run ./cmd/seed
```
