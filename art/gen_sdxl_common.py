import json, time, urllib.request, urllib.parse, uuid

API = "http://127.0.0.1:8188"
NEG = ("3d render, realistic, photo, blurry, smooth gradient, anti-aliasing, text, letters, "
       "watermark, noisy, deformed, extra limbs")


def post(path, data):
    r = urllib.request.Request(API + path, json.dumps(data).encode(), {"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(r))


def upload(path, name):
    b = uuid.uuid4().hex
    data = open(path, "rb").read()
    head = ('--%s\r\nContent-Disposition: form-data; name="image"; filename="%s"\r\n'
            'Content-Type: image/png\r\n\r\n' % (b, name)).encode()
    tail = ('\r\n--%s\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n--%s--\r\n' % (b, b)).encode()
    r = urllib.request.Request(API + "/upload/image", head + data + tail,
                               {"Content-Type": "multipart/form-data; boundary=" + b})
    return json.load(urllib.request.urlopen(r))["name"]


def wf_i2i(pos, image, seed, denoise=0.6, lora=1.2):
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "sdxl_base_1.0_eval.safetensors"}},
        "2": {"class_type": "LoraLoader", "inputs": {"model": ["1", 0], "clip": ["1", 1],
              "lora_name": "pixelartxl_nerijs_v1.safetensors", "strength_model": lora, "strength_clip": lora}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"text": pos, "clip": ["2", 1]}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"text": NEG, "clip": ["2", 1]}},
        "5": {"class_type": "LoadImage", "inputs": {"image": image}},
        "6": {"class_type": "VAEEncode", "inputs": {"pixels": ["5", 0], "vae": ["1", 2]}},
        "7": {"class_type": "KSampler", "inputs": {"model": ["2", 0], "positive": ["3", 0], "negative": ["4", 0],
              "latent_image": ["6", 0], "seed": seed, "steps": 30, "cfg": 7.0, "sampler_name": "euler",
              "scheduler": "normal", "denoise": denoise}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["1", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": "i2i"}},
    }


def run(wf):
    pid = post("/prompt", {"prompt": wf})["prompt_id"]
    while True:
        h = json.load(urllib.request.urlopen("%s/history/%s" % (API, pid)))
        if pid in h and h[pid].get("outputs"):
            im = h[pid]["outputs"]["9"]["images"][0]
            return urllib.request.urlopen("%s/view?%s" % (API, urllib.parse.urlencode(im))).read()
        time.sleep(1)
