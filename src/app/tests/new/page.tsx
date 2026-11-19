"use client";

// Отдельная страница создания теста: основные поля и выбор материала.
// Материал можно добавить здесь же, не уходя на страницу «Материалы».

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";
import { MaterialForm, type CreatedMaterial } from "@/components/material-form";
import { MaterialPreview } from "@/components/material-preview";

export default function NewTestPage() {
  const { user, loading, t } = useApp();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState<"RU" | "EN">("RU");
  const [materialId, setMaterialId] = useState("");

  const [materials, setMaterials] = useState<CreatedMaterial[]>([]);
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Список материалов нужен для выбора источника генерации.
  useEffect(() => {
    if (!user) {
      return;
    }

    api<{ materials: CreatedMaterial[] }>("/api/materials")
      .then((data) => setMaterials(data.materials))
      .catch(() => setMaterials([]));
  }, [user]);

  /** Добавленный материал сразу выбираем — скорее всего, тест будет по нему. */
  function handleMaterialCreated(material: CreatedMaterial) {
    setMaterials((previous) => [material, ...previous]);
    setMaterialId(material.id);
    setAddingMaterial(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setCreating(true);

    try {
      const data = await api<{ test: { id: string } }>("/api/tests", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          category: category.trim() || null,
          description: description.trim() || null,
          language,
          materialId: materialId || null,
        }),
      });

      router.push(`/tests/${data.test.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
      setCreating(false);
    }
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
          <h1 className="page-title">{t("tests.new.title")}</h1>
          <p className="page-subtitle">{t("tests.new.subtitle")}</p>
        </div>
        <Link className="btn btn--ghost btn--sm" href="/catalog">
          {t("common.back")}
        </Link>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <form className="stack" onSubmit={handleSubmit}>
        <section className="card">
          <div className="card__header">
            <h2 className="card__title">{t("tests.new.basic")}</h2>
          </div>

          <div className="stack">
            <div className="grid grid--2">
              <label className="field">
                <span className="field__label">{t("catalog.field.title")}</span>
                <input
                  className="input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  minLength={2}
                  maxLength={200}
                />
              </label>

              <label className="field">
                <span className="field__label">{t("catalog.field.category")}</span>
                <input
                  className="input"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  maxLength={100}
                />
              </label>
            </div>

            <label className="field">
              <span className="field__label">{t("catalog.field.description")}</span>
              <textarea
                className="textarea"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={2000}
              />
            </label>

            <label className="field">
              <span className="field__label">{t("tests.field.language")}</span>
              <select
                className="select"
                value={language}
                onChange={(event) =>
                  setLanguage(event.target.value === "EN" ? "EN" : "RU")
                }
              >
                <option value="RU">{t("tests.field.language.ru")}</option>
                <option value="EN">{t("tests.field.language.en")}</option>
              </select>
            </label>
          </div>
        </section>

        <section className="card">
          <div className="card__header">
            <h2 className="card__title">{t("tests.new.material")}</h2>

            <button
              type="button"
              className="btn btn--sm"
              onClick={() => setAddingMaterial((value) => !value)}
            >
              {addingMaterial ? t("common.cancel") : t("materials.create")}
            </button>
          </div>

          <div className="stack">
            <label className="field">
              <span className="field__label">{t("tests.new.material")}</span>
              <select
                className="select"
                value={materialId}
                onChange={(event) => setMaterialId(event.target.value)}
              >
                <option value="">{t("tests.new.material.none")}</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.title}
                  </option>
                ))}
              </select>
              <span className="field__hint">{t("tests.new.material.hint")}</span>
            </label>

            {materialId && (
              <div>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setPreviewId(materialId)}
                >
                  {t("materials.view")}
                </button>
              </div>
            )}

            {addingMaterial && (
              <div className="card card--soft">
                <MaterialForm onCreated={handleMaterialCreated} />
              </div>
            )}
          </div>
        </section>

        <div className="row">
          <button className="btn btn--primary" type="submit" disabled={creating}>
            {creating ? t("tests.new.creating") : t("tests.new.submit")}
          </button>
        </div>
      </form>

      <MaterialPreview materialId={previewId} onClose={() => setPreviewId(null)} />
    </div>
  );
}
