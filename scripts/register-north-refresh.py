"""Register new art; read raster pixels for geometry only, never rewrite images.

One source/identity for map and battle. Counter/follow-up reuse the attack;
critical remains the shared visual effect. Old shared atlases stay available
for other classes. Run after copying the five generated PNGs into tactical/.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy.ndimage import label, distance_transform_edt

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'src/assets/tactical'
MODELS = [
    ('north-warrior', 'north_warrior', 'male', 'axe'),
    ('male-axe', 'raider', 'male', 'axe-shield'),
    ('male-sword', 'raider', 'male', 'sword-shield'),
    ('female-sword', 'raider', 'female', 'sword-shield'),
    ('huntress', 'hunter', 'female', 'bow'),
]
layouts = json.loads((ASSETS / 'atlas-layout.json').read_text())
anchors = json.loads((ASSETS / 'combat-anchors.json').read_text())
template = json.loads((ASSETS / 'pillarde-axe.review.json').read_text())
approved = json.loads(json.dumps(template))
approved['note'] = 'Pillarde hache/bouclier élancée validée ; carte et combat.'
approved['clips']['combat_move'] = {'reuse': 'move'}
approved['clips']['combat_damage'] = {'reuse': 'damage'}
profiles = [approved]
audit = []

for name, cls, gender, equipment in MODELS:
    source = f'tactical/combat-v4-north-refresh-{name}.png'
    image = np.array(Image.open(ROOT / 'src/assets' / source).convert('RGBA'))
    height, width = image.shape[:2]
    if np.mean(image[:, :, 3] == 0) < .2:
        raise ValueError(f'{name}: transparent background missing')
    frames, source_anchors, frame_audit = [], {}, []
    rgb = image[:, :, :3].astype(float)
    red = (rgb[:, :, 0] > 155) & (rgb[:, :, 0] > rgb[:, :, 1]*1.8) & (rgb[:, :, 0] > rgb[:, :, 2]*1.8)
    yellow = (rgb[:, :, 0] > 190) & (rgb[:, :, 1] > 165) & (rgb[:, :, 2] < 65)
    valid = (image[:, :, 3] > 64) & ~red & ~yellow
    labels, count = label(valid)
    sizes = np.bincount(labels.ravel()); sizes[0] = 0
    majors = [i for i in range(1,count+1) if sizes[i] > 1000]
    if len(majors) != 26:
        raise ValueError(f'{name}: expected26 complete figures, found{len(majors)}')
    parts = []
    for number in majors:
        yy, xx = np.where(labels == number)
        parts.append(dict(number=number, cy=float(yy.mean()), cx=float(xx.mean()),
                          left=int(xx.min()), top=int(yy.min()), right=int(xx.max()+1), bottom=int(yy.max()+1)))
    # Generated rows may drift from the nominal square grid. Measure COMPLETE
    # isolated figures, then assign logical row/column; never slice through feet.
    parts.sort(key=lambda p:p['cy'])
    ordered = []
    for row, number in enumerate([4,4,4,4,3,3,4]):
        band = sorted(parts[:number],key=lambda p:p['cx']); parts=parts[number:]
        ordered.extend((row,col,part) for col,part in enumerate(band))
    reference = None
    for row, col, part in ordered:
        left, right = max(0,part['left']-8), min(width,part['right']+8)
        top, bottom = max(0,part['top']-8), min(height,part['bottom']+8)
        region = labels[top:bottom,left:right]
        own = region == part['number']
        distance = distance_transform_edt(~own)
        for number in np.unique(region):
            if number and number not in majors and sizes[number]>=3:
                small=region==number
                if distance[small].min()<=5: own |= small
        yy, xx = np.where(own)
        x, y = left+int(xx.min()), top+int(yy.min())
        w, h = int(xx.max()-xx.min()+1), int(yy.max()-yy.min()+1)
        if reference is None: reference = h
        ground = y+h
        _, foot_x = np.where(own & (np.indices(own.shape)[0] >= yy.max()-8))
        anchor = left+float(np.median(foot_x))
        runs=[]
        for ry,values in enumerate(own):
            edges=np.diff(np.r_[False,values,False].astype(int))
            for start,end in zip(np.where(edges==1)[0],np.where(edges==-1)[0]):
                runs.append([left+int(start),top+ry,int(end-start)])
        frames.append(dict(row=row,column=col,x=x,y=y,width=w,height=h,ground=ground,
                           anchorX=round(anchor,2),bodyGround=ground,bodyHeight=reference,ambiguous=False))
        source_anchors[f'{row}:{col}']=dict(feetX=round(anchor,2),feetY=ground,bodyHeight=reference,
            weaponTip=dict(x=x+w,y=y+h*.45),bounds=[x,y,w,h],ambiguous=False,sourceDefect=False,
            maskRuns=runs,foreignPixelsRemoved=int((region>0).sum()-own.sum()))
        frame_audit.append(dict(row=row,column=col,bounds=[x,y,w,h],
            edgeContact=bool(x==0 or y==0 or x+w==width or y+h==height)))
    layouts[source] = dict(width=width,height=height,columns=4,rows=7,frames=frames)
    anchors[source] = source_anchors
    p = json.loads(json.dumps(template))
    p.update(classId=cls, gender=gender, equipment=equipment,
             note='Harmonisation nordique : même identité et équipement sur carte et en combat.',
             referenceHeights={source:reference})
    for clip in p['clips'].values():
        if 'source' in clip:
            clip['source'] = source
    p['clips']['combat_move'] = {'reuse': 'move'}
    p['clips']['combat_damage'] = {'reuse': 'damage'}
    profiles.append(p)
    audit.append(dict(source=source, classId=cls,gender=gender,equipment=equipment,
                      referenceHeight=reference,poses=len(frames),frames=frame_audit))

for suffix in ['sprite', 'combat']:
    (ASSETS / f'zzzzzzzzzzz-north-refresh.{suffix}.json').write_text(
        json.dumps(dict(override=True,profiles=profiles),indent=2,ensure_ascii=False)+'\n')
(ASSETS/'atlas-layout.json').write_text(json.dumps(layouts,indent=2)+'\n')
(ASSETS/'combat-anchors.json').write_text(json.dumps(anchors,separators=(',',':'))+'\n')
(ROOT/'docs/references/north-refresh-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
print(json.dumps([dict(source=e['source'], poses=e['poses'], edges=[f for f in e['frames'] if f['edgeContact']]) for e in audit]))
