$ErrorActionPreference = 'Stop'

$response = Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:8000/api/health'
if ($response.status -ne 'ready') {
    throw "Expected API status 'ready', got '$($response.status)'"
}

$response | ConvertTo-Json -Depth 5