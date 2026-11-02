"""Reusable grass variants assembled from the existing illustrated tileset; no new image generation."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter,ImageEnhance,ImageOps
root=Path(__file__).resolve().parents[1]
im=Image.open(root/'public/assets/tiles.png').convert('RGB');size=im.width//8
grass=im.crop((0,0,size,size))
# A quiet patch of the existing painting, without the characteristic three tufts.
base=grass.crop((88,9,120,31)).resize((size,size),Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(1))
# Matching boundary pixels make all variants join without a decorative border.
p=base.load()
for y in range(size):
 for x in range(10):
  a=p[x,y];b=p[size-1-x,y];v=tuple(round((a[c]+b[c])/2) for c in range(3));p[x,y]=p[size-1-x,y]=v
for x in range(size):
 for y in range(10):
  a=p[x,y];b=p[x,size-1-y];v=tuple(round((a[c]+b[c])/2) for c in range(3));p[x,y]=p[x,size-1-y]=v
patches=[grass.crop((14,18,72,65)),grass.crop((0,76,41,115)),grass.crop((74,80,119,116))]
arrangements=[[],[(0,37,35)],[(1,56,49)],[(2,41,43)],[(1,20,25),(2,66,70)],[(2,18,61)],[(0,44,14),(1,20,78)],[(1,18,20),(2,67,68),(1,65,28)]]
out=Image.new('RGB',(size*8,size))
for i,items in enumerate(arrangements):
 tile=base.copy()
 for kind,x,y in items:
  patch=patches[kind];mask=Image.new('L',patch.size);d=ImageDraw.Draw(mask);d.rectangle((6,6,patch.width-7,patch.height-7),fill=255);mask=mask.filter(ImageFilter.GaussianBlur(4));tile.paste(patch,(x,y),mask)
 out.paste(tile,(i*size,0))
out.save(root/'public/assets/grass-variants.png')
