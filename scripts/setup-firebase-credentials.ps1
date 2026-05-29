# Copies your Firebase service account JSON into the project for local dev.
# Usage (replace with YOUR downloaded file path):
#   .\scripts\setup-firebase-credentials.ps1 "C:\Users\jcruz\Downloads\lyricai-studio-otgxn-firebase-adminsdk-abc123.json"

param(
  [Parameter(Mandatory = $true)]
  [string]$SourcePath
)

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$dest = Join-Path $projectRoot 'firebase-service-account.json'

if (-not (Test-Path $SourcePath)) {
  Write-Error "File not found: $SourcePath"
  Write-Host ""
  Write-Host "List JSON files in Downloads:"
  Get-ChildItem "$env:USERPROFILE\Downloads\*.json" | Select-Object Name, LastWriteTime
  Write-Host ""
  Write-Host "Download a NEW key from:"
  Write-Host "  https://console.firebase.google.com/project/lyricai-studio-otgxn/settings/serviceaccounts/adminsdk"
  exit 1
}

$content = Get-Content $SourcePath -Raw | ConvertFrom-Json
if ($content.project_id -ne 'lyricai-studio-otgxn') {
  Write-Warning "This key is for project '$($content.project_id)', not lyricai-studio-otgxn."
  $confirm = Read-Host "Continue anyway? (y/N)"
  if ($confirm -ne 'y') { exit 1 }
}

Copy-Item -Path $SourcePath -Destination $dest -Force
Write-Host "Copied to: $dest"
Write-Host ""
Write-Host "Ensure .env has: GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json"
Write-Host "Restart dev server: npm run dev"
