@echo off
chcp 65001 > nul
echo ========================================================
echo   블로그 트렌드 전용 크롬 브라우저 실행기
echo ========================================================
echo.
echo 기존 크롬 창이 열려 있다면 자동으로 연동 포트(9222)로 실행합니다...
echo.

set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% (
    set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

start "" %CHROME_PATH% --remote-debugging-port=9222 --user-data-dir="%LOCALAPPDATA%\Google\Chrome\User Data" "https://creator-advisor.naver.com/naver_blog/steely-eyed/trends"

echo 크롬 창이 열렸습니다!
echo 네이버 크리에이터 어드바이저 화면이 나오면 대시보드에서 '어드바이저 수집'을 눌러주세요.
timeout /t 3 > nul
