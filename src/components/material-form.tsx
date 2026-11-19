"use client";

// Форма добавления материала: текстом, файлом или ссылкой на статью.
// Используется на странице материалов, при создании теста и при генерации.

import { useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";

export interface CreatedMaterial {
  id: string;
  title: string;
  content: string | null;
  source: "TEXT" | "FILE" | "URL";
  sourceUrl: string | null;
  fileType: string | null;
  createdAt: string;
}

type Tab = "text" | "file" | "url";

/** Предел размера файла на сервере (МБ) — только для подсказки. */
const MAX_FILE_MB = 25;

interface MaterialFormProps {
  /** Что сделать с созданным материалом. */
  onCreated: (material: CreatedMaterial) => void;
}

export function MaterialForm({ onCreated }: MaterialFormProps) {
  const { t } = useApp();

  const [tab, setTab] = useState<Tab>("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  /** Очищает поля после успешного добавления. */
  function reset() {
    setTitle("");
    setContent("");
    setUrl("");
    setFile(null);
  }

  /** Отправляет материал тем способом, который выбран на вкладке. */
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setCreating(true);

    try {
      let data: { material: CreatedMaterial };

      if (tab === "file") {
        if (!file) {
          setError(t("materials.error.emptyFile"));
          return;
        }

        const formData = new FormData();
        formData.append("title", title || file.name);
        formData.append("file", file);

        data = await api<{ material: CreatedMaterial }>("/api/materials", {
          method: "POST",
          body: formData,
        });
      } else if (tab === "url") {
        data = await api<{ material: CreatedMaterial }>("/api/materials", {
          method: "POST",
          body: JSON.stringify({ title: title || undefined, sourceUrl: url }),
        });
      } else {
        data = await api<{ material: CreatedMaterial }>("/api/materials", {
          method: "POST",
          body: JSON.stringify({ title, content }),
        });
      }

      reset();
      setNotice(t("materials.added"));
      onCreated(data.material);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
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

      {error && <div className="alert alert--error">{error}</div>}
      {notice && <div className="alert alert--success">{notice}</div>}

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
              rows={8}
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

      <div>
        <button className="btn btn--primary" type="submit" disabled={creating}>
          {creating ? t("materials.creating") : t("materials.create")}
        </button>
      </div>
    </form>
  );
}
