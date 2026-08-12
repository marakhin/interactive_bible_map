@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Сборка Библейской карты...
call npm.cmd run build
if errorlevel 1 (
  echo.
  echo Не удалось собрать проект. Проверьте сообщения выше.
  pause
  exit /b 1
)
start "" "http://127.0.0.1:3000"
echo.
echo Библейская карта открыта по адресу http://127.0.0.1:3000
echo Для остановки закройте это окно или нажмите Ctrl+C.
call npx.cmd vinext start -p 3000 -H 127.0.0.1
