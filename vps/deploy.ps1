param(
    [string]$Remote = "vps",
    [string]$RemoteDir = "/opt/valemuito",
    [int]$HostPort = 3008,
    [string]$ProjectName = "valemuito",
    [switch]$CopyLocalEnv,
    [switch]$SkipChecks
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ArchiveName = "valemuito-$((Get-Date).ToUniversalTime().ToString('yyyyMMddHHmmss')).tar.gz"
$ArchivePath = Join-Path ([System.IO.Path]::GetTempPath()) $ArchiveName

function Invoke-CheckedCommand {
    param([string]$FilePath, [string[]]$Arguments)

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed: $FilePath $($Arguments -join ' ')"
    }
}

if (-not $SkipChecks) {
    Push-Location $RepoRoot
    try {
        Invoke-CheckedCommand "npm" @("run", "lint")
        Invoke-CheckedCommand "npm" @("run", "typecheck")
        Invoke-CheckedCommand "npm" @("run", "test")
        Invoke-CheckedCommand "npm" @("run", "build")
    } finally {
        Pop-Location
    }
}

if (Test-Path $ArchivePath) {
    Remove-Item $ArchivePath -Force
}

$TarArgs = @(
    "-czf", $ArchivePath,
    "--exclude=.git",
    "--exclude=node_modules",
    "--exclude=.next",
    "--exclude=coverage",
    "--exclude=build",
    "--exclude=out",
    "--exclude=.env",
    "--exclude=.env.*",
    "--exclude=.secrets",
    "--exclude=*.tsbuildinfo",
    "--exclude=vps/*.tar.gz",
    "-C", $RepoRoot,
    "."
)
Invoke-CheckedCommand "tar" $TarArgs

Invoke-CheckedCommand "ssh" @($Remote, "mkdir -p '$RemoteDir/releases' '$RemoteDir/shared'")

if ($CopyLocalEnv) {
    $LocalEnv = Join-Path $RepoRoot ".env.local"
    if (-not (Test-Path $LocalEnv)) {
        throw ".env.local not found. Create the remote env file manually at $RemoteDir/shared/.env.production or rerun without -CopyLocalEnv."
    }

    Invoke-CheckedCommand "scp" @($LocalEnv, "${Remote}:$RemoteDir/shared/.env.production.tmp")
    Invoke-CheckedCommand "ssh" @($Remote, "mv '$RemoteDir/shared/.env.production.tmp' '$RemoteDir/shared/.env.production' && chmod 600 '$RemoteDir/shared/.env.production'")
}

Invoke-CheckedCommand "ssh" @($Remote, "test -f '$RemoteDir/shared/.env.production'")
Invoke-CheckedCommand "scp" @($ArchivePath, "${Remote}:$RemoteDir/releases/$ArchiveName")

$RemoteScript = @'
set -euo pipefail
remote_dir="$1"
archive_name="$2"
host_port="$3"
project_name="$4"
release_id="${archive_name%.tar.gz}"
release_dir="$remote_dir/releases/$release_id"
env_file="$remote_dir/shared/.env.production"
container_name="valemuito-app"

command -v docker >/dev/null
if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose is not available on the VPS." >&2
  exit 1
fi

if ss -tln | awk '{print $4}' | grep -Eq "(^|:)${host_port}$"; then
  if ! docker ps --filter "name=^/${container_name}$" --format '{{.Names}}' | grep -qx "$container_name"; then
    echo "Port ${host_port} is already in use by another service. Choose another -HostPort." >&2
    exit 1
  fi
fi

mkdir -p "$release_dir"
tar -xzf "$remote_dir/releases/$archive_name" -C "$release_dir"
ln -sfn "$release_dir" "$remote_dir/current"
cd "$remote_dir/current"

export VALEMUITO_ENV_FILE="$env_file"
export VALEMUITO_HOST_PORT="$host_port"
docker compose -p "$project_name" -f docker-compose.prod.yml up -d --build --remove-orphans
docker compose -p "$project_name" -f docker-compose.prod.yml ps

for attempt in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:${host_port}/" >/dev/null; then
        break
    fi

    if [ "$attempt" -eq 30 ]; then
        echo "Vale Muito did not respond on http://127.0.0.1:${host_port}/ after ${attempt} attempts." >&2
        exit 1
    fi

    sleep 2
done

echo "Vale Muito deployed on http://127.0.0.1:${host_port}"
'@

$RemoteScript = $RemoteScript -replace "`r`n", "`n"
$RemoteScript | ssh $Remote "bash -s -- '$RemoteDir' '$ArchiveName' '$HostPort' '$ProjectName'"
if ($LASTEXITCODE -ne 0) {
    throw "Remote deploy failed. Existing Docker/Nginx projects were not modified outside the $ProjectName compose project."
}

Remove-Item $ArchivePath -Force
Write-Host "Deploy completed. Configure existing Nginx to proxy to http://127.0.0.1:$HostPort after reviewing vps/nginx-valemuito.example.conf." -ForegroundColor Green
