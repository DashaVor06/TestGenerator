// Порт внешнего сервиса генерации вопросов (сторонний ИИ-сервис).
// Реализация — в infrastructure/external.

import type {
  CognitiveLevel,
  Difficulty,
  QuestionType,
  TestLanguage,
} from "@/domain/entities";

/** Сколько вопросов каждого типа нужно сгенерировать. */
export interface TypeCount {
  type: QuestionType;
  count: number;
}

export interface GenerateQuestionsParams {
  /** Текст материала, по которому генерируются вопросы. */
  content: string;
  /** Сколько вопросов каждого типа нужно. */
  typeCounts: TypeCount[];
  /** Общее количество вопросов (сумма по типам). */
  totalCount: number;
  /** Сложность вопросов. */
  difficulty: Difficulty | null;
  /** Язык, на котором должны быть вопросы. */
  language: TestLanguage;
  /**
   * true — вопросы «на размышление» (дорогой режим мышления),
   * false — обычные вопросы на знание материала (дешёвый режим).
   */
  thinking: boolean;
  /** Тексты уже существующих вопросов, чтобы модель не повторялась. */
  existingQuestions?: string[];
}

export interface GeneratedAnswerOption {
  text: string;
  isCorrect: boolean;
}

export interface GeneratedQuestion {
  type: QuestionType;
  text: string;
  difficulty: Difficulty | null;
  cognitiveLevel: CognitiveLevel;
  explanation: string | null;
  sourceQuote: string | null;
  expectedAnswer: string | null;
  options: GeneratedAnswerOption[];
}

/** Сколько стоил один вызов модели. */
export interface GenerationUsage {
  model: string;
  /** Режим мышления: low или high. */
  effort: string;
  inputTokens: number;
  outputTokens: number;
  cacheHitTokens: number;
  costUsd: number;
  durationMs: number;
}

export interface GenerationResult {
  questions: GeneratedQuestion[];
  usage: GenerationUsage;
}

export interface QuestionGenerator {
  generate(params: GenerateQuestionsParams): Promise<GenerationResult>;
}

/** Ошибка обращения к внешнему ИИ-сервису. */
export class AiServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiServiceError";
  }
}
