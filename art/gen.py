"""Generate pixel-art game assets through a local ComfyUI (Flux dev fp8), then pixelate.
usage: python gen.py jobs.json [name ...]
jobs.json: [{"name","prompt","gen":[w,h],"out":[w,h],"sprite":bool,"colors":int}]
"""
import json, sys, time, random, urllib.request, urllib.parse, io, os
from PIL import Image

API = "http://127.0.0.1:8188"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "game", "assets", "img")
RAW = os.path.join(HERE, "raw")
os.makedirs(OUT, exist_ok=True); os.makedirs(RAW, exist_ok=True)

STYLE = ("cartoony pixel art, early Final Fantasy JRPG style, chunky pixels, clean dark outlines, "
         "limited colour palette, flat cel shading, charming and cute, ")
NEG_BG = " on a plain solid pure magenta #FF00FF background, isolated, no shadow on ground, no text"

def post(path, data):
    req = urllib.request.Request(API + path, json.dumps(data).encode(), {"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req))

def workflow(prompt, w, h, seed):
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "flux1-dev-fp8.safetensors"}},
        "2": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["1", 1]}},
        "3": {"class_type": "FluxGuidance", "inputs": {"conditioning": ["2", 0], "guidance": 3.5}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"text": "", "clip": ["1", 1]}},
        "5": {"class_type": "EmptySD3LatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
        "6": {"class_type": "KSampler", "inputs": {"model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0],
              "latent_image": ["5", 0], "seed": seed, "steps": 22, "cfg": 1.0,
              "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "7": {"class_type": "VAEDecode", "inputs": {"samples": ["6", 0], "vae": ["1", 2]}},
        "8": {"class_type": "SaveImage", "inputs": {"images": ["7", 0], "filename_prefix": "ttq"}},
    }

def run(prompt, w, h, seed):
    pid = post("/prompt", {"prompt": workflow(prompt, w, h, seed)})["prompt_id"]
    while True:
        hist = json.load(urllib.request.urlopen(f"{API}/history/{pid}"))
        if pid in hist and hist[pid].get("outputs"):
            im = hist[pid]["outputs"]["8"]["images"][0]
            q = urllib.parse.urlencode(im)
            return Image.open(io.BytesIO(urllib.request.urlopen(f"{API}/view?{q}").read())).convert("RGB")
        time.sleep(1.5)

def key_magenta(im):
    # flood-fill the backdrop from the borders; colour tolerance vs. sampled corner colours
    from collections import deque
    im = im.convert("RGBA"); px = im.load(); W, H = im.size
    refs = [px[0,0][:3], px[W-1,0][:3], px[0,H-1][:3], px[W-1,H-1][:3]]
    def near(c):
        if c[2] > c[1] + 15 and c[0] > c[1] + 15 and c[0] > 60:  # magenta/purple cast shadow
            return True
        return any(sum((c[i]-r[i])**2 for i in range(3)) < 55**2 for r in refs)
    seen = bytearray(W*H); dq = deque()
    for x in range(W):
        dq.append((x,0)); dq.append((x,H-1))
    for y in range(H):
        dq.append((0,y)); dq.append((W-1,y))
    while dq:
        x,y = dq.popleft()
        if x<0 or y<0 or x>=W or y>=H or seen[y*W+x]: continue
        if not near(px[x,y][:3]): continue
        seen[y*W+x]=1; px[x,y]=(0,0,0,0)
        dq.extend(((x+1,y),(x-1,y),(x,y+1),(x,y-1)))
    return im

def pixelate(im, out, sprite, colors):
    # crop to content for sprites, then box-downscale and quantize
    if sprite:
        im = key_magenta(im)
        bbox = im.getchannel("A").getbbox()
        if bbox: im = im.crop(bbox)
        iw, ih = im.size; s = min(out[0] / iw, out[1] / ih)
        nw, nh = max(1, round(iw * s)), max(1, round(ih * s))
        small = im.resize((nw, nh), Image.BOX)
        a = small.getchannel("A").point(lambda v: 255 if v > 110 else 0)
        rgb = small.convert("RGB").quantize(colors, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
        small = rgb.convert("RGBA"); small.putalpha(a)
        canvas = Image.new("RGBA", out, (0, 0, 0, 0))
        canvas.paste(small, ((out[0] - nw) // 2, out[1] - nh), small)  # bottom-align
        return canvas
    small = im.resize(out, Image.BOX)
    return small.quantize(colors, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")

def main():
    jobs = json.load(open(sys.argv[1], encoding="utf-8"))
    only = set(sys.argv[2:])
    for j in jobs:
        if only and j["name"] not in only: continue
        gw, gh = j.get("gen", [1024, 1024])
        sprite = j.get("sprite", True)
        prompt = STYLE + j.get("view", "2.5D isometric three-quarter view, ") + j["prompt"] + (NEG_BG if sprite else "")
        seed = j.get("seed", random.randint(1, 2**31))
        print("gen", j["name"], seed, flush=True)
        rp = os.path.join(RAW, j["name"] + "_raw.png")
        if os.environ.get("REUSE") and os.path.exists(rp):
            raw = Image.open(rp).convert("RGB")
        else:
            raw = run(prompt, gw, gh, seed)
            raw.save(rp)
        pixelate(raw, tuple(j["out"]), sprite, j.get("colors", 28)).save(os.path.join(OUT, j["name"] + ".png"))
        print("ok", j["name"], flush=True)

if __name__ == "__main__":
    main()
