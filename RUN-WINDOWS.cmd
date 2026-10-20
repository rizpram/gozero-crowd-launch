@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 or 24 first, then run this file again.
  pause
  exit /b 1
)
if not exist node_modules\qrcode (
  call npm ci
  if errorlevel 1 goto failed
)
call npm run build
if errorlevel 1 goto failed
echo.
echo Open http://127.0.0.1:3100/operator
echo Local rehearsal password: gozero-rehearsal
echo Keep this window open. Press Ctrl+C to stop the server.
echo.
call npm start
exit /b
:failed
echo Setup failed. Read the error above.
pause
exit /b 1
