#!/bin/bash
cd "$(dirname "$0")"
PY=/e/ComfyUI/ComfyUI_windows_portable/python_embeded/python.exe
$PY -I gen_sdxl.py jobs_sdxl_houses2.json 8 > batch_houses.log 2>&1
$PY -I gen_sdxl.py jobs_sdxl_all.json 4 > batch_all.log 2>&1
echo done > batch_done.flag
