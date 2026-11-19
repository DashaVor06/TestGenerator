"use client";

// «Мои тесты»: список собственных тестов с единым блоком поиска и сортировки.
// У каждого теста две кнопки — пройти и редактировать.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";
import { ListToolbar, type ToolbarSortOption } from "@/components/list-toolbar";
import type { Language, TranslationKey } from "@/i18n/dictionary";

type TestStatus = "PENDING" | "PROCESSING" | "READY" | "ERROR";
type SortBy = "createdAt" | "title";
type SortOrder = "asc" | "desc";

interface TestItem {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  language: Language;
  status: TestStatus;
  createdAt: string;
}

interface TestsResponse {
  tests: TestItem[];
  total: number;
}

/** Пауза перед запросом, чтобы не искать на каждую введённую букву. */
const SEARCH_DELAY_MS = 300;
const PAGE_LIMIT = 30;

const STATUS_KEYS: Record<TestStatus, TranslationKey> = {
  PENDING: "catalog.status.PENDING",
  PROCESSING: "catalog.status.PROCESSING",
  READY: "catalog.status.READY",
  ERROR: "catalog.status.ERROR",
};

const STATUS_BADGES: Record<TestStatus, string> = {
  PENDING: "badge badge--warning",
  PROCESSING: "badge badge--primary",
  READY: "badge badge--success",
  ERROR: "badge badge--danger",
};

export default function MyTestsPage() {
  const { user, loading, t, language } = useApp();

  const [tests, setTests] = useState<TestItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingTests, setLoadingTests] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const sortOptions: ToolbarSortOption[] = [
    { value: "createdAt", label: t("catalog.sort.createdAt") },
    { value: "title", label: t("catalog.sort.title") },
  ];

  const load = useCallback(async () => {
    setLoadingTests(true);
    setError("");

    const params = new URLSearchParams({
      sortBy,
      sortOrder,
      limit: String(PAGE_LIMIT),
    });
    if (search.trim()) {
      params.set("search", search.trim());
    }
    if (category.trim()) {
      params.set("category", category.trim());
    }

    try {
      const data = await api<TestsResponse>(`/api/tests?${params.toString()}`);
      setTests(data.tests);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoadingTests(false);
    }
  }, [search, category, sortBy, sortOrder, t]);

  // Существующие категории нужны выпадающему фильтру.
  useEffect(() => {
    if (!user) {
      return;
    }

    api<{ categories: string[] }>("/api/tests/categories")
      .then((data) => setCategories(data.categories))
      .catch(() => setCategories([]));
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const timer = setTimeout(() => {
      void load();
    }, SEARCH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [user, load]);

  /** Дата создания в коротком виде. */
  function formatDate(value: string): string {
    return new Date(value).toLocaleDateString(language === "RU" ? "ru-RU" : "en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  if (loading) {
    return <p className="muted">{t("common.loading")}</p>;
  }

  if (!user) {
    return (
      <div className="empty">
        <p className="empty__title">{t("auth.required")}</p>
        <div className="row" style={{ justifyContent: "center" }}>
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

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">{t("tests.my.title")}</h1>
          <p className="page-subtitle">{t("tests.my.subtitle")}</p>
        </div>

        <Link className="btn btn--primary btn--sm" href="/tests/new">
          {t("catalog.new.button")}
        </Link>
      </header>

      <ListToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder={t("catalog.search.placeholder")}
        categories={categories}
        category={category}
        onCategory={setCategory}
        sortOptions={sortOptions}
        sortBy={sortBy}
        onSortBy={(value) => setSortBy(value === "title" ? "title" : "createdAt")}
        sortOrder={sortOrder}
        onSortOrder={setSortOrder}
        resultLabel={t("common.found", { count: total })}
      />

      {error && <div className="alert alert--error">{error}</div>}

      {loadingTests && tests.length === 0 && (
        <p className="muted">{t("common.loading")}</p>
      )}

      {!loadingTests && tests.length === 0 && (
        <div className="empty">
          <p className="empty__title">{t("tests.my.empty")}</p>
          <Link className="btn btn--primary btn--sm" href="/tests/new">
            {t("catalog.new.button")}
          </Link>
        </div>
      )}

      {tests.length > 0 && (
        <div className="list">
          {tests.map((test) => (
            <article className="card" key={test.id}>
              <div className="card__header">
                <div>
                  <h3 className="card__title">{test.title}</h3>
                  <div className="row small muted">
                    {test.category && <span className="badge">{test.category}</span>}
                    <span className={STATUS_BADGES[test.status]}>
                      {t(STATUS_KEYS[test.status])}
                    </span>
                    <span>{formatDate(test.createdAt)}</span>
                  </div>
                </div>

                <div className="row">
                  <Link className="btn btn--primary btn--sm" href={`/tests/${test.id}/take`}>
                    {t("tests.card.take")}
                  </Link>
                  <Link className="btn btn--sm" href={`/tests/${test.id}`}>
                    {t("tests.card.edit")}
                  </Link>
                </div>
              </div>

              {test.description && <p className="muted">{test.description}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
