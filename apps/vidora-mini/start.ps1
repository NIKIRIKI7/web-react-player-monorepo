[CmdletBinding()]
param(
    [switch]$Install
)

$ErrorActionPreference = 'Stop'
$miniRoot = $PSScriptRoot
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $miniRoot '..\..')).Path
$backendRoot = Join-Path $miniRoot 'backend'
$backendPort = 8355
$frontendPort = 5174
$backendProcess = $null
$frontendProcess = $null

function Get-RequiredCommandPath {
    param(
        [Parameter(Mandatory)]
        [string[]]$Names
    )

    foreach ($name in $Names) {
        $command = Get-Command $name -ErrorAction SilentlyContinue
        if ($command) {
            return $command.Source
        }
    }

    $names = $Names -join ', '
    throw "Command '$names' was not found in PATH."
}

function Assert-PortAvailable {
    param(
        [Parameter(Mandatory)]
        [int]$Port
    )

    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($connection) {
        throw "Port $Port is already in use by process $($connection[0].OwningProcess)."
    }
}

function Wait-HttpReady {
    param(
        [Parameter(Mandatory)]
        [string]$Url
    )

    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return
            }
        } catch {
        }

        Start-Sleep -Milliseconds 500
    }

    throw "The service did not respond at $Url."
}

function Stop-ProcessTree {
    param(
        [System.Diagnostics.Process]$Process
    )

    if ($null -eq $Process) {
        return
    }

    try {
        if (-not $Process.HasExited) {
            & taskkill.exe /PID $Process.Id /T /F 2>$null | Out-Null
        }
    } catch {
    }
}

$pnpmPath = Get-RequiredCommandPath @('pnpm.cmd', 'pnpm.exe', 'pnpm.ps1')
$pythonPath = Get-RequiredCommandPath @('python.exe', 'python')
Get-RequiredCommandPath @('ffmpeg.exe', 'ffmpeg') | Out-Null
Get-RequiredCommandPath @('ffprobe.exe', 'ffprobe') | Out-Null
$venvRoot = Join-Path $backendRoot '.venv'
$venvPython = Join-Path $venvRoot 'Scripts\python.exe'

Assert-PortAvailable -Port $backendPort
Assert-PortAvailable -Port $frontendPort

if ($Install) {
    Push-Location -LiteralPath $repoRoot
    try {
        & $pnpmPath install
        $frontendInstallExitCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }
    if ($frontendInstallExitCode -ne 0) {
        throw 'Frontend dependency installation failed.'
    }

    if (-not (Test-Path -LiteralPath $venvPython)) {
        & $pythonPath -m venv $venvRoot
        if ($LASTEXITCODE -ne 0) {
            throw 'Could not create the Python virtualenv.'
        }
    }

    $venvPython = Join-Path $venvRoot 'Scripts\python.exe'
    & $venvPython -m pip install -r (Join-Path $backendRoot 'requirements.txt')
    if ($LASTEXITCODE -ne 0) {
        throw 'Backend dependency installation failed.'
    }
}

if (Test-Path -LiteralPath $venvPython) {
    $pythonExecutable = $venvPython
} else {
    $pythonExecutable = $pythonPath
}

& $pythonExecutable -c 'import fastapi, httpx, pydantic, uvicorn'
if ($LASTEXITCODE -ne 0) {
    throw 'Backend dependencies are missing. Run the script with -Install.'
}

try {
    $backendProcess = Start-Process `
        -FilePath $pythonExecutable `
        -ArgumentList @('-m', 'uvicorn', 'main:app', '--reload', '--host', '127.0.0.1', '--port', "$backendPort") `
        -WorkingDirectory $backendRoot `
        -NoNewWindow `
        -PassThru

    $frontendProcess = Start-Process `
        -FilePath $pnpmPath `
        -ArgumentList @('--filter', 'vidora-tester', 'dev') `
        -WorkingDirectory $repoRoot `
        -NoNewWindow `
        -PassThru

    Wait-HttpReady -Url "http://127.0.0.1:$backendPort/docs"
    Wait-HttpReady -Url "http://127.0.0.1:$frontendPort/"

    Write-Host "Backend: http://localhost:$backendPort"
    Write-Host "Frontend: http://localhost:$frontendPort"
    Write-Host 'Press Ctrl+C to stop both services.'

    while ($true) {
        Start-Sleep -Seconds 1
        if ($backendProcess.HasExited) {
            throw 'Backend exited unexpectedly.'
        }
        if ($frontendProcess.HasExited) {
            throw 'Frontend exited unexpectedly.'
        }
    }
} finally {
    Stop-ProcessTree -Process $frontendProcess
    Stop-ProcessTree -Process $backendProcess
}
