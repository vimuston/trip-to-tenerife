@echo off
rem Publishes the game/ folder to the gh-pages branch (GitHub Pages serves it).
cd /d "%~dp0"
git subtree split --prefix game -b gh-pages-tmp || exit /b 1
git push --force origin gh-pages-tmp:gh-pages || exit /b 1
git branch -D gh-pages-tmp
echo Published. Live in about a minute: https://vimuston.github.io/trip-to-tenerife/
