"use client";

// История прохождений: список сохранённых результатов, поиск, сортировка
// и переход к подробному разбору.

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";
import { ListToolbar, type ToolbarSortOption } from "@/components/list-toolbar";

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

type SortBy = "date" | "percent";
type SortOrder = "asc" | "desc";

export default function ResultsPage() {
  const { user, loading, language, t } = useApp();

  const [rows, setRows] = useState<ResultRow[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const sortOptions: ToolbarSortOption[] = [
    { value: "date", label: t("results.sort.date") },
    { value: "percent", label: t("results.sort.percent") },
  ];

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
  const query = search.trim().toLowerCase();

  // Поиск и сортировка выполняются на клиенте: результатов у пользователя немного.
  const visible = rows
    .filter((row) => row.test.title.toLowerCase().includes(query))
    .sort((first, second) => {
      const difference =
        sortBy === "percent"
          ? first.result.percentCorrect - second.result.percentCorrect
          : new Date(first.result.completedAt).getTime() -
            new Date(second.result.completedAt).getTime();

      return sortOrder === "asc" ? difference : -difference;
    });

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">{t("results.title")}</h1>
          <p className="page-subtitle">{t("results.subtitle")}</p>
        </div>
      </header>

      <ListToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder={t("results.search.placeholder")}
        sortOptions={sortOptions}
        sortBy={sortBy}
        onSortBy={(value) => setSortBy(value === "percent" ? "percent" : "date")}
        sortOrder={sortOrder}
        onSortOrder={setSortOrder}
        resultLabel={t("common.found", { count: visible.length })}
      />

      {error && <div className="alert alert--error">{error}</div>}

      {visible.length === 0 && !error && (
        <div className="empty">
          <p className="empty__title">
            {rows.length === 0 ? t("results.empty") : t("common.empty")}
          </p>
        </div>
      )}

      {visible.length > 0 && (
        <div className="list">
          {visible.map(({ result, test }) => (
            <article className="list__item" key={result.id}>
              <div>
                <p className="card__title">{test.title}</p>
                <p className="muted small">
                  {new Date(result.completedAt).toLocaleString(locale)}
                  {result.durationMs !== null && (
                    <>
                      {" · "}
                      {t("quiz.result.timeLabel")}:{" "}
                      {Math.round(result.durationMs / 1000)} {t("common.seconds")}
                    </>
                  )}
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
                <Link href={`/results/${result.id}`} className="btn btn--sm">
                  {t("results.details")}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
