# PMS Intranet Data Service (V2-Intranet)
# PowerShell 5.1 / 零依賴 / 單檔服務
# - 靜態托管 dist/（前端 SPA）
# - GET  /api/db     : 讀取共用資料檔（附 ETag 版本）
# - PUT  /api/db     : 樂觀鎖寫入（If-Match）+ 原子寫入 + 滾動快照
# - GET  /api/health : 真實健康狀態（資料夾可寫性、版本、最後儲存時間）
#
# 啟動： powershell -ExecutionPolicy Bypass -File intranet-service.ps1 -DataDir "D:\PMS-data" -Port 8420
# 首次部署需一次性授權（管理員），詳見 server/README.md

param(
    [int]$Port = 8420,
    [string]$DataDir = (Join-Path $PSScriptRoot 'pms-data'),
    [string]$DistDir = (Join-Path (Split-Path $PSScriptRoot -Parent) 'dist'),
    [switch]$LocalOnly   # 單機模式：僅綁定 localhost，免 URLACL 授權（不供內網其他電腦連入）
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$DbPath       = Join-Path $DataDir 'db.json'
$MetaPath     = Join-Path $DataDir 'db.meta.json'
$SnapshotDir  = Join-Path $DataDir 'snapshots'
$MaxSnapshots = 30

# ── 初始化資料目錄 ────────────────────────────────────────────────────────────
foreach ($dir in @($DataDir, $SnapshotDir)) {
    if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

function Write-JsonResponse {
    param($Context, [int]$StatusCode, [object]$Object)
    $json  = $Object | ConvertTo-Json -Depth 12 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $Context.Response.StatusCode      = $StatusCode
    $Context.Response.ContentType     = 'application/json; charset=utf-8'
    $Context.Response.ContentLength64 = $bytes.Length
    $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $Context.Response.OutputStream.Close()
}

function Get-DbMeta {
    # 回傳 @{ Version; LastSavedAt }；無 meta 時以檔案存在與否推導
    if (Test-Path -LiteralPath $MetaPath) {
        $m = Get-Content -LiteralPath $MetaPath -Raw -Encoding UTF8 | ConvertFrom-Json
        return @{ Version = [int64]$m.version; LastSavedAt = [string]$m.lastSavedAt }
    }
    if (Test-Path -LiteralPath $DbPath) {
        return @{ Version = 1; LastSavedAt = (Get-Item -LiteralPath $DbPath).LastWriteTime.ToString('o') }
    }
    return @{ Version = 0; LastSavedAt = $null }
}

function Test-DataDirWritable {
    try {
        $probe = Join-Path $DataDir '.write-test'
        [IO.File]::WriteAllText($probe, 'ok')
        Remove-Item -LiteralPath $probe -Force
        return $true
    } catch { return $false }
}

function Save-IncomingDatabase {
    param([string]$BodyJson, [int64]$ExpectedVersion)

    $meta = Get-DbMeta
    if ($meta.Version -ne $ExpectedVersion) {
        return @{ Conflict = $true; CurrentVersion = $meta.Version }
    }

    # 滾動快照：覆寫前留存現檔
    if (Test-Path -LiteralPath $DbPath) {
        $snap = Join-Path $SnapshotDir ("db-{0}.json" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
        Copy-Item -LiteralPath $DbPath -Destination $snap -Force
        $old = Get-ChildItem -LiteralPath $SnapshotDir -Filter 'db-*.json' |
               Sort-Object Name -Descending | Select-Object -Skip $MaxSnapshots
        foreach ($f in $old) { Remove-Item -LiteralPath $f.FullName -Force }
    }

    # 原子寫入：暫存檔 → rename
    $tmp = "$DbPath.tmp"
    [IO.File]::WriteAllText($tmp, $BodyJson, (New-Object System.Text.UTF8Encoding($false)))
    Move-Item -LiteralPath $tmp -Destination $DbPath -Force

    $newVersion = $ExpectedVersion + 1
    $savedAt    = (Get-Date).ToString('o')
    $metaJson   = @{ version = $newVersion; lastSavedAt = $savedAt } | ConvertTo-Json -Compress
    [IO.File]::WriteAllText($MetaPath, $metaJson, (New-Object System.Text.UTF8Encoding($false)))

    return @{ Conflict = $false; Version = $newVersion; SavedAt = $savedAt }
}

$MimeMap = @{
    '.html' = 'text/html; charset=utf-8'; '.js'   = 'application/javascript; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8';  '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml';            '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg';               '.ico'  = 'image/x-icon'
    '.woff' = 'font/woff';                '.woff2'= 'font/woff2'
    '.map'  = 'application/json; charset=utf-8'
}

function Send-StaticFile {
    param($Context, [string]$UrlPath)
    if ($UrlPath -eq '/' -or -not (Test-Path -LiteralPath (Join-Path $DistDir $UrlPath.TrimStart('/')) -PathType Leaf)) {
        $UrlPath = '/index.html'   # SPA fallback
    }
    $full = Join-Path $DistDir ($UrlPath -replace '^/', '')
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
        Write-JsonResponse $Context 404 @{ error = 'not_found' }
        return
    }
    $ext    = [IO.Path]::GetExtension($full).ToLowerInvariant()
    $bytes  = [IO.File]::ReadAllBytes($full)
    $resp   = $Context.Response
    $resp.StatusCode      = 200
    $resp.ContentType     = if ($MimeMap.ContainsKey($ext)) { $MimeMap[$ext] } else { 'application/octet-stream' }
    $resp.ContentLength64 = $bytes.Length
    if ($ext -ne '.html') { $resp.Headers['Cache-Control'] = 'public, max-age=3600' }
    $resp.OutputStream.Write($bytes, 0, $bytes.Length)
    $resp.OutputStream.Close()
}

# ── 啟動監聽 ─────────────────────────────────────────────────────────────────
$listener = New-Object System.Net.HttpListener
$bindPrefix = if ($LocalOnly) { "http://localhost:$Port/" } else { "http://+:$Port/" }
$listener.Prefixes.Add($bindPrefix)
try {
    $listener.Start()
} catch {
    Write-Host "❌ 無法綁定 $bindPrefix — 請以管理員執行一次性授權："
    Write-Host "   netsh http add urlacl url=http://+:$Port/ user=Everyone"
    Write-Host "   （或以系統管理員身分執行本腳本，或改用 -LocalOnly 單機模式）"
    exit 1
}

Write-Host "✅ PMS Intranet Data Service 啟動"
Write-Host "   位址     : $bindPrefix"
Write-Host "   資料夾   : $DataDir"
Write-Host "   前端目錄 : $DistDir"
Write-Host "   按 Ctrl+C 停止服務"

try {
    while ($listener.IsListening) {
        $ctx  = $listener.GetContext()
        $req  = $ctx.Request
        $path = $req.Url.AbsolutePath
        try {
            if ($path -eq '/api/health' -and $req.HttpMethod -eq 'GET') {
                $meta = Get-DbMeta
                Write-JsonResponse $ctx 200 @{
                    ok           = $true
                    writable     = Test-DataDirWritable
                    dataDir      = $DataDir
                    version      = $meta.Version
                    lastSavedAt  = $meta.LastSavedAt
                    snapshotCount= @(Get-ChildItem -LiteralPath $SnapshotDir -Filter 'db-*.json' -ErrorAction SilentlyContinue).Count
                    serverTime   = (Get-Date).ToString('o')
                }
            }
            elseif ($path -eq '/api/db' -and $req.HttpMethod -eq 'GET') {
                if (-not (Test-Path -LiteralPath $DbPath)) {
                    Write-JsonResponse $ctx 404 @{ error = 'not_initialized' }
                } else {
                    $meta  = Get-DbMeta
                    $bytes = [IO.File]::ReadAllBytes($DbPath)
                    $ctx.Response.StatusCode      = 200
                    $ctx.Response.ContentType     = 'application/json; charset=utf-8'
                    $ctx.Response.ContentLength64 = $bytes.Length
                    $ctx.Response.Headers['ETag'] = "$($meta.Version)"
                    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
                    $ctx.Response.OutputStream.Close()
                }
            }
            elseif ($path -eq '/api/db' -and $req.HttpMethod -eq 'PUT') {
                $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
                $body   = $reader.ReadToEnd()
                $ifMatch = 0
                [int64]::TryParse(($req.Headers['If-Match'] -replace '^W/', '' -replace '"', ''), [ref]$ifMatch) | Out-Null
                $result = Save-IncomingDatabase -BodyJson $body -ExpectedVersion $ifMatch
                if ($result.Conflict) {
                    Write-JsonResponse $ctx 409 @{ error = 'version_conflict'; currentVersion = $result.CurrentVersion }
                } else {
                    Write-JsonResponse $ctx 200 @{ version = $result.Version; savedAt = $result.SavedAt }
                }
            }
            elseif ($path -like '/api/*') {
                Write-JsonResponse $ctx 404 @{ error = 'unknown_api' }
            }
            else {
                Send-StaticFile $ctx $path
            }
        } catch {
            Write-Host "⚠ 處理 $path 發生錯誤：$_"
            try { Write-JsonResponse $ctx 500 @{ error = 'internal_error'; detail = "$_" } } catch {}
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
    Write-Host "服務已停止"
}
