"use client";

// Прохождение своего теста: стартовый экран, вопросы и результат.

import Link from "next/link";
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

export default function TakeTestPage() {
  const params = useParams<{ id: string }>();

  // key нужен, чтобы при переходе к другому тесту состояние сбросилось.
  return <TakeTest key={params.id} testId={params.id} />;
}

function TakeTest({ testId }: { testId: string }) {
  const { user, loading, t } = useApp();

  const [attempt, setAttempt] = useState<AttemptTest | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [started, setStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Ждём пользователя и не перезапрашиваем уже загруженный тест.
    if (loading || !user || loaded) {
      return;
    }

    let cancelled = false;

    api<{ attempt: AttemptTest }>(`/api/tests/${testId}/attempt`)
      .then((data) => {
        if (!cancelled) {
          setAttempt(data.attempt);
          setLoaded(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("common.error"));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [testId, loading, user, loaded, t]);

  async function submit(answers: SubmittedAnswer[], durationMs: number) {
    setSubmitting(true);
    setError("");
    try {
      const data = await api<{ result: AttemptResult }>(
        `/api/tests/${testId}/submit`,
        {
          method: "POST",
          body: JSON.stringify({ answers, durationMs }),
        }
      );
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  /** Ещё раз — возвращаемся к стартовому экрану этого же теста. */
  function restart() {
    setResult(null);
    setStarted(false);
  }

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return (
      <div className="empty">
        <p className="empty__title">{t("auth.required")}</p>
        <Link href="/login" className="btn btn--primary btn--sm">
          {t("auth.login.title")}
        </Link>
      </div>
    );
  }

  if (result) {
    return (
      <ResultView
        result={result}
        onRepeat={restart}
        backHref={`/tests/${testId}`}
        backLabel={t("quiz.result.toTest")}
      />
    );
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

              <div className="row">
                {attempt.category && (
                  <span className="badge badge--primary">{attempt.category}</span>
                )}
                <span className="muted">
                  {t("quiz.intro.description", {
                    count: attempt.questionCount,
                    points: attempt.totalPoints,
                  })}
                </span>
              </div>

              <p className="field__hint">
                {t("quiz.intro.loginHint", { name: user.username })}
              </p>

              <div>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setStarted(true)}
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
