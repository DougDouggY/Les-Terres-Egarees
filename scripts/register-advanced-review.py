"""Measure review art without rewriting pixels or installing live unit profiles."""
from pathlib import Path
import json, shutil
import numpy as np
from PIL import Image
from scipy.ndimage import label, distance_transform_edt

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'public/validation/vikings-evolues/reprises'
OUT.mkdir(parents=True,exist_ok=True)


def measure(entry, filename, count, attack=False):
    src=Path(entry['source'])
    if not src.exists(): src=OUT/filename
    im=np.asarray(Image.open(src).convert('RGBA')); h,w=im.shape[:2]
    if np.mean(im[:,:,3]<32)<.2: raise ValueError(f'{filename}: fond non transparent')
    rgb=im[:,:,:3].astype(float)
    red=(rgb[:,:,0]>155)&(rgb[:,:,0]>rgb[:,:,1]*1.8)&(rgb[:,:,0]>rgb[:,:,2]*1.8)
    yellow=(rgb[:,:,0]>190)&(rgb[:,:,1]>165)&(rgb[:,:,2]<65)
    labels,n=label((im[:,:,3]>64)&~red&~yellow,np.ones((3,3)))
    sizes=np.bincount(labels.ravel());sizes[0]=0
    majors=[i for i in range(1,n+1) if sizes[i]>max(300,w*h/12000)]
    if len(majors)!=count: raise ValueError(f'{filename}: {len(majors)} figures au lieu de {count}')
    parts=[]
    for number in majors:
        yy,xx=np.where(labels==number)
        parts.append(dict(number=number,cy=float(yy.mean()),cx=float(xx.mean()),left=int(xx.min()),top=int(yy.min()),right=int(xx.max()+1),bottom=int(yy.max()+1)))
    parts.sort(key=lambda p:p['cy']);frames=[]
    for row in range(count//4):
        band=sorted(parts[:4],key=lambda p:p['cx']);parts=parts[4:]
        for column,part in enumerate(band):
            x0,x1=max(0,part['left']-12),min(w,part['right']+12)
            y0,y1=max(0,part['top']-12),min(h,part['bottom']+12)
            region=labels[y0:y1,x0:x1];own=region==part['number'];dist=distance_transform_edt(~own)
            for number in np.unique(region):
                if number and number not in majors and sizes[number]>=3:
                    small=region==number
                    if dist[small].min()<=6:own|=small
            yy,xx=np.where(own)
            x,y=x0+int(xx.min()),y0+int(yy.min());fw,fh=int(xx.max()-xx.min()+1),int(yy.max()-yy.min()+1)
            if x==0 or y==0 or x+fw==w or y+fh==h:raise ValueError(f'{filename}: figure coupée {row}:{column}')
            low=own&(np.indices(own.shape)[0]>=yy.max()-max(5,int(fh*.035)))
            _,feet=np.where(low);foot=x0+float(np.median(feet))
            rear=x0+float(np.median(feet[feet<=np.quantile(feet,.35)]))
            runs=[]
            for ry,values in enumerate(own):
                edges=np.diff(np.r_[False,values,False].astype(int))
                for a,b in zip(np.where(edges==1)[0],np.where(edges==-1)[0]):runs.append([x0+int(a),y0+ry,int(b-a)])
            # The staff tip is measured in the forward upper part, never at a hand or foot.
            upper=own&(np.indices(own.shape)[0]<yy.min()+fh*.68)
            uy,ux=np.where(upper);front=ux>=ux.max()-max(4,int(fh*.035))
            tip=dict(x=x0+float(ux.max())-fh*.025,y=y0+float(np.median(uy[front])))
            frames.append(dict(row=row,column=column,x=x,y=y,width=fw,height=fh,anchorX=round(foot,2),rearHeel=round(rear,2),ground=y+fh,runs=runs,source=filename,sourceWidth=w,sourceHeight=h,weaponTip=tip))
    # Attack sheets end in recovery. Its head-to-foot height excludes the lifted weapon.
    reference=frames[-1 if attack else 0]['height']
    if attack:
        offset=frames[0]['anchorX']-frames[0]['rearHeel']
        for f in frames:f['anchorX']=round(f['rearHeel']+offset,2)
    for f in frames:f['referenceHeight']=reference
    dest=OUT/filename;dest.parent.mkdir(parents=True,exist_ok=True)
    if src.resolve()!=dest.resolve():shutil.copyfile(src,dest)
    return dict(source=filename,width=w,height=h,referenceHeight=reference,frames=frames,original=Path(entry['source']).name)


sources=json.loads((ROOT/'docs/references/advanced-review-sources.json').read_text())
profiles={}
ids=lambda r,columns:[r*4+c for c in columns]
markers={'huscarl':'Cotte de mailles, fourrure sombre et bouclier renforcé.','honor_guard':'Armure et bouclier à larges finitions dorées.','clan_healer':'Sans cape ni fourrure ; sacoche à bandages en bandoulière.','tracker':'Hache mise en évidence, y compris avec l’arc.'}
for entry in sources:
    identity=entry['id'];count=28 if identity.startswith('clan_healer-') else 24
    p=measure(entry,f'{identity}.png',count)
    shield='shield' in identity;dual='twin_' in identity
    clips=dict(idle=[0],guard=[0],move=ids(1,[0,1,2,3]),attack=ids(2,[0,1,2,3])+(ids(3,[0,1,2,3]) if not dual else []),evade=ids(5,[0,1,2]),damage=ids(4,[3]) if shield else ids(4,[0,1,2]),death=ids(5,[3]))
    if dual:clips['offhand']=ids(3,[0,1,2,3])
    if shield:clips['block']=ids(4,[0,1,2])
    if identity.startswith('clan_healer-'):clips['bandage']=ids(6,[0,1,2,3])
    p.update(id=identity,kind='full',baseFrameCount=count,clips=clips,status='À comparer · non activé en campagne',roleMarker=markers.get(identity.split('-')[0],''))
    if (OUT/'avant'/f'{identity}-guard.png').exists():p['beforeImage']=f'avant/{identity}-guard.png'
    profiles[identity]=p

patchfile=ROOT/'docs/references/advanced-review-revisions.json'
if patchfile.exists():
    for patch in json.loads(patchfile.read_text()):
        identity=patch['id'];kind=patch['kind'];filename=f"corrections/{identity}-{kind}.png"
        sheet=measure(patch,filename,8,attack=kind=='attack')
        for target in [identity]+patch.get('aliases',[]):
            if target in profiles:
                p=profiles[target];offset=len(p['frames']);p['frames']+=sheet['frames']
            else:
                p={**sheet,'frames':list(sheet['frames']),'id':target,'kind':kind+'-only','baseFrameCount':0,'clips':{'idle':[0],'guard':[0]},'guardImage':f'{target}-guard.png','status':'À comparer · non activé en campagne'}
                profiles[target]=p;offset=0
            index=lambda values:[offset+i for i in values]
            p.setdefault('timings',{});p.setdefault('impacts',{})
            if kind=='attack':
                p['attackSheet']=filename
                if 'twin_' in target:
                    p['clips'].update(attack=index([0,1,2,3]),offhand=index([4,5,6,7]),combo=index([0,1,2,4,5,6,7]))
                    p['timings'].update(attack=[130,100,100,150],offhand=[130,100,100,150],combo=[150,120,80,130,110,90,180])
                    p['impacts'].update(attack=[2],offhand=[2],combo=[2,5])
                    p['roleMarker']='Deux frappes successives, une par bras, sans arrêt en garde au milieu.'
                else:
                    p['clips']['attack']=index(list(range(8)));p['timings']['attack']=[160,160,200,90,80,130,160,160];p['impacts']['attack']=[4]
                    p['roleMarker']='Un coup lourd à deux mains, manche unique et un seul impact.'
            else:
                healing='healing_focus' in target
                action='heal' if healing else 'cast'
                p['clips'][action]=index(list(range(8)))
                p['timings'][action]=[150,160,150,160,100,180,160,160];p['impacts'][action]=[4]
                p['castSheet']=filename;p['effect']='heal' if healing else 'lightning'
                p['roleMarker']='Bâton tendu vers la cible ; magie émise depuis son extrémité.'

(OUT/'manifest.json').write_text(json.dumps(dict(profiles=list(profiles.values())),ensure_ascii=False,separators=(',',':'))+'\n')
print(json.dumps([dict(id=p['id'],frames=len(p['frames']),kind=p['kind']) for p in profiles.values()],ensure_ascii=False))
