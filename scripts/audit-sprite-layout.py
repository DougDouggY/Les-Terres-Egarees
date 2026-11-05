"""Read-only raster audit. Writes crop/anchor metadata and a report; never changes images."""
import json,hashlib
from pathlib import Path
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parent.parent
sources={}
for path in sorted([*(root/'src/assets/tactical').glob('*.sprite.json'),*(root/'src/assets/tactical').glob('*.combat.json')]):
 for profile in json.loads(path.read_text())['profiles']:
  for clip in profile['clips'].values():
   if 'source' in clip:sources[clip['source']]=(clip['columns'],clip['rows'])
def bands(alpha):
 projection=(alpha>32).sum(1);runs=[];start=None
 for y,count in enumerate(projection):
  if count>1 and start is None:start=y
  if count<=1 and start is not None:
   if y-start>16 and projection[start:y].sum()>200:runs.append([start,y-1])
   start=None
 if start is not None:runs.append([start,len(projection)-1])
 return runs
result={};issues=[]
for source,(columns,rows) in sources.items():
 path=root/('src/assets/'+source if source.startswith('tactical/') else 'public/'+source)
 im=np.array(Image.open(path).convert('RGBA'));height,width=im.shape[:2];frames=[];corrected=0
 guides=[]
 if source.startswith('tactical/complete-'):
  for ci in range(columns):
   runs=bands(im[:,round(ci*width/columns):round((ci+1)*width/columns),3])
   if len(runs)==rows:guides.append(runs)
 for col in range(columns):
  left,right=round(col*width/columns),round((col+1)*width/columns)
  alpha=im[:,left:right,3];projection=(alpha>32).sum(1);runs=[];start=None
  for y,count in enumerate(projection):
   if count>1 and start is None:start=y
   if count<=1 and start is not None:
    if y-start>16 and projection[start:y].sum()>200:runs.append([start,y-1])
    start=None
  if start is not None:runs.append([start,height-1])
  valid=len(runs)==rows
  if not valid and guides:
   # A raised weapon can join two alpha bands. Sibling columns provide the
   # actual row pitch, which can differ substantially from uniform cell height.
   runs=np.median(np.array(guides),axis=0).astype(int).tolist()
   valid=True
  if not valid:issues.append(dict(source=source,column=col,problem='Séparation ambiguë des figures',expected=rows,detected=len(runs)))
  for row in range(rows):
   if valid:
    low=0 if row==0 else (runs[row-1][1]+runs[row][0])//2
    high=height if row==rows-1 else (runs[row][1]+runs[row+1][0])//2
   else:low,high=round(row*height/rows),round((row+1)*height/rows)
   yy,xx=np.where(alpha[low:high]>16)
   if not len(xx):continue
   x0,x1=left+int(xx.min()),left+int(xx.max())+1;y0,y1=low+int(yy.min()),low+int(yy.max())+1
   if y0<round(row*height/rows) or y1>round((row+1)*height/rows):corrected+=1
   defect= y0==0 or y1==height or x0==0 or x1==width
   if defect:issues.append(dict(source=source,column=col,row=row,problem='Contact avec le bord de l’image source : pointe/pied à vérifier, aucun redessin automatique.'))
   frames.append(dict(row=row,column=col,x=x0,y=y0,width=x1-x0,height=y1-y0,ground=y1,anchorX=(left+right)/2,ambiguous=not valid,sourceDefect=defect))
 if source.startswith('tactical/complete-'):
  from scipy.ndimage import label,find_objects
  labels,_=label(im[:,:,3]>16);sizes=np.bincount(labels.ravel());boxes=find_objects(labels)
  selected=[]
  for frame in frames:
   x,y,w,h=frame['x'],frame['y'],frame['width'],frame['height']
   overlap=np.bincount(labels[y:y+h,x:x+w].ravel(),minlength=len(sizes));overlap[0]=0
   number=int(overlap.argmax())
   selected.append(number if number and overlap[number]>=600 else 0)
  for frame,number in zip(frames,selected):
   if not number:continue
   ys,xs=boxes[number-1]
   # Do not mistake two touching bodies for a single, unusually tall figure.
   if selected.count(number)>1 or ys.stop-ys.start>height/rows*1.8 or xs.stop-xs.start>width/columns*1.8:
    frame['ambiguous']=True
    issues.append(dict(source=source,column=frame['column'],row=frame['row'],problem='Deux silhouettes ou effets se touchent : découpage provisoire.'))
    continue
   frame.update(x=xs.start,y=ys.start,width=xs.stop-xs.start,height=ys.stop-ys.start,ground=ys.stop,sourceDefect=xs.start==0 or ys.start==0 or xs.stop==width or ys.stop==height)
 # The trial atlas contains complete figures crossing a nominal column by a few pixels.
 # Connected alpha components isolate the actual drawing, avoiding both clipped blades
 # and fragments from the next figure. Existing validated atlases keep their metadata.
 if source=='tactical/combat-pair-reference-v2.png':
  from scipy.ndimage import label,find_objects
  labels,_=label(im[:,:,3]>16);sizes=np.bincount(labels.ravel());boxes=find_objects(labels)
  isolated=[]
  for number,box in enumerate(boxes,1):
   if sizes[number]<1000:continue
   ys,xs=box;col=int(((xs.start+xs.stop)/2)/width*columns);row=min(rows-1,int((ys.stop-1)/height*rows))
   isolated.append(dict(row=row,column=col,x=xs.start,y=ys.start,width=xs.stop-xs.start,height=ys.stop-ys.start,ground=ys.stop,anchorX=(col+.5)*width/columns,ambiguous=False,sourceDefect=False))
  if len(isolated)!=columns*rows or len({(f['row'],f['column']) for f in isolated})!=columns*rows:raise ValueError('Trial atlas components must isolate exactly 32 figures')
  frames=isolated
 # Combat V2: index complete connected figures by FOOT centroid, not by
 # transparent cell bounds or the tip of a spear crossing into the next cell.
 if source.startswith(('tactical/combat-v2-', 'tactical/combat-v3-')):
  from scipy.ndimage import label,find_objects
  labels,_=label(im[:,:,3]>16);sizes=np.bincount(labels.ravel());boxes=find_objects(labels);groups={}
  for number,box in enumerate(boxes,1):
   if sizes[number]<600:continue
   ys,xs=box;region=labels[ys,xs]==number
   fy,fx=np.where(region[round(region.shape[0]*.8):]);foot=xs.start+float(np.median(fx)) if len(fx) else (xs.start+xs.stop)/2
   col=max(0,min(columns-1,int(foot/width*columns)));row=max(0,min(rows-1,int(((ys.start+ys.stop)/2)/height*rows)))
   key=(row,col)
   candidate=dict(row=row,column=col,x=xs.start,y=ys.start,width=xs.stop-xs.start,height=ys.stop-ys.start,ground=ys.stop,anchorX=foot,ambiguous=False,sourceDefect=xs.start==0 or ys.start==0 or xs.stop==width or ys.stop==height)
   if key not in groups or sizes[number]>groups[key][0]:groups[key]=(sizes[number],candidate)
  if len(groups)==columns*rows:
   frames=[v[1] for v in groups.values()]
   # The initial rectangular probe can touch faint background noise. Report
   # only final isolated figures, including any actual cropped body/weapon.
   issues=[issue for issue in issues if issue.get('source')!=source]
   for f in frames:
    if f['sourceDefect']:issues.append(dict(source=source,row=f['row'],column=f['column'],problem='Figure isolée au bord de la source : ressource à corriger.'))
  else:issues.append(dict(source=source,problem='Figures V2 non isolables sans retouche artistique',expected=columns*rows,detected=len(groups)))
 # Anatomical anchor: estimate the torso from the dense lower silhouette,
 # then use its longest vertical band. Isolated staff/spear tips are excluded.
 for frame in frames:
  x,y,w,h=frame['x'],frame['y'],frame['width'],frame['height']
  low=im[y+round(h*.72):y+h,x:x+w,3]>32
  _,xx=np.where(low)
  center=x+float(np.median(xx)) if len(xx) else frame['anchorX']
  half=max(6,width/columns*.23)
  left=max(x,round(center-half));right=min(x+w,round(center+half))
  band=im[y:y+h,left:right,3]
  dense=(band>32).sum(1)>=max(3,(right-left)*.12)
  segments=[];start=None
  for yy,filled in enumerate(dense):
   if filled and start is None:start=yy
   if not filled and start is not None:segments.append((start,yy));start=None
  if start is not None:segments.append((start,h))
  top,bottom=max(segments,key=lambda pair:pair[1]-pair[0]) if segments else (0,h)
  feet=np.where((band>32).sum(1)>=3)[0]
  ground=int(feet[-1])+1 if len(feet) else bottom
  frame['bodyHeight']=int(max(1,ground-top))
  frame['bodyGround']=int(y+ground)
 result[source]=dict(width=width,height=height,columns=columns,rows=rows,frames=frames,corrected=corrected)
(root/'src/assets/tactical/atlas-layout.json').write_text(json.dumps(result,indent=2)+'\n')
(root/'docs/SPRITE-AUDIT.json').write_text(json.dumps(dict(sources=len(result),correctedFrames=sum(v['corrected'] for v in result.values()),issues=issues),indent=2)+'\n')
print(json.dumps(dict(sources=len(result),correctedFrames=sum(v['corrected'] for v in result.values()),issues=len(issues))))
