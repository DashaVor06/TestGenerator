// Выполняется после `pnpm install`.
//
// Только проверяет наличие LibreOffice и подсказывает, как его поставить.
// Саму установку здесь не запускаем: она требует прав администратора и
// может надолго «подвесить» установку зависимостей.

import { existsSync } from "node:fs";

const CANDIDATES = [
  process.env.LIBREOFFICE_PATH,
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
].filter((value) => Boolean(value));

const installed = CANDIDATES.some((candidate) => existsSync(candidate));

if (process.platform === "win32" && !installed) {
  console.log(
    "[postinstall] LibreOffice не найден. DOCX и PPTX будут открываться " +
      "в упрощённом виде. Установить: pnpm setup:libreoffice"
  );
}

process.exit(0);
