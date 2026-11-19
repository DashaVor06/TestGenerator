"use client";

// Каталог: свои тесты (поиск, сортировка, создание) и публичные тесты других авторов.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";
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
  shareToken: string | null;
  createdAt: string;
}

interface TestsResponse {
  tests: TestItem[];
  total: number;
  page: number;
  limit: number;
}

// Подписи статусов и цвет значка для каждого статуса.
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

// Сколько тестов показывать в блоке публичных.
const PUBLIC_LIMIT = 6;
// Пауза перед запросом, чтобы не искать на каждую введённую букву.
const SEARCH_DELAY_MS = 300;

/** Дата создания теста в коротком виде. */
function formatDate(value: string, language: Language): string {
  const locale = language === "RU" ? "ru-RU" : "en-US";
  return new Date(value).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CatalogPage() {
  const { user, loading, t, language } = useApp();
  const router = useRouter();

  const [tests, setTests] = useState<TestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingTests, setLoadingTests] = useState(false);
  const [error, setError] = useState("");

  // Фильтры списка своих тестов.
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Форма нового теста.
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newLanguage, setNewLanguage] = useState<Language>(language);
  const [creating, setCreating] = useState(false);

  // Публичный каталог доступен и гостям.
  const [publicTests, setPublicTests] = useState<TestItem[]>([]);
  const [publicLoaded, setPublicLoaded] = useState(false);

  /** Загружает свои тесты с учётом поиска, категории и сортировки. */
  const loadTests = useCallback(async () => {
    setLoadingTests(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      params.set("limit", "20");
      if (search.trim()) {
        params.set("search", search.trim());
      }
      if (category.trim()) {
        params.set("category", category.trim());
      }

      const data = await api<TestsResponse>(`/api/tests?${params.toString()}`);
      setTests(data.tests);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoadingTests(false);
    }
  }, [search, category, sortBy, sortOrder, t]);

  // Список перезагружается с небольшой задержкой после смены фильтров.
  useEffect(() => {
    if (!user) {
      return;
    }

    const timer = setTimeout(() => {
      void loadTests();
    }, SEARCH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [user, loadTests]);

  // Публичные тесты грузим сразу — они видны даже без входа.
  useEffect(() => {
    let alive = true;

    api<TestsResponse>(`/api/tests/public?limit=${PUBLIC_LIMIT}`)
      .then((data) => {
        if (alive) {
          setPublicTests(data.tests);
        }
      })
      .catch(() => {
        if (alive) {
          setPublicTests([]);
        }
      })
      .finally(() => {
        if (alive) {
          setPublicLoaded(true);
        }
      });

    return () => {
      alive = false;
    };
  }, []);

  /** Создаёт тест и сразу открывает страницу управления. */
  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const data = await api<{ test: TestItem }>("/api/tests", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          category: newCategory.trim() || null,
          description: description.trim() || null,
          language: newLanguage,
        }),
      });
      router.push(`/tests/${data.test.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
      setCreating(false);
    }
  }

  if (loading) {
    return <p className="muted">{t("common.loading")}</p>;
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1 className="page-title">{t("catalog.title")}</h1>
          <p className="page-subtitle">{t("catalog.subtitle")}</p>
        </div>
      </header>

      {!user ? (
        <div className="card stack">
          <h2 className="card__title">{t("auth.required")}</h2>
          <p className="muted">{t("auth.login.subtitle")}</p>
          <div className="row">
            <Link className="btn btn--primary btn--sm" href="/login">
              {t("nav.login")}
            </Link>
            <Link className="btn btn--sm" href="/register">
              {t("nav.register")}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <form className="card" onSubmit={handleCreate}>
            <div className="card__header">
              <h2 className="card__title">{t("catalog.new.title")}</h2>
            </div>

            <div className="stack">
              <div className="grid grid--2">
                <div className="field">
                  <label className="field__label" htmlFor="new-test-title">
                    {t("catalog.field.title")}
                  </label>
                  <input
                    id="new-test-title"
                    className="input"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                    minLength={2}
                    maxLength={200}
                  />
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="new-test-category">
                    {t("catalog.field.category")}
                  </label>
                  <input
                    id="new-test-category"
                    className="input"
                    value={newCategory}
                    onChange={(event) => setNewCategory(event.target.value)}
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="new-test-description">
                  {t("catalog.field.description")}
                </label>
                <textarea
                  id="new-test-description"
                  className="textarea"
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={2000}
                />
              </div>

              <div className="field">
                <label className="field__label" htmlFor="new-test-language">
                  {t("tests.field.language")}
                </label>
                <select
                  id="new-test-language"
                  className="select"
                  value={newLanguage}
                  onChange={(event) =>
                    setNewLanguage(event.target.value === "EN" ? "EN" : "RU")
                  }
                >
                  <option value="RU">{t("tests.field.language.ru")}</option>
                  <option value="EN">{t("tests.field.language.en")}</option>
                </select>
              </div>

              <div className="row">
                <button className="btn btn--primary" type="submit" disabled={creating}>
                  {creating ? t("common.saving") : t("common.create")}
                </button>
              </div>
            </div>
          </form>

          <div className="card">
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
                    <option value="createdAt">{t("catalog.sort.createdAt")}</option>
                    <option value="title">{t("catalog.sort.title")}</option>
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
          </div>

          {error && <div className="alert alert--error">{error}</div>}

          {loadingTests && tests.length === 0 ? (
            <p className="muted">{t("common.loading")}</p>
          ) : tests.length === 0 ? (
            <div className="empty">
              <p className="empty__title">{t("catalog.empty")}</p>
            </div>
          ) : (
            <>
              <p className="small muted">{t("catalog.found", { count: total })}</p>

              <div className="grid grid--2">
                {tests.map((item) => (
                  <div key={item.id}>
                    <article className="card stack">
                      <div className="row row--between">
                        <h3 className="card__title">{item.title}</h3>
                        <span className={STATUS_BADGES[item.status]}>
                          {t(STATUS_KEYS[item.status])}
                        </span>
                      </div>

                      <div className="row">
                        {item.category && (
                          <span className="badge badge--primary">{item.category}</span>
                        )}
                        <span className="small muted">
                          {formatDate(item.createdAt, language)}
                        </span>
                      </div>

                      {item.description && <p className="muted">{item.description}</p>}

                      <div className="row">
                        <Link className="btn btn--primary btn--sm" href={`/tests/${item.id}`}>
                          {t("catalog.open")}
                        </Link>
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <section className="stack">
        <div>
          <h2 className="card__title">{t("catalog.public.title")}</h2>
          <p className="muted small">{t("catalog.public.subtitle")}</p>
        </div>

        {!publicLoaded && <p className="muted">{t("common.loading")}</p>}

        {publicLoaded && publicTests.length === 0 && (
          <div className="empty">
            <p className="empty__title">{t("catalog.public.empty")}</p>
          </div>
        )}

        {publicTests.length > 0 && (
          <div className="grid grid--3">
            {publicTests.map((item) => (
              <div key={item.id}>
                <article className="card stack">
                  <h3 className="card__title">{item.title}</h3>

                  <div className="row">
                    {item.category && (
                      <span className="badge badge--primary">{item.category}</span>
                    )}
                    <span className="small muted">
                      {formatDate(item.createdAt, language)}
                    </span>
                  </div>

                  {item.description && (
                    <p className="muted small">{item.description}</p>
                  )}

                  {item.shareToken && (
                    <div className="row">
                      <Link
                        className="btn btn--primary btn--sm"
                        href={`/t/${item.shareToken}`}
                      >
                        {t("catalog.public.take")}
                      </Link>
                    </div>
                  )}
                </article>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
