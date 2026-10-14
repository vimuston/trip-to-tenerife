import sys,os
from PIL import Image, ImageDraw
# usage: sheet.py out.png prefix name [name...] ; shows px version only for N candidates each
out,prefix=sys.argv[1],sys.argv[2]; names=sys.argv[3:]
S=int(os.environ.get("CELL","160")); N=int(os.environ.get("N","4"))
rows=[]
for n in names:
    c=[]
    for k in range(N):
        p=f'cand/{prefix}{n}_{k}_px.png'
        if os.path.exists(p): c.append((k,p))
    rows.append((n,c))
W=N*(S+6)+6; H=len(rows)*(S+18)+6
sh=Image.new('RGB',(W,H),(27,21,56)); d=ImageDraw.Draw(sh)
for r,(n,c) in enumerate(rows):
    for k,p in c:
        im=Image.open(p).convert('RGBA'); bg=Image.new('RGBA',im.size,(60,80,110,255)); bg.alpha_composite(im)
        sc=max(1,min(S//im.width,S//im.height)); bg=bg.convert('RGB').resize((im.width*sc,im.height*sc),Image.NEAREST)
        x=6+k*(S+6); y=6+r*(S+18)+14
        sh.paste(bg,(x+(S-bg.width)//2,y+(S-bg.height)//2)); d.text((x,y-12),f'{prefix}{n} #{k}',fill=(255,213,74))
sh.save(out)
