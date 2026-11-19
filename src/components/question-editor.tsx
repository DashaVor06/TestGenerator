"use client";

// Форма вопроса: общая для добавления и редактирования.

import { useState } from "react";
import { useApp } from "@/components/providers";
import {
  clamp,
  COGNITIVE_LEVELS,
  COGNITIVE_KEYS,
  DIFFICULTIES,
  DIFFICULTY_KEYS,
  hasExpectedAnswer,
  hasOptions,
  MAX_POINTS,
  MIN_POINTS,
  QUESTION_TYPES,
  twoOptions,
  TYPE_KEYS,
  type CognitiveLevel,
  type Difficulty,
  type OptionDraft,
  type QuestionDraft,
  type QuestionType,
} from "./test-types";

interface QuestionEditorProps {
  initial: QuestionDraft;
  saving: boolean;
  onSubmit: (draft: QuestionDraft) => void;
  onCancel: () => void;
  /** Показать заголовок «Редактирование вопроса» вместо «Добавить вопрос». */
  isEditing?: boolean;
}

export function QuestionEditor({
  initial,
  saving,
  onSubmit,
  onCancel,
  isEditing,
}: QuestionEditorProps) {
  const { t } = useApp();
  const [draft, setDraft] = useState<QuestionDraft>(initial);

  /** Меняет одно поле черновика. */
  function patch(fields: Partial<QuestionDraft>) {
    setDraft((previous) => ({ ...previous, ...fields }));
  }

  /** При смене типа подставляем варианты ответа, если их ещё нет. */
  function handleTypeChange(value: string) {
    const type = value as QuestionType;
    setDraft((previous) => {
      let options = previous.options;
      if (type === "TRUE_FALSE") {
        options = twoOptions(previous.options);
      } else if (hasOptions(type) && previous.options.length < 2) {
        options = [
          { text: "", isCorrect: true },
          { text: "", isCorrect: false },
        ];
      }
      return { ...previous, type, options };
    });
  }

  function updateOption(index: number, fields: Partial<OptionDraft>) {
    setDraft((previous) => ({
      ...previous,
      options: previous.options.map((option, position) =>
        position === index ? { ...option, ...fields } : option
      ),
    }));
  }

  function addOption() {
    setDraft((previous) => ({
      ...previous,
      options: [...previous.options, { text: "", isCorrect: false }],
    }));
  }

  function removeOption(index: number) {
    setDraft((previous) => ({
      ...previous,
      options: previous.options.filter((_, position) => position !== index),
    }));
  }

  /** Отмечает правильный вариант: у вопроса с одним выбором — только один. */
  function toggleCorrect(index: number, checked: boolean) {
    if (draft.type !== "SINGLE_CHOICE") {
      updateOption(index, { isCorrect: checked });
      return;
    }

    setDraft((previous) => ({
      ...previous,
      options: previous.options.map((option, position) => ({
        ...option,
        isCorrect: position === index ? checked : false,
      })),
    }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit(draft);
  }

  return (
    <form className="card card--soft" onSubmit={handleSubmit}>
      <div className="card__header">
        <h3 className="card__title">{isEditing ? t("tests.questions.editing") : t("tests.questions.add")}</h3>
      </div>

      <div className="stack">
        <div className="grid grid--2">
          <div className="field">
            <label className="field__label" htmlFor="question-type">{t("tests.question.type")}</label>
            <select
              id="question-type"
              className="select"
              value={draft.type}
              onChange={(event) => handleTypeChange(event.target.value)}
            >
              {QUESTION_TYPES.map((type) => <option key={type} value={type}>{t(TYPE_KEYS[type])}</option>)}
            </select>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="question-points">{t("tests.question.points")}</label>
            <input
              id="question-points"
              className="input"
              type="number"
              min={MIN_POINTS}
              max={MAX_POINTS}
              value={draft.points}
              onChange={(event) =>
                patch({
                  points: clamp(
                    Number(event.target.value) || MIN_POINTS,
                    MIN_POINTS,
                    MAX_POINTS
                  ),
                })
              }
            />
          </div>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="question-text">{t("tests.question.text")}</label>
          <textarea
            id="question-text"
            className="textarea"
            value={draft.text}
            onChange={(event) => patch({ text: event.target.value })}
            required
            minLength={3}
            maxLength={2000}
          />
        </div>

        <div className="grid grid--2">
          <div className="field">
            <label className="field__label" htmlFor="question-difficulty">{t("tests.question.difficulty")}</label>
            <select
              id="question-difficulty"
              className="select"
              value={draft.difficulty}
              onChange={(event) =>
                patch({
                  difficulty:
                    event.target.value === "" ? "" : (event.target.value as Difficulty),
                })
              }
            >
              <option value="">{t("tests.question.difficulty.none")}</option>
              {DIFFICULTIES.map((item) => <option key={item} value={item}>{t(DIFFICULTY_KEYS[item])}</option>)}
            </select>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="question-cognitive">{t("tests.question.cognitive")}</label>
            <select
              id="question-cognitive"
              className="select"
              value={draft.cognitiveLevel}
              onChange={(event) =>
                patch({ cognitiveLevel: event.target.value as CognitiveLevel })
              }
            >
              {COGNITIVE_LEVELS.map((item) => <option key={item} value={item}>{t(COGNITIVE_KEYS[item])}</option>)}
            </select>
          </div>
        </div>

        {hasExpectedAnswer(draft.type) && (
          <div className="field">
            <label className="field__label" htmlFor="question-expected">{t("tests.question.expected")}</label>
            <input
              id="question-expected"
              className="input"
              value={draft.expectedAnswer}
              onChange={(event) => patch({ expectedAnswer: event.target.value })}
              maxLength={500}
            />
            <p className="field__hint">{t("tests.question.expected.hint")}</p>
          </div>
        )}

        {hasOptions(draft.type) && (
          <div className="field">
            <p className="field__label">{t("tests.question.options")}</p>

            <div className="stack">
              {draft.options.map((option, index) => (
                <div className="row" key={index}>
                  <input
                    className="input"
                    value={option.text}
                    placeholder={t("tests.question.option", { number: index + 1 })}
                    onChange={(event) => updateOption(index, { text: event.target.value })}
                    maxLength={500}
                  />
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={option.isCorrect}
                      onChange={(event) => toggleCorrect(index, event.target.checked)}
                    />
                    <span>{t("tests.question.correct")}</span>
                  </label>
                  {draft.type !== "TRUE_FALSE" && (
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost"
                      onClick={() => removeOption(index)}
                      aria-label={t("common.delete")}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {draft.type !== "TRUE_FALSE" && (
              <div className="row">
                <button type="button" className="btn btn--sm" onClick={addOption}>
                  {t("tests.question.addOption")}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="field">
          <label className="field__label" htmlFor="question-explanation">{t("tests.question.explanation")}</label>
          <textarea
            id="question-explanation"
            className="textarea"
            rows={2}
            value={draft.explanation}
            onChange={(event) => patch({ explanation: event.target.value })}
            maxLength={2000}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="question-source">{t("tests.question.source")}</label>
          <textarea
            id="question-source"
            className="textarea"
            rows={2}
            value={draft.sourceQuote}
            onChange={(event) => patch({ sourceQuote: event.target.value })}
            maxLength={1000}
          />
        </div>

        <div className="row">
          <button className="btn btn--primary" type="submit" disabled={saving}>
            {saving ? t("common.saving") : t("tests.question.save")}
          </button>
          <button className="btn btn--ghost" type="button" onClick={onCancel}>
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </form>
  );
}
