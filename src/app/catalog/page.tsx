"use client";

// Каталог публичных тестов. Доступен всем, в том числе без входа.
// Здесь только прохождение — создание и редактирование живут в «Моих тестах».

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";
import type { Language, TranslationKey } from "@/i18n/dictionary";

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

const SORT_BY_KEYS: Record<SortBy, TranslationKey> = {
  createdAt: "catalog.sort.createdAt",
  title: "catalog.sort.title",
};

/** Дата создания в коротком виде. */
function formatDate(value: string, language: Language): string {
  return new Date(value).toLocaleDateString(language === "RU" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CatalogPage() {
  const { t, language } = useApp();

  const [tests, setTests] = useState<PublicTest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

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

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, SEARCH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">{t("catalog.title")}</h1>
          <p className="page-subtitle">{t("catalog.subtitle")}</p>
        </div>
      </header>

      <section className="card">
        <div className="grid grid--3">
          <div className="field">
            <label className="field__label" htmlFor="catalog-search">
              {t("common.search")}
            </label>
            <input
              id="catalog-search"
              className="input"
              placeholder={t("catalog.search.placeholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="catalog-category">
              {t("catalog.field.category")}
            </label>
            <input
              id="catalog-category"
              className="input"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              maxLength={100}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="catalog-sort-by">
              {t("catalog.sort")}
            </label>
            <div className="row">
              <select
                id="catalog-sort-by"
                className="select"
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value === "title" ? "title" : "createdAt")
                }
              >
                <option value="createdAt">{t(SORT_BY_KEYS.createdAt)}</option>
                <option value="title">{t(SORT_BY_KEYS.title)}</option>
              </select>

              <select
                className="select"
                aria-label={t("catalog.sort")}
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(event.target.value === "asc" ? "asc" : "desc")
                }
              >
                <option value="desc">{t("catalog.sort.desc")}</option>
                <option value="asc">{t("catalog.sort.asc")}</option>
              </select>
            </div>
          </div>
        </div>

        <p className="small muted" style={{ marginTop: 10 }}>
          {t("catalog.found", { count: total })}
        </p>
      </section>

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
                <span className="small muted">{formatDate(test.createdAt, language)}</span>

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
