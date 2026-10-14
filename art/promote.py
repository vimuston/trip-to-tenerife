"""promote.py <styleId> <candPrefix> name=k [name=k ...]  -> copies cand/<prefix><name>_<k>_px.png to game/assets/styles/<styleId>/<name>.png and rewrites manifest.js"""
import sys,os,shutil,glob,json
sid,prefix=sys.argv[1],sys.argv[2]
root=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..","game","assets","styles",sid); os.makedirs(root,exist_ok=True)
for a in sys.argv[3:]:
    n,k=a.split("="); src=os.path.join(os.path.dirname(os.path.abspath(__file__)),"cand",f"{prefix}{n}_{k}_px.png")
    shutil.copy(src,os.path.join(root,n+".png")); print("promoted",n,k)
names=sorted(os.path.basename(p)[:-4] for p in glob.glob(os.path.join(root,"*.png")))
open(os.path.join(root,"manifest.js"),"w",encoding="utf-8").write(
 'window.ART_MANIFEST = window.ART_MANIFEST || {}; window.ART_MANIFEST[%s] = %s;\n'%(json.dumps(sid),json.dumps(names)))
