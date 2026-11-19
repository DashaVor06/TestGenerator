"use client";

// Страница учебных материалов: добавление (текст, файл, ссылка),
// список материалов и просмотр полного текста.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";
import { MaterialForm, type CreatedMaterial } from "@/components/material-form";
import { MaterialPreview } from "@/components/material-preview";
import { ListToolbar } from "@/components/list-toolbar";

interface Material extends CreatedMaterial {
  status: string;
}

/** Сколько символов показываем в карточке до открытия полного текста. */
const PREVIEW_LENGTH = 160;

/** Пауза перед запросом, чтобы не искать на каждую введённую букву. */
const SEARCH_DELAY_MS = 300;

/** Ключи словаря и классы значков для источника материала. */
const SOURCE_KEYS = {
  TEXT: "materials.source.TEXT",
  FILE: "materials.source.FILE",
  URL: "materials.source.URL",
} as const;

const SOURCE_CLASSES = {
  TEXT: "badge badge--success",
  FILE: "badge badge--primary",
  URL: "badge badge--warning",
} as const;

export default function MaterialsPage() {
  const { user, loading, language, t } = useApp();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

  // Поиск и сортировка списка материалов.
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "title">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("search", search.trim());
    }
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);

    try {
      const data = await api<{ materials: Material[] }>(
        `/api/materials?${params.toString()}`
      );
      setMaterials(data.materials);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setListLoading(false);
    }
  }, [search, sortBy, sortOrder, t]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const timer = setTimeout(() => {
      void load();
    }, SEARCH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [user, load]);

  /** Новый материал сразу ставим первым в список. */
  function handleCreated(material: CreatedMaterial) {
    setMaterials((previous) => [{ ...material, status: "READY" }, ...previous]);
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

  function formatDate(value: string): string {
    return new Date(value).toLocaleDateString(language === "EN" ? "en-GB" : "ru-RU");
  }

  function preview(text: string): string {
    return text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH)}…` : text;
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

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">{t("materials.create")}</h2>
        </div>
        <MaterialForm onCreated={handleCreated} />
      </section>

      <ListToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder={t("materials.search.placeholder")}
        sortOptions={[
          { value: "createdAt", label: t("materials.sort.createdAt") },
          { value: "title", label: t("materials.sort.title") },
        ]}
        sortBy={sortBy}
        onSortBy={(value) => setSortBy(value === "title" ? "title" : "createdAt")}
        sortOrder={sortOrder}
        onSortOrder={setSortOrder}
        resultLabel={t("common.found", { count: materials.length })}
      />

      {listLoading && <p className="muted">{t("common.loading")}</p>}

      {!listLoading && materials.length === 0 && (
        <div className="empty">
          <p className="empty__title">{t("materials.empty")}</p>
        </div>
      )}

      {!listLoading && materials.length > 0 && (
        <>
          <p className="small muted">{t("materials.view.hint")}</p>

          <div className="list">
            {materials.map((material) => (
              <article className="card" key={material.id}>
                <div className="card__header">
                  <div>
                    <h3 className="card__title">
                      <button
                        type="button"
                        className="link"
                        onClick={() => setPreviewId(material.id)}
                      >
                        {material.title}
                      </button>
                    </h3>

                    <div className="row small muted">
                      <span className={SOURCE_CLASSES[material.source]}>
                        {t(SOURCE_KEYS[material.source])}
                      </span>
                      <span>
                        {t("materials.chars", {
                          count: material.content ? material.content.length : 0,
                        })}
                      </span>
                      <span>{formatDate(material.createdAt)}</span>
                    </div>
                  </div>

                  <div className="row">
                    <button
                      type="button"
                      className="btn btn--sm"
                      onClick={() => setPreviewId(material.id)}
                    >
                      {t("materials.view")}
                    </button>

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
                </div>

                {material.content && (
                  <p className="muted">{preview(material.content)}</p>
                )}
              </article>
            ))}
          </div>
        </>
      )}

      <MaterialPreview materialId={previewId} onClose={() => setPreviewId(null)} />
    </div>
  );
}
