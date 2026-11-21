"""Register reviewed art through measured geometry; never rewrite source pixels.
Partial attack sheets retain the approved movement/defence sources explicitly.
"""
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
previous=json.loads((ROOT/'docs/art-archive/before-combat-refinements.json').read_text())
template=json.loads((ASSETS/'pillarde-axe.review.json').read_text())
MODELS=[('blade','nordic_blade','female',True),('hunter','hunter','male',True),
 ('sword-m','swordsman','male',False),('sword-f','swordsman','female',False),
 ('spear','spearman','male',False),('mage-m','sorcerer','male',False),('mage-f','sorcerer','female',False)]
map_profiles=[];combat_profiles=[];audit=[]
for name,cls,gender,full in MODELS:
    source=f'tactical/combat-v4-refinements-{name}.png'
    if not (ROOT/'src/assets'/source).exists(): raise ValueError(f'Missing {source}')
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
    row_counts = [4,4,4,4,3,4] if full else [4,4,4]
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
    old=next(e for e in previous if e['cls']==cls and e['gender']==gender)
    def clip(cells, fps=7, loop=False, impact=None):
        out=dict(source=source,columns=4,rows=len(row_counts),row=cells[0][0],
          frames=[c for r,c in cells],cells=[dict(row=r,column=c) for r,c in cells],
          fps=fps,loop=loop,recolor='blue',recolorEdges=True,status='functional')
        if impact is not None:out['impactFrame']=impact
        return out
    if full:
        p=deepcopy(template)
        p.update(classId=cls,gender=gender,equipment=old['map']['equipment'],
          referenceHeights={source:reference},note='Harmonisation : une identité commune à la création, la carte et au combat.')
        p['clips']={
          'idle':clip([(0,0),(0,1)],2,True),
          'combat_idle':clip([(0,2),(0,3)],2,True),
          'move':clip([(1,i) for i in range(4)],6,True),
          'attack':clip([(r,i) for r in [2,3] for i in range(4)],8,False,3),
          'counter':{'reuse':'attack'},'attack_again':{'reuse':'attack'},
          'combat_move':{'reuse':'move'},'combat_damage':{'reuse':'damage'},
          'evade':clip([(4,i) for i in range(3)],7),
          'damage':clip([(5,i) for i in range(3)],6),
          'death':clip([(5,3)],3)}
        # The far-right extension touches the source edge: omit that incomplete pose.
        if name=='blade':
            c=p['clips']['attack'];c['cells'].pop(3);c['frames'].pop(3)
        battle=deepcopy(p)
    else:
        p=deepcopy(old['map']);battle=deepcopy(old['combat'])
        for out in [p,battle]:
            out['allowMixedSources']=True
            out.setdefault('referenceHeights',{})[source]=reference
            cells=[(r,i) for r in [1,2] for i in range(4)]
            # A sword tip touches the sheet boundary in this one generated pose.
            # Do not import a clipped weapon; the neighbouring complete strike is used.
            if name in ['sword-f','spear']:cells.remove((1,3))
            # Keep the caster's spare hand empty throughout the casting cycle.
            if name=='mage-f':
                cells.remove((1,1));cells.remove((2,1))
            out['clips']['attack']=clip(cells,8,False,2 if name in ['sword-f','spear','mage-f'] else 3)
            out['clips']['counter']={'reuse':'attack'}
            out['clips']['attack_again']={'reuse':'attack'}
            out['clips']['combat_idle']=clip([(0,2),(0,3)],2,True)
            out['note']='Attaque corrigée ; déplacements, défenses et identité existants conservés après contrôle des sources.'
        battle['clips']['idle']=deepcopy(p['clips']['combat_idle'])
        # Give male caster the same new staff/clothing during creation and dialogue scenes.
        # Its existing defence sheet remains archived and explicitly normalized.
        if cls=='sorcerer':
            p['clips']['idle']=clip([(0,0),(0,1)],2,True)
        # Orb centre measured in each source pose, not the staff hand or a generic box corner.
        if cls=='sorcerer':
            tips = {
              'mage-m': [(125,63),(487,63),(963,83),(1354,83),
                         (270,461),(624,437),(1019,414),(1405,397),
                         (278,774),(615,800),(975,816),(1354,816)],
              'mage-f': [(240,33),(600,33),(1013,68),(1378,82),
                         (295,442),(666,444),(1033,418),(1417,399),
                         (328,768),(670,778),(1002,796),(1371,797)]
            }
            for f, (tx,ty) in zip(frames,tips[name]):
                source_anchors[f"{f['row']}:{f['column']}"]['weaponTip']=dict(x=tx,y=ty)
    map_profiles.append(p);combat_profiles.append(battle)
    audit.append(dict(source=source,classId=cls,gender=gender,referenceHeight=reference,
       poses=len(frames),frames=frame_audit,fullReplacement=full))

# Calm shield knights: one stable illustrated pose, slight shared breathing only.
for old in previous:
    if old['cls']!='man_at_arms':continue
    for target,key in [(map_profiles,'map'),(combat_profiles,'combat')]:
        p=deepcopy(old[key]);c=deepcopy(p['clips']['idle'])
        c['frames']=c['frames'][:1];c['cells']=c['cells'][:1];c['fps']=1
        c['note']='Pieds fixes ; respiration légère partagée, sans alternance de grandes poses.'
        p['clips']['idle']=c
        # Combat guard also keeps feet stable.
        guard=deepcopy(p['clips']['combat_idle']);guard['frames']=guard['frames'][:1];guard['cells']=guard['cells'][:1]
        p['clips']['combat_idle']=guard
        target.append(p)
for suffix,profiles in [('sprite',map_profiles),('combat',combat_profiles)]:
    (ASSETS/f'zzzzzzzzzzzzz-combat-refinements.{suffix}.json').write_text(json.dumps(dict(override=True,profiles=profiles),indent=2,ensure_ascii=False)+'\n')
(ASSETS/'atlas-layout.json').write_text(json.dumps(layouts,indent=2)+'\n')
(ASSETS/'combat-anchors.json').write_text(json.dumps(anchors,separators=(',',':'))+'\n')
(ROOT/'docs/references/combat-refinements-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
print(json.dumps([dict(source=e['source'],poses=e['poses'],edges=[f for f in e['frames'] if f['edgeContact']]) for e in audit]))
