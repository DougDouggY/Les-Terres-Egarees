"""Assemble connectivity variants from the generated cobble, sand and grass tiles.
Masks determine where existing artwork appears; no scenery is drawn by primitives.
"""
from pathlib import Path
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]
im=Image.open(root/'public/assets/tiles.png').convert('RGB')
grass=im.crop((0,0,32,32));sand=im.crop((96,0,128,32));stone=im.crop((64,0,96,32))
out=Image.new('RGB',(128,256))
for ground,base in enumerate([grass,sand]):
 for bits in range(16):
  mask=Image.new('L',(32,32));d=ImageDraw.Draw(mask)
  d.rectangle((7,7,24,24),fill=255)
  for bit,rect in [(1,(7,0,24,16)),(2,(16,7,31,24)),(4,(7,16,24,31)),(8,(0,7,16,24))]:
   if bits&bit:d.rectangle(rect,fill=255)
  tile=Image.composite(stone,base,mask)
  out.paste(tile,((bits%4)*32,(bits//4+ground*4)*32))
out.save(root/'public/assets/roads.png')
