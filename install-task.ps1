$ErrorActionPreference = 'Stop'
$taskName = 'AgentRouter-AutoLogin'
if ((Get-TimeZone).Id -ne 'China Standard Time') {
    Write-Error 'install-task error System time zone must be China Standard Time.'
    exit 1
}
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Write-Error 'install-task error Task already exists; inspect it before replacing.'
    exit 1
}
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$powershellPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$arguments = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}" -NodePath "{1}"' -f (Join-Path $PSScriptRoot 'run.ps1'), $nodePath
$action = New-ScheduledTaskAction -Execute $powershellPath -Argument $arguments -WorkingDirectory $PSScriptRoot
$trigger = New-ScheduledTaskTrigger -Daily -At '09:00'
$trigger.RandomDelay = 'PT59M59S'
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $taskName -Description '每天北京时间 09:00–10:00 随机执行 AgentRouter 退出并通过 GitHub 重新登录。' -Action $action -Trigger $trigger -Settings $settings -Principal $principal
