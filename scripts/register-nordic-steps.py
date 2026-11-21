"""Register male Nordic steps and stabilize both movement strips, preserving the approved dodge."""
from pathlib import Path
from copy import deepcopy
import json
import numpy as np
from PIL import Image
from scipy.ndimage import label, distance_transform_edt
ROOT=Path(__file__).resolve().parent.parent
ASSETS=ROOT/'src/assets/tactical'
layouts=json.loads((ASSETS/'atlas-layout.json').read_text())
anchors=json.loads((ASSETS/'combat-anchors.json').read_text())
previous=json.loads((ROOT/'docs/art-archive/nordic-blades-before-approach-review.json').read_text())
for name in ['nordic-male-steps']:
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
    reference=round(reference/.95)
    def head_axis(source, frame):
        pixels=[]
        for x,y,n in anchors[source][f"{frame['row']}:{frame['column']}"]['maskRuns']:
            if y<frame['y']+frame['height']*.22:pixels.extend(range(x,x+n))
        return float(np.median(pixels))
    review=[];map_profiles=[];combat_profiles=[]
    for old in previous:
        guard=old['combat']['clips']['idle']
        cell=guard.get('cells',[dict(row=guard['row'],column=guard['frames'][0])])[0]
        gf=next(f for f in layouts[guard['source']]['frames'] if f['row']==cell['row'] and f['column']==cell['column'])
        guard_ref=old['combat'].get('referenceHeights',{}).get(guard['source'],gf['bodyHeight'])
        offset=(head_axis(guard['source'],gf)-gf['anchorX'])/guard_ref
        if old['gender']=='male':
            motion_source=source;motion_frames=frames;motion_ref=reference
        else:
            motion_source='tactical/combat-v4-refinements-blade.png'
            motion_frames=[f for f in layouts[motion_source]['frames'] if f['row']==1]
            motion_ref=219
        for f in motion_frames:
            h=head_axis(motion_source,f)
            f['anchorX']=round(h-offset*motion_ref,2);f['bodyHeight']=motion_ref
            a=anchors[motion_source][f"{f['row']}:{f['column']}"];a['feetX']=f['anchorX'];a['bodyHeight']=motion_ref
            review.append(dict(gender=old['gender'],source=motion_source,row=f['row'],column=f['column'],headX=h,rootX=f['anchorX'],reference=motion_ref,guardOffset=offset))
        for kind,target in [('map',map_profiles),('combat',combat_profiles)]:
            p=deepcopy(old[kind]);p['allowMixedSources']=True
            p.setdefault('referenceHeights',{})[motion_source]=motion_ref
            row=0 if old['gender']=='male' else 1
            p['clips']['move']=dict(source=motion_source,columns=4,rows=1 if row==0 else 6,row=row,frames=[0,1,2,3],
                cells=[dict(row=row,column=i) for i in range(4)],fps=6,loop=True,recolor='blue',recolorEdges=True,status='functional')
            p['clips']['combat_move']={'reuse':'move'}
            p['note']='Pas nordiques stabilisés et arrivée en garde ; esquive féminine approuvée conservée.'
            target.append(p)
    for suffix,profiles in [('sprite',map_profiles),('combat',combat_profiles)]:
        (ASSETS/f'zzzzzzzzzzzzzzz-nordic-steps.{suffix}.json').write_text(json.dumps(dict(override=True,profiles=profiles),indent=2,ensure_ascii=False)+'\n')
    (ASSETS/'atlas-layout.json').write_text(json.dumps(layouts,indent=2)+'\n')
    (ASSETS/'combat-anchors.json').write_text(json.dumps(anchors,separators=(',',':'))+'\n')
    (ROOT/'docs/references/nordic-steps-review.json').write_text(json.dumps(review,indent=2)+'\n')
    print(json.dumps(dict(poses=frame_audit,review=review)))
