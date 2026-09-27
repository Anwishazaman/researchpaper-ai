$ErrorActionPreference = 'Stop'

$response = Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:8000/api/evaluation?top_k=5'
$methods = @($response.runs | ForEach-Object { $_.method })
if ('bm25' -notin $methods -or 'hybrid' -notin $methods) {
    throw "Expected evaluation results for bm25 and hybrid, got: $($methods -join ', ')"
}

$response | ConvertTo-Json -Depth 5