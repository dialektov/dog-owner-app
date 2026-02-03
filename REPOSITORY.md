# Пошаговая инструкция по работе с репозиторием

## 1. Создание репозитория на GitHub

1. Перейдите на [github.com](https://github.com) и войдите в аккаунт.
2. Нажмите **"+"** в правом верхнем углу → **"New repository"**.
3. Заполните:
   - **Repository name:** `dog-owner-app`
   - **Description:** Помощник владельца собаки (iOS/Android)
   - **Visibility:** Public или Private
   - **НЕ** отмечайте "Add a README file" (репозиторий уже есть локально).
4. Нажмите **"Create repository"**.

---

## 2. Подключение локального репозитория к GitHub

Откройте терминал в папке проекта и выполните:

```bash
cd C:\Users\idial\projects\dog-owner-app
```

Добавьте удалённый репозиторий (замените `ВАШ_ЛОГИН` на ваш логин GitHub):

```bash
git remote add origin https://github.com/ВАШ_ЛОГИН/dog-owner-app.git
```

Переименуйте ветку в `main` (если нужно):

```bash
git branch -M main
```

Отправьте код на GitHub:

```bash
git push -u origin main
```

При первом `git push` потребуется авторизация (логин и пароль или токен).

---

## 3. Последующие изменения — рабочий процесс

### Сохранить изменения и отправить на GitHub

```bash
# 1. Посмотреть, что изменилось
git status

# 2. Добавить файлы в индекс
git add .
# или выборочно: git add backend/main.go src/screens/PetProfileScreen.tsx

# 3. Создать коммит
git commit -m "Описание изменений"

# 4. Отправить на GitHub
git push
```

### Примеры сообщений коммитов

- `Добавлен экран сканирования QR-кода`
- `Исправлена ошибка в калькуляторе кормления`
- `Подключён бэкенд к экрану карты`

---

## 4. Клонирование репозитория (на другом компьютере)

```bash
git clone https://github.com/ВАШ_ЛОГИН/dog-owner-app.git
cd dog-owner-app
```

---

## 5. Получение обновлений с GitHub

Если изменения вносились с другого компьютера или другими людьми:

```bash
git pull origin main
```

---

## 6. Полезные команды

| Команда | Описание |
|--------|----------|
| `git status` | Показать изменённые файлы |
| `git log --oneline` | История коммитов |
| `git diff` | Показать незакоммиченные изменения |
| `git branch` | Список веток |
| `git remote -v` | Показать подключённые удалённые репозитории |

---

## 7. Альтернатива: GitLab или Bitbucket

### GitLab
1. Создайте репозиторий на [gitlab.com](https://gitlab.com).
2. Подключите: `git remote add origin https://gitlab.com/ВАШ_ЛОГИН/dog-owner-app.git`
3. Выполните `git push -u origin main`.

### Bitbucket
1. Создайте репозиторий на [bitbucket.org](https://bitbucket.org).
2. Подключите: `git remote add origin https://bitbucket.org/ВАШ_ЛОГИН/dog-owner-app.git`
3. Выполните `git push -u origin main`.
