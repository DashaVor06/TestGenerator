// Фабрика генератора вопросов: DeepSeek при наличии ключа, иначе mock.

import type { QuestionGenerator } from "@/application/ports";
import { config } from "@/config";
import { MockQuestionGenerator } from "./mock-question-generator";
import { OpenAiQuestionGenerator } from "./openai-question-generator";

/** Создаёт генератор на основе настроек из переменных окружения. */
export function createQuestionGenerator(): QuestionGenerator {
  if (!config.ai.apiKey) {
    return new MockQuestionGenerator();
  }

  return new OpenAiQuestionGenerator(
    config.ai.apiKey,
    config.ai.baseUrl,
    config.ai.model,
    config.ai.basicEffort,
    config.ai.thinkingEffort
  );
}

export const questionGenerator = createQuestionGenerator();
