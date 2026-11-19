"use client";

// Каталог публичных тестов. Доступен всем, в том числе без входа.
// Здесь только прохождение — создание и редактирование живут в «Моих тестах».

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";
import { ListToolbar, type ToolbarSortOption } from "@/components/list-toolbar";
import type { Language } from "@/i18n/dictionary";

interface PublicTest {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  language: Language;
  shareToken: string | null;
  createdAt: string;
}

interface PublicTestsResponse {
  tests: PublicTest[];
  total: number;
}

type SortBy = "createdAt" | "title";
type SortOrder = "asc" | "desc";

/** Пауза перед запросом, чтобы не искать на каждую введённую букву. */
const SEARCH_DELAY_MS = 300;

/** Сколько тестов загружаем за раз. */
const PAGE_LIMIT = 24;

export default function CatalogPage() {
  const { t, language } = useApp();

  const [tests, setTests] = useState<PublicTest[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
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
      const data = await api<PublicTestsResponse>(
        `/api/tests/public?${params.toString()}`
      );
      setTests(data.tests);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [search, category, sortBy, sortOrder, t]);

  // Категории публичных тестов для выпадающего фильтра.
  useEffect(() => {
    api<{ categories: string[] }>("/api/tests/categories?scope=public")
      .then((data) => setCategories(data.categories))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, SEARCH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [load]);

  /** Дата создания в коротком виде. */
  function formatDate(value: string): string {
    return new Date(value).toLocaleDateString(language === "RU" ? "ru-RU" : "en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">{t("catalog.title")}</h1>
          <p className="page-subtitle">{t("catalog.subtitle")}</p>
        </div>
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

      {loading && tests.length === 0 && <p className="muted">{t("common.loading")}</p>}

      {!loading && tests.length === 0 && (
        <div className="empty">
          <p className="empty__title">{t("catalog.public.empty")}</p>
        </div>
      )}

      {tests.length > 0 && (
        <div className="grid grid--2">
          {tests.map((test) => (
            <article className="card" key={test.id}>
              <div className="card__header">
                <h3 className="card__title">{test.title}</h3>
                {test.category && <span className="badge">{test.category}</span>}
              </div>

              {test.description && <p className="muted">{test.description}</p>}

              <div className="row row--between" style={{ marginTop: 12 }}>
                <span className="small muted">{formatDate(test.createdAt)}</span>

                {test.shareToken && (
                  <Link className="btn btn--primary btn--sm" href={`/t/${test.shareToken}`}>
                    {t("catalog.public.take")}
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
