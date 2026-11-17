// Реализация порта QuestionGenerator через OpenAI-совместимый API.

import type {
  GenerateQuestionsParams,
  GeneratedQuestion,
  QuestionGenerator,
} from "@/application/ports";

export class OpenAiQuestionGenerator implements QuestionGenerator {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string
  ) {}

  async generate(params: GenerateQuestionsParams): Promise<GeneratedQuestion[]> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "Ты — генератор учебных тестов. Отвечай ТОЛЬКО валидным JSON без пояснений.",
          },
          { role: "user", content: this.buildPrompt(params) },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`ИИ-сервис вернул ошибку: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "[]";
    return this.parseQuestions(content);
  }

  private buildPrompt(params: GenerateQuestionsParams): string {
    const typeHints: Record<string, string> = {
      MULTIPLE_CHOICE: "множественный выбор (4 варианта, один или несколько верных)",
      TRUE_FALSE: "верно/неверно",
      OPEN: "открытый ответ",
    };
    const types = params.types.map((t) => typeHints[t] ?? t).join(", ");

    return [
      `Сгенерируй ${params.count} вопросов типа: ${types}.`,
      `Сложность: ${params.difficulty ?? "easy"}.`,
      "Для каждого вопроса верни объект с полями: type, text, difficulty, explanation, options.",
      "options — массив {text, isCorrect} (для TRUE_FALSE — 2 варианта, для MULTIPLE_CHOICE — 3-4).",
      "Ответ верни строго как JSON-массив.",
      "",
      "Материал:",
      params.content,
    ].join("\n");
  }

  private parseQuestions(content: string): GeneratedQuestion[] {
    const cleaned = content.replace(/```json|```/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (!match) return [];
      try {
        const parsed = JSON.parse(match[0]);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
  }
}
