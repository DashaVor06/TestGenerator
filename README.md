# Генератор тестов

Веб-приложение для автоматической генерации тестов по учебным материалам.

**Стек:** TypeScript · Next.js (App Router) · Prisma ORM · PostgreSQL · Node.js

## Архитектура (Clean Architecture)

```
src/
├── app/                 # presentation — страницы и route handlers (имя зафиксировано Next.js)
├── application/         # бизнес-логика: use cases + порты (интерфейсы)
├── domain/              # ядро: сущности и бизнес-правила
└── infrastructure/      # адаптеры: Prisma (БД), ИИ-сервис, WebSocket, безопасность
```

Зависимости направлены внутрь: `app → application → domain`, а `infrastructure` реализует порты из `application`.

## Запуск

### 1. База данных (PostgreSQL)

Поднять PostgreSQL через Docker:

```bash
docker compose up -d
```

Либо использовать любой запущенный PostgreSQL и прописать свой `DATABASE_URL` в `.env`.

### 2. Установка зависимостей

```bash
pnpm install
```

### 3. Миграции и сид-данные

```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

### 4. Запуск в режиме разработки

```bash
pnpm dev
```

Открыть http://localhost:3000.

## Полезные команды

| Команда | Описание |
|---------|----------|
| `pnpm dev` | dev-сервер Next.js |
| `pnpm build` | production-сборка |
| `pnpm prisma:generate` | генерация клиента Prisma |
| `pnpm prisma:migrate` | создание/применение миграций |
| `pnpm prisma:studio` | визуальный просмотр БД |
| `pnpm prisma:seed` | наполнение БД демо-данными |
