"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";

interface Material {
  id: string;
  title: string;
  content: string | null;
  fileUrl: string | null;
  fileType: string | null;
  status: string;
  createdAt: string;
}

export default function MaterialsPage() {
  const { user } = useApp();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ materials: Material[] }>("/api/materials");
      setMaterials(data.materials);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      if (file) {
        const formData = new FormData();
        formData.append("title", title || file.name);
        formData.append("file", file);
        await api("/api/materials", { method: "POST", body: formData });
      } else {
        await api("/api/materials", {
          method: "POST",
          body: JSON.stringify({ title, content: content || null }),
        });
      }
      setTitle("");
      setContent("");
      setFile(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api(`/api/materials/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления");
    }
  }

  if (!user) return <p>Войдите, чтобы управлять материалами.</p>;

  return (
    <div>
      <h1 className="page-title">Материалы</h1>

      <form className="card" onSubmit={handleCreate}>
        <h3>Новый материал</h3>
        <div className="form-group">
          <label>Название</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
          />
        </div>
        <div className="form-group">
          <label>Текст материала</label>
          <textarea
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Введите или вставьте текст…"
          />
        </div>
        <div className="form-group">
          <label>Или файл (.txt, .pdf, .docx, до 5 МБ)</label>
          <input
            type="file"
            accept=".txt,.pdf,.docx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={creating}>
          {creating ? "Сохранение…" : "Сохранить"}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {materials.length === 0 && <p className="muted">Материалов пока нет.</p>}

      {materials.map((m) => (
        <div className="card" key={m.id}>
          <h3>{m.title}</h3>
          {m.fileType && <span className="badge">{m.fileType}</span>}
          {m.content && (
            <p className="muted">
              {m.content.slice(0, 120)}
              {m.content.length > 120 ? "…" : ""}
            </p>
          )}
          <button className="btn btn-danger" onClick={() => handleDelete(m.id)}>
            Удалить
          </button>
        </div>
      ))}
    </div>
  );
}
