"use client";

// Карточка настроек теста: название, категория, описание, язык и удаление.

import { useState } from "react";
import { useApp } from "@/components/providers";
import type { Language } from "@/i18n/dictionary";
import { STATUS_BADGES, STATUS_KEYS, type Test } from "./test-types";

/** Поля, которые сохраняются через PATCH. */
export interface TestSettingsFields {
  title: string;
  category: string | null;
  description: string | null;
  language: Language;
}

interface TestSettingsCardProps {
  test: Test;
  saving: boolean;
  deleting: boolean;
  onSave: (fields: TestSettingsFields) => void;
  onDelete: () => void;
}

export function TestSettingsCard({
  test,
  saving,
  deleting,
  onSave,
  onDelete,
}: TestSettingsCardProps) {
  const { t } = useApp();

  // Поля заполняются один раз при открытии, чтобы опрос статуса не затирал правки.
  const [title, setTitle] = useState(test.title);
  const [category, setCategory] = useState(test.category ?? "");
  const [description, setDescription] = useState(test.description ?? "");
  const [language, setLanguage] = useState<Language>(test.language);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    // Приводим поля к тому виду, который уйдёт на сервер.
    const fields: TestSettingsFields = {
      title: title.trim(),
      category: category.trim() || null,
      description: description.trim() || null,
      language,
    };

    setTitle(fields.title);
    setCategory(fields.category ?? "");
    setDescription(fields.description ?? "");
    onSave(fields);
  }

  return (
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">{t("tests.settings")}</h2>
        <span className={STATUS_BADGES[test.status]}>{t(STATUS_KEYS[test.status])}</span>
      </div>

      <form className="stack" onSubmit={handleSubmit}>
        <div className="grid grid--2">
          <div className="field">
            <label className="field__label" htmlFor="test-title">
              {t("tests.field.title")}
            </label>
            <input
              id="test-title"
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              minLength={2}
              maxLength={200}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="test-category">
              {t("tests.field.category")}
            </label>
            <input
              id="test-category"
              className="input"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              maxLength={100}
            />
          </div>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="test-description">
            {t("tests.field.description")}
          </label>
          <textarea
            id="test-description"
            className="textarea"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={2000}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="test-language">
            {t("tests.field.language")}
          </label>
          <select
            id="test-language"
            className="select"
            value={language}
            onChange={(event) => setLanguage(event.target.value === "EN" ? "EN" : "RU")}
          >
            <option value="RU">{t("tests.field.language.ru")}</option>
            <option value="EN">{t("tests.field.language.en")}</option>
          </select>
        </div>

        <div className="row row--between">
          <button className="btn btn--primary" type="submit" disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </button>
          <button className="btn btn--danger" type="button" onClick={onDelete} disabled={deleting}>
            {deleting ? t("common.deleting") : t("tests.delete")}
          </button>
        </div>
      </form>
    </section>
  );
}
