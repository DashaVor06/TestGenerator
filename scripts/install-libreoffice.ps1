# Установка LibreOffice для просмотра DOCX и PPTX страницами.
# Запуск: pnpm setup:libreoffice
#
# Установка выполняется в отдельном окне с правами администратора:
# так видно прогресс и запросы подтверждения, и скрипт не «зависает» молча.
# Если за отведённое время установка не завершилась, она прерывается,
# показывается журнал и открывается страница загрузки.

$ErrorActionPreference = "Stop"

$standard = "C:\Program Files\LibreOffice\program\soffice.exe"
$alternative = "C:\Program Files (x86)\LibreOffice\program\soffice.exe"
$timeoutSeconds = 900
$log = Join-Path $env:TEMP "libreoffice-install.log"

function Test-LibreOfficeInstalled {
    return (Test-Path -LiteralPath $standard) -or (Test-Path -LiteralPath $alternative)
}

function Invoke-ElevatedInstall {
    param(
        [string]$Command,
        [string]$Title
    )

    Write-Host $Title

    $inner = "$Command *> '$log'"

    try {
        $process = Start-Process -FilePath "powershell" -Verb RunAs -PassThru -ArgumentList @(
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command", $inner
        )
    }
    catch {
        Write-Host "Запуск с правами администратора отменён."
        return $false
    }

    if (-not $process.WaitForExit($timeoutSeconds * 1000)) {
        try { $process.Kill() } catch { }
        Write-Host "Установка не завершилась за $timeoutSeconds секунд и была прервана."
        return $false
    }

    return $true
}

if (Test-LibreOfficeInstalled) {
    Write-Host "LibreOffice уже установлен."
    exit 0
}

Write-Host "LibreOffice не найден. Начинаю установку."

# 1. Chocolatey — обычно ставит пакет полностью в автоматическом режиме.
if (Get-Command choco -ErrorAction SilentlyContinue) {
    $ok = Invoke-ElevatedInstall `
        -Command "choco install libreoffice-fresh -y --no-progress" `
        -Title "Устанавливаю LibreOffice через Chocolatey..."

    if ($ok -and (Test-LibreOfficeInstalled)) {
        Write-Host "Готово: LibreOffice установлен."
        exit 0
    }
}

# 2. winget — если Chocolatey не помог.
if (Get-Command winget -ErrorAction SilentlyContinue) {
    $wingetCommand = "winget install --id TheDocumentFoundation.LibreOffice --exact --silent " +
        "--accept-package-agreements --accept-source-agreements --disable-interactivity"

    $ok = Invoke-ElevatedInstall -Command $wingetCommand -Title "Устанавливаю LibreOffice через winget..."

    if ($ok -and (Test-LibreOfficeInstalled)) {
        Write-Host "Готово: LibreOffice установлен."
        exit 0
    }
}

# 3. Ручная установка: открываем страницу загрузки.
Write-Host ""
Write-Host "Автоматическая установка не удалась."

if (Test-Path -LiteralPath $log) {
    Write-Host ""
    Write-Host "Последние строки журнала установки:"
    Get-Content -LiteralPath $log -Tail 15 -ErrorAction SilentlyContinue |
        ForEach-Object { Write-Host "  $_" }
}

Write-Host ""
Write-Host "Открываю страницу загрузки LibreOffice. Установите вручную — это 5 минут."
Start-Process "https://ru.libreoffice.org/download/"

Write-Host ""
Write-Host "Если программа установится в нестандартную папку, укажите путь в .env:"
Write-Host 'LIBREOFFICE_PATH="C:\Program Files\LibreOffice\program\soffice.exe"'

exit 1
