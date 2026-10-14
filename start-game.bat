@echo off
rem Starts a tiny local web server for the game and opens it in your browser.
rem Close this window to stop the server.
cd /d "%~dp0game"
start "" "http://localhost:8765/index.html"
python -m http.server 8765
