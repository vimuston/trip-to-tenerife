"""SDXL + Pixel Art XL candidate generator. usage: python gen_sdxl.py jobs.json [N] [name ...]
Writes raw + pixelated candidates to art/cand/<name>_<k>(.png|_px.png); pick one, then promote with promote.py."""
import json, sys, os, random, time, urllib.request, urllib.parse, io
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen
API=gen.API; HERE=gen.HERE; CAND=os.path.join(HERE,"cand"); os.makedirs(CAND,exist_ok=True)
NEG="3d render, realistic, photo, blurry, smooth gradient, anti-aliasing, text, letters, watermark, jpeg artifacts, noisy, deformed"
def wf(pos,w,h,seed,lora=1.2):
    return {"1":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"sdxl_base_1.0_eval.safetensors"}},
    "2":{"class_type":"LoraLoader","inputs":{"model":["1",0],"clip":["1",1],"lora_name":"pixelartxl_nerijs_v1.safetensors","strength_model":lora,"strength_clip":lora}},
    "3":{"class_type":"CLIPTextEncode","inputs":{"text":pos,"clip":["2",1]}},
    "4":{"class_type":"CLIPTextEncode","inputs":{"text":NEG,"clip":["2",1]}},
    "5":{"class_type":"EmptyLatentImage","inputs":{"width":w,"height":h,"batch_size":1}},
    "6":{"class_type":"KSampler","inputs":{"model":["2",0],"positive":["3",0],"negative":["4",0],"latent_image":["5",0],"seed":seed,"steps":30,"cfg":7.0,"sampler_name":"euler","scheduler":"normal","denoise":1.0}},
    "7":{"class_type":"VAEDecode","inputs":{"samples":["6",0],"vae":["1",2]}},
    "8":{"class_type":"SaveImage","inputs":{"images":["7",0],"filename_prefix":"sdxlpx"}}}
def run(pos,w,h,seed):
    pid=gen.post("/prompt",{"prompt":wf(pos,w,h,seed)})["prompt_id"]
    while True:
        hh=json.load(urllib.request.urlopen(f"{API}/history/{pid}"))
        if pid in hh and hh[pid].get("outputs"):
            im=hh[pid]["outputs"]["8"]["images"][0]
            return Image.open(io.BytesIO(urllib.request.urlopen(f"{API}/view?"+urllib.parse.urlencode(im)).read())).convert("RGB")
        time.sleep(1)
TAG=os.environ.get("TAG","")
jobs=json.load(open(sys.argv[1],encoding="utf-8")); N=int(sys.argv[2]) if len(sys.argv)>2 else 4; only=set(sys.argv[3:])
for j in jobs:
    if only and j["name"] not in only: continue
    sprite=j.get("sprite",True); gw,gh=j.get("gen",[1024,1024])
    pos="pixel art, "+j["prompt"]+((j.get("bgtext") or ", on a plain solid flat magenta background, isolated, centered") if sprite else "")
    for k in range(N):
        seed=random.randint(1,2**31)
        raw=run(pos,gw,gh,seed); rp=os.path.join(CAND,f'{TAG}{j["name"]}_{k}.png'); raw.save(rp)
        gen.pixelate(raw,tuple(j["out"]),sprite,j.get("colors",24)).save(os.path.join(CAND,f'{TAG}{j["name"]}_{k}_px.png'))
        print("ok",j["name"],k,seed,flush=True)
