"use client";

// Личный кабинет: данные пользователя, сводная статистика, язык
// интерфейса, последние уведомления и выход из аккаунта.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";

interface TestsPage {
  tests: { id: string }[];
  total: number;
}

interface ResultsList {
  results: { id: string }[];
}

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

/** Сколько уведомлений показываем в кабинете. */
const NOTIFICATIONS_LIMIT = 5;

export default function ProfilePage() {
  const { user, loading, language, setLanguage, refresh, t } = useApp();
  const router = useRouter();

  const [testsCount, setTestsCount] = useState(0);
  const [resultsCount, setResultsCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  // Статистика и уведомления грузятся одним заходом после входа
  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [tests, results, list] = await Promise.all([
          api<TestsPage>("/api/tests?limit=1"),
          api<ResultsList>("/api/results"),
          api<{ notifications: NotificationItem[] }>("/api/notifications"),
        ]);

        if (cancelled) {
          return;
        }

        setTestsCount(tests.total);
        setResultsCount(results.results.length);
        setNotifications(list.notifications.slice(0, NOTIFICATIONS_LIMIT));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("common.error"));
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [user, t]);

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      // Даже если запрос не прошёл, локальное состояние сбрасываем.
      await refresh();
      router.push("/login");
    }
  }

  function formatDateTime(value: string): string {
    return new Date(value).toLocaleString(language === "EN" ? "en-GB" : "ru-RU");
  }

  if (loading || loggingOut) {
    return <p className="muted">{t("common.loading")}</p>;
  }

  if (!user) {
    return <p className="muted">{t("auth.required")}</p>;
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("profile.title")}</h1>
        </div>

        <button
          type="button"
          className="btn btn--danger"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {t("nav.logout")}
        </button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <div className="card">
        <div className="grid grid--2">
          <div className="field">
            <span className="field__label">{t("auth.username")}</span>
            <span>{user.username}</span>
          </div>

          <div className="field">
            <span className="field__label">{t("auth.email")}</span>
            <span>{user.email}</span>
          </div>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat__value">{testsCount}</div>
          <div className="stat__label">{t("profile.stats.tests")}</div>
        </div>

        <div className="stat">
          <div className="stat__value">{resultsCount}</div>
          <div className="stat__label">{t("profile.stats.results")}</div>
        </div>
      </div>

      <div className="card">
        <div className="row row--between">
          <div>
            <h2 className="card__title">{t("profile.language")}</h2>
            <p className="field__hint">{t("profile.language.hint")}</p>
          </div>

          <div className="tabs">
            <button
              type="button"
              className={language === "RU" ? "tab tab--active" : "tab"}
              onClick={() => setLanguage("RU")}
            >
              RU
            </button>
            <button
              type="button"
              className={language === "EN" ? "tab tab--active" : "tab"}
              onClick={() => setLanguage("EN")}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h2 className="card__title">{t("profile.notifications")}</h2>
        </div>

        {notifications.length === 0 ? (
          <p className="muted">{t("profile.notifications.empty")}</p>
        ) : (
          <div className="list">
            {notifications.map((item) => (
              <div className="list__item" key={item.id}>
                <p>{item.message}</p>
                <span className="small muted">{formatDateTime(item.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
