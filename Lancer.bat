@echo off
cd /d "%~dp0"
title TikTok Content Agent
set OPTS=
:start
echo.
echo  Recherche de mises a jour...
python -m content_agent.updater
echo.
echo  Lancement de TikTok Content Agent...
echo  Laisse cette fenetre ouverte pendant que tu utilises l'application.
echo.
python -m content_agent %OPTS%
if %errorlevel%==42 (
  set OPTS=--no-browser
  goto start
)
pause
