param(
  [string]$RepoRoot = (Resolve-Path "$PSScriptRoot\..\.."),
  [string]$LogoTarget = "C:\\logo"
)

$mockDir = Join-Path $RepoRoot "mock\e2e-cloud-to-local"
$logos = Join-Path $mockDir "logos"

if (!(Test-Path $logos)) { Write-Host "No logos folder found at $logos"; exit 1 }

if (!(Test-Path $LogoTarget)) { New-Item -ItemType Directory -Force -Path $LogoTarget | Out-Null }

Copy-Item -Path (Join-Path $logos '*') -Destination $LogoTarget -Force
Write-Host "Copied logos to $LogoTarget"
Write-Host "Set ROSTER_MAPPING_PATH to: $($mockDir)\roster_mapping.json"
