"use client";

// Прохождение теста по публичной ссылке — работает и без входа в систему.

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";
import {
  QuizRunner,
  ResultView,
  type AttemptResult,
  type AttemptTest,
  type SubmittedAnswer,
} from "@/components/quiz-runner";

export default function PublicTestPage() {
  const params = useParams<{ token: string }>();

  // key сбрасывает прогресс, если открыть другую ссылку.
  return <PublicTest key={params.token} token={params.token} />;
}

function PublicTest({ token }: { token: string }) {
  const { user, loading, t } = useApp();

  const [attempt, setAttempt] = useState<AttemptTest | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [started, setStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loaded) {
      return;
    }

    let cancelled = false;

    api<{ attempt: AttemptTest }>(`/api/tests/public/${token}`)
      .then((data) => {
        if (!cancelled) {
          setAttempt(data.attempt);
          setLoaded(true);
        }
      })
      .catch(() => {
        // Ссылка могла устареть — показываем «тест не найден».
        if (!cancelled) {
          setError(t("public.notFound"));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, loaded, t]);

  async function submit(answers: SubmittedAnswer[], durationMs: number) {
    setSubmitting(true);
    setError("");
    try {
      const data = await api<{ result: AttemptResult }>(
        `/api/tests/public/${token}/submit`,
        {
          method: "POST",
          body: JSON.stringify({
            // Имя нужно только гостю, у вошедшего результат идёт в профиль.
            guestName: user ? undefined : guestName.trim() || undefined,
            answers,
            durationMs,
          }),
        }
      );
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  function restart() {
    setResult(null);
    setStarted(false);
  }

  if (result) {
    return <ResultView result={result} onRepeat={restart} />;
  }

  if (!attempt) {
    return error ? (
      <div className="alert alert--error">{error}</div>
    ) : (
      <Loading />
    );
  }

  return (
    <div>
      {error && <div className="alert alert--error">{error}</div>}

      {started ? (
        <QuizRunner attempt={attempt} submitting={submitting} onSubmit={submit} />
      ) : (
        <div className="quiz">
          <div className="card">
            <div className="stack">
              <div>
                <h1 className="page-title">{attempt.title}</h1>
                {attempt.description && (
                  <p className="page-subtitle">{attempt.description}</p>
                )}
              </div>

              <p className="muted">
                {t("quiz.intro.description", {
                  count: attempt.questionCount,
                  points: attempt.totalPoints,
                })}
              </p>

              {!loading && !user && (
                <div className="field">
                  <label className="field__label" htmlFor="guest-name">
                    {t("quiz.intro.name")}
                  </label>
                  <input
                    id="guest-name"
                    className="input"
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                    placeholder={t("quiz.intro.name.placeholder")}
                    maxLength={50}
                    autoComplete="name"
                  />
                  <p className="field__hint">{t("quiz.intro.guestHint")}</p>
                </div>
              )}

              {user && (
                <p className="field__hint">
                  {t("quiz.intro.loginHint", { name: user.username })}
                </p>
              )}

              <div>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setStarted(true)}
                  disabled={loading}
                >
                  {t("quiz.intro.start")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Заглушка на время загрузки. */
function Loading() {
  const { t } = useApp();

  return (
    <div className="stack">
      <div className="skeleton" style={{ height: 26, width: "40%" }} />
      <p className="muted small">{t("common.loading")}</p>
    </div>
  );
}
