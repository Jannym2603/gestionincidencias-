Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Verificacion del proyecto" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$hayError = $false

function Probar-Comando {
    param([string]$Nombre)

    if (Get-Command $Nombre -ErrorAction SilentlyContinue) {
        Write-Host "[OK] $Nombre" -ForegroundColor Green
    } else {
        Write-Host "[FALTA] $Nombre" -ForegroundColor Red
        $script:hayError = $true
    }
}

Probar-Comando "java"
Probar-Comando "node"

$variables = @(
    "DB_PASSWORD",
    "JWT_SECRET",
    "MAIL_USERNAME",
    "MAIL_PASSWORD",
    "SUPPORT_EMAIL"
)

foreach ($variable in $variables) {
    $valor = [Environment]::GetEnvironmentVariable($variable, "User")
    if ([string]::IsNullOrWhiteSpace($valor)) {
        Write-Host "[FALTA] $variable" -ForegroundColor Red
        $hayError = $true
    } else {
        Write-Host "[OK] $variable" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Comprobando sintaxis JavaScript..." -ForegroundColor Cyan

$archivosJs = Get-ChildItem ".\src\main\resources\static" -Filter "*.js" -File
foreach ($archivo in $archivosJs) {
    node --check $archivo.FullName
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] $($archivo.Name)" -ForegroundColor Red
        $hayError = $true
        break
    }
}

if (-not $hayError) {
    Write-Host "[OK] JavaScript" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ejecutando pruebas Maven..." -ForegroundColor Cyan
    .\mvnw clean test
    if ($LASTEXITCODE -ne 0) {
        $hayError = $true
    }
}

Write-Host ""
if ($hayError) {
    Write-Host "La verificacion encontro elementos pendientes." -ForegroundColor Red
    exit 1
}

Write-Host "Proyecto verificado correctamente." -ForegroundColor Green
