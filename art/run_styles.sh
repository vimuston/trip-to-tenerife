#!/bin/bash
cd "$(dirname "$0")"
PY=/e/ComfyUI/ComfyUI_windows_portable/python_embeded/python.exe
while [ ! -f batch_done.flag ]; do sleep 10; done
TAG=snes_ $PY -I gen_sdxl.py jobs_snes.json 4 > batch_snes.log 2>&1
TAG=ff_ $PY -I gen_sdxl.py jobs_ff.json 4 > batch_ff.log 2>&1
echo done > styles_done.flag
