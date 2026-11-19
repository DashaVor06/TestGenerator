"use client";

// Просмотр материала в модальном окне.
// Формат документа определяет способ показа: PDF — встроенный просмотрщик
// браузера, DOCX — HTML с сохранением оформления, PPTX — по слайдам,
// MD и статьи — с разметкой, обычный текст — как есть.

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";
import { renderMarkdown } from "@/lib/markdown";
import type { CreatedMaterial } from "./material-form";

/** Варианты содержимого, которые возвращает сервер. */
type Preview =
  | { kind: "pdf"; url: string; converted: boolean }
  | { kind: "html"; html: string }
  | { kind: "slides"; slides: string[] }
  | { kind: "markdown"; text: string; sourceUrl: string | null }
  | { kind: "text"; text: string };

interface PreviewResponse {
  preview: Preview;
  hasFile: boolean;
}

interface MaterialPreviewProps {
  /** Какой материал показывать; null — окно закрыто. */
  materialId: string | null;
  onClose: () => void;
}

/** Ключи словаря для подписи источника материала. */
const SOURCE_KEYS = {
  TEXT: "materials.source.TEXT",
  FILE: "materials.source.FILE",
  URL: "materials.source.URL",
} as const;

export function MaterialPreview({ materialId, onClose }: MaterialPreviewProps) {
  const { t, language } = useApp();

  const [material, setMaterial] = useState<CreatedMaterial | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [hasFile, setHasFile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Загружаем материал и его представление при открытии окна.
  useEffect(() => {
    if (!materialId) {
      setMaterial(null);
      setPreview(null);
      return;
    }

    let alive = true;
    setLoading(true);
    setError("");

    Promise.all([
      api<{ material: CreatedMaterial }>(`/api/materials/${materialId}`),
      api<PreviewResponse>(`/api/materials/${materialId}/preview`),
    ])
      .then(([materialData, previewData]) => {
        if (!alive) {
          return;
        }
        setMaterial(materialData.material);
        setPreview(previewData.preview);
        setHasFile(previewData.hasFile);
      })
      .catch((err: unknown) => {
        if (alive) {
          setError(err instanceof Error ? err.message : t("common.error"));
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [materialId, t]);

  // Escape закрывает окно.
  useEffect(() => {
    if (!materialId) {
      return;
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [materialId, onClose]);

  if (!materialId) {
    return null;
  }

  const date = material
    ? new Date(material.createdAt).toLocaleDateString(
        language === "EN" ? "en-GB" : "ru-RU"
      )
    : "";

  const fileUrl = `/api/materials/${materialId}/file`;

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__backdrop" onClick={onClose} />

      <div className="modal__panel modal__panel--wide">
        <div className="modal__header">
          <div>
            <h2 className="modal__title">
              {material ? material.title : t("common.loading")}
            </h2>
            {material && (
              <p className="small muted">
                {t(SOURCE_KEYS[material.source])} ·{" "}
                {t("materials.chars", {
                  count: material.content ? material.content.length : 0,
                })}{" "}
                · {date}
              </p>
            )}
          </div>

          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>

        {hasFile && (
          <div className="modal__toolbar">
            <a className="btn btn--sm" href={fileUrl} download>
              {t("materials.download")}
            </a>
          </div>
        )}

        <div className="modal__body modal__body--document">
          {loading && (
            <p className="muted" style={{ padding: 20 }}>
              {t("common.loading")}
            </p>
          )}

          {error && (
            <div className="alert alert--error" style={{ margin: 20 }}>
              {error}
            </div>
          )}

          {!loading && !error && preview?.kind === "pdf" && (
            <iframe
              className="doc-frame"
              src={preview.url}
              title={material?.title ?? "PDF"}
            />
          )}

          {!loading && !error && (preview?.kind === "html" || preview?.kind === "slides") && (
            <div className="alert alert--info" style={{ margin: "16px 20px 0" }}>
              {t("materials.office.hint")}
            </div>
          )}

          {!loading && !error && preview?.kind === "html" && (
            <div
              className="doc-html"
              dangerouslySetInnerHTML={{ __html: preview.html }}
            />
          )}

          {!loading && !error && preview?.kind === "slides" && (
            <div className="doc-slides">
              {preview.slides.map((text, index) => (
                <div className="doc-slide" key={index}>
                  <div className="doc-slide__number">
                    {t("materials.slide", { number: index + 1 })}
                  </div>
                  <div>{text || "—"}</div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && preview?.kind === "markdown" && (
            <>
              <div
                className="doc-html"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(preview.text) }}
              />
              {preview.sourceUrl && (
                <div className="doc-source">
                  <a href={preview.sourceUrl} target="_blank" rel="noreferrer">
                    {preview.sourceUrl}
                  </a>
                </div>
              )}
            </>
          )}

          {!loading && !error && preview?.kind === "text" && (
            <pre className="doc-text">{preview.text}</pre>
          )}

          {!loading && !error && !preview && (
            <p className="muted" style={{ padding: 20 }}>
              {t("common.empty")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
