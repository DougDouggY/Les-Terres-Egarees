"""Review lance movement anchors and shorten the thrust, retaining source pixels.
Run after register-lance-v2.py when rebuilding the descriptors.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy.ndimage import label, distance_transform_edt
ROOT=Path(__file__).resolve().parent.parent
ASSETS=ROOT/'src/assets/tactical'
layouts=json.loads((ASSETS/'atlas-layout.json').read_text())
anchors=json.loads((ASSETS/'combat-anchors.json').read_text())
for name in ['lance-steps-v3']:
    source=f'tactical/combat-v4-refinements-{name}.png'
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
    row_counts = [4]
    expected = sum(row_counts)
    if len(majors) != expected:
        raise ValueError(f'{name}: expected{expected} complete figures, found{len(majors)}')
    parts = []
    for number in majors:
        yy, xx = np.where(labels == number)
        parts.append(dict(number=number, cy=float(yy.mean()), cx=float(xx.mean()),
                          left=int(xx.min()), top=int(yy.min()), right=int(xx.max()+1), bottom=int(yy.max()+1)))
    # Generated rows may drift from the nominal square grid. Measure COMPLETE
    # isolated figures, then assign logical row/column; never slice through feet.
    parts.sort(key=lambda p:p['cy'])
    ordered = []
    for row, number in enumerate(row_counts):
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
    layouts[source] = dict(width=width,height=height,columns=4,rows=len(row_counts),frames=frames)
    anchors[source] = source_anchors
    # The supporting foot alternates. Anchor the upper body to one stable axis
    # instead of snapping the whole character to a different toe each frame.
    reference=round(reference*203/195)
    for f in frames:
        yy,xx=np.where(valid[f['y']:f['y']+round(f['height']*.22),f['x']:f['x']+f['width']])
        axis=f['x']+float(np.median(xx))-reference*.035
        f['anchorX']=round(axis,2);f['bodyHeight']=reference
        a=source_anchors[f"{f['row']}:{f['column']}"]
        a['feetX']=f['anchorX'];a['bodyHeight']=reference
    for suffix in ['sprite','combat']:
        path=ASSETS/f'zzzzzzzzzzzzzz-lance-v2.{suffix}.json'
        data=json.loads(path.read_text());p=data['profiles'][0]
        p['referenceHeights'][source]=reference
        p['clips']['move']=dict(source=source,columns=4,rows=1,row=0,frames=[0,1,2,3],
           cells=[dict(row=0,column=i) for i in range(4)],fps=6,loop=True,
           recolor='blue',recolorEdges=True,status='functional')
        p['clips']['combat_move']={'reuse':'move'}
        c=p['clips']['attack'];cells=[(2,0),(2,1),(2,2),(2,1),(2,0),(0,2)]
        c.update(row=2,frames=[i for r,i in cells],cells=[dict(row=r,column=i) for r,i in cells],impactFrame=2)
        c['note']='Estoc modéré puis récupération avec les mêmes dessins : aucune lance amincie ni fente excessive.'
        p['note']='Pas rapides calqués sur la référence validée, buste stabilisé ; estoc limité à la troisième pose.'
        path.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
    (ASSETS/'atlas-layout.json').write_text(json.dumps(layouts,indent=2)+'\n')
    (ASSETS/'combat-anchors.json').write_text(json.dumps(anchors,separators=(',',':'))+'\n')
    report=dict(source=source,referenceHeight=reference,frames=frame_audit)
    (ROOT/'docs/references/lance-steps-v3-audit.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report))
