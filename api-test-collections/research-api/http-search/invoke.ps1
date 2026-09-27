$ErrorActionPreference = 'Stop'

$payload = Get-Content -Raw (Join-Path $PSScriptRoot 'sample-data.json') | ConvertFrom-Json
$response = Invoke-RestMethod `
    -Method Post `
    -Uri 'http://127.0.0.1:8000/api/search' `
    -ContentType 'application/json' `
    -Body ($payload | ConvertTo-Json -Depth 5)
if ($response.results.Count -lt 1 -or $response.results[0].rank -ne 1) {
    throw 'Expected search to return ranked evidence with rank 1 first'
}

$response | ConvertTo-Json -Depth 8