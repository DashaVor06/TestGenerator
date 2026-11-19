-- Миграция: расширенные возможности генерации тестов.
-- Добавлены: сложность и уровень мышления вопросов, источники материалов (текст/файл/URL),
-- приватность тестов и ссылка для доступа, разбор ошибок (ответы по вопросам),
-- журнал расходов на ИИ, язык интерфейса и генерации, поддержка гостевого прохождения.

-- 1. Новые значения существующих перечислений ---------------------------------

ALTER TYPE "Role" ADD VALUE 'ADMIN';

ALTER TYPE "QuestionType" ADD VALUE 'SINGLE_CHOICE';
ALTER TYPE "QuestionType" ADD VALUE 'SHORT_ANSWER';

-- 2. Новые перечисления -------------------------------------------------------

CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE "CognitiveLevel" AS ENUM ('REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE');
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');
CREATE TYPE "MaterialSource" AS ENUM ('TEXT', 'FILE', 'URL');
CREATE TYPE "TestLanguage" AS ENUM ('RU', 'EN');

-- 3. Пользователь: язык интерфейса -------------------------------------------

ALTER TABLE "users"
  ADD COLUMN "language" "TestLanguage" NOT NULL DEFAULT 'RU';

-- 4. Материал: источник и ссылка ---------------------------------------------

ALTER TABLE "materials"
  ADD COLUMN "source" "MaterialSource" NOT NULL DEFAULT 'TEXT',
  ADD COLUMN "sourceUrl" TEXT;

-- Материал, загруженный через форму, уже разобран, поэтому по умолчанию READY
ALTER TABLE "materials" ALTER COLUMN "status" SET DEFAULT 'READY';

-- 5. Тест: материал, язык, приватность, короткая ссылка -----------------------

ALTER TABLE "tests"
  ADD COLUMN "materialId" TEXT,
  ADD COLUMN "language" "TestLanguage" NOT NULL DEFAULT 'RU',
  ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN "shareToken" TEXT,
  ADD COLUMN "settings" JSONB;

CREATE UNIQUE INDEX "tests_shareToken_key" ON "tests"("shareToken");
CREATE INDEX "tests_materialId_idx" ON "tests"("materialId");
CREATE INDEX "tests_visibility_idx" ON "tests"("visibility");

ALTER TABLE "tests"
  ADD CONSTRAINT "tests_materialId_fkey"
  FOREIGN KEY ("materialId") REFERENCES "materials"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Вопрос: сложность, уровень мышления, цитата из материала -----------------

ALTER TABLE "questions"
  ALTER COLUMN "difficulty" TYPE "Difficulty"
  USING (
    CASE
      WHEN "difficulty" IS NULL THEN NULL
      WHEN lower("difficulty") = 'easy' THEN 'EASY'::"Difficulty"
      WHEN lower("difficulty") = 'hard' THEN 'HARD'::"Difficulty"
      ELSE 'MEDIUM'::"Difficulty"
    END
  );

ALTER TABLE "questions"
  ADD COLUMN "cognitiveLevel" "CognitiveLevel" NOT NULL DEFAULT 'REMEMBER',
  ADD COLUMN "sourceQuote" TEXT,
  ADD COLUMN "expectedAnswer" TEXT,
  ADD COLUMN "points" INTEGER NOT NULL DEFAULT 1;

-- 7. Вариант ответа: порядок вывода ------------------------------------------

ALTER TABLE "answer_options" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- 8. Результат: гостевой проход, максимум баллов, длительность ----------------

ALTER TABLE "test_results" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "test_results"
  ADD COLUMN "guestName" TEXT,
  ADD COLUMN "maxScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "durationMs" INTEGER;

-- 9. Ответ пользователя на вопрос (для разбора ошибок) ------------------------

CREATE TABLE "test_answers" (
  "id" TEXT NOT NULL,
  "resultId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "selectedOptionIds" TEXT[],
  "textAnswer" TEXT,
  "isCorrect" BOOLEAN NOT NULL DEFAULT false,
  "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "test_answers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "test_answers_resultId_idx" ON "test_answers"("resultId");
CREATE INDEX "test_answers_questionId_idx" ON "test_answers"("questionId");

ALTER TABLE "test_answers"
  ADD CONSTRAINT "test_answers_resultId_fkey"
  FOREIGN KEY ("resultId") REFERENCES "test_results"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "test_answers"
  ADD CONSTRAINT "test_answers_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "questions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 10. Журнал расходов на генерацию -------------------------------------------

CREATE TABLE "generations" (
  "id" TEXT NOT NULL,
  "testId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "effort" TEXT NOT NULL,
  "inputTokens" INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "durationMs" INTEGER NOT NULL DEFAULT 0,
  "questionsCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "generations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "generations_testId_idx" ON "generations"("testId");
CREATE INDEX "generations_userId_idx" ON "generations"("userId");

ALTER TABLE "generations"
  ADD CONSTRAINT "generations_testId_fkey"
  FOREIGN KEY ("testId") REFERENCES "tests"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "generations"
  ADD CONSTRAINT "generations_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
