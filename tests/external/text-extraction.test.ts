import { describe, expect, it } from "vitest";
import {
  extractFileText,
  extractPlainText,
  extractPdfText,
} from "@/infrastructure/external/text-extraction";
import { buildSamplePdf } from "../helpers/pdf";

describe("extractPdfText", () => {
  it("читает текст из PDF, переданного как Buffer", async () => {
    // unpdf принимает только Uint8Array и отклоняет Buffer,
    // поэтому этот тест ловит регрессию с типом входных данных.
    const text = await extractPdfText(buildSamplePdf("Проверка PDF"));

    expect(text).toContain("Проверка PDF");
  });

  it("извлекает текст через общий диспетчер по расширению", async () => {
    const text = await extractFileText(buildSamplePdf("Dispatch works"), "pdf");

    expect(text).toContain("Dispatch works");
  });
});

describe("extractPlainText", () => {
  it("читает текстовый файл в UTF-8", () => {
    const buffer = Buffer.from("Конспект лекции", "utf8");
    expect(extractPlainText(buffer)).toBe("Конспект лекции");
  });
});

describe("extractFileText", () => {
  it("поддерживает md наравне с txt", async () => {
    const buffer = Buffer.from("# Заголовок\n\nТекст", "utf8");
    const text = await extractFileText(buffer, "md");

    expect(text).toContain("# Заголовок");
  });

  it("отклоняет неизвестное расширение", async () => {
    await expect(
      extractFileText(Buffer.from("data"), "xyz")
    ).rejects.toThrow();
  });
});
