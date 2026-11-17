"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";

interface Test {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  status: string;
  createdAt: string;
}

export default function CatalogPage() {
  const { user, loading } = useApp();
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams({ sortBy, sortOrder });
    if (search) params.set("search", search);
    api<{ tests: Test[] }>(`/api/tests?${params.toString()}`)
      .then((data) => setTests(data.tests))
      .catch((err) => setError(err.message));
  }, [user, search, sortBy, sortOrder]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const data = await api<{ test: Test }>("/api/tests", {
        method: "POST",
        body: JSON.stringify({ title, category: category || null }),
      });
      router.push(`/tests/${data.test.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания");
      setCreating(false);
    }
  }

  if (loading) return <p className="muted">Загрузка…</p>;
  if (!user) {
    return (
      <p>
        Войдите, чтобы увидеть каталог — <Link href="/login">вход</Link>
      </p>
    );
  }

  return (
    <div>
      <h1 className="page-title">Каталог тестов</h1>

      <form className="card" onSubmit={handleCreate}>
        <h3>Новый тест</h3>
        <div className="form-row">
          <input
            placeholder="Название теста"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
          />
          <input
            placeholder="Категория"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={creating}>
            {creating ? "Создание…" : "Создать"}
          </button>
        </div>
      </form>

      <div className="card">
        <div className="form-row">
          <input
            placeholder="Поиск по названию…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="createdAt">По дате</option>
            <option value="title">По названию</option>
          </select>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="desc">Сначала новые</option>
            <option value="asc">Сначала старые</option>
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {tests.length === 0 && <p className="muted">Тестов пока нет.</p>}

      {tests.map((t) => (
        <div className="card" key={t.id}>
          <h3>{t.title}</h3>
          {t.category && <span className="badge">{t.category}</span>}
          <p className="muted">{t.description}</p>
          <Link className="btn" href={`/tests/${t.id}`}>
            Открыть
          </Link>
        </div>
      ))}
    </div>
  );
}
