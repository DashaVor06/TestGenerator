"use client";

// Список вопросов теста с кнопками редактирования и удаления.

import { useApp } from "@/components/providers";
import {
  COGNITIVE_KEYS,
  DIFFICULTY_KEYS,
  TYPE_KEYS,
  type Question,
} from "./test-types";

interface QuestionRowProps {
  question: Question;
  number: number;
  onEdit: (question: Question) => void;
  onDelete: (question: Question) => void;
}

/** Один вопрос в списке: текст, значки и кнопки действий. */
function QuestionRow({ question, number, onEdit, onDelete }: QuestionRowProps) {
  const { t } = useApp();

  return (
    <div className="list__item">
      <div className="stack">
        <p>
          <strong>{number}.</strong> {question.text}
        </p>
        <div className="row">
          <span className="badge badge--primary">{t(TYPE_KEYS[question.type])}</span>
          {question.difficulty && (
            <span className="badge">{t(DIFFICULTY_KEYS[question.difficulty])}</span>
          )}
          <span className="badge">{t(COGNITIVE_KEYS[question.cognitiveLevel])}</span>
          <span className="small muted">
            {t("tests.question.points")}: {question.points}
          </span>
        </div>
      </div>

      <div className="row">
        <button type="button" className="btn btn--sm" onClick={() => onEdit(question)}>
          {t("common.edit")}
        </button>
        <button
          type="button"
          className="btn btn--sm btn--danger"
          onClick={() => onDelete(question)}
        >
          {t("common.delete")}
        </button>
      </div>
    </div>
  );
}

interface QuestionListProps {
  questions: Question[];
  onEdit: (question: Question) => void;
  onDelete: (question: Question) => void;
  onAdd: () => void;
}

export function QuestionList({ questions, onEdit, onDelete, onAdd }: QuestionListProps) {
  const { t } = useApp();

  return (
    <>
      <div className="card__header">
        <div>
          <h2 className="card__title">
            {t("tests.questions", { count: questions.length })}
          </h2>
          <p className="small muted">{t("tests.question.answers")}</p>
        </div>
        <button type="button" className="btn btn--sm" onClick={onAdd}>
          {t("tests.questions.add")}
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="empty">
          <p className="empty__title">{t("tests.questions.empty")}</p>
        </div>
      ) : (
        <div className="list">
          {questions.map((question, index) => (
            <QuestionRow
              key={question.id}
              question={question}
              number={index + 1}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </>
  );
}
