"""Stable locomotion roots and standing source scales; source PNGs are read-only.
Register upper-body RGB/alpha patches, never the alternately planted feet.
Bear locomotion is deliberately excluded. JSON reports retain match confidence.
"""
from pathlib import Path
import json,numpy as np
from PIL import Image
from scipy.signal import fftconvolve
root=Path(__file__).resolve().parent.parent;folder=root/'src/assets/tactical'
anchors=json.loads((folder/'combat-anchors.json').read_text());layouts=json.loads((folder/'atlas-layout.json').read_text())
profiles=json.loads((folder/'zz-v4.combat.json').read_text())['profiles'];report=[];images={};changed=set();rgba={}
def raster(s):
 if s not in images:
  im=np.array(Image.open(root/'src/assets'/s).convert('RGBA'),dtype=float)/255
  rgba[s]=im
  images[s]=((im[:,:,0]*.23+im[:,:,1]*.45+im[:,:,2]*.32)*im[:,:,3]+im[:,:,3]*.3).astype(np.float32)
 return images[s]
def cells(c):return c.get('cells',[dict(row=c['row'],column=x)for x in c['frames']])
def resolved(p,n):
 c=p['clips'].get(n)
 return resolved(p,c['reuse'])if c and 'reuse'in c else c
def frame(c,i):
 cell=cells(c)[i];return anchors[c['source']][f"{cell['row']}:{cell['column']}"]
for p in profiles:
 # All new sheets use an explicit standing guard reference, never a wound/fall.
 refs=p.setdefault('referenceHeights',{})
 for c in p['clips'].values():
  if 'source'not in c or 'combat-v4-'not in c['source']:continue
  row=c['row'];source=c['source'];col=0
  if source.endswith('ranged.png')and p['classId']=='pavise_crossbowman':row=1
  refs[source]=anchors[source][f'{row}:{col}']['bodyHeight']
 c=resolved(p,'move')
 if not c or p['state']=='bear' or len(c['frames'])<2:continue
 key=(c['source'],tuple((x['row'],x['column'])for x in cells(c)))
 if key in changed:continue
 changed.add(key);im=raster(c['source']);f0=frame(c,0);h=f0['bodyHeight'];fy=f0['feetY'];fx=f0['feetX'];top=fy-h
 # Small head/shoulder template excludes lower legs and forward weapon tips.
 tw=max(12,round(h*.3));th=max(12,round(h*.24))
 def head_center(f):
  x,y,w,bh=f['bounds'];low=max(y,round(f['feetY']-f['bodyHeight']));high=min(y+bh,round(low+h*.18))
  yy,xx=np.where(rgba[c['source']][low:high,x:x+w,3]>.5)
  return x+float(np.median(xx)) if len(xx) else f['feetX']
 tx=round(head_center(f0)-tw*.5);ty=round(top+h*.02)
 tx=max(0,min(im.shape[1]-tw,tx));ty=max(0,min(im.shape[0]-th,ty));template=im[ty:ty+th,tx:tx+tw];template=template-template.mean();norm=np.sqrt((template**2).sum())
 if norm<.01:continue
 for i,cell in enumerate(cells(c)):
  f=frame(c,i);old=f['feetX'];guessx=head_center(f)-tw*.5;guessy=f['feetY']-f['bodyHeight']+h*.04
  sx=max(0,round(guessx-h*.27));sy=max(0,round(guessy-h*.17));ex=min(im.shape[1],round(guessx+tw+h*.27));ey=min(im.shape[0],round(guessy+th+h*.17));patch=im[sy:ey,sx:ex]
  if patch.shape[0]<th or patch.shape[1]<tw:continue
  numerator=fftconvolve(patch,template[::-1,::-1],mode='valid');ones=np.ones(template.shape);sums=fftconvolve(patch,ones,mode='valid');sq=fftconvolve(patch*patch,ones,mode='valid');denom=np.sqrt(np.maximum(0,sq-sums*sums/template.size))*norm
  score=numerator/np.maximum(1e-7,denom);yy,xx=np.unravel_index(np.argmax(score),score.shape);confidence=float(score[yy,xx]);new=fx+(sx+xx-tx)
  # Confidence is exposed rather than quietly accepting an arbitrary match.
  if i==0:new=fx;confidence=1.
  accepted=confidence>=.35
  if accepted:f['feetX']=round(new,2)
  report.append(dict(source=c['source'],row=cell['row'],column=cell['column'],oldRoot=old,newRoot=f['feetX'],confidence=round(confidence,4),accepted=accepted))
(folder/'combat-anchors.json').write_text(json.dumps(anchors,separators=(',',':'))+'\n')
(folder/'zz-v4.combat.json').write_text(json.dumps({'profiles':profiles},indent=2)+'\n')
# Same standing references in the tactical registry, without changing terrain or movement rules.
p=folder/'zzzzzzzzz-v4.sprite.json';data=json.loads(p.read_text());bykey={tuple(x[k]for k in ['classId','gender','equipment','state']):x for x in profiles}
for x in data['profiles']:x['referenceHeights']=bykey[tuple(x[k]for k in ['classId','gender','equipment','state'])]['referenceHeights']
p.write_text(json.dumps(data,indent=2)+'\n')
(root/'docs/COMBAT-V4-ROOT-AUDIT.json').write_text(json.dumps(report,indent=2)+'\n');print('Registered locomotion frames:',len(report),'low-confidence:',sum(not x['accepted']for x in report))
