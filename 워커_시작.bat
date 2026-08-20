@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo UShort 워커를 시작합니다. 이 창을 닫으면 워커가 꺼집니다.
echo 렌더링이 필요할 때만 이 파일을 더블클릭해서 켜두세요.
echo.
call npm run worker
pause
