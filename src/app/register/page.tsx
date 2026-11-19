"use client";

// Страница регистрации: имя, почта и пароль, после успеха — каталог тестов.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";

interface RegisterResponse {
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const { refresh, t } = useApp();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api<RegisterResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      });

      // После регистрации сервер сразу выдаёт cookie входа.
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
            <h1 className="page-title">{t("auth.register.title")}</h1>
            <p className="page-subtitle">{t("auth.register.subtitle")}</p>
          </div>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          {error && <div className="alert alert--error">{error}</div>}

          <label className="field">
            <span className="field__label">{t("auth.username")}</span>
            <input
              className="input"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength={2}
              maxLength={50}
              required
            />
          </label>

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
            <span className="field__label">{t("auth.password.min")}</span>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>

          <button className="btn btn--primary btn--block" type="submit" disabled={loading}>
            {t("auth.register.submit")}
          </button>
        </form>

        <p className="muted small" style={{ marginTop: 14 }}>
          {t("auth.register.hasAccount")}{" "}
          <Link className="link" href="/login">
            {t("auth.register.toLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
