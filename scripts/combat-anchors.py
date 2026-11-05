"""Combat-only anchors. Read-only source raster measurements; tactical anchors unchanged."""
from pathlib import Path
import json,numpy as np
from PIL import Image
from scipy.ndimage import label, binary_dilation, find_objects, distance_transform_edt
root=Path(__file__).resolve().parent.parent
layouts=json.loads((root/'src/assets/tactical/atlas-layout.json').read_text());out={}
for source,layout in layouts.items():
 path=root/('src/assets/'+source if source.startswith('tactical/') else 'public/'+source)
 im=np.array(Image.open(path).convert('RGBA'));frames={}
 labels,_=label(im[:,:,3]>16);sizes=np.bincount(labels.ravel())
 for f in layout['frames']:
  x,y,w,h=[f[v]for v in ['x','y','width','height']];a=im[y:y+h,x:x+w,3]>64
  # Foot cluster: lower dense rows, not the transparent cell or a spear point.
  low=max(0,min(h-1,f.get('bodyGround',y+h)-y-round(h*.12)))
  ground=min(h,f.get('bodyGround',y+h)-y)
  ys,xs=np.where(a[low:ground]);foot=x+float(np.median(xs)) if len(xs) else f['anchorX']
  # The forward-most weapon/shield region determines a meaningful endpoint.
  yy,xx=np.where(a);front=np.quantile(xx,.985) if len(xx) else w
  band=a[:,max(0,int(front)-3):];wy,_=np.where(band)
  region=labels[y:y+h,x:x+w];counts=np.bincount(region.ravel(),minlength=len(sizes));counts[0]=0;main=int(counts.argmax())
  foreign=int(counts.sum()-counts[main]);mask=[]
  if main and foreign>12:
   own=region==main
   distance=distance_transform_edt(~own)
   for number in np.unique(region):
    if number and number!=main and sizes[number]<350:
     part=region==number
     if part.any() and distance[part].min()<8:own|=part
   chosen=binary_dilation(own,iterations=1)
   for row,values in enumerate(chosen):
    starts=np.where(np.diff(np.r_[False,values,False].astype(int))==1)[0];ends=np.where(np.diff(np.r_[False,values,False].astype(int))==-1)[0]
    mask.extend([[x+int(start),y+row,int(end-start)] for start,end in zip(starts,ends)])
  frames[f"{f['row']}:{f['column']}"]={'feetX':round(foot,2),'feetY':f.get('bodyGround',y+h),'weaponTip':{'x':x+round(float(front),2),'y':y+round(float(np.median(wy)) if len(wy) else h*.45,2)},'bodyHeight':f.get('bodyHeight',h),'bounds':[x,y,w,h],'ambiguous':f.get('ambiguous',False),'sourceDefect':f.get('sourceDefect',False),'maskRuns':mask,'foreignPixelsRemoved':foreign if mask else 0}
 out[source]=frames
(root/'src/assets/tactical/combat-anchors.json').write_text(json.dumps(out,indent=2)+'\n')
print('Combat anchor sources:',len(out))
