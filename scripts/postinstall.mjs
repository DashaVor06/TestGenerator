// Выполняется после `pnpm install`.
//
// На Windows проверяет, установлен ли LibreOffice, и если нет — пытается
// поставить его через winget или Chocolatey. Ошибки установки не прерывают
// установку зависимостей проекта: без LibreOffice приложение просто покажет
// документы в упрощённом виде.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CANDIDATES = [
  process.env.LIBREOFFICE_PATH,
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
].filter((value) => Boolean(value));

const alreadyInstalled = CANDIDATES.some((candidate) => existsSync(candidate));

// На других системах и в CI ничего не делаем.
if (process.platform !== "win32" || alreadyInstalled || process.env.CI) {
  process.exit(0);
}

const scriptPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "install-libreoffice.ps1"
);

console.log("[postinstall] LibreOffice не найден — пробую установить автоматически…");

const result = spawnSync(
  "powershell",
  ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath],
  { stdio: "inherit" }
);

if (result.status !== 0) {
  console.log(
    "[postinstall] Не удалось установить LibreOffice автоматически. " +
      "Установите вручную или выполните: pnpm setup:libreoffice"
  );
}

// Установка зависимостей не должна падать из-за LibreOffice.
process.exit(0);
