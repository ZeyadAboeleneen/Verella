<#
  Removes the auto-start task and stops the running gateway.
  The linked WhatsApp session (openwa\auth_info) is kept.

  powershell -ExecutionPolicy Bypass -File openwa\uninstall-autostart.ps1
#>
$TaskName = 'Verella WhatsApp Gateway'

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Removed '$TaskName'."
} else {
  Write-Host "'$TaskName' is not installed."
}

# Stopping the task may leave the launcher loop / gateway behind. Stop the
# launcher first (so it can't restart the gateway), then only the process
# that owns the gateway's port — never any other node process.
Get-CimInstance Win32_Process -Filter "Name = 'cmd.exe'" |
  Where-Object { $_.CommandLine -match 'start-gateway\.cmd' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
$port = if ($env:OPENWA_PORT) { [int]$env:OPENWA_PORT } else { 3001 }
Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Write-Host 'Gateway stopped.'
