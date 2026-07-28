@echo off
cd /d "%~dp0"
echo Tatakai - Voiranime Scraper
echo ============================
echo.
echo Phase 1: Catalogue (anime list)
echo Phase 2: Anime info + episode lists
echo Phase 3: Episode video sources (Sibnet)
echo.
echo The scraper saves progress automatically.
echo To resume later, just run this script again.
echo.
echo Press Ctrl+C to stop at any time (progress is saved).
echo.
pushd scraper
node run-scraper.js
if %errorlevel% neq 0 (
  echo.
  echo Scraper ended with error. Check the message above.
  pause
)
echo.
echo Done! Check the "scraper/data" folder for results.
pause
