// Фабрика генератора вопросов: OpenAI при наличии ключа, иначе mock.

import type { QuestionGenerator } from "@/application/ports";
import { MockQuestionGenerator } from "./mock-question-generator";
import { OpenAiQuestionGenerator } from "./openai-question-generator";

export function createQuestionGenerator(): QuestionGenerator {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    return new OpenAiQuestionGenerator(apiKey, baseUrl, model);
  }

  return new MockQuestionGenerator();
}

export const questionGenerator = createQuestionGenerator();
