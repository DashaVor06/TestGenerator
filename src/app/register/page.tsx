"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useApp();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      });
      await refresh();
      router.push("/catalog");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Регистрация</h1>
      <form className="card" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-group">
          <label>Имя пользователя</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={2}
          />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Пароль (минимум 6 символов)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Регистрация…" : "Зарегистрироваться"}
        </button>
        <p className="muted" style={{ marginTop: 12 }}>
          Уже есть аккаунт? <Link href="/login">Войти</Link>
        </p>
      </form>
    </div>
  );
}
