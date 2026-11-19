# Генератор тестов

Веб-приложение для автоматической генерации тестов по учебным материалам.
Материал можно вставить текстом, загрузить файлом (PDF, DOCX, PPTX, TXT, MD)
или добавить ссылкой на статью. Тест генерируется внешним ИИ-сервисом DeepSeek,
проходится в браузере и разбирается по ошибкам с цитатами из материала.

**Стек:** TypeScript · Next.js (App Router) · Prisma ORM · PostgreSQL · Node.js · WebSocket

## Возможности

- регистрация и вход (bcrypt + JWT в httpOnly-cookie);
- материалы: текст, файл (PDF/DOCX/PPTX/TXT/MD), статья по URL;
- генерация вопросов пяти типов: одиночный выбор, множественный выбор,
  «верно/неверно», короткий ответ, развёрнутый ответ;
- выбор количества вопросов каждого типа, сложности и числа вопросов «на размышление»;
- два режима генерации: обычные вопросы — дешёвый (`low`), вопросы на размышление — точный (`high`);
- ручное добавление, редактирование и удаление вопросов;
- прохождение теста с прогресс-баром и подсчётом баллов;
- разбор ошибок: ваш ответ, правильный ответ, пояснение и цитата из материала;
- приватность: приватный тест, доступ по ссылке, публичный каталог;
- прохождение по ссылке без регистрации (гостевой режим);
- история результатов;
- русский и английский интерфейс, светлая и тёмная тема;
- уведомления о готовности теста через WebSocket;
- живая оценка стоимости генерации до запуска.

## Архитектура (Clean Architecture)

```
src/
├── app/                 # presentation — страницы и route handlers (имя зафиксировано Next.js)
├── application/         # бизнес-логика: use cases + порты (интерфейсы)
├── domain/              # ядро: сущности, подсчёт баллов, стоимость, бизнес-правила
├── infrastructure/      # адаптеры: Prisma (БД), ИИ-сервис, WebSocket, безопасность
├── i18n/                # словарь интерфейса (ru/en)
└── components/          # общие компоненты интерфейса
```

Зависимости направлены внутрь: `app → application → domain`,
а `infrastructure` реализует порты из `application`.

## Запуск

### 1. База данных (PostgreSQL)

Подходит локальный PostgreSQL, Docker или облачная база (например, Supabase).

Через Docker:

```bash
docker compose up -d
```

Для Supabase возьмите строку подключения в панели проекта
(Database → Connection string → URI) и укажите её в `DATABASE_URL`.

### 2. Переменные окружения

Скопируйте `.env.example` в `.env` и заполните:

| Переменная | Назначение |
|---|---|
| `DATABASE_URL` | строка подключения к PostgreSQL |
| `JWT_SECRET` | секрет для подписи токенов |
| `OPENAI_API_KEY` | ключ DeepSeek API |
| `OPENAI_BASE_URL` | `https://api.deepseek.com` |
| `OPENAI_MODEL` | `deepseek-flash` |
| `AI_BASIC_EFFORT` | режим мышления для обычных вопросов (`low`) |
| `AI_THINKING_EFFORT` | режим для вопросов на размышление (`high`) |
| `AI_MAX_MATERIAL_CHARS` | сколько символов материала отправлять в модель (по умолчанию 30000) |
| `MAX_UPLOAD_MB` | максимальный размер файла (по умолчанию 25) |
| `MAX_GENERATIONS_PER_HOUR` | лимит генераций в час на пользователя |

Если `OPENAI_API_KEY` не задан, приложение работает на mock-генераторе
(удобно для демонстрации без расходов).

### 3. Установка зависимостей

```bash
pnpm install
```

### 4. Миграции и демо-данные

```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

Seed создаёт пользователя `demo@example.com` с паролем `demo1234`,
материал, публичный тест и ссылку `/t/demo-javascript`.

### 5. Запуск

```bash
pnpm dev
```

Открыть http://localhost:3000.

## Полезные команды

| Команда | Описание |
|---------|----------|
| `pnpm dev` | dev-сервер Next.js + WebSocket |
| `pnpm build` | production-сборка |
| `pnpm test` | unit-тесты (Vitest) |
| `pnpm typecheck` | проверка типов |
| `pnpm prisma:generate` | генерация клиента Prisma |
| `pnpm prisma:migrate` | создание/применение миграций |
| `pnpm prisma:studio` | визуальный просмотр БД |
| `pnpm prisma:seed` | наполнение БД демо-данными |

## REST API (кратко)

| Метод | Адрес | Назначение |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` | регистрация и вход |
| GET | `/api/auth/me` | текущий пользователь |
| PATCH | `/api/profile/language` | язык интерфейса |
| GET/POST | `/api/materials` | список и создание материала (текст/файл/ссылка) |
| DELETE | `/api/materials/[id]` | удаление материала |
| GET/POST | `/api/tests` | список тестов и создание |
| GET/PATCH/DELETE | `/api/tests/[id]` | тест целиком |
| POST | `/api/tests/[id]/generate` | запуск генерации |
| POST | `/api/tests/[id]/share` | приватность и ссылка |
| POST | `/api/tests/[id]/questions` | добавить вопрос |
| PATCH/DELETE | `/api/tests/[id]/questions/[questionId]` | изменить/удалить вопрос |
| GET | `/api/tests/[id]/attempt` | тест для прохождения |
| POST | `/api/tests/[id]/submit` | сдача теста |
| GET | `/api/tests/public` | публичный каталог |
| GET | `/api/tests/public/[token]` | тест по ссылке |
| POST | `/api/tests/public/[token]/submit` | сдача по ссылке (гость) |
| GET | `/api/results` | история результатов |
| GET | `/api/results/[id]` | разбор ошибок |

## Стоимость генерации

Используется модель `deepseek-flash`. Обычные вопросы генерируются в дешёвом
режиме мышления, вопросы «на размышление» — в точном. Цены и формула расчёта
находятся в `src/domain/pricing.ts`, оценка показывается в интерфейсе до запуска.

Ориентир: тест из 10 вопросов по статье на 20 000 знаков стоит примерно
0,006 $ в пиковые часы и 0,003 $ вне пика. Подробнее — в комментариях
`src/domain/pricing.ts`.

## CI и секреты GitHub

В репозитории настроен GitHub Actions (`.github/workflows/ci.yml`):
установка зависимостей → генерация Prisma Client → проверка типов → тесты → сборка.

В **Settings → Secrets and variables → Actions** нужно добавить:

**Secrets**

| Имя | Значение |
|---|---|
| `DATABASE_URL` | строка подключения к PostgreSQL (можно к Supabase) |
| `JWT_SECRET` | случайная строка, например `openssl rand -base64 32` |
| `OPENAI_API_KEY` | ключ DeepSeek API (необязателен для сборки) |

**Variables** (необязательно, для сборки)

| Имя | Значение |
|---|---|
| `OPENAI_BASE_URL` | `https://api.deepseek.com` |
| `OPENAI_MODEL` | `deepseek-flash` |

## Проверка работоспособности

```bash
pnpm typecheck
pnpm test
```

Unit-тесты покрывают подсчёт баллов, стоимость генерации, деление вопросов
на обычные и «на размышление», правила ручного вопроса, публикацию теста,
гостевой доступ, валидацию схем и извлечение текста из ссылок.
