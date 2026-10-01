<#
  Registers a Windows scheduled task that starts the WhatsApp gateway
  automatically (hidden, restarted if it crashes).

  Normal PowerShell  -> starts when you sign in to Windows (no admin needed).
  As Administrator   -> starts at boot, before anyone signs in.

  Run from the repo root:   powershell -ExecutionPolicy Bypass -File openwa\install-autostart.ps1
  Remove it again with:     powershell -ExecutionPolicy Bypass -File openwa\uninstall-autostart.ps1
#>
$ErrorActionPreference = 'Stop'
$TaskName = 'Verella WhatsApp Gateway'

Get-Command node -ErrorAction Stop | Out-Null  # fail early if Node isn't installed
$launcher = Join-Path $PSScriptRoot 'start-gateway.cmd'
if (-not (Test-Path (Join-Path $PSScriptRoot 'node_modules'))) {
  throw "openwa dependencies are missing. Run 'pnpm install' in the repo root first."
}

$me = [Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = (New-Object Security.Principal.WindowsPrincipal $me).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

# conhost --headless runs the console app with no window at all. The launcher
# finds node.exe itself — passing a path with spaces through conhost loses its quotes.
$action = New-ScheduledTaskAction -Execute 'conhost.exe' `
  -Argument "--headless `"$launcher`"" `
  -WorkingDirectory $PSScriptRoot

if ($isAdmin) {
  $trigger = New-ScheduledTaskTrigger -AtStartup
  # S4U: runs as you, whether or not you're signed in, without storing your password.
  $principal = New-ScheduledTaskPrincipal -UserId $me.Name -LogonType S4U -RunLevel Limited
  $when = 'at boot (before sign-in)'
} else {
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $me.Name
  $principal = New-ScheduledTaskPrincipal -UserId $me.Name -LogonType Interactive -RunLevel Limited
  $when = 'when you sign in to Windows'
}

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
  -StartWhenAvailable -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings `
  -Description 'Verella: keeps the WhatsApp (Baileys) gateway running for automatic order invoices.' -Force | Out-Null

# Start it right away too, unless the gateway is already answering.
$running = $false
try { Invoke-RestMethod -Uri 'http://127.0.0.1:3001/health' -TimeoutSec 2 | Out-Null; $running = $true } catch {}
if (-not $running) { Start-ScheduledTask -TaskName $TaskName }

Write-Host "Installed '$TaskName' - the WhatsApp gateway now starts $when."
Write-Host "Logs: $(Join-Path $PSScriptRoot 'logs\gateway.log')"
