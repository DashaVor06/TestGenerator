import { describe, expect, it, vi } from "vitest";
import { shareTest } from "@/application/use-cases/tests/share-test";
import { ForbiddenError, NotFoundError } from "@/domain/errors/domain-error";
import { makeTest, makeTestRepo } from "../helpers/fakes";

describe("shareTest", () => {
  it("для приватного теста не создаёт ссылку", async () => {
    const { repo } = makeTestRepo([makeTest({ visibility: "PRIVATE", shareToken: null })]);
    const createToken = vi.fn(() => "token-1");

    const test = await shareTest(
      "t1",
      "user-1",
      { visibility: "PRIVATE" },
      { tests: repo, createToken }
    );

    expect(test.visibility).toBe("PRIVATE");
    expect(createToken).not.toHaveBeenCalled();
  });

  it("при публикации создаёт ссылку, если её ещё нет", async () => {
    const { repo } = makeTestRepo([makeTest({ visibility: "PRIVATE", shareToken: null })]);
    const createToken = vi.fn(() => "token-1");

    const test = await shareTest(
      "t1",
      "user-1",
      { visibility: "UNLISTED" },
      { tests: repo, createToken }
    );

    expect(test.visibility).toBe("UNLISTED");
    expect(test.shareToken).toBe("token-1");
    expect(createToken).toHaveBeenCalledTimes(1);
  });

  it("не меняет существующую ссылку без запроса", async () => {
    const { repo } = makeTestRepo([makeTest({ visibility: "PUBLIC", shareToken: "old" })]);
    const createToken = vi.fn(() => "new");

    const test = await shareTest(
      "t1",
      "user-1",
      { visibility: "PUBLIC" },
      { tests: repo, createToken }
    );

    expect(test.shareToken).toBe("old");
    expect(createToken).not.toHaveBeenCalled();
  });

  it("обновляет ссылку по запросу", async () => {
    const { repo } = makeTestRepo([makeTest({ visibility: "PUBLIC", shareToken: "old" })]);
    const createToken = vi.fn(() => "new");

    const test = await shareTest(
      "t1",
      "user-1",
      { visibility: "PUBLIC", regenerateToken: true },
      { tests: repo, createToken }
    );

    expect(test.shareToken).toBe("new");
  });

  it("запрещает публиковать чужой тест", async () => {
    const { repo } = makeTestRepo([makeTest({ ownerId: "other-user" })]);

    await expect(
      shareTest(
        "t1",
        "user-1",
        { visibility: "PUBLIC" },
        { tests: repo, createToken: () => "token" }
      )
    ).rejects.toThrow(ForbiddenError);
  });

  it("выбрасывает NotFoundError для несуществующего теста", async () => {
    const { repo } = makeTestRepo();

    await expect(
      shareTest("missing", "user-1", { visibility: "PUBLIC" }, { tests: repo, createToken: () => "t" })
    ).rejects.toThrow(NotFoundError);
  });
});
