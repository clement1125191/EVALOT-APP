param([string]$Python = 'python')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Push-Location $projectRoot
try {
    $ocrPython = Join-Path $projectRoot '.data/paddleocr-venv/Scripts/python.exe'
    if (!(Test-Path -LiteralPath $ocrPython)) {
        & $Python -m venv .data/paddleocr-venv
        if ($LASTEXITCODE -ne 0) { throw 'Could not create OCR virtual environment.' }
    }
    & $ocrPython -m pip install --upgrade 'pip>=26.2.2'
    if ($LASTEXITCODE -ne 0) { throw 'Could not update the OCR package installer.' }
    & $ocrPython -m pip install --retries 5 --timeout 60 -r services/ocr/requirements.txt
    if ($LASTEXITCODE -ne 0) { throw 'PaddleOCR installation failed.' }
    & $ocrPython -m pip check
    if ($LASTEXITCODE -ne 0) { throw 'OCR dependency check failed.' }
    Write-Host 'CPU OCR installed. See services/ocr/README.md to run extraction.'
} finally { Pop-Location }
