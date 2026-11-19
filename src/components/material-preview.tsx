"use client";

// Просмотр полного текста материала в модальном окне.

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";
import type { CreatedMaterial } from "./material-form";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Загружаем материал при открытии окна.
  useEffect(() => {
    if (!materialId) {
      setMaterial(null);
      return;
    }

    let alive = true;
    setLoading(true);
    setError("");

    api<{ material: CreatedMaterial }>(`/api/materials/${materialId}`)
      .then((data) => {
        if (alive) {
          setMaterial(data.material);
        }
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

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__backdrop" onClick={onClose} />

      <div className="modal__panel">
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

        <div className="modal__body">
          {loading && <p className="muted">{t("common.loading")}</p>}
          {error && <div className="alert alert--error">{error}</div>}

          {material?.sourceUrl && (
            <p className="small muted">{material.sourceUrl}</p>
          )}

          {material?.content && <div>{material.content}</div>}

          {material && !material.content && (
            <p className="muted">{t("common.empty")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
