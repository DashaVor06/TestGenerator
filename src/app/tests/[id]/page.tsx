"use client";

// Страница управления тестом: загрузка данных, действия пользователя
// и связка карточек (настройки, генерация, вопросы).

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";
import { GenerationCard, type GenerationParams, type GenerationResult } from "@/components/generation-card";
import { QuestionEditor } from "@/components/question-editor";
import { QuestionList } from "@/components/question-list";
import { TestSettingsCard, type TestSettingsFields } from "@/components/test-settings-card";
import {
  clamp, draftFromQuestion, emptyDraft, hasExpectedAnswer, hasOptions, MAX_POINTS, MIN_POINTS,
  VISIBILITIES, VISIBILITY_HINT_KEYS, VISIBILITY_KEYS,
  type Material, type Question, type QuestionDraft, type Test, type TestWithQuestions, type Visibility,
} from "@/components/test-types";

const POLL_INTERVAL_MS = 2000;
const COPY_HINT_MS = 2000;

export default function TestPage() {
  const { id: testId } = useParams<{ id: string }>();
  const { user, loading, t } = useApp();
  const router = useRouter();

  const [test, setTest] = useState<TestWithQuestions | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [deletingTest, setDeletingTest] = useState(false);

  // Генерация и её длительность.
  const [generating, setGenerating] = useState(false);
  const [finished, setFinished] = useState<GenerationResult | null>(null);
  const startedAt = useRef<number | null>(null);

  // Ссылка для прохождения и буфер обмена.
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Форма вопроса: черновик и id редактируемого вопроса (null — добавляем новый).
  const [editing, setEditing] = useState<QuestionDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Ключ формы: каждое открытие начинает с чистого черновика.
  const [formKey, setFormKey] = useState(0);
  const [savingQuestion, setSavingQuestion] = useState(false);

  /** Загружает тест вместе с вопросами. */
  const load = useCallback(async () => {
    const data = await api<{ test: TestWithQuestions }>(`/api/tests/${testId}`);
    setTest(data.test);
    return data.test;
  }, [testId]);

  /** Перечитывает список материалов — нужен после загрузки нового. */
  const reloadMaterials = useCallback(() => {
    api<{ materials: Material[] }>("/api/materials")
      .then((data) => setMaterials(data.materials))
      .catch(() => setMaterials([]));
  }, []);

  // Первая загрузка теста и списка материалов.
  useEffect(() => {
    if (!user) {
      return;
    }
    void load().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : t("common.error"));
    });
    reloadMaterials();
  }, [user, load, reloadMaterials, t]);

  // Ссылка для прохождения (origin нужен только на клиенте) и таймер подсказки.
  useEffect(() => {
    setOrigin(window.location.origin);
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
          if (fresh.status !== "READY" && fresh.status !== "ERROR") {
            return;
          }
          // Секунды считаем, только если генерацию запускали с этой страницы.
          if (fresh.status === "READY" && startedAt.current) {
            const passed = Math.round((Date.now() - startedAt.current) / 1000);
            setFinished({ count: fresh.questions.length, seconds: Math.max(1, passed) });
          }
          setGenerating(false);
          startedAt.current = null;
        })
        .catch(() => {
          // Сеть может моргнуть — дождёмся следующего опроса.
        });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [status, load]);

  /** Сохраняет название, категорию, описание и язык вопросов. */
  async function handleSaveSettings(fields: TestSettingsFields) {
    setSavingSettings(true);
    setError("");
    setNotice("");
    try {
      await api(`/api/tests/${testId}`, { method: "PATCH", body: JSON.stringify(fields) });
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

  /** Запускает генерацию вопросов по выбранному материалу. */
  async function handleGenerate(params: GenerationParams) {
    setGenerating(true);
    setFinished(null);
    setError("");
    setNotice("");
    startedAt.current = Date.now();

    try {
      await api(`/api/tests/${testId}/generate`, {
        method: "POST",
        body: JSON.stringify({
          materialId: params.materialId,
          typeCounts: params.typeCounts,
          difficulty: params.difficulty,
          thinkingCount: params.thinkingCount,
          language: test?.language,
        }),
      });
      // Сразу показываем «идёт генерация», чтобы включился опрос статуса.
      setTest((previous) => (previous ? { ...previous, status: "PROCESSING" } : previous));
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

  /** Меняет приватность теста, при необходимости выдаёт новую ссылку. */
  async function updateShare(visibility: Visibility, regenerateToken = false) {
    if (!test || (!regenerateToken && test.visibility === visibility)) {
      return;
    }
    setSavingVisibility(true);
    setError("");
    setNotice("");
    try {
      const body = regenerateToken ? { visibility, regenerateToken: true } : { visibility };
      const data = await api<{ test: Test }>(`/api/tests/${testId}/share`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      // Вопросы приходят только в GET, поэтому объединяем поля.
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
      field.style.cssText = "position: fixed; opacity: 0";
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

  /** Открывает форму для нового вопроса. */
  function handleAddQuestion() {
    setEditingId(null);
    setEditing(emptyDraft());
    setFormKey((value) => value + 1);
    setError("");
    setNotice("");
  }

  /** Открывает форму с данными существующего вопроса. */
  function handleEditQuestion(question: Question) {
    setEditingId(question.id);
    setEditing(draftFromQuestion(question));
    setFormKey((value) => value + 1);
    setError("");
    setNotice("");
  }

  function closeEditor() {
    setEditing(null);
    setEditingId(null);
  }

  /** Сохраняет вопрос: новый создаём, существующий обновляем. */
  async function handleSaveQuestion(draft: QuestionDraft) {
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
      expectedAnswer: hasExpectedAnswer(draft.type) ? draft.expectedAnswer.trim() || null : null,
      points: clamp(draft.points, MIN_POINTS, MAX_POINTS),
      options: hasOptions(draft.type)
        ? draft.options
            .filter((option) => option.text.trim().length > 0)
            .map((option) => ({ text: option.text.trim(), isCorrect: option.isCorrect }))
        : [],
    };

    try {
      await api(editingId ? `/api/tests/${testId}/questions/${editingId}` : `/api/tests/${testId}/questions`, {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      await load();
      setNotice(t("tests.question.saved"));
      closeEditor();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSavingQuestion(false);
    }
  }

  /** Удаляет вопрос из теста. */
  async function handleDeleteQuestion(question: Question) {
    if (!window.confirm(t("common.confirmDelete"))) {
      return;
    }
    setError("");
    setNotice("");
    try {
      await api(`/api/tests/${testId}/questions/${question.id}`, { method: "DELETE" });
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
          <Link className="btn btn--primary btn--sm" href="/login">{t("nav.login")}</Link>
          <Link className="btn btn--sm" href="/register">{t("nav.register")}</Link>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="stack">
        <p className="muted">{error || t("common.loading")}</p>
        <div className="row">
          <Link className="btn btn--sm" href="/catalog">{t("common.back")}</Link>
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
      </header>

      {error && <div className="alert alert--error">{error}</div>}
      {notice && <div className="alert alert--success">{notice}</div>}
      {!error && !notice && status === "PROCESSING" && (
        <div className="alert alert--info">{t("tests.status.PROCESSING")}</div>
      )}
      {status === "ERROR" && <div className="alert alert--error">{t("tests.status.ERROR")}</div>}

      {/* 1. Настройки теста */}
      <TestSettingsCard
        test={test}
        saving={savingSettings}
        deleting={deletingTest}
        onSave={handleSaveSettings}
        onDelete={handleDeleteTest}
      />

      {/* 2. Генерация вопросов */}
      <GenerationCard
        materials={materials}
        generating={generating}
        status={test.status}
        lastResult={finished}
        initialMaterialId={test.materialId ?? undefined}
        onGenerate={handleGenerate}
        onMaterialsChanged={reloadMaterials}
      />

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
                className={item === test.visibility ? "btn btn--primary btn--sm" : "btn btn--sm"}
                onClick={() => void updateShare(item)}
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
                <button className="btn btn--sm" type="button" onClick={() => void handleCopy()}>
                  {copied ? t("common.copied") : t("tests.visibility.copy")}
                </button>
                <button
                  className="btn btn--sm"
                  type="button"
                  disabled={savingVisibility}
                  onClick={() => void updateShare(test.visibility, true)}
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
        <QuestionList
          questions={test.questions}
          onAdd={handleAddQuestion}
          onEdit={handleEditQuestion}
          onDelete={handleDeleteQuestion}
        />

        {editing && (
          <QuestionEditor
            key={formKey}
            initial={editing}
            saving={savingQuestion}
            isEditing={editingId !== null}
            onSubmit={handleSaveQuestion}
            onCancel={closeEditor}
          />
        )}
      </section>

      {/* 5. Прохождение */}
      {test.questions.length > 0 && (
        <div className="card card--soft row row--between">
          <p className="small muted">{t("tests.questions", { count: test.questions.length })}</p>
          <Link className="btn btn--primary" href={`/tests/${test.id}/take`}>
            {t("tests.take")}
          </Link>
        </div>
      )}
    </div>
  );
}
