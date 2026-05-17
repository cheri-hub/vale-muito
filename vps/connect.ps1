# ============================================================
# VPS SSH Connection Script
# ============================================================
# Edit the three variables below once, then run:
#   .\connect.ps1          — connects to the VPS
#   .\connect.ps1 -Setup   — gera a chave SSH e envia para o servidor
# ============================================================

param(
    [switch]$Setup
)

$VPS_USER = "root"          # <-- troque pelo seu usuario
$VPS_IP   = "76.13.68.64"      # <-- troque pelo IP da sua VPS
$KEY_PATH = "$env:USERPROFILE\.ssh\id_ed25519_vps"

function Test-SshAvailable {
    return (Get-Command ssh -ErrorAction SilentlyContinue) -ne $null
}

function Setup-SshKey {
    if (-not (Test-SshAvailable)) {
        Write-Error "ssh nao encontrado. Instale o OpenSSH pelo Windows: Settings > Apps > Optional Features > OpenSSH Client"
        exit 1
    }

    if (-not (Test-Path $KEY_PATH)) {
        Write-Host "Gerando chave SSH em $KEY_PATH ..." -ForegroundColor Cyan
        ssh-keygen -t ed25519 -f $KEY_PATH -N "" -C "vps-$VPS_IP"
    } else {
        Write-Host "Chave ja existe: $KEY_PATH" -ForegroundColor Yellow
    }

    $pubKey = Get-Content "$KEY_PATH.pub"
    Write-Host ""
    Write-Host "Enviando chave publica para ${VPS_USER}@${VPS_IP} ..." -ForegroundColor Cyan
    Write-Host "(Voce precisara digitar sua senha UMA ultima vez)" -ForegroundColor Gray
    Write-Host ""

    # Cria o diretorio .ssh e adiciona a chave no servidor
    $remoteCmd = "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$pubKey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
    ssh "${VPS_USER}@${VPS_IP}" $remoteCmd

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Chave configurada com sucesso!" -ForegroundColor Green
        Write-Host "Agora rode .\connect.ps1 para conectar sem senha." -ForegroundColor Green
    } else {
        Write-Error "Falha ao configurar a chave. Verifique usuario, IP e senha."
    }
}

function Connect-Vps {
    if (-not (Test-SshAvailable)) {
        Write-Error "ssh nao encontrado. Instale o OpenSSH pelo Windows: Settings > Apps > Optional Features > OpenSSH Client"
        exit 1
    }

    if ($VPS_IP -eq "0.0.0.0") {
        Write-Error "Configure VPS_USER e VPS_IP no topo do script antes de conectar."
        exit 1
    }

    $sshArgs = @("${VPS_USER}@${VPS_IP}")

    if (Test-Path $KEY_PATH) {
        $sshArgs = @("-i", $KEY_PATH) + $sshArgs
    } else {
        Write-Host "Chave SSH nao encontrada. Rodando sem chave (pedira senha)." -ForegroundColor Yellow
        Write-Host "Rode .\connect.ps1 -Setup para configurar autenticacao por chave." -ForegroundColor Gray
        Write-Host ""
    }

    Write-Host "Conectando em ${VPS_USER}@${VPS_IP} ..." -ForegroundColor Cyan
    ssh @sshArgs
}

if ($Setup) {
    Setup-SshKey
} else {
    Connect-Vps
}
