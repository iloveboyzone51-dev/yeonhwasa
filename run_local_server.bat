@echo off
chcp 65001 > nul
echo ========================================================
echo   [마음산사 - 연화사] 로컬 웹서버 실행기 (포트 8080)
echo ========================================================
echo.
echo 실제 스님 불경 음원과 고화질 캔버스를 로컬 웹서버로 실행합니다.
echo 브라우저가 잠시 후 자동으로 열립니다. (종료하려면 이 창을 닫으세요)
echo.

start "" "http://localhost:8080"

powershell -NoProfile -Command ^
  "$listener = New-Object System.Net.HttpListener; ^
   $listener.Prefixes.Add('http://localhost:8080/'); ^
   $listener.Start(); ^
   Write-Host '사찰 서버가 http://localhost:8080 에서 원활히 실행 중입니다...'; ^
   while ($listener.IsListening) { ^
     $ctx = $listener.GetContext(); ^
     $req = $ctx.Request; ^
     $resp = $ctx.Response; ^
     $urlPath = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/')); ^
     if ([string]::IsNullOrEmpty($urlPath)) { $urlPath = 'index.html'; } ^
     $filePath = Join-Path (Get-Location) $urlPath; ^
     if (Test-Path $filePath -PathType Leaf) { ^
       $bytes = [System.IO.File]::ReadAllBytes($filePath); ^
       $ext = [System.IO.Path]::GetExtension($filePath).ToLower(); ^
       $ctype = 'application/octet-stream'; ^
       if ($ext -eq '.html') { $ctype = 'text/html; charset=utf-8'; } ^
       elseif ($ext -eq '.js') { $ctype = 'application/javascript; charset=utf-8'; } ^
       elseif ($ext -eq '.css') { $ctype = 'text/css; charset=utf-8'; } ^
       elseif ($ext -eq '.mp3') { $ctype = 'audio/mpeg'; } ^
       elseif ($ext -eq '.json') { $ctype = 'application/json; charset=utf-8'; } ^
       elseif ($ext -eq '.png') { $ctype = 'image/png'; } ^
       elseif ($ext -eq '.jpg') { $ctype = 'image/jpeg'; } ^
       $resp.ContentType = $ctype; ^
       $resp.ContentLength64 = $bytes.Length; ^
       $resp.OutputStream.Write($bytes, 0, $bytes.Length); ^
     } else { ^
       $resp.StatusCode = 404; ^
     } ^
     $resp.Close(); ^
   }"
pause
