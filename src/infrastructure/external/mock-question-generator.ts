// Mock-реализация порта QuestionGenerator (для демо/тестов без API-ключа).

import type {
  GenerateQuestionsParams,
  GeneratedQuestion,
  QuestionGenerator,
} from "@/application/ports";
import type { QuestionType } from "@/domain/entities";

export class MockQuestionGenerator implements QuestionGenerator {
  async generate(params: GenerateQuestionsParams): Promise<GeneratedQuestion[]> {
    const sentences = params.content
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    if (sentences.length === 0) {
      return [];
    }

    const count = Math.min(params.count, sentences.length);
    const questions: GeneratedQuestion[] = [];

    for (let i = 0; i < count; i++) {
      const type = params.types[i % params.types.length] ?? "MULTIPLE_CHOICE";
      questions.push(this.buildQuestion(type, sentences[i], params.difficulty ?? "easy"));
    }

    return questions;
  }

  private buildQuestion(
    type: QuestionType,
    sentence: string,
    difficulty: string
  ): GeneratedQuestion {
    if (type === "TRUE_FALSE") {
      return {
        type: "TRUE_FALSE",
        text: `Верно ли утверждение: «${sentence}»?`,
        difficulty,
        explanation: sentence,
        options: [
          { text: "Верно", isCorrect: true },
          { text: "Неверно", isCorrect: false },
        ],
      };
    }

    return {
      type: "MULTIPLE_CHOICE",
      text: `Какое утверждение соответствует материалу? «${sentence.slice(0, 60)}…»`,
      difficulty,
      explanation: sentence,
      options: [
        { text: sentence, isCorrect: true },
        { text: "Утверждение противоречит материалу", isCorrect: false },
        { text: "В материале нет такой информации", isCorrect: false },
        { text: "Все варианты неверны", isCorrect: false },
      ],
    };
  }
}
