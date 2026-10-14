#!/bin/bash
cd "$(dirname "$0")"
PY=/e/ComfyUI/ComfyUI_windows_portable/python_embeded/python.exe
TAG=fin_ $PY -I gen_sdxl.py jobs_final.json 5 > batch_final.log 2>&1
echo done > final_done.flag
