Write-Host ""
Write-Host "============================================"
Write-Host " Sistema de Gestion de Incidencias"
Write-Host " Iniciando entorno local"
Write-Host "============================================"
Write-Host ""

$defaults = @{
    "DB_URL" = "jdbc:postgresql://localhost:5432/gestionincidencias"
    "DB_USERNAME" = "postgres"
    "FRONTEND_URL" = "http://localhost:8081"
}

$variables = @(
    "DB_URL",
    "DB_USERNAME",
    "DB_PASSWORD",
    "JWT_SECRET",
    "FRONTEND_URL",
    "MAIL_USERNAME",
    "MAIL_PASSWORD",
    "SUPPORT_EMAIL"
)

$faltantes = @()

foreach ($variable in $variables) {

    $valor = [Environment]::GetEnvironmentVariable(
        $variable,
        "User"
    )

    if ([string]::IsNullOrWhiteSpace($valor)) {

        if ($defaults.ContainsKey($variable)) {
            $valor = $defaults[$variable]
            Set-Item -Path "Env:$variable" -Value $valor
            Write-Host "[OK] $variable (valor local por defecto)" -ForegroundColor Green
        } else {
            Write-Host "[FALTA] $variable" -ForegroundColor Red
            $faltantes += $variable
        }

    } else {

        Set-Item -Path "Env:$variable" -Value $valor

        Write-Host "[OK] $variable" -ForegroundColor Green
    }
}

Write-Host ""

if ($faltantes.Count -gt 0) {

    Write-Host "No se puede iniciar la aplicacion." -ForegroundColor Red
    Write-Host "Faltan estas variables:" -ForegroundColor Yellow

    foreach ($variable in $faltantes) {
        Write-Host " - $variable"
    }

    Write-Host ""
    exit 1
}

Write-Host "Todas las variables estan configuradas." -ForegroundColor Green
Write-Host ""
Write-Host "Base de datos:"
Write-Host $env:DB_URL
Write-Host ""

Write-Host "Ejecutando Spring Boot..." -ForegroundColor Cyan
Write-Host ""

.\mvnw spring-boot:run