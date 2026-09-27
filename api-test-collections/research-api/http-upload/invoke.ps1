$ErrorActionPreference = 'Stop'

$sample = Join-Path $PSScriptRoot 'sample-data.txt'
$status = & curl.exe --silent --show-error --output NUL --write-out '%{http_code}' `
    --form "file=@$sample;type=text/plain;filename=notes.txt" `
    'http://127.0.0.1:8000/api/papers/upload'
if ($LASTEXITCODE -ne 0) {
    throw "curl.exe failed with exit code $LASTEXITCODE"
}
if ($status -ne '400') {
    throw "Expected HTTP 400 for a non-PDF upload, got HTTP $status"
}

Write-Output 'HTTP 400: upload validation rejected a non-PDF as expected.'