# Установка LibreOffice для просмотра DOCX и PPTX страницами.
# Запуск: pnpm setup:libreoffice
# Скрипт также вызывается автоматически после pnpm install (см. scripts/postinstall.mjs).

$ErrorActionPreference = "Stop"

$standard = "C:\Program Files\LibreOffice\program\soffice.exe"
$alternative = "C:\Program Files (x86)\LibreOffice\program\soffice.exe"

if (Test-Path -LiteralPath $standard) {
    Write-Host "LibreOffice уже установлен: $standard"
    exit 0
}

if (Test-Path -LiteralPath $alternative) {
    Write-Host "LibreOffice уже установлен: $alternative"
    exit 0
}

# Основной способ — winget (есть в Windows 10/11).
if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "Устанавливаю LibreOffice через winget..."
    winget install --id TheDocumentFoundation.LibreOffice --exact `
        --accept-package-agreements --accept-source-agreements

    if (Test-Path -LiteralPath $standard) {
        Write-Host "Готово: $standard"
        exit 0
    }
}

# Запасной способ — Chocolatey.
if (Get-Command choco -ErrorAction SilentlyContinue) {
    Write-Host "Устанавливаю LibreOffice через Chocolatey..."
    choco install libreoffice-fresh -y

    if ((Test-Path -LiteralPath $standard) -or (Test-Path -LiteralPath $alternative)) {
        Write-Host "Готово"
        exit 0
    }
}

Write-Host ""
Write-Host "Автоматическая установка не удалась."
Write-Host "Скачайте LibreOffice вручную: https://ru.libreoffice.org/download/"
Write-Host 'Если он установлен в другую папку, укажите путь в .env:'
Write-Host 'LIBREOFFICE_PATH="C:\Program Files\LibreOffice\program\soffice.exe"'
exit 1
