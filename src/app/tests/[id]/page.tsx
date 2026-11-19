"use client";

// Управление тестом: настройки, генерация вопросов, доступ и редактор вопросов.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";
import { estimateGenerationCost, formatByn, formatUsd } from "@/domain/pricing";
import type { Language, TranslationKey } from "@/i18n/dictionary";

type TestStatus = "PENDING" | "PROCESSING" | "READY" | "ERROR";
type Visibility = "PRIVATE" | "UNLISTED" | "PUBLIC";
type QuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "SHORT_ANSWER"
  | "OPEN";
type Difficulty = "EASY" | "MEDIUM" | "HARD";
type CognitiveLevel = "REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE";

interface AnswerOption {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

interface Question {
  id: string;
  testId: string;
  type: QuestionType;
  text: string;
  difficulty: Difficulty | null;
  cognitiveLevel: CognitiveLevel;
  explanation: string | null;
  sourceQuote: string | null;
  expectedAnswer: string | null;
  points: number;
  order: number;
  options: AnswerOption[];
}

interface Test {
  id: string;
  ownerId: string;
  materialId: string | null;
  title: string;
  category: string | null;
  description: string | null;
  language: Language;
  visibility: Visibility;
  shareToken: string | null;
  status: TestStatus;
  createdAt: string;
}

interface TestWithQuestions extends Test {
  questions: Question[];
}

interface Material {
  id: string;
  title: string;
  content: string | null;
}

// Вариант ответа в форме вопроса (у сохранённых вариантов есть id, здесь он не нужен).
interface OptionDraft {
  text: string;
  isCorrect: boolean;
}

interface QuestionDraft {
  type: QuestionType;
  text: string;
  points: number;
  difficulty: Difficulty | "";
  cognitiveLevel: CognitiveLevel;
  explanation: string;
  sourceQuote: string;
  expectedAnswer: string;
  options: OptionDraft[];
}

const QUESTION_TYPES: QuestionType[] = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "OPEN",
];
const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];
const COGNITIVE_LEVELS: CognitiveLevel[] = [
  "REMEMBER",
  "UNDERSTAND",
  "APPLY",
  "ANALYZE",
];
const VISIBILITIES: Visibility[] = ["PRIVATE", "UNLISTED", "PUBLIC"];

const TYPE_KEYS: Record<QuestionType, TranslationKey> = {
  SINGLE_CHOICE: "tests.question.type.SINGLE_CHOICE",
  MULTIPLE_CHOICE: "tests.question.type.MULTIPLE_CHOICE",
  TRUE_FALSE: "tests.question.type.TRUE_FALSE",
  SHORT_ANSWER: "tests.question.type.SHORT_ANSWER",
  OPEN: "tests.question.type.OPEN",
};

const DIFFICULTY_KEYS: Record<Difficulty, TranslationKey> = {
  EASY: "tests.generation.difficulty.EASY",
  MEDIUM: "tests.generation.difficulty.MEDIUM",
  HARD: "tests.generation.difficulty.HARD",
};

const COGNITIVE_KEYS: Record<CognitiveLevel, TranslationKey> = {
  REMEMBER: "tests.question.cognitive.REMEMBER",
  UNDERSTAND: "tests.question.cognitive.UNDERSTAND",
  APPLY: "tests.question.cognitive.APPLY",
  ANALYZE: "tests.question.cognitive.ANALYZE",
};

const VISIBILITY_KEYS: Record<Visibility, TranslationKey> = {
  PRIVATE: "tests.visibility.PRIVATE",
  UNLISTED: "tests.visibility.UNLISTED",
  PUBLIC: "tests.visibility.PUBLIC",
};

const VISIBILITY_HINT_KEYS: Record<Visibility, TranslationKey> = {
  PRIVATE: "tests.visibility.hint.PRIVATE",
  UNLISTED: "tests.visibility.hint.UNLISTED",
  PUBLIC: "tests.visibility.hint.PUBLIC",
};

const STATUS_KEYS: Record<TestStatus, TranslationKey> = {
  PENDING: "tests.status.PENDING",
  PROCESSING: "tests.status.PROCESSING",
  READY: "tests.status.READY",
  ERROR: "tests.status.ERROR",
};

const STATUS_BADGES: Record<TestStatus, string> = {
  PENDING: "badge badge--warning",
  PROCESSING: "badge badge--primary",
  READY: "badge badge--success",
  ERROR: "badge badge--danger",
};

// Ограничения совпадают с проверкой на сервере.
const MAX_QUESTIONS = 50;
const MIN_POINTS = 1;
const MAX_POINTS = 10;
const POLL_INTERVAL_MS = 2000;
const COPY_HINT_MS = 2000;

/** Есть ли у вопроса варианты ответа. */
function hasOptions(type: QuestionType): boolean {
  return (
    type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE"
  );
}

/** Нужен ли эталонный ответ (он показывается и проверяется у свободных ответов). */
function hasExpectedAnswer(type: QuestionType): boolean {
  return type === "SHORT_ANSWER" || type === "OPEN";
}

/** Пустая форма нового вопроса. */
function emptyDraft(): QuestionDraft {
  return {
    type: "SINGLE_CHOICE",
    text: "",
    points: 1,
    difficulty: "",
    cognitiveLevel: "UNDERSTAND",
    explanation: "",
    sourceQuote: "",
    expectedAnswer: "",
    options: [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
    ],
  };
}

/** Оставляет ровно два варианта — столько требует тип «верно/неверно». */
function twoOptions(options: OptionDraft[]): OptionDraft[] {
  const first = options[0] ?? { text: "", isCorrect: true };
  const second = options[1] ?? { text: "", isCorrect: false };
  return [first, second];
}

/** Заполняет форму по уже сохранённому вопросу. */
function draftFromQuestion(question: Question): QuestionDraft {
  return {
    type: question.type,
    text: question.text,
    points: question.points,
    difficulty: question.difficulty ?? "",
    cognitiveLevel: question.cognitiveLevel,
    explanation: question.explanation ?? "",
    sourceQuote: question.sourceQuote ?? "",
    expectedAnswer: question.expectedAnswer ?? "",
    options: question.options.map((option) => ({
      text: option.text,
      isCorrect: option.isCorrect,
    })),
  };
}

/** Ограничивает число диапазоном. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function TestPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading, t } = useApp();
  const router = useRouter();

  const [test, setTest] = useState<TestWithQuestions | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Настройки теста.
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [testLanguage, setTestLanguage] = useState<Language>("RU");
  const [savingSettings, setSavingSettings] = useState(false);
  const [deletingTest, setDeletingTest] = useState(false);
  // Форму заполняем один раз, чтобы опрос статуса не затирал правки пользователя.
  const formFilled = useRef(false);

  // Генерация вопросов.
  const [materialId, setMaterialId] = useState("");
  const [typeCounts, setTypeCounts] = useState<Record<QuestionType, number>>({
    SINGLE_CHOICE: 5,
    MULTIPLE_CHOICE: 0,
    TRUE_FALSE: 0,
    SHORT_ANSWER: 0,
    OPEN: 0,
  });
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [thinkingOn, setThinkingOn] = useState(false);
  const [thinkingCount, setThinkingCount] = useState(2);
  const [generating, setGenerating] = useState(false);
  const [finished, setFinished] = useState<{ count: number; seconds: number } | null>(
    null
  );
  // Момент запуска генерации — нужен, чтобы показать её длительность.
  const startedAt = useRef<number | null>(null);

  // Доступ к тесту.
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Форма вопроса (общая для добавления и редактирования).
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<QuestionDraft>(emptyDraft());
  const [savingQuestion, setSavingQuestion] = useState(false);

  const testId = id;

  /** Загружает тест вместе с вопросами. */
  const load = useCallback(async () => {
    const data = await api<{ test: TestWithQuestions }>(`/api/tests/${testId}`);
    setTest(data.test);
    return data.test;
  }, [testId]);

  // Первая загрузка теста и списка материалов.
  useEffect(() => {
    if (!user) {
      return;
    }

    void load().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : t("common.error"));
    });

    api<{ materials: Material[] }>("/api/materials")
      .then((data) => setMaterials(data.materials))
      .catch(() => setMaterials([]));
  }, [user, load, t]);

  // Заполняем форму настроек тем, что пришло с сервера.
  useEffect(() => {
    if (!test || formFilled.current) {
      return;
    }

    setTitle(test.title);
    setCategory(test.category ?? "");
    setDescription(test.description ?? "");
    setTestLanguage(test.language);
    // Материал прошлой генерации подставляем сразу, чтобы не выбирать заново.
    if (test.materialId) {
      setMaterialId(test.materialId);
    }
    formFilled.current = true;
  }, [test]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Таймер подсказки «Скопировано» очищаем при уходе со страницы.
  useEffect(() => {
    return () => {
      if (copyTimer.current) {
        clearTimeout(copyTimer.current);
      }
    };
  }, []);

  // Пока идёт генерация, каждые две секунды перечитываем статус теста.
  const status = test?.status;
  useEffect(() => {
    if (status !== "PROCESSING") {
      return;
    }

    const timer = setInterval(() => {
      void load()
        .then((fresh) => {
          if (fresh.status === "READY") {
            // Секунды считаем только если генерацию запускали с этой страницы.
            if (startedAt.current) {
              setFinished({
                count: fresh.questions.length,
                seconds: Math.max(
                  1,
                  Math.round((Date.now() - startedAt.current) / 1000)
                ),
              });
            }
            setGenerating(false);
            startedAt.current = null;
          } else if (fresh.status === "ERROR") {
            setGenerating(false);
            startedAt.current = null;
          }
        })
        .catch(() => {
          // Сеть может моргнуть — дождёмся следующего опроса.
        });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [status, load]);

  /** Сохраняет название, категорию, описание и язык вопросов. */
  async function handleSaveSettings(event: React.FormEvent) {
    event.preventDefault();
    setSavingSettings(true);
    setError("");
    setNotice("");
    try {
      await api(`/api/tests/${testId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          category: category.trim() || null,
          description: description.trim() || null,
          language: testLanguage,
        }),
      });
      // После перезагрузки поля заполнятся значениями с сервера.
      formFilled.current = false;
      await load();
      setNotice(t("tests.settings.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSavingSettings(false);
    }
  }

  /** Удаляет тест и уводит в каталог. */
  async function handleDeleteTest() {
    if (!window.confirm(t("tests.delete.confirm"))) {
      return;
    }

    setDeletingTest(true);
    setError("");
    try {
      await api(`/api/tests/${testId}`, { method: "DELETE" });
      router.push("/catalog");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
      setDeletingTest(false);
    }
  }

  // Итоги генерации: сколько вопросов всего и сколько из них «на размышление».
  const totalQuestions = QUESTION_TYPES.reduce(
    (sum, type) => sum + typeCounts[type],
    0
  );
  const thinking = thinkingOn ? Math.min(thinkingCount, totalQuestions) : 0;
  const selectedMaterial = materials.find((item) => item.id === materialId) ?? null;
  const estimate = estimateGenerationCost({
    characters: selectedMaterial?.content?.length ?? 0,
    questions: totalQuestions,
    thinkingQuestions: thinking,
  });
  const isGenerating = generating || status === "PROCESSING";
  const canGenerate = Boolean(materialId) && totalQuestions > 0 && !isGenerating;

  /** Меняет количество вопросов одного типа. */
  function handleCountChange(type: QuestionType, value: string) {
    const parsed = Number(value);
    const safe = Number.isFinite(parsed)
      ? clamp(Math.floor(parsed), 0, MAX_QUESTIONS)
      : 0;
    setTypeCounts((previous) => ({ ...previous, [type]: safe }));
  }

  /** Запускает генерацию вопросов по выбранному материалу. */
  async function handleGenerate() {
    if (!canGenerate) {
      return;
    }

    setGenerating(true);
    setFinished(null);
    setError("");
    setNotice("");
    startedAt.current = Date.now();

    try {
      await api(`/api/tests/${testId}/generate`, {
        method: "POST",
        body: JSON.stringify({
          materialId,
          typeCounts,
          difficulty,
          thinkingCount: thinking,
          language: testLanguage,
        }),
      });
      // Сразу показываем «идёт генерация», чтобы включился опрос статуса.
      setTest((previous) =>
        previous ? { ...previous, status: "PROCESSING" } : previous
      );
    } catch (err) {
      setGenerating(false);
      startedAt.current = null;
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  /** Ссылка на прохождение теста — нужна, когда тест не полностью приватный. */
  const shareLink =
    test && origin && test.visibility !== "PRIVATE" && test.shareToken
      ? `${origin}/t/${test.shareToken}`
      : "";

  /** Меняет приватность теста через эндпоинт публикации. */
  async function changeVisibility(visibility: Visibility) {
    if (!test || test.visibility === visibility) {
      return;
    }

    setSavingVisibility(true);
    setError("");
    setNotice("");
    try {
      const data = await api<{ test: Test }>(`/api/tests/${testId}/share`, {
        method: "POST",
        body: JSON.stringify({ visibility }),
      });
      // Вопросы приходят только в GET, поэтому объединяем поля.
      setTest((previous) => (previous ? { ...previous, ...data.test } : previous));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSavingVisibility(false);
    }
  }

  /** Выдаёт новую ссылку и отзывает старую. */
  async function handleRegenerateToken() {
    if (!test) {
      return;
    }

    setSavingVisibility(true);
    setError("");
    setNotice("");
    try {
      const data = await api<{ test: Test }>(`/api/tests/${testId}/share`, {
        method: "POST",
        body: JSON.stringify({
          visibility: test.visibility,
          regenerateToken: true,
        }),
      });
      setTest((previous) => (previous ? { ...previous, ...data.test } : previous));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSavingVisibility(false);
    }
  }

  /** Копирует ссылку в буфер обмена. */
  async function handleCopy() {
    if (!shareLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareLink);
    } catch {
      // Запасной вариант для браузеров без Clipboard API.
      const field = document.createElement("textarea");
      field.value = shareLink;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      document.body.removeChild(field);
    }

    setCopied(true);
    if (copyTimer.current) {
      clearTimeout(copyTimer.current);
    }
    copyTimer.current = setTimeout(() => setCopied(false), COPY_HINT_MS);
  }

  function openAddForm() {
    setEditingId(null);
    setDraft(emptyDraft());
    setFormOpen(true);
    setError("");
    setNotice("");
  }

  function openEditForm(question: Question) {
    setEditingId(question.id);
    setDraft(draftFromQuestion(question));
    setFormOpen(true);
    setError("");
    setNotice("");
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setDraft(emptyDraft());
  }

  /** При смене типа подставляем варианты ответа, если их ещё нет. */
  function handleTypeChange(value: string) {
    const type = value as QuestionType;
    setDraft((previous) => {
      let options = previous.options;

      if (type === "TRUE_FALSE") {
        options = twoOptions(previous.options);
      } else if (hasOptions(type) && previous.options.length < 2) {
        options = [
          { text: "", isCorrect: true },
          { text: "", isCorrect: false },
        ];
      }

      return { ...previous, type, options };
    });
  }

  function updateOption(index: number, patch: Partial<OptionDraft>) {
    setDraft((previous) => ({
      ...previous,
      options: previous.options.map((option, position) =>
        position === index ? { ...option, ...patch } : option
      ),
    }));
  }

  function addOption() {
    setDraft((previous) => ({
      ...previous,
      options: [...previous.options, { text: "", isCorrect: false }],
    }));
  }

  function removeOption(index: number) {
    setDraft((previous) => ({
      ...previous,
      options: previous.options.filter((_, position) => position !== index),
    }));
  }

  /** Сохраняет вопрос: новый создаём, существующий обновляем. */
  async function handleSaveQuestion(event: React.FormEvent) {
    event.preventDefault();
    setSavingQuestion(true);
    setError("");
    setNotice("");

    const body = {
      type: draft.type,
      text: draft.text.trim(),
      difficulty: draft.difficulty === "" ? null : draft.difficulty,
      cognitiveLevel: draft.cognitiveLevel,
      explanation: draft.explanation.trim() || null,
      sourceQuote: draft.sourceQuote.trim() || null,
      expectedAnswer: hasExpectedAnswer(draft.type)
        ? draft.expectedAnswer.trim() || null
        : null,
      points: clamp(draft.points, MIN_POINTS, MAX_POINTS),
      options: hasOptions(draft.type)
        ? draft.options
            .filter((option) => option.text.trim().length > 0)
            .map((option) => ({
              text: option.text.trim(),
              isCorrect: option.isCorrect,
            }))
        : [],
    };

    try {
      if (editingId) {
        await api(`/api/tests/${testId}/questions/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await api(`/api/tests/${testId}/questions`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }

      await load();
      setNotice(t("tests.question.saved"));
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSavingQuestion(false);
    }
  }

  /** Удаляет вопрос из теста. */
  async function handleDeleteQuestion(questionId: string) {
    if (!window.confirm(t("common.confirmDelete"))) {
      return;
    }

    setError("");
    setNotice("");
    try {
      await api(`/api/tests/${testId}/questions/${questionId}`, {
        method: "DELETE",
      });
      await load();
      setNotice(t("tests.question.deleted"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  if (loading) {
    return <p className="muted">{t("common.loading")}</p>;
  }

  if (!user) {
    return (
      <div className="card stack">
        <h1 className="page-title">{t("auth.required")}</h1>
        <p className="muted">{t("tests.title")}</p>
        <div className="row">
          <Link className="btn btn--primary btn--sm" href="/login">
            {t("nav.login")}
          </Link>
          <Link className="btn btn--sm" href="/register">
            {t("nav.register")}
          </Link>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="stack">
        <p className="muted">{error || t("common.loading")}</p>
        <div className="row">
          <Link className="btn btn--sm" href="/catalog">
            {t("common.back")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">{test.title}</h1>
          <p className="page-subtitle">{t("tests.title")}</p>
        </div>
        <span className={STATUS_BADGES[test.status]}>{t(STATUS_KEYS[test.status])}</span>
      </header>

      {error && <div className="alert alert--error">{error}</div>}
      {notice && <div className="alert alert--success">{notice}</div>}
      {!error && !notice && status === "PROCESSING" && (
        <div className="alert alert--info">{t("tests.status.PROCESSING")}</div>
      )}
      {status === "ERROR" && (
        <div className="alert alert--error">{t("tests.status.ERROR")}</div>
      )}

      {/* 1. Настройки теста */}
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">{t("tests.settings")}</h2>
        </div>

        <form className="stack" onSubmit={handleSaveSettings}>
          <div className="grid grid--2">
            <div className="field">
              <label className="field__label" htmlFor="test-title">
                {t("tests.field.title")}
              </label>
              <input
                id="test-title"
                className="input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                minLength={2}
                maxLength={200}
              />
            </div>

            <div className="field">
              <label className="field__label" htmlFor="test-category">
                {t("tests.field.category")}
              </label>
              <input
                id="test-category"
                className="input"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                maxLength={100}
              />
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="test-description">
              {t("tests.field.description")}
            </label>
            <textarea
              id="test-description"
              className="textarea"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="test-language">
              {t("tests.field.language")}
            </label>
            <select
              id="test-language"
              className="select"
              value={testLanguage}
              onChange={(event) =>
                setTestLanguage(event.target.value === "EN" ? "EN" : "RU")
              }
            >
              <option value="RU">{t("tests.field.language.ru")}</option>
              <option value="EN">{t("tests.field.language.en")}</option>
            </select>
          </div>

          <div className="row row--between">
            <button className="btn btn--primary" type="submit" disabled={savingSettings}>
              {savingSettings ? t("common.saving") : t("common.save")}
            </button>
            <button
              className="btn btn--danger"
              type="button"
              onClick={handleDeleteTest}
              disabled={deletingTest}
            >
              {deletingTest ? t("common.deleting") : t("tests.delete")}
            </button>
          </div>
        </form>
      </section>

      {/* 2. Генерация вопросов */}
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">{t("tests.generation")}</h2>
        </div>

        {materials.length === 0 ? (
          <div className="empty">
            <p className="empty__title">{t("tests.generation.material.empty")}</p>
            <div className="row">
              <Link className="btn btn--primary btn--sm" href="/materials">
                {t("nav.materials")}
              </Link>
            </div>
          </div>
        ) : (
          <div className="stack">
            <div className="field">
              <label className="field__label" htmlFor="material">
                {t("tests.generation.material")}
              </label>
              <select
                id="material"
                className="select"
                value={materialId}
                onChange={(event) => setMaterialId(event.target.value)}
              >
                <option value="">{t("tests.generation.material.choose")}</option>
                {materials.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
              <p className="field__hint">{t("tests.generation.material.hint")}</p>
            </div>

            <div>
              <p className="field__label">{t("tests.generation.types")}</p>
              <div className="grid grid--3">
                {QUESTION_TYPES.map((type) => (
                  <div className="field" key={type}>
                    <label className="field__label" htmlFor={`count-${type}`}>
                      {t(TYPE_KEYS[type])}
                    </label>
                    <input
                      id={`count-${type}`}
                      className="input"
                      type="number"
                      min={0}
                      max={MAX_QUESTIONS}
                      value={typeCounts[type]}
                      onChange={(event) => handleCountChange(type, event.target.value)}
                    />
                  </div>
                ))}
              </div>
              <p className="field__hint">{t("tests.generation.limit")}</p>
            </div>

            <div className="grid grid--2">
              <div className="field">
                <label className="field__label" htmlFor="difficulty">
                  {t("tests.generation.difficulty")}
                </label>
                <select
                  id="difficulty"
                  className="select"
                  value={difficulty}
                  onChange={(event) =>
                    setDifficulty(
                      event.target.value === "EASY"
                        ? "EASY"
                        : event.target.value === "HARD"
                          ? "HARD"
                          : "MEDIUM"
                    )
                  }
                >
                  {DIFFICULTIES.map((item) => (
                    <option key={item} value={item}>
                      {t(DIFFICULTY_KEYS[item])}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={thinkingOn}
                    onChange={(event) => setThinkingOn(event.target.checked)}
                  />
                  <span>{t("tests.generation.thinking")}</span>
                </label>

                <div className="row">
                  <label className="field__label" htmlFor="thinking-count">
                    {t("tests.generation.thinking.count")}
                  </label>
                  <input
                    id="thinking-count"
                    className="input"
                    type="number"
                    min={0}
                    max={totalQuestions}
                    value={thinkingCount}
                    disabled={!thinkingOn}
                    onChange={(event) =>
                      setThinkingCount(
                        clamp(Number(event.target.value) || 0, 0, totalQuestions)
                      )
                    }
                  />
                </div>

                <p className="field__hint">{t("tests.generation.thinking.hint")}</p>
              </div>
            </div>

            <div className="card card--soft stack">
              <p>{t("tests.generation.total", { count: totalQuestions })}</p>
              <p className="muted small">
                {t("tests.generation.estimate", {
                  usd: formatUsd(estimate.usd),
                  byn: formatByn(estimate.byn),
                })}
              </p>
              <p className="field__hint">{t("tests.generation.low")}</p>
              <p className="field__hint">{t("tests.generation.high")}</p>
              <p className="field__hint">{t("tests.generation.replace")}</p>
            </div>

            <div className="row">
              <button
                className="btn btn--primary"
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate}
              >
                {isGenerating
                  ? t("tests.generation.running")
                  : t("tests.generation.start")}
              </button>
            </div>

            {finished && !isGenerating && (
              <div className="alert alert--success">
                {t("tests.generation.ready", {
                  count: finished.count,
                  seconds: finished.seconds,
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. Доступ к тесту */}
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">{t("tests.visibility.title")}</h2>
        </div>

        <div className="stack">
          <div className="row">
            {VISIBILITIES.map((item) => (
              <button
                key={item}
                type="button"
                className={
                  item === test.visibility
                    ? "btn btn--primary btn--sm"
                    : "btn btn--sm"
                }
                onClick={() => {
                  void changeVisibility(item);
                }}
                disabled={savingVisibility || item === test.visibility}
              >
                {t(VISIBILITY_KEYS[item])}
              </button>
            ))}
          </div>

          <p className="field__hint">{t(VISIBILITY_HINT_KEYS[test.visibility])}</p>

          {shareLink && (
            <div className="field">
              <label className="field__label" htmlFor="share-link">
                {t("tests.visibility.link")}
              </label>
              <input
                id="share-link"
                className="input"
                readOnly
                value={shareLink}
                onFocus={(event) => event.target.select()}
              />
              <div className="row">
                <button
                  className="btn btn--sm"
                  type="button"
                  onClick={() => {
                    void handleCopy();
                  }}
                >
                  {copied ? t("common.copied") : t("tests.visibility.copy")}
                </button>
                <button
                  className="btn btn--sm"
                  type="button"
                  onClick={() => {
                    void handleRegenerateToken();
                  }}
                  disabled={savingVisibility}
                >
                  {t("tests.visibility.regenerate")}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. Вопросы */}
      <section className="card stack">
        <div className="card__header">
          <div>
            <h2 className="card__title">
              {t("tests.questions", { count: test.questions.length })}
            </h2>
            <p className="small muted">{t("tests.question.answers")}</p>
          </div>
          <button type="button" className="btn btn--sm" onClick={openAddForm}>
            {t("tests.questions.add")}
          </button>
        </div>

        {test.questions.length === 0 ? (
          <div className="empty">
            <p className="empty__title">{t("tests.questions.empty")}</p>
          </div>
        ) : (
          <div className="list">
            {test.questions.map((question, index) => (
              <div className="list__item" key={question.id}>
                <div className="stack">
                  <p>
                    <strong>{index + 1}.</strong> {question.text}
                  </p>
                  <div className="row">
                    <span className="badge badge--primary">
                      {t(TYPE_KEYS[question.type])}
                    </span>
                    {question.difficulty && (
                      <span className="badge">
                        {t(DIFFICULTY_KEYS[question.difficulty])}
                      </span>
                    )}
                    <span className="badge">
                      {t(COGNITIVE_KEYS[question.cognitiveLevel])}
                    </span>
                    <span className="small muted">
                      {t("tests.question.points")}: {question.points}
                    </span>
                  </div>
                </div>

                <div className="row">
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => openEditForm(question)}
                  >
                    {t("common.edit")}
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--danger"
                    onClick={() => {
                      void handleDeleteQuestion(question.id);
                    }}
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {formOpen && (
          <form className="card card--soft" onSubmit={handleSaveQuestion}>
            <div className="card__header">
              <h3 className="card__title">
                {editingId ? t("tests.questions.editing") : t("tests.questions.add")}
              </h3>
            </div>

            <div className="stack">
              <div className="grid grid--2">
                <div className="field">
                  <label className="field__label" htmlFor="question-type">
                    {t("tests.question.type")}
                  </label>
                  <select
                    id="question-type"
                    className="select"
                    value={draft.type}
                    onChange={(event) => handleTypeChange(event.target.value)}
                  >
                    {QUESTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(TYPE_KEYS[type])}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="question-points">
                    {t("tests.question.points")}
                  </label>
                  <input
                    id="question-points"
                    className="input"
                    type="number"
                    min={MIN_POINTS}
                    max={MAX_POINTS}
                    value={draft.points}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        points: clamp(
                          Number(event.target.value) || MIN_POINTS,
                          MIN_POINTS,
                          MAX_POINTS
                        ),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="question-text">
                  {t("tests.question.text")}
                </label>
                <textarea
                  id="question-text"
                  className="textarea"
                  value={draft.text}
                  onChange={(event) =>
                    setDraft((previous) => ({ ...previous, text: event.target.value }))
                  }
                  required
                  minLength={3}
                  maxLength={2000}
                />
              </div>

              <div className="grid grid--2">
                <div className="field">
                  <label className="field__label" htmlFor="question-difficulty">
                    {t("tests.question.difficulty")}
                  </label>
                  <select
                    id="question-difficulty"
                    className="select"
                    value={draft.difficulty}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        difficulty:
                          event.target.value === ""
                            ? ""
                            : (event.target.value as Difficulty),
                      }))
                    }
                  >
                    <option value="">{t("tests.question.difficulty.none")}</option>
                    {DIFFICULTIES.map((item) => (
                      <option key={item} value={item}>
                        {t(DIFFICULTY_KEYS[item])}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="question-cognitive">
                    {t("tests.question.cognitive")}
                  </label>
                  <select
                    id="question-cognitive"
                    className="select"
                    value={draft.cognitiveLevel}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        cognitiveLevel: event.target.value as CognitiveLevel,
                      }))
                    }
                  >
                    {COGNITIVE_LEVELS.map((item) => (
                      <option key={item} value={item}>
                        {t(COGNITIVE_KEYS[item])}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {hasExpectedAnswer(draft.type) && (
                <div className="field">
                  <label className="field__label" htmlFor="question-expected">
                    {t("tests.question.expected")}
                  </label>
                  <input
                    id="question-expected"
                    className="input"
                    value={draft.expectedAnswer}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        expectedAnswer: event.target.value,
                      }))
                    }
                    maxLength={500}
                  />
                  <p className="field__hint">{t("tests.question.expected.hint")}</p>
                </div>
              )}

              {hasOptions(draft.type) && (
                <div className="field">
                  <p className="field__label">{t("tests.question.options")}</p>

                  <div className="stack">
                    {draft.options.map((option, index) => (
                      <div className="row" key={index}>
                        <input
                          className="input"
                          value={option.text}
                          placeholder={t("tests.question.option", { number: index + 1 })}
                          onChange={(event) =>
                            updateOption(index, { text: event.target.value })
                          }
                          maxLength={500}
                        />
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={option.isCorrect}
                            onChange={(event) => {
                              const checked = event.target.checked;

                              // У вопроса с одним выбором правильный вариант только один.
                              if (draft.type === "SINGLE_CHOICE") {
                                setDraft((previous) => ({
                                  ...previous,
                                  options: previous.options.map((item, position) => ({
                                    ...item,
                                    isCorrect: position === index ? checked : false,
                                  })),
                                }));
                                return;
                              }

                              updateOption(index, { isCorrect: checked });
                            }}
                          />
                          <span>{t("tests.question.correct")}</span>
                        </label>
                        {draft.type !== "TRUE_FALSE" && (
                          <button
                            type="button"
                            className="btn btn--sm btn--ghost"
                            onClick={() => removeOption(index)}
                            aria-label={t("common.delete")}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {draft.type !== "TRUE_FALSE" && (
                    <div className="row">
                      <button type="button" className="btn btn--sm" onClick={addOption}>
                        {t("tests.question.addOption")}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="field">
                <label className="field__label" htmlFor="question-explanation">
                  {t("tests.question.explanation")}
                </label>
                <textarea
                  id="question-explanation"
                  className="textarea"
                  rows={2}
                  value={draft.explanation}
                  onChange={(event) =>
                    setDraft((previous) => ({
                      ...previous,
                      explanation: event.target.value,
                    }))
                  }
                  maxLength={2000}
                />
              </div>

              <div className="field">
                <label className="field__label" htmlFor="question-source">
                  {t("tests.question.source")}
                </label>
                <textarea
                  id="question-source"
                  className="textarea"
                  rows={2}
                  value={draft.sourceQuote}
                  onChange={(event) =>
                    setDraft((previous) => ({
                      ...previous,
                      sourceQuote: event.target.value,
                    }))
                  }
                  maxLength={1000}
                />
              </div>

              <div className="row">
                <button
                  className="btn btn--primary"
                  type="submit"
                  disabled={savingQuestion}
                >
                  {savingQuestion ? t("common.saving") : t("tests.question.save")}
                </button>
                <button className="btn btn--ghost" type="button" onClick={closeForm}>
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>

      {/* 5. Прохождение */}
      {test.questions.length > 0 && (
        <div className="card card--soft">
          <div className="row row--between">
            <p className="small muted">
              {t("tests.questions", { count: test.questions.length })}
            </p>
            <Link className="btn btn--primary" href={`/tests/${test.id}/take`}>
              {t("tests.take")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
