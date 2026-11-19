"use client";

// Прохождение теста по одному вопросу и экран результата с разбором ошибок.

import Link from "next/link";
import { useRef, useState } from "react";
import { useApp } from "@/components/providers";

export type QuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "SHORT_ANSWER"
  | "OPEN";

export interface AttemptOption {
  id: string;
  text: string;
}

export interface AttemptQuestion {
  id: string;
  type: QuestionType;
  text: string;
  points: number;
  options: AttemptOption[];
}

export interface AttemptTest {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  language: "RU" | "EN";
  questionCount: number;
  totalPoints: number;
  questions: AttemptQuestion[];
}

export interface SubmittedAnswer {
  questionId: string;
  optionIds: string[];
  text?: string | null;
}

export interface ReviewOption {
  id: string;
  text: string;
  isCorrect: boolean;
  selected: boolean;
}

export interface ReviewItem {
  questionId: string;
  text: string;
  type: QuestionType;
  points: number;
  options: ReviewOption[];
  yourOptionIds: string[];
  yourText: string | null;
  correctOptionIds: string[];
  expectedAnswer: string | null;
  isCorrect: boolean;
  autoGraded: boolean;
  explanation: string | null;
  sourceQuote: string | null;
}

export interface AttemptResult {
  result: {
    id: string;
    testId: string;
    userId: string | null;
    guestName: string | null;
    score: number;
    maxScore: number;
    percentCorrect: number;
    durationMs: number | null;
    completedAt: string;
  };
  test: { id: string; title: string };
  items: ReviewItem[];
}

interface QuizRunnerProps {
  attempt: AttemptTest;
  submitting: boolean;
  onSubmit: (answers: SubmittedAnswer[], durationMs: number) => void;
}

interface ResultViewProps {
  result: AttemptResult;
  onRepeat?: () => void;
  backHref?: string;
  backLabel?: string;
}

/** Что выбрано и что написано в одном вопросе. */
interface AnswerState {
  optionIds: string[];
  text: string;
}

const EMPTY_ANSWER: AnswerState = { optionIds: [], text: "" };

/** Ответ выбирается вариантами, а не вводом текста? */
function usesOptions(question: AttemptQuestion): boolean {
  return question.type !== "OPEN" && question.options.length > 0;
}

/** Классы варианта в разборе: правильный — зелёный, выбранный неверный — красный. */
function reviewOptionClass(option: ReviewOption): string {
  if (option.isCorrect) {
    return "option option--correct";
  }
  if (option.selected) {
    return "option option--wrong";
  }
  return "option";
}

export function QuizRunner({ attempt, submitting, onSubmit }: QuizRunnerProps) {
  const { t } = useApp();
  // Время прохождения считаем от момента, когда показали первый вопрос.
  const startedAt = useRef(Date.now());
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});

  const total = attempt.questions.length;
  const question = attempt.questions[index];

  /** Ответил ли пользователь на вопрос. */
  function isAnswered(item: AttemptQuestion): boolean {
    const state = answers[item.id];
    if (!state) {
      return false;
    }
    return usesOptions(item)
      ? state.optionIds.length > 0
      : state.text.trim().length > 0;
  }

  // Процент прохождения — доля вопросов, до которых пользователь дошёл.
  const percent = total === 0 ? 0 : Math.round(((index + 1) / total) * 100);

  // Тест без вопросов API не отдаёт, но подстрахуемся.
  if (!question) {
    return null;
  }

  const answer = answers[question.id] ?? EMPTY_ANSWER;
  const multiple = question.type === "MULTIPLE_CHOICE";

  function selectOption(optionId: string) {
    setAnswers((previous) => {
      const current = previous[question.id] ?? EMPTY_ANSWER;
      const selected = current.optionIds.includes(optionId);
      let optionIds: string[];

      if (selected) {
        // Повторное нажатие снимает выбор.
        optionIds = current.optionIds.filter((id) => id !== optionId);
      } else {
        optionIds = multiple ? [...current.optionIds, optionId] : [optionId];
      }

      return { ...previous, [question.id]: { ...current, optionIds } };
    });
  }

  function changeText(text: string) {
    setAnswers((previous) => ({
      ...previous,
      [question.id]: { ...(previous[question.id] ?? EMPTY_ANSWER), text },
    }));
  }

  /** Собирает ответы по всем вопросам, даже если часть осталась пустой. */
  function collectAnswers(): SubmittedAnswer[] {
    return attempt.questions.map((item) => {
      const state = answers[item.id];

      if (usesOptions(item)) {
        return { questionId: item.id, optionIds: state?.optionIds ?? [], text: null };
      }

      const text = state?.text.trim();
      return { questionId: item.id, optionIds: [], text: text ? text : null };
    });
  }

  function finish() {
    const unanswered = attempt.questions.some((item) => !isAnswered(item));
    if (unanswered && !window.confirm(t("quiz.unanswered"))) {
      return;
    }
    onSubmit(collectAnswers(), Date.now() - startedAt.current);
  }

  return (
    <div className="quiz">
      <div className="quiz__top">
        <span>{t("quiz.question", { current: index + 1, total })}</span>
        <span>{t("quiz.progress", { percent })}</span>
      </div>
      <div
        className="quiz__bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="quiz__bar-fill" style={{ width: `${percent}%` }} />
      </div>

      <div className="card">
        <h1 className="quiz__question">{question.text}</h1>

        {usesOptions(question) ? (
          <div className="quiz__options">
            {question.options.map((option, position) => {
              const selected = answer.optionIds.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  className={selected ? "option option--selected" : "option"}
                  onClick={() => selectOption(option.id)}
                  disabled={submitting}
                  aria-pressed={selected}
                >
                  <span className="option__marker">
                    {multiple ? "✓" : position + 1}
                  </span>
                  <span>{option.text}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <textarea
            className="textarea"
            value={answer.text}
            onChange={(event) => changeText(event.target.value)}
            placeholder={t("quiz.answer.placeholder")}
            disabled={submitting}
          />
        )}

        {multiple && usesOptions(question) && (
          <p className="field__hint" style={{ marginTop: 10 }}>
            {t("quiz.answer.hint")}
          </p>
        )}
        {question.type === "SHORT_ANSWER" && !usesOptions(question) && (
          <p className="field__hint" style={{ marginTop: 10 }}>
            {t("quiz.answer.shortHint")}
          </p>
        )}
        {question.type === "OPEN" && (
          <p className="field__hint" style={{ marginTop: 10 }}>
            {t("quiz.answer.openHint")}
          </p>
        )}
      </div>

      <div className="quiz__nav">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
          disabled={index === 0 || submitting}
        >
          {t("quiz.prev")}
        </button>

        {index < total - 1 ? (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setIndex((current) => Math.min(total - 1, current + 1))}
            disabled={submitting}
          >
            {t("quiz.next")}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary"
            onClick={finish}
            disabled={submitting}
          >
            {submitting ? t("quiz.submitting") : t("quiz.finish")}
          </button>
        )}
      </div>
    </div>
  );
}

export function ResultView({
  result,
  onRepeat,
  backHref,
  backLabel,
}: ResultViewProps) {
  const { t } = useApp();
  const info = result.result;
  const isGuest = info.userId === null;
  const seconds =
    info.durationMs === null ? null : Math.round(info.durationMs / 1000);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("quiz.result.title")}</h1>
          <p className="page-subtitle">{result.test.title}</p>
        </div>
        <span className={isGuest ? "badge badge--warning" : "badge badge--success"}>
          {isGuest ? t("quiz.result.guest") : t("quiz.result.saved")}
        </span>
      </div>

      <div className="stack">
        <div className="stats">
          <div className="stat">
            <div className="stat__value">
              {t("quiz.result.percent", { percent: info.percentCorrect })}
            </div>
            <div className="stat__label">{t("quiz.result.percentLabel")}</div>
          </div>
          <div className="stat">
            <div className="stat__value">
              {t("quiz.result.score", { score: info.score, max: info.maxScore })}
            </div>
            <div className="stat__label">{t("quiz.result.scoreLabel")}</div>
          </div>
          <div className="stat">
            <div className="stat__value">
              {seconds === null ? "—" : `${seconds} ${t("common.seconds")}`}
            </div>
            <div className="stat__label">{t("quiz.result.timeLabel")}</div>
          </div>
        </div>

        <div className="stack">
          <h2 className="card__title">{t("review.title")}</h2>
          <div className="review">
            {result.items.map((item) => (
              <ReviewRow key={item.questionId} item={item} />
            ))}
          </div>
        </div>

        {(onRepeat || backHref) && (
          <div className="row">
            {onRepeat && (
              <button type="button" className="btn btn--primary" onClick={onRepeat}>
                {t("quiz.result.again")}
              </button>
            )}
            {backHref && (
              <Link href={backHref} className="btn btn--ghost">
                {backLabel ?? t("common.back")}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Один вопрос в разборе ошибок. */
function ReviewRow({ item }: { item: ReviewItem }) {
  const { t } = useApp();
  const manual = !item.isCorrect && !item.autoGraded;

  const rowClass = item.isCorrect
    ? "review__item review__item--correct"
    : manual
      ? "review__item review__item--manual"
      : "review__item review__item--wrong";

  const badgeClass = item.isCorrect
    ? "badge badge--success"
    : manual
      ? "badge badge--warning"
      : "badge badge--danger";

  const verdict = item.isCorrect
    ? t("review.correct")
    : manual
      ? t("review.notGraded")
      : t("review.wrong");

  const textQuestion = item.type === "SHORT_ANSWER" || item.type === "OPEN";

  /** Тексты вариантов, которые выбрал пользователь. */
  function selectedText(): string {
    return item.options
      .filter((option) => option.selected)
      .map((option) => option.text)
      .join(", ");
  }

  /** Тексты правильных вариантов. */
  function correctText(): string {
    return item.options
      .filter((option) => option.isCorrect)
      .map((option) => option.text)
      .join(", ");
  }

  return (
    <div className={rowClass}>
      <div className="review__head">
        <span className="review__text">{item.text}</span>
        <span className={badgeClass}>{verdict}</span>
      </div>

      {item.options.length > 0 && (
        <div className="quiz__options">
          {item.options.map((option) => (
            <div key={option.id} className={reviewOptionClass(option)}>
              <span className="option__marker">
                {option.isCorrect ? "✓" : option.selected ? "✕" : ""}
              </span>
              <span>{option.text}</span>
            </div>
          ))}
        </div>
      )}

      {!textQuestion && item.options.length > 0 && (
        <>
          <div className="review__answer">
            <span className="muted small">{t("review.yourAnswer")}:</span>
            <span>{selectedText() || t("review.noAnswer")}</span>
          </div>

          <div className="review__answer">
            <span className="muted small">{t("review.correctAnswer")}:</span>
            <span>{correctText() || "—"}</span>
          </div>
        </>
      )}

      {textQuestion && (
        <div className="review__answer">
          <span className="muted small">{t("review.yourAnswer")}:</span>
          <span>{item.yourText?.trim() ? item.yourText : t("review.noAnswer")}</span>
        </div>
      )}

      {item.expectedAnswer && (
        <div className="review__answer">
          <span className="muted small">{t("review.expected")}:</span>
          <span>{item.expectedAnswer}</span>
        </div>
      )}

      {item.explanation && (
        <div className="review__answer">
          <span className="muted small">{t("review.explanation")}:</span>
          <span>{item.explanation}</span>
        </div>
      )}

      {item.sourceQuote && (
        <div className="review__quote">
          <span className="small">{t("review.source")}: </span>
          {item.sourceQuote}
        </div>
      )}
    </div>
  );
}
