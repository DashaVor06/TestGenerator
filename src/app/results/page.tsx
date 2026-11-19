"use client";

// История прохождений: список сохранённых результатов и ссылки на разбор.

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";

interface ResultSummary {
  id: string;
  testId: string;
  score: number;
  maxScore: number;
  percentCorrect: number;
  durationMs: number | null;
  completedAt: string;
}

interface ResultRow {
  result: ResultSummary;
  test: { id: string; title: string };
}

export default function ResultsPage() {
  const { user, loading, language, t } = useApp();
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading || !user) {
      return;
    }

    let cancelled = false;

    api<{ results: ResultRow[] }>("/api/results")
      .then((data) => {
        if (!cancelled) {
          setRows(data.results);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("common.error"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPageLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loading, user, t]);

  if (loading) {
    return (
      <div className="stack">
        <div className="skeleton" style={{ height: 26, width: "40%" }} />
        <p className="muted small">{t("common.loading")}</p>
      </div>
    );
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

  if (pageLoading) {
    return (
      <div className="stack">
        <div className="skeleton" style={{ height: 26, width: "40%" }} />
        <p className="muted small">{t("common.loading")}</p>
      </div>
    );
  }

  const locale = language === "RU" ? "ru-RU" : "en-US";

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("results.title")}</h1>
          <p className="page-subtitle">{t("results.subtitle")}</p>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {rows.length === 0 && !error && (
        <div className="empty">
          <p className="empty__title">{t("results.empty")}</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="list">
          {rows.map(({ result, test }) => (
            <div className="list__item" key={result.id}>
              <div>
                <p className="card__title">{test.title}</p>
                <p className="muted small">
                  {new Date(result.completedAt).toLocaleString(locale)}
                </p>
              </div>

              <div className="row">
                <span
                  className={
                    result.percentCorrect >= 60
                      ? "badge badge--success"
                      : "badge badge--danger"
                  }
                >
                  {t("quiz.result.percent", { percent: result.percentCorrect })}
                </span>
                <span className="muted small">
                  {t("quiz.result.score", {
                    score: result.score,
                    max: result.maxScore,
                  })}
                </span>
                <Link href={`/results/${result.id}`} className="link small">
                  {t("results.review")}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
