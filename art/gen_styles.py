import json, time, random, urllib.request, urllib.parse, io, os
from PIL import Image
API="http://127.0.0.1:8188"; OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),"styles")
def post(p,d):
    r=urllib.request.Request(API+p,json.dumps(d).encode(),{"Content-Type":"application/json"}); return json.load(urllib.request.urlopen(r))
def wf(prompt,w,h,seed):
    return {"1":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"flux1-dev-fp8.safetensors"}},
    "2":{"class_type":"CLIPTextEncode","inputs":{"text":prompt,"clip":["1",1]}},
    "3":{"class_type":"FluxGuidance","inputs":{"conditioning":["2",0],"guidance":3.5}},
    "4":{"class_type":"CLIPTextEncode","inputs":{"text":"","clip":["1",1]}},
    "5":{"class_type":"EmptySD3LatentImage","inputs":{"width":w,"height":h,"batch_size":1}},
    "6":{"class_type":"KSampler","inputs":{"model":["1",0],"positive":["3",0],"negative":["4",0],"latent_image":["5",0],"seed":seed,"steps":22,"cfg":1.0,"sampler_name":"euler","scheduler":"simple","denoise":1.0}},
    "7":{"class_type":"VAEDecode","inputs":{"samples":["6",0],"vae":["1",2]}},
    "8":{"class_type":"SaveImage","inputs":{"images":["7",0],"filename_prefix":"style"}}}
def run(prompt,w,h,seed):
    pid=post("/prompt",{"prompt":wf(prompt,w,h,seed)})["prompt_id"]
    while True:
        h_=json.load(urllib.request.urlopen(f"{API}/history/{pid}"))
        if pid in h_ and h_[pid].get("outputs"):
            im=h_[pid]["outputs"]["8"]["images"][0]
            return Image.open(io.BytesIO(urllib.request.urlopen(f"{API}/view?"+urllib.parse.urlencode(im)).read())).convert("RGB")
        time.sleep(1.5)
STYLES={
 "1_zelda":"16-bit SNES pixel art in the style of The Legend of Zelda A Link to the Past, bright saturated overworld palette, clean black outlines, top-down three-quarter view, soft cast shadows, crisp tiles, CRT scanlines glow",
 "2_ff6":"16-bit SNES JRPG pixel art in the style of Final Fantasy VI, dramatic moody cinematic lighting, rich dithered gradients, deep blue and magenta night palette, detailed painterly sprites, melancholic atmosphere, CRT glow",
 "3_earthbound":"quirky SNES pixel art in the style of EarthBound, pastel suburban colours, thick wobbly outlines, flat bright candy colours, slightly surreal and funny, big-headed little characters, psychedelic CRT glow",
 "4_mariorpg":"pre-rendered isometric SNES graphics in the style of Super Mario RPG and Donkey Kong Country, glossy chunky 3D-looking models, strong isometric 2.5D perspective, vibrant shading, soft highlights, CRT glow",
 "5_phosphor":"strict 4-colour monochrome Game Boy style palette of dark green and light mint shades only, chunky pixel art, high contrast, retro handheld LCD feel with soft CRT phosphor glow, simple readable shapes",
 "6_neon":"fresh neon arcade retro pixel art, very dark navy background with glowing neon cyan magenta and orange outlines, bloom glow, synthwave cosy night, SNES era sprites, heavy CRT bloom and scanlines",
}
SCENES={
 "pickup":"top-down three-quarter view scene: a yellow taxi parked at the kerb in front of a pale grey two-storey Finnish wooden house with a dark blue roof and a birch tree, cold autumn evening with snow patches, a family of four (two adults and two small kids with suitcases) walking toward the taxi, the taxi driver opening the door",
 "plane":"inside an airplane cabin looking down the aisle, a family of four seated (two adults and two kids), a kid holding a glass of dark purple blueberry juice, a flight attendant with a tray, small windows with bright clouds, cosy and cheerful",
}
for sk,sv in SCENES.items():
    for k,st in STYLES.items():
        p=os.path.join(OUT,f"{sk}_{k}.png")
        if os.path.exists(p): continue
        seed=7000+hash(sk)%100
        im=run(f"{st}, vertical portrait composition. {sv}. no text, no letters",576,1024,seed)
        im.save(p); print("ok",p,flush=True)
