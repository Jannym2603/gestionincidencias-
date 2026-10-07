Write-Host ""
Write-Host "============================================"
Write-Host " Sistema de Gestion de Incidencias"
Write-Host " Iniciando entorno local"
Write-Host "============================================"
Write-Host ""


# ==========================================================
# VALORES LOCALES POR DEFECTO
# ==========================================================

$defaults = @{
    "DB_URL"       = "jdbc:postgresql://localhost:5432/gestionincidencias"
    "DB_USERNAME"  = "postgres"
    "FRONTEND_URL" = "http://localhost:8081"
}


# ==========================================================
# VARIABLES OBLIGATORIAS
# ==========================================================

$variablesObligatorias = @(
    "DB_URL",
    "DB_USERNAME",
    "DB_PASSWORD",
    "JWT_SECRET",
    "FRONTEND_URL"
)


# ==========================================================
# VARIABLES OPCIONALES DE CORREO
# ==========================================================

$variablesOpcionales = @(
    "MAIL_USERNAME",
    "MAIL_PASSWORD",
    "SUPPORT_EMAIL",
    "MAIL_COPY_SUPPORT"
)


$faltantes = @()


# ==========================================================
# CARGAR VARIABLES OBLIGATORIAS
# ==========================================================

foreach ($variable in $variablesObligatorias) {

    $valor = [Environment]::GetEnvironmentVariable(
        $variable,
        "User"
    )

    if ([string]::IsNullOrWhiteSpace($valor)) {

        if ($defaults.ContainsKey($variable)) {

            $valor = $defaults[$variable]

            Set-Item `
                -Path "Env:$variable" `
                -Value $valor

            Write-Host `
                "[OK] $variable (valor local por defecto)" `
                -ForegroundColor Green

        } else {

            Write-Host `
                "[FALTA] $variable" `
                -ForegroundColor Red

            $faltantes += $variable
        }

    } else {

        Set-Item `
            -Path "Env:$variable" `
            -Value $valor

        Write-Host `
            "[OK] $variable" `
            -ForegroundColor Green
    }
}


Write-Host ""


# ==========================================================
# VERIFICAR VARIABLES OBLIGATORIAS
# ==========================================================

if ($faltantes.Count -gt 0) {

    Write-Host `
        "No se puede iniciar la aplicacion." `
        -ForegroundColor Red

    Write-Host `
        "Faltan estas variables obligatorias:" `
        -ForegroundColor Yellow

    foreach ($variable in $faltantes) {
        Write-Host " - $variable"
    }

    Write-Host ""
    exit 1
}


# ==========================================================
# CARGAR CONFIGURACION OPCIONAL DE CORREO
# ==========================================================

Write-Host ""
Write-Host "Configuracion de correo:" -ForegroundColor Cyan

$correoConfigurado = $true

foreach ($variable in $variablesOpcionales) {

    $valor = [Environment]::GetEnvironmentVariable(
        $variable,
        "User"
    )

    if ([string]::IsNullOrWhiteSpace($valor)) {

        if ($variable -eq "MAIL_USERNAME" -or
            $variable -eq "MAIL_PASSWORD") {

            $correoConfigurado = $false
        }

        Write-Host `
            "[OPCIONAL] $variable no configurada" `
            -ForegroundColor DarkYellow

    } else {

        Set-Item `
            -Path "Env:$variable" `
            -Value $valor

        Write-Host `
            "[OK] $variable" `
            -ForegroundColor Green
    }
}


Write-Host ""

if ($correoConfigurado) {

    Write-Host `
        "Correo habilitado." `
        -ForegroundColor Green

} else {

    Write-Host `
        "Correo no configurado. El sistema iniciara sin notificaciones por correo." `
        -ForegroundColor Yellow
}


# ==========================================================
# RESUMEN DE CONFIGURACION
# ==========================================================

Write-Host ""
Write-Host "Variables principales configuradas." -ForegroundColor Green

Write-Host ""
Write-Host "Base de datos:"
Write-Host $env:DB_URL

Write-Host ""
Write-Host "Frontend:"
Write-Host $env:FRONTEND_URL


# ==========================================================
# MODO LIGERO
# Usa aproximadamente el 50% de los procesadores disponibles
# ==========================================================

$CPU_TOTAL = [Environment]::ProcessorCount

$CPU_JAVA = [Math]::Max(
    1,
    [Math]::Floor($CPU_TOTAL / 2)
)

$env:JAVA_TOOL_OPTIONS = `
    "-XX:ActiveProcessorCount=$CPU_JAVA -Xms256m -Xmx768m"


Write-Host ""
Write-Host "Modo ligero activado" -ForegroundColor Green
Write-Host "Procesadores detectados: $CPU_TOTAL"
Write-Host "Procesadores para Java: $CPU_JAVA"
Write-Host "RAM maxima para Java: 768 MB"
Write-Host ""


# ==========================================================
# INICIAR SPRING BOOT
# ==========================================================

Write-Host `
    "Ejecutando Spring Boot..." `
    -ForegroundColor Cyan

Write-Host ""

.\mvnw spring-boot:run