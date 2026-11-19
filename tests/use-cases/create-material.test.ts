import { describe, expect, it } from "vitest";
import { createMaterial } from "@/application/use-cases/materials/create-material";
import { ValidationError } from "@/domain/errors/domain-error";
import { makeMaterialRepo } from "../helpers/fakes";

describe("createMaterial", () => {
  it("сохраняет текст материала и помечает его как готовый", async () => {
    const { repo } = makeMaterialRepo();
    const content = "Достаточно длинный текст материала для генерации тестовых вопросов.";

    const material = await createMaterial(
      "user-1",
      { title: "Конспект", content },
      { materials: repo }
    );

    expect(material.content).toBe(content);
    expect(material.source).toBe("TEXT");
    expect(material.status).toBe("READY");
  });

  it("сохраняет источник и ссылку", async () => {
    const { repo } = makeMaterialRepo();

    const material = await createMaterial(
      "user-1",
      {
        title: "Статья",
        content: "Достаточно длинный текст статьи, загруженной по ссылке, для теста.",
        source: "URL",
        sourceUrl: "https://example.com/article",
      },
      { materials: repo }
    );

    expect(material.source).toBe("URL");
    expect(material.sourceUrl).toBe("https://example.com/article");
  });

  it("не принимает пустой материал", async () => {
    const { repo } = makeMaterialRepo();

    await expect(
      createMaterial("user-1", { title: "Пусто", content: "   " }, { materials: repo })
    ).rejects.toThrow(ValidationError);
  });

  it("не принимает слишком короткий текст", async () => {
    const { repo } = makeMaterialRepo();

    await expect(
      createMaterial("user-1", { title: "Коротко", content: "Пара слов" }, { materials: repo })
    ).rejects.toThrow(ValidationError);
  });
});
