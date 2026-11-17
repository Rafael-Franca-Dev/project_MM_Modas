# =====================================================================
# Script de Inicializacao Completa — MM MODAS (Back-end + Front-end)
# =====================================================================
$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackDir = Join-Path $RootDir "MM_Modas_Back"
$FrontDir = Join-Path $RootDir "MM_Modas_Front"

# Garante JAVA_HOME caso nao esteja definido na sessao
if (-not $env:JAVA_HOME) {
    $jdkCandidates = @(
        "C:\Program Files\Java\latest\jdk-21",
        "C:\Program Files\Java\jdk-21.0.12.1"
    )
    foreach ($candidate in $jdkCandidates) {
        if (Test-Path $candidate) {
            $env:JAVA_HOME = $candidate
            break
        }
    }
}

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  MM MODAS - Iniciando Back-end e Front-end" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Back-end (Spring Boot) : http://localhost:8080/api" -ForegroundColor Yellow
Write-Host "  Front-end (React/Vite) : http://localhost:5173" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Cyan

# Instala dependencias do Front-end automaticamente se node_modules nao existir
if (-not (Test-Path (Join-Path $FrontDir "node_modules"))) {
    Write-Host "`n[Front-end] Instalando dependencias (npm install)..." -ForegroundColor Yellow
    Push-Location $FrontDir
    npm install
    Pop-Location
}

# 1. Inicia o Back-end em uma nova janela do PowerShell
Write-Host "`n[1/2] Abrindo servidor Back-end (Spring Boot na porta 8080)..." -ForegroundColor Yellow
$backCommand = "Set-Location '$BackDir'; if ('$env:JAVA_HOME') { `$env:JAVA_HOME = '$env:JAVA_HOME' }; Write-Host 'Iniciando MM Modas API (porta 8080)...' -ForegroundColor Cyan; .\mvnw.cmd spring-boot:run"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backCommand

# 2. Inicia o Front-end no terminal atual
Write-Host "[2/2] Iniciando servidor Front-end (Vite na porta 5173)...`n" -ForegroundColor Green
Set-Location $FrontDir
npm run dev
