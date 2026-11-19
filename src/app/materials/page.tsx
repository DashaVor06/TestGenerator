"use client";

// Страница учебных материалов: добавление текстом, файлом или ссылкой
// и список уже загруженных материалов.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";

type Tab = "text" | "file" | "url";

interface Material {
  id: string;
  title: string;
  content: string | null;
  fileUrl: string | null;
  fileType: string | null;
  source: "TEXT" | "FILE" | "URL";
  sourceUrl: string | null;
  status: string;
  createdAt: string;
}

/** Сколько символов текста показываем в карточке материала. */
const PREVIEW_LENGTH = 160;

/** Предел размера файла на сервере (МБ) — только для подсказки. */
const MAX_FILE_MB = 25;

export default function MaterialsPage() {
  const { user, loading, language, t } = useApp();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("text");

  // Поля формы
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api<{ materials: Material[] }>("/api/materials");
      setMaterials(data.materials);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setListLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (user) {
      void load();
    }
  }, [user, load]);

  /** Очищает поля после успешного добавления. */
  function resetForm() {
    setTitle("");
    setContent("");
    setUrl("");
    setFile(null);
  }

  /** Отправляет материал одним из трёх способов в зависимости от вкладки. */
  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setCreating(true);

    try {
      if (tab === "text") {
        await api<{ material: Material }>("/api/materials", {
          method: "POST",
          body: JSON.stringify({ title, content }),
        });
      } else if (tab === "file") {
        if (!file) {
          setError(t("materials.error.emptyFile"));
          return;
        }

        const formData = new FormData();
        formData.append("title", title || file.name);
        formData.append("file", file);

        await api<{ material: Material }>("/api/materials", {
          method: "POST",
          body: formData,
        });
      } else {
        await api<{ material: Material }>("/api/materials", {
          method: "POST",
          body: JSON.stringify({ title: title || undefined, sourceUrl: url }),
        });
      }

      resetForm();
      setNotice(t("materials.added"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(material: Material) {
    if (!window.confirm(t("common.confirmDelete"))) {
      return;
    }

    setDeletingId(material.id);
    setError("");

    try {
      await api(`/api/materials/${material.id}`, { method: "DELETE" });
      setMaterials((previous) => previous.filter((item) => item.id !== material.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setDeletingId("");
    }
  }

  function sourceLabel(source: Material["source"]): string {
    if (source === "FILE") {
      return t("materials.source.FILE");
    }
    if (source === "URL") {
      return t("materials.source.URL");
    }
    return t("materials.source.TEXT");
  }

  function sourceClass(source: Material["source"]): string {
    if (source === "FILE") {
      return "badge badge--primary";
    }
    if (source === "URL") {
      return "badge badge--warning";
    }
    return "badge badge--success";
  }

  function formatDate(value: string): string {
    return new Date(value).toLocaleDateString(language === "EN" ? "en-GB" : "ru-RU");
  }

  function preview(text: string): string {
    return text.length > PREVIEW_LENGTH
      ? `${text.slice(0, PREVIEW_LENGTH)}…`
      : text;
  }

  if (loading) {
    return <p className="muted">{t("common.loading")}</p>;
  }

  if (!user) {
    return (
      <div className="empty">
        <p className="empty__title">{t("auth.required")}</p>
        <Link className="link" href="/login">
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("materials.title")}</h1>
          <p className="page-subtitle">{t("materials.subtitle")}</p>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {notice && <div className="alert alert--success">{notice}</div>}

      <form className="card" onSubmit={handleCreate}>
        <div className="card__header">
          <h2 className="card__title">{t("materials.create")}</h2>

          <div className="tabs">
            <button
              type="button"
              className={tab === "text" ? "tab tab--active" : "tab"}
              onClick={() => setTab("text")}
            >
              {t("materials.tab.text")}
            </button>
            <button
              type="button"
              className={tab === "file" ? "tab tab--active" : "tab"}
              onClick={() => setTab("file")}
            >
              {t("materials.tab.file")}
            </button>
            <button
              type="button"
              className={tab === "url" ? "tab tab--active" : "tab"}
              onClick={() => setTab("url")}
            >
              {t("materials.tab.url")}
            </button>
          </div>
        </div>

        <div className="stack">
          {tab === "text" && (
            <>
              <label className="field">
                <span className="field__label">{t("materials.field.title")}</span>
                <input
                  className="input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={200}
                  minLength={2}
                  required
                />
              </label>

              <label className="field">
                <span className="field__label">{t("materials.field.text")}</span>
                <textarea
                  className="textarea"
                  rows={10}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder={t("materials.field.text.placeholder")}
                  required
                />
              </label>
            </>
          )}

          {tab === "file" && (
            <>
              <label className="field">
                <span className="field__label">{t("materials.field.title")}</span>
                <input
                  className="input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={200}
                />
                <span className="field__hint">{t("common.optional")}</span>
              </label>

              <label className="field">
                <span className="field__label">{t("materials.field.file")}</span>
                <input
                  className="input"
                  type="file"
                  accept=".pdf,.docx,.pptx,.txt,.md"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
                <span className="field__hint">
                  {t("materials.file.hint", { size: MAX_FILE_MB })}
                </span>
              </label>
            </>
          )}

          {tab === "url" && (
            <>
              <label className="field">
                <span className="field__label">{t("materials.field.title")}</span>
                <input
                  className="input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={200}
                />
                <span className="field__hint">{t("common.optional")}</span>
              </label>

              <label className="field">
                <span className="field__label">{t("materials.field.url")}</span>
                <input
                  className="input"
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder={t("materials.field.url.placeholder")}
                  required
                />
              </label>
            </>
          )}

          <button
            className="btn btn--primary btn--block"
            type="submit"
            disabled={creating}
          >
            {creating ? t("materials.creating") : t("materials.create")}
          </button>
        </div>
      </form>

      {listLoading && <p className="muted">{t("common.loading")}</p>}

      {!listLoading && materials.length === 0 && (
        <div className="empty">
          <p className="empty__title">{t("materials.empty")}</p>
        </div>
      )}

      {!listLoading && materials.length > 0 && (
        <div className="list">
          {materials.map((material) => (
            <article className="card" key={material.id}>
              <div className="card__header">
                <div>
                  <h3 className="card__title">{material.title}</h3>
                  <div className="row small muted">
                    <span className={sourceClass(material.source)}>
                      {sourceLabel(material.source)}
                    </span>
                    <span>
                      {t("materials.chars", {
                        count: material.content ? material.content.length : 0,
                      })}
                    </span>
                    <span>{formatDate(material.createdAt)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={() => handleDelete(material)}
                  disabled={deletingId === material.id}
                >
                  {deletingId === material.id
                    ? t("common.deleting")
                    : t("materials.delete")}
                </button>
              </div>

              {material.content && (
                <p className="muted">{preview(material.content)}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
