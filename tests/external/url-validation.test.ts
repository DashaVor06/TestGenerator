import { describe, expect, it } from "vitest";
import { validateUrl } from "@/infrastructure/external/url-extraction";

describe("validateUrl", () => {
  it("принимает обычную https-ссылку", () => {
    const url = validateUrl("https://example.com/article");
    expect(url.hostname).toBe("example.com");
    expect(url.protocol).toBe("https:");
  });

  it("принимает http-ссылку", () => {
    expect(validateUrl("http://example.com").protocol).toBe("http:");
  });

  it("отклоняет локальные адреса", () => {
    expect(() => validateUrl("http://localhost:3000")).toThrow();
    expect(() => validateUrl("http://127.0.0.1")).toThrow();
    expect(() => validateUrl("http://192.168.1.10/admin")).toThrow();
  });

  it("отклоняет другие протоколы", () => {
    expect(() => validateUrl("ftp://example.com/file")).toThrow();
    expect(() => validateUrl("javascript:alert(1)")).toThrow();
  });

  it("отклоняет некорректную строку", () => {
    expect(() => validateUrl("это не ссылка")).toThrow();
  });
});
