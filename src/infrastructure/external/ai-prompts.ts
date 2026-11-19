// Тексты запросов к ИИ-сервису.
// Системный запрос специально сделан постоянным: он вместе с материалом
// образует неизменяемый префикс, который DeepSeek кэширует и считает в 50 раз
// дешевле. Поэтому инструкции идут первыми, а параметры генерации — в конце.

import type { GenerateQuestionsParams } from "@/application/ports";
import type { QuestionType, TestLanguage } from "@/domain/entities";

/** Названия типов вопросов для человека (в запросе к модели). */
const TYPE_NAMES: Record<QuestionType, string> = {
  SINGLE_CHOICE: "SINGLE_CHOICE — один правильный вариант из 4",
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE — 2 и более правильных варианта из 4-5",
  TRUE_FALSE: "TRUE_FALSE — верно/неверно, ровно 2 варианта",
  SHORT_ANSWER: "SHORT_ANSWER — короткий ответ (1-3 слова), вводится текстом",
  OPEN: "OPEN — развёрнутый ответ, проверяется преподавателем",
};

/** Системная инструкция. Не зависит от параметров, поэтому хорошо кэшируется. */
export function buildSystemPrompt(language: TestLanguage): string {
  const languageName = language === "EN" ? "английском" : "русском";

  return [
    "Ты — опытный преподаватель-методист. Ты составляешь тестовые вопросы строго по учебному материалу.",
    "",
    "Правила:",
    "1. Используй только факты из материала. Не придумывай то, чего в нём нет.",
    `2. Все тексты (вопросы, варианты, пояснения) пиши на ${languageName} языке.`,
    "3. В каждом вопросе ровно один смысл и однозначный правильный ответ.",
    "4. Неправильные варианты должны выглядеть правдоподобно, но быть однозначно неверными.",
    "5. Поле sourceQuote — дословный фрагмент материала (до 200 символов), на котором основан вопрос.",
    "6. Поле explanation — короткое пояснение, почему ответ правильный (1-2 предложения).",
    "",
    "Ответ — ТОЛЬКО валидный JSON-объект без пояснений и без markdown-разметки:",
    "{",
    '  "questions": [',
    "    {",
    '      "type": "SINGLE_CHOICE",',
    '      "text": "текст вопроса",',
    '      "difficulty": "EASY | MEDIUM | HARD",',
    '      "cognitiveLevel": "REMEMBER | UNDERSTAND | APPLY | ANALYZE",',
    '      "explanation": "почему ответ правильный",',
    '      "sourceQuote": "фрагмент материала",',
    '      "expectedAnswer": null,',
    '      "options": [',
    '        { "text": "вариант 1", "isCorrect": true },',
    '        { "text": "вариант 2", "isCorrect": false }',
    "      ]",
    "    }",
    "  ]",
    "}",
  ].join("\n");
}

/** Блок с материалом. Идёт сразу после системной инструкции. */
export function buildMaterialBlock(content: string, wasTruncated: boolean): string {
  const note = wasTruncated
    ? "\n\n(Материал сокращён. Составляй вопросы только по приведённому фрагменту.)"
    : "";

  return ["МАТЕРИАЛ:", '"""', content, '"""', note].join("\n");
}

/** Вариативная часть запроса: что именно и в каком количестве нужно. */
export function buildTaskBlock(params: GenerateQuestionsParams): string {
  const typesList = params.typeCounts
    .map((item) => `- ${TYPE_NAMES[item.type]}: ${item.count} шт.`)
    .join("\n");

  const lines: string[] = [
    "ЗАДАНИЕ:",
    `- Всего вопросов: ${params.totalCount}`,
    "- Распределение по типам:",
    typesList,
    `- Сложность: ${params.difficulty ?? "MEDIUM"}`,
  ];

  if (params.thinking) {
    lines.push(
      "- Уровень мышления: APPLY и ANALYZE (вопросы «на размышление»).",
      "- Ответ нельзя найти в материале дословно: ученик должен применить знание, сравнить, объяснить причину или сделать вывод.",
      "- Формулируй вопрос так, чтобы он опирался на материал, но требовал размышления."
    );
  } else {
    lines.push(
      "- Уровень мышления: REMEMBER и UNDERSTAND (вопросы на знание материала).",
      "- Ответ должен прямо следовать из материала."
    );
  }

  lines.push(
    "- Для SHORT_ANSWER обязательно заполни expectedAnswer (эталонный ответ).",
    "- Для OPEN верни пустой массив options."
  );

  if (params.existingQuestions && params.existingQuestions.length > 0) {
    lines.push(
      "- Не повторяй вопросы, которые уже есть:",
      ...params.existingQuestions.slice(0, 30).map((text) => `  * ${text}`)
    );
  }

  lines.push("Верни JSON строго по описанной схеме.");

  return lines.join("\n");
}
