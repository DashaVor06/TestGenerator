// Mock-реализация порта QuestionGenerator (для демо и тестов без API-ключа).
// Вопросы строятся из предложений материала, поэтому текст всегда «настоящий»,
// но качество, конечно, ниже, чем у ИИ.

import type {
  GenerateQuestionsParams,
  GeneratedQuestion,
  GenerationResult,
  QuestionGenerator,
} from "@/application/ports";
import type { QuestionType } from "@/domain/entities";

export class MockQuestionGenerator implements QuestionGenerator {
  async generate(params: GenerateQuestionsParams): Promise<GenerationResult> {
    const sentences = params.content
      .split(/[.!?]+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 15);

    const questions: GeneratedQuestion[] = [];
    let sentenceIndex = 0;

    for (const typeCount of params.typeCounts) {
      for (let i = 0; i < typeCount.count; i++) {
        const sentence = sentences[sentenceIndex % Math.max(sentences.length, 1)];
        sentenceIndex++;

        if (!sentence) {
          break;
        }

        questions.push(this.buildQuestion(typeCount.type, sentence, params));
      }
    }

    return {
      questions: questions.slice(0, params.totalCount),
      usage: {
        model: "mock",
        effort: params.thinking ? "high" : "low",
        inputTokens: 0,
        outputTokens: 0,
        cacheHitTokens: 0,
        costUsd: 0,
        durationMs: 0,
      },
    };
  }

  private buildQuestion(
    type: QuestionType,
    sentence: string,
    params: GenerateQuestionsParams
  ): GeneratedQuestion {
    const difficulty = params.difficulty ?? "MEDIUM";
    const cognitiveLevel = params.thinking ? ("APPLY" as const) : ("REMEMBER" as const);

    if (type === "TRUE_FALSE") {
      return {
        type,
        text: `Верно ли утверждение: «${sentence}»?`,
        difficulty,
        cognitiveLevel,
        explanation: sentence,
        sourceQuote: sentence,
        expectedAnswer: null,
        options: [
          { text: "Верно", isCorrect: true },
          { text: "Неверно", isCorrect: false },
        ],
      };
    }

    if (type === "SHORT_ANSWER") {
      // Берём последнее слово предложения как «термин».
      const words = sentence.split(/\s+/);
      const term = words[words.length - 1].replace(/[^\p{L}\p{N}-]/gu, "");

      return {
        type,
        text: `Закончите утверждение одним словом: «${sentence.slice(0, 60)}…»`,
        difficulty,
        cognitiveLevel,
        explanation: sentence,
        sourceQuote: sentence,
        expectedAnswer: term,
        options: [],
      };
    }

    if (type === "OPEN") {
      return {
        type,
        text: `Объясните своими словами: «${sentence.slice(0, 80)}…»`,
        difficulty,
        cognitiveLevel,
        explanation: sentence,
        sourceQuote: sentence,
        expectedAnswer: null,
        options: [],
      };
    }

    const isSingle = type === "SINGLE_CHOICE";

    return {
      type,
      text: `Какое утверждение соответствует материалу? «${sentence.slice(0, 60)}…»`,
      difficulty,
      cognitiveLevel,
      explanation: sentence,
      sourceQuote: sentence,
      expectedAnswer: null,
      options: [
        { text: sentence, isCorrect: true },
        { text: "Утверждение противоречит материалу", isCorrect: false },
        { text: "В материале нет такой информации", isCorrect: false },
        ...(isSingle
          ? [{ text: "Все варианты неверны", isCorrect: false }]
          : [
              { text: "Все варианты неверны", isCorrect: false },
              { text: "Вопрос не относится к теме", isCorrect: false },
            ]),
      ],
    };
  }
}
