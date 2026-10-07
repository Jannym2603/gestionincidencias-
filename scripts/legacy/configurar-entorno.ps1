Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Configuracion local - Gestion Incidencias" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

function Leer-TextoConDefault {
    param(
        [string]$Mensaje,
        [string]$Default
    )

    $valor = Read-Host "$Mensaje [$Default]"
    if ([string]::IsNullOrWhiteSpace($valor)) {
        return $Default
    }
    return $valor.Trim()
}

function Leer-Secreto {
    param([string]$Mensaje)

    $seguro = Read-Host $Mensaje -AsSecureString
    return [System.Net.NetworkCredential]::new("", $seguro).Password
}

function Generar-JwtSecret {
    $bytes = New-Object byte[] 64
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    return [Convert]::ToBase64String($bytes)
}

$dbUrl = Leer-TextoConDefault "DB_URL" "jdbc:postgresql://localhost:5432/gestionincidencias"
$dbUser = Leer-TextoConDefault "DB_USERNAME" "postgres"
$dbPassword = Leer-Secreto "DB_PASSWORD (no se mostrara)"
$frontendUrl = Leer-TextoConDefault "FRONTEND_URL" "http://localhost:8081"
$mailUser = Read-Host "MAIL_USERNAME (correo Gmail)"
$mailPassword = Leer-Secreto "MAIL_PASSWORD (contrasena de aplicacion; no se mostrara)"
$supportEmail = Leer-TextoConDefault "SUPPORT_EMAIL" $mailUser

Write-Host ""
$respuestaJwt = Read-Host "Presiona ENTER para generar un JWT_SECRET seguro automaticamente, o escribe uno propio"
if ([string]::IsNullOrWhiteSpace($respuestaJwt)) {
    $jwtSecret = Generar-JwtSecret
} else {
    $jwtSecret = $respuestaJwt.Trim()
}

$valores = @{
    "DB_URL" = $dbUrl
    "DB_USERNAME" = $dbUser
    "DB_PASSWORD" = $dbPassword
    "JWT_SECRET" = $jwtSecret
    "FRONTEND_URL" = $frontendUrl
    "MAIL_USERNAME" = $mailUser.Trim()
    "MAIL_PASSWORD" = $mailPassword
    "SUPPORT_EMAIL" = $supportEmail
}

foreach ($item in $valores.GetEnumerator()) {
    [Environment]::SetEnvironmentVariable(
        $item.Key,
        $item.Value,
        "User"
    )
}

Write-Host ""
Write-Host "Variables configuradas correctamente para tu usuario de Windows." -ForegroundColor Green
Write-Host "Los secretos no fueron guardados dentro del proyecto." -ForegroundColor Green
Write-Host ""
Write-Host "Cierra y vuelve a abrir la terminal de VS Code antes de iniciar la aplicacion." -ForegroundColor Yellow
