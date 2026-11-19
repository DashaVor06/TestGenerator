"use client";

// Шапка приложения: навигация, переключатель языка и темы, вход/выход.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "./providers";
import { api } from "@/lib/api";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, language, setLanguage, theme, toggleTheme, t, refresh } = useApp();

  async function handleLogout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      await refresh();
      router.push("/login");
    }
  }

  /** Подсвечивает активный раздел меню. */
  function linkClass(href: string): string {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return active ? "nav__link nav__link--active" : "nav__link";
  }

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link href="/catalog" className="brand">
          <span className="brand__logo">Т</span>
          <span>{t("app.name")}</span>
        </Link>

        <nav className="nav" aria-label={t("nav.menu")}>
          <Link href="/catalog" className={linkClass("/catalog")}>
            {t("nav.catalog")}
          </Link>
          {user && (
            <>
              <Link href="/tests" className={linkClass("/tests")}>
                {t("nav.myTests")}
              </Link>
              <Link href="/materials" className={linkClass("/materials")}>
                {t("nav.materials")}
              </Link>
              <Link href="/results" className={linkClass("/results")}>
                {t("nav.results")}
              </Link>
            </>
          )}
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setLanguage(language === "RU" ? "EN" : "RU")}
            title={t("common.language")}
            aria-label={t("common.language")}
          >
            {language}
          </button>

          <button
            type="button"
            className="icon-btn"
            onClick={toggleTheme}
            title={theme === "dark" ? t("common.theme.light") : t("common.theme.dark")}
            aria-label={theme === "dark" ? t("common.theme.light") : t("common.theme.dark")}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>

          {user ? (
            <>
              <Link href="/profile" className="user-chip">
                <span className="user-chip__avatar">{user.username.slice(0, 1)}</span>
                <span>{user.username}</span>
              </Link>
              <button type="button" className="btn btn--ghost btn--sm" onClick={handleLogout}>
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn--ghost btn--sm">
                {t("nav.login")}
              </Link>
              <Link href="/register" className="btn btn--primary btn--sm">
                {t("nav.register")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
