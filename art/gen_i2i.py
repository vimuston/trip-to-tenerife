import json, sys, os, io, random
from PIL import Image
HERE=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,HERE)
import gen, gen_sdxl_common as C
PRE=os.environ.get('PRE','hol_')
jobs=json.load(open(sys.argv[1],encoding="utf-8")); N=int(sys.argv[2]); only=set(sys.argv[3:])
CAND=os.path.join(HERE,"cand"); TMP=os.path.join(HERE,"raw")
for j in jobs:
    if only and j["name"] not in only: continue
    base=Image.open(os.path.join(HERE,"..","game","assets","styles","stardew",j["base"]+".png")).convert("RGBA")
    bg=Image.new("RGBA",base.size,(255,255,255,255)); bg.alpha_composite(base)
    W,H=832,1216; sc=min(W//base.width,H//base.height); im=bg.convert("RGB").resize((base.width*sc,base.height*sc),Image.NEAREST)
    canvas=Image.new("RGB",(W,H),(255,255,255)); canvas.paste(im,((W-im.width)//2,H-im.height))
    p=os.path.join(TMP,"i2i_"+j["name"]+".png"); canvas.save(p); up=C.upload(p,"i2i_"+j["name"]+".png")
    for k in range(N):
        seed=random.randint(1,2**31)
        raw=Image.open(io.BytesIO(C.run(C.wf_i2i("pixel art, Stardew Valley style, "+j["prompt"]+", full body standing, front view, single subject, plain white background",up,seed,j.get("denoise",0.6))))).convert("RGB")
        raw.save(os.path.join(CAND,f'{PRE}{j["name"]}_{k}.png'))
        gen.pixelate(raw,(32,48),True,24).save(os.path.join(CAND,f'{PRE}{j["name"]}_{k}_px.png')); print("ok",j["name"],k,flush=True)
