"""Measure generated figures without rewriting pixels or changing live unit profiles."""
from pathlib import Path
import json, shutil
import numpy as np
from PIL import Image
from scipy.ndimage import label, distance_transform_edt
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'public/validation/vikings-evolues/reprises'
OUT.mkdir(parents=True,exist_ok=True)
sources=json.loads((ROOT/'docs/references/advanced-review-sources.json').read_text())
profiles=[]
for entry in sources:
    identity=entry['id']; src=Path(entry['source'])
    if not src.exists(): src=OUT/f'{identity}.png'
    im=np.asarray(Image.open(src).convert('RGBA')); h,w=im.shape[:2]
    alpha=im[:,:,3]
    if np.mean(alpha<32)<.2:raise ValueError(f'{identity}: fond non transparent')
    rgb=im[:,:,:3].astype(float)
    red=(rgb[:,:,0]>155)&(rgb[:,:,0]>rgb[:,:,1]*1.8)&(rgb[:,:,0]>rgb[:,:,2]*1.8)
    yellow=(rgb[:,:,0]>190)&(rgb[:,:,1]>165)&(rgb[:,:,2]<65)
    valid=(alpha>64)&~red&~yellow
    labels,count=label(valid,np.ones((3,3)))
    sizes=np.bincount(labels.ravel());sizes[0]=0
    majors=[i for i in range(1,count+1) if sizes[i]>max(300,w*h/12000)]
    expected=28 if identity.startswith('clan_healer-') else 24
    if len(majors)!=expected:raise ValueError(f'{identity}: {len(majors)} figures, {expected} attendues, tailles={sorted([int(sizes[i]) for i in majors])}')
    parts=[]
    for number in majors:
        yy,xx=np.where(labels==number)
        parts.append(dict(number=number,cy=float(yy.mean()),cx=float(xx.mean()),left=int(xx.min()),top=int(yy.min()),right=int(xx.max()+1),bottom=int(yy.max()+1)))
    parts.sort(key=lambda p:p['cy'])
    frames=[]; reference=None
    for row in range(expected//4):
        band=sorted(parts[:4],key=lambda p:p['cx']);parts=parts[4:]
        for column,part in enumerate(band):
            x0,x1=max(0,part['left']-12),min(w,part['right']+12)
            y0,y1=max(0,part['top']-12),min(h,part['bottom']+12)
            region=labels[y0:y1,x0:x1]; own=region==part['number'];dist=distance_transform_edt(~own)
            for number in np.unique(region):
                if number and number not in majors and sizes[number]>=3:
                    small=region==number
                    if dist[small].min()<=6:own|=small
            yy,xx=np.where(own)
            x,y=x0+int(xx.min()),y0+int(yy.min()); fw,fh=int(xx.max()-xx.min()+1),int(yy.max()-yy.min()+1)
            if reference is None:reference=fh
            # Keep one anatomical scale across the whole sheet. Foot anchoring is
            # measured per pose; there is no separate resize of attack figures.
            low=own & (np.indices(own.shape)[0]>=yy.max()-max(5,int(reference*.035)))
            _,feet=np.where(low); anchor=x0+float(np.median(feet))
            runs=[]
            for ry,values in enumerate(own):
                edges=np.diff(np.r_[False,values,False].astype(int))
                for a,b in zip(np.where(edges==1)[0],np.where(edges==-1)[0]):runs.append([x0+int(a),y0+ry,int(b-a)])
            if x==0 or y==0 or x+fw==w or y+fh==h:raise ValueError(f'{identity}: figure coupée {row}:{column}')
            frames.append(dict(row=row,column=column,x=x,y=y,width=fw,height=fh,anchorX=round(anchor,2),ground=y+fh,runs=runs))
    shield='shield' in identity
    dual='twin_' in identity
    ids=lambda row,columns:[row*4+c for c in columns]
    clips=dict(idle=ids(0,[0]),guard=ids(0,[0]),move=ids(1,[0,1,2,3]),attack=ids(2,[0,1,2,3])+(ids(3,[0,1,2,3]) if not dual else []),evade=ids(5,[0,1,2]),damage=ids(4,[3]) if shield else ids(4,[0,1,2]),death=ids(5,[3]))
    if dual:clips['offhand']=ids(3,[0,1,2,3])
    if shield:clips['block']=ids(4,[0,1,2])
    if identity.startswith('clan_healer-'):clips['bandage']=ids(6,[0,1,2,3])
    destination=OUT/f'{identity}.png'
    if src.resolve()!=destination.resolve():shutil.copyfile(src,destination)
    profiles.append(dict(id=identity,source=destination.name,width=w,height=h,referenceHeight=reference,frames=frames,clips=clips,original=Path(entry['source']).name,status='À comparer · non activé en campagne'))
(OUT/'manifest.json').write_text(json.dumps(dict(profiles=profiles),ensure_ascii=False,separators=(',',':'))+'\n')
print(json.dumps([dict(id=p['id'],frames=len(p['frames']),height=p['referenceHeight']) for p in profiles],ensure_ascii=False))
