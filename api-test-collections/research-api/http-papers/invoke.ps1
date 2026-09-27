$ErrorActionPreference = 'Stop'

$response = Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:8000/api/papers'
if ($response.items.Count -lt 1) {
    throw 'Expected at least one paper in the library'
}

$response | ConvertTo-Json -Depth 5