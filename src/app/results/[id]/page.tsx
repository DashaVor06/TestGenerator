"use client";

// Разбор ошибок по одному сохранённому результату.

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";
import { ResultView, type AttemptResult } from "@/components/quiz-runner";

export default function ResultPage() {
  const { user, loading, t } = useApp();
  const params = useParams<{ id: string }>();
  const resultId = params.id;

  const [result, setResult] = useState<AttemptResult | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading || !user) {
      return;
    }

    let cancelled = false;

    api<{ result: AttemptResult }>(`/api/results/${resultId}`)
      .then((data) => {
        if (!cancelled) {
          setResult(data.result);
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
  }, [resultId, loading, user, t]);

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

  if (error) {
    return <div className="alert alert--error">{error}</div>;
  }

  if (!result) {
    return null;
  }

  return (
    <ResultView
      result={result}
      backHref="/results"
      backLabel={t("quiz.result.toResults")}
    />
  );
}
