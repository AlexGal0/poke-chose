@echo off
setlocal
title PokeChose - Pokemon Black
cd /d "%~dp0"
if errorlevel 1 goto error

where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas instalar Node.js 22.15 o posterior para iniciar PokeChose.
  echo https://nodejs.org/
  pause
  exit /b 1
)
node -e "const [major, minor] = process.versions.node.split('.').map(Number); process.exit(major > 22 || major === 22 && minor >= 15 ? 0 : 1)"
if errorlevel 1 (
  echo Necesitas Node.js 22.15 o posterior. Version instalada:
  node --version
  pause
  exit /b 1
)

if not exist "node_modules\vite\bin\vite.js" (
  echo Instalando dependencias por primera vez...
  call npm ci
  if errorlevel 1 goto error
)

echo Iniciando PokeChose y el bridge de melonDS...
echo El navegador se abrira automaticamente.
echo Manten esta ventana abierta. Para detener el programa pulsa Ctrl+C.
echo.
node scripts/start-save.mjs --open
if errorlevel 1 goto error
exit /b 0

:error
echo.
echo No se pudo iniciar PokeChose. Revisa el error mostrado arriba.
pause
exit /b 1
