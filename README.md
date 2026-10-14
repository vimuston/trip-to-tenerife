# Trip to Tenerife

Retro pixel-art web game about two families travelling from Oulu to Tenerife (Finnish language, made for a family trip).

- `game/` - the playable web app (plain HTML/JS, no build step). Run locally with `start-game.bat`.
- `art/` - ComfyUI/SDXL generation scripts (`gen_sdxl.py`, `gen_i2i.py`, `promote.py`, job lists). Generated candidates are git-ignored.
- `publish.bat` - publishes `game/` to the `gh-pages` branch (GitHub Pages).

Live: https://vimuston.github.io/trip-to-tenerife/
