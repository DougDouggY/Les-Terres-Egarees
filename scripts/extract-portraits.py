from PIL import Image
from pathlib import Path
import json, argparse
parser=argparse.ArgumentParser(description="Extract the four supplied portrait sheets without painting or background removal.")
parser.add_argument("source",type=Path)
parser.add_argument("--output",type=Path,default=Path("public/assets/portraits"))
args=parser.parse_args()
out=args.output
out.mkdir(parents=True,exist_ok=True)
meta=[]
for file,prefix,cols,rows,count in [('chevalier 1.png','C',4,3,12),('viking 1.png','V',4,3,12),('perso prédéfini.png','R',4,1,4),('PnJ.png','N',5,1,5)]:
 im=Image.open(args.source/file)
 for i in range(count):
  # The supplied sheets are not exact equal grids: hand-verified gutters avoid
  # clipping a shoulder or including a fragment of the neighbouring character.
  xs,ys={
   'C':([0,400,772,1146,1536],[0,340,673,1024]),
   'V':([0,454,895,1330,1774],[0,297,589,887]),
   'R':([0,543,1086,1629,2172],[0,724]),
   'N':([0,454,872,1304,1722,2172],[0,724]),
  }[prefix]
  x0=xs[i%cols];x1=xs[i%cols+1]
  y0=ys[i//cols];y1=ys[i//cols+1]
  tile=im.crop((x0,y0,x1,y1));pix=tile.load();coords=[(x,y) for y in range(tile.height) for x in range(tile.width) if max(pix[x,y])>75]
  l=max(0,min(x for x,y in coords)-3);r=min(tile.width,max(x for x,y in coords)+4)
  t=max(0,min(y for x,y in coords)-3);b=min(tile.height,max(y for x,y in coords)+4)
  crop=tile.crop((l,t,r,b));id=f'{prefix}{i+1:02}'
  crop.save(out/(id+'.png'))
  meta.append(dict(id=id,source=file,rect=[x0+l,y0+t,r-l,b-t],width=crop.width,height=crop.height))
(out/'extraction.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
