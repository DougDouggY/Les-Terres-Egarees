"""Align reviewed pelvis landmarks; source PNG pixels are never changed.
Run after register-knight-refresh.py when rebuilding the source measurements.
"""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parent.parent
ASSETS=ROOT/'src/assets/tactical'
layouts=json.loads((ASSETS/'atlas-layout.json').read_text())
anchors=json.loads((ASSETS/'combat-anchors.json').read_text())
# Waist/belt landmarks read on the original full-resolution sheets.
# Preserve the neutral map pose's pelvis-to-root offset in every standing action.
landmarks={
 'male': {'offset':13, 'rows':{0:[115,352,582,824],1:[112,352,590,834],2:[110,352,584,821],3:[110,353,584,819],4:[111,348,586]}},
 'female': {'offset':18, 'rows':{0:[119,357,588,831],1:[114,354,592,835],2:[113,355,584,828],3:[113,352,588,822],4:[110,350,588]}}
}
review=[];previous=[]
for gender,data in landmarks.items():
    source=f'tactical/combat-v4-knight-refresh-man-arms-{gender}.png'
    for frame in layouts[source]['frames']:
        row,col=frame['row'],frame['column']
        if row not in data['rows']:continue
        cell=f'{row}:{col}';a=anchors[source][cell]
        previous.append(dict(source=source,row=row,column=col,anchorX=frame['anchorX'],feetX=a['feetX']))
        pelvis=data['rows'][row][col];root=pelvis-data['offset']
        frame['anchorX']=root;a['feetX']=root
        review.append(dict(source=source,row=row,column=col,pelvisX=pelvis,rootX=root,
          pelvisOffset=data['offset'],reference=frame['bodyHeight']))
archive=ROOT/'docs/art-archive/man-at-arms-roots-before-alignment.json'
if archive.exists():
    saved=json.loads(archive.read_text());keys={(r['source'],r['row'],r['column']) for r in saved}
    previous=saved+[r for r in previous if (r['source'],r['row'],r['column']) not in keys]
archive.write_text(json.dumps(previous,indent=2)+'\n')
(ASSETS/'atlas-layout.json').write_text(json.dumps(layouts,indent=2)+'\n')
(ASSETS/'combat-anchors.json').write_text(json.dumps(anchors,separators=(',',':'))+'\n')
(ROOT/'docs/references/man-at-arms-root-review.json').write_text(json.dumps(review,indent=2)+'\n')
print(f'{len(review)} poses aligned; drawings retained, dodge/damage/death anchors left intact.')
