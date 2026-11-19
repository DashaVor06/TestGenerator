"use client";

// Карточка генерации: материал, количество вопросов по типам, сложность,
// вопросы «на размышление» и предварительная оценка стоимости.

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/providers";
import { estimateGenerationCost, formatByn, formatUsd } from "@/domain/pricing";
import { MaterialForm, type CreatedMaterial } from "./material-form";
import {
  clamp,
  DIFFICULTIES,
  DIFFICULTY_KEYS,
  MAX_QUESTIONS,
  QUESTION_TYPES,
  TYPE_KEYS,
  type Difficulty,
  type Material,
  type QuestionType,
  type TestStatus,
} from "./test-types";

/** Параметры запуска генерации. */
export interface GenerationParams {
  materialId: string;
  typeCounts: Record<QuestionType, number>;
  difficulty: Difficulty;
  thinkingCount: number;
}

/** Итог последней генерации: сколько вопросов и за сколько секунд. */
export interface GenerationResult {
  count: number;
  seconds: number;
}

interface GenerationCardProps {
  materials: Material[];
  generating: boolean;
  status: TestStatus;
  lastResult: GenerationResult | null;
  onGenerate: (params: GenerationParams) => void;
  /** Материал прошлой генерации — подставляем в список сразу. */
  initialMaterialId?: string;
  /** Сообщает странице, что список материалов нужно перечитать. */
  onMaterialsChanged?: () => void;
}

export function GenerationCard({
  materials,
  generating,
  status,
  lastResult,
  onGenerate,
  initialMaterialId,
  onMaterialsChanged,
}: GenerationCardProps) {
  const { t } = useApp();

  const [materialId, setMaterialId] = useState(initialMaterialId ?? "");
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [typeCounts, setTypeCounts] = useState<Record<QuestionType, number>>({
    SINGLE_CHOICE: 5,
    MULTIPLE_CHOICE: 0,
    TRUE_FALSE: 0,
    SHORT_ANSWER: 0,
    OPEN: 0,
  });
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [thinkingOn, setThinkingOn] = useState(false);
  const [thinkingCount, setThinkingCount] = useState(2);

  const totalQuestions = QUESTION_TYPES.reduce(
    (sum, type) => sum + typeCounts[type],
    0
  );
  const thinking = thinkingOn ? Math.min(thinkingCount, totalQuestions) : 0;
  const selectedMaterial = materials.find((item) => item.id === materialId) ?? null;
  const estimate = estimateGenerationCost({
    characters: selectedMaterial?.content?.length ?? 0,
    questions: totalQuestions,
    thinkingQuestions: thinking,
  });

  const busy = generating || status === "PROCESSING";
  const canGenerate = Boolean(materialId) && totalQuestions > 0 && !busy;

  /** Меняет количество вопросов одного типа. */
  function handleCountChange(type: QuestionType, value: string) {
    const parsed = Number(value);
    const safe = Number.isFinite(parsed)
      ? clamp(Math.floor(parsed), 0, MAX_QUESTIONS)
      : 0;
    setTypeCounts((previous) => ({ ...previous, [type]: safe }));
  }

  function handleSubmit() {
    if (!canGenerate) {
      return;
    }

    onGenerate({
      materialId,
      typeCounts,
      difficulty,
      thinkingCount: thinking,
    });
  }

  /** Новый материал: выбираем его и просим страницу перечитать список. */
  function handleMaterialCreated(material: CreatedMaterial) {
    setMaterialId(material.id);
    setAddingMaterial(false);
    onMaterialsChanged?.();
  }

  return (
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">{t("tests.generation")}</h2>
      </div>

      {materials.length === 0 ? (
        <div className="stack">
          <div className="empty">
            <p className="empty__title">{t("tests.generation.material.empty")}</p>
            <div className="row">
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => setAddingMaterial((value) => !value)}
              >
                {t("materials.create")}
              </button>
              <Link className="btn btn--sm" href="/materials">
                {t("nav.materials")}
              </Link>
            </div>
          </div>

          {addingMaterial && (
            <div className="card card--soft">
              <MaterialForm onCreated={handleMaterialCreated} />
            </div>
          )}
        </div>
      ) : (
        <div className="stack">
          <div className="field">
            <label className="field__label" htmlFor="material">
              {t("tests.generation.material")}
            </label>
            <select
              id="material"
              className="select"
              value={materialId}
              onChange={(event) => setMaterialId(event.target.value)}
            >
              <option value="">{t("tests.generation.material.choose")}</option>
              {materials.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            <p className="field__hint">{t("tests.generation.material.hint")}</p>
          </div>

          <div className="row">
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => setAddingMaterial((value) => !value)}
            >
              {addingMaterial ? t("common.cancel") : t("materials.create")}
            </button>
          </div>

          {addingMaterial && (
            <div className="card card--soft">
              <MaterialForm onCreated={handleMaterialCreated} />
            </div>
          )}

          <div>
            <p className="field__label">{t("tests.generation.types")}</p>
            <div className="grid grid--3">
              {QUESTION_TYPES.map((type) => (
                <div className="field" key={type}>
                  <label className="field__label" htmlFor={`count-${type}`}>
                    {t(TYPE_KEYS[type])}
                  </label>
                  <input
                    id={`count-${type}`}
                    className="input"
                    type="number"
                    min={0}
                    max={MAX_QUESTIONS}
                    value={typeCounts[type]}
                    onChange={(event) => handleCountChange(type, event.target.value)}
                  />
                </div>
              ))}
            </div>
            <p className="field__hint">{t("tests.generation.limit")}</p>
          </div>

          <div className="grid grid--2">
            <div className="field">
              <label className="field__label" htmlFor="difficulty">
                {t("tests.generation.difficulty")}
              </label>
              <select
                id="difficulty"
                className="select"
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(
                    event.target.value === "EASY"
                      ? "EASY"
                      : event.target.value === "HARD"
                        ? "HARD"
                        : "MEDIUM"
                  )
                }
              >
                {DIFFICULTIES.map((item) => (
                  <option key={item} value={item}>
                    {t(DIFFICULTY_KEYS[item])}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={thinkingOn}
                  onChange={(event) => setThinkingOn(event.target.checked)}
                />
                <span>{t("tests.generation.thinking")}</span>
              </label>

              <div className="row">
                <label className="field__label" htmlFor="thinking-count">
                  {t("tests.generation.thinking.count")}
                </label>
                <input
                  id="thinking-count"
                  className="input"
                  type="number"
                  min={0}
                  max={totalQuestions}
                  value={thinkingCount}
                  disabled={!thinkingOn}
                  onChange={(event) =>
                    setThinkingCount(
                      clamp(Number(event.target.value) || 0, 0, totalQuestions)
                    )
                  }
                />
              </div>

              <p className="field__hint">{t("tests.generation.thinking.hint")}</p>
            </div>
          </div>

          <div className="card card--soft stack">
            <p>{t("tests.generation.total", { count: totalQuestions })}</p>
            <p className="muted small">
              {t("tests.generation.estimate", {
                usd: formatUsd(estimate.usd),
                byn: formatByn(estimate.byn),
              })}
            </p>
            <p className="field__hint">{t("tests.generation.low")}</p>
            <p className="field__hint">{t("tests.generation.high")}</p>
            <p className="field__hint">{t("tests.generation.replace")}</p>
          </div>

          <div className="row">
            <button
              className="btn btn--primary"
              type="button"
              onClick={handleSubmit}
              disabled={!canGenerate}
            >
              {busy ? t("tests.generation.running") : t("tests.generation.start")}
            </button>
          </div>

          {lastResult && !busy && (
            <div className="alert alert--success">
              {t("tests.generation.ready", {
                count: lastResult.count,
                seconds: lastResult.seconds,
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
