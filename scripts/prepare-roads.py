"""Connectivity variants assembled from the generated artwork, at native tile resolution."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
root=Path(__file__).resolve().parents[1]
im=Image.open(root/'public/assets/tiles.png').convert('RGB')
size=im.width//8
assert im.height//4==size, 'Atlas cells must be square'
def tile(index):
 return im.crop((index%8*size,index//8*size,(index%8+1)*size,(index//8+1)*size))
grass,sand,stone=tile(0),tile(3),tile(2)
variants=root/'public/assets/grass-variants.png'
if variants.exists():grass=Image.open(variants).convert('RGB').crop((0,0,size,size))
out=Image.new('RGB',(size*4,size*8))
a,b,mid=round(size*7/32),round(size*25/32)-1,size//2
for ground,base in enumerate([grass,sand]):
 for bits in range(16):
  mask=Image.new('L',(size,size));d=ImageDraw.Draw(mask)
  d.rectangle((a,a,b,b),fill=255)
  for bit,rect in [(1,(a,0,b,mid)),(2,(mid,a,size-1,b)),(4,(a,mid,b,size-1)),(8,(0,a,mid,b))]:
   if bits&bit:d.rectangle(rect,fill=255)
  mask=mask.filter(ImageFilter.GaussianBlur(size/128))
  out.paste(Image.composite(stone,base,mask),((bits%4)*size,(bits//4+ground*4)*size))
out.save(root/'public/assets/roads.png')
