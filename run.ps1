param([Parameter(Mandatory = $true)][string]$NodePath)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
& $NodePath (Join-Path $PSScriptRoot 'login.mjs') --scheduled *> (Join-Path $PSScriptRoot 'logs\last-task-output.log')
exit $LASTEXITCODE
