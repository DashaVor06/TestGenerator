"use client";

// Страница входа: почта и пароль, после успеха — переход в каталог тестов.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";

interface LoginResponse {
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export default function LoginPage() {
  const router = useRouter();
  const { refresh, t } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // Обновляем пользователя в общем состоянии, чтобы шапка сразу ожила.
      await refresh();
      router.push("/catalog");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <div className="card">
        <div className="card__header">
          <div>
            <h1 className="page-title">{t("auth.login.title")}</h1>
            <p className="page-subtitle">{t("auth.login.subtitle")}</p>
          </div>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          {error && <div className="alert alert--error">{error}</div>}

          <label className="field">
            <span className="field__label">{t("auth.email")}</span>
            <input
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span className="field__label">{t("auth.password")}</span>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button className="btn btn--primary btn--block" type="submit" disabled={loading}>
            {t("auth.login.submit")}
          </button>
        </form>

        <p className="muted small" style={{ marginTop: 14 }}>
          {t("auth.login.noAccount")}{" "}
          <Link className="link" href="/register">
            {t("auth.login.toRegister")}
          </Link>
        </p>
      </div>
    </div>
  );
}
