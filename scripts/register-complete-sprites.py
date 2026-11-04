"""Register reviewed supplemental drawings without changing existing image bytes.
Each sequence lists actual poses; aliases explicitly describe reuse. Rerunnable.
"""
import json
from PIL import Image
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
ASSETS=ROOT/'src/assets/tactical'
# Reject opaque candidates before they can enter either the game or the gallery.
# This only reads pixels; sources are never rewritten or automatically keyed out.
for candidate in ASSETS.glob('complete-*.png'):
 alpha=Image.open(candidate).convert('RGBA').getchannel('A')
 if alpha.histogram()[0]/(alpha.width*alpha.height)<.15:
  raise ValueError(f'{candidate.name}: fond non transparent, intégration refusée')
BATCHES=[('complete-knights.png',6,6,[('spearman','any','lance'),('crossbowman','male','crossbow'),('swordsman','any','sword')])]
if (ASSETS/'complete-north.png').exists():
 BATCHES.append(('complete-north.png',6,6,[('north_warrior','male','axe'),('nordic_blade','male','sword'),('hunter','female','bow')]))
BATCHES += [
 ('complete-north-promotions.png',4,12,[('huscarl','male','axe-shield'),('clan_healer','male','axe-shield'),('honor_guard','any','sword-shield')]),
 ('complete-knight-promotions.png',4,11,[('guard_knight','any','sword-shield'),('royal_guard','any','lance-shield'),('duelist','male','dual-swords')]),
]
for batch in json.loads((ROOT/'scripts/visual-plan.json').read_text()):
 source='complete-'+batch['name']+'.png'
 if not (ASSETS/source).exists():continue
 cols,rows=(4,8) if batch['name']=='lot1-dual' else (5,6) if batch['name']=='lot4-hunters' else (4,6) if batch['name'] in ('lot4-recruits','lot4-equipment','lot2-magic') else (6,6)
 models=[(u[0],u[3],u[1],u[2]) for u in batch['units']]
 BATCHES.append((source,cols,rows,models))
profiles=[]
for source,cols,rows,models in BATCHES:
 for model,model_data in enumerate(models):
  class_id,gender,equipment=model_data[:3]
  state=model_data[3] if len(model_data)>3 else 'default'
  # Preserve the two explicitly validated protagonists and their timings.
  if class_id=='man_at_arms' or (class_id=='raider' and equipment=='axe-shield' and gender=='male'):continue
  start_row = model*2 if rows==6 else model*4
  if source=='complete-knight-promotions.png' and model==2:start_row=7
  def clip(poses,fps=8,impact=None):
   cells=[dict(row=start_row+p//cols,column=p%cols) for p in poses]
   result=dict(source='tactical/'+source,columns=cols,rows=rows,row=cells[0]['row'],frames=[c['column'] for c in cells],cells=cells,fps=fps,loop=False,recolor='magenta',recolorEdges=True,status='functional')
   if impact is not None:result['impactFrame']=impact
   return result
  profile=dict(classId=class_id,gender=gender,equipment=equipment,state=state,note='Planches complémentaires : anticipation, armement, contact, récupération, dégâts, esquive et chute. Validation artistique en cours.',clips={
   'attack':clip([5,0,1,2,3,4,5],9,3),
   'counter':dict(reuse='attack',note='Même geste complet, déclenché en riposte ; retour à la garde sans nouvelle frappe.'),
   'damage':clip([6,7],6),
   'evade':clip([8,9],7),
   'death':clip([10,11],4),
  })
  if rows==6 and cols==5:
   profile['clips']['attack']=clip([0,1,2,3,5,6],9,3)
   profile['clips']['damage']=clip([7,6],6)
   profile['clips']['death']=clip([8,9],4)
   del profile['clips']['evade']
  if rows==6 and cols==4:
   profile['clips']['attack']=clip([0,3,4,5,0],8,3)
   profile['clips']['damage']=clip([6,0],6)
   profile['clips']['death']=clip([6,7],4)
   del profile['clips']['evade']
   if source=='complete-lot2-magic.png':
    if class_id=='raider':continue
    profile['clips']={'heal' if equipment=='healing' else 'attack':clip([0,1,2,3,0],7,2)}
    if equipment!='healing':profile['clips']['counter']=dict(reuse='attack')
  if source=='complete-lot1-heavy.png' and class_id in ('ironbreaker','executioner'):
   profile['clips']['attack']=clip([4,0,1,2,3,4,4],8,3)
  if source=='complete-knight-promotions.png' and model==0:
   profile['clips']['block']=clip([12,13,14,15],7)
  if class_id in ('duelist','berserker','drengr'):
   profile['clips']['attack_offhand']=clip([5,12,13,14,15],9,2)
  profiles.append(profile)
# New promotions use actual human/bear drawings. Healing and buffs explicitly share
# the same casting motion; no invented transformation sequence is registered.
source='complete-shaman-forms.png';cols=6;rows=6
for model,class_id,equipments,state in [(0,'volva',['spell','healing'],'default'),(1,'hamrammr',['healing'],'default'),(2,'hamrammr',['claws'],'bear')]:
 start_row=model*2
 for equipment in equipments:
  clips={'idle':clip([0,5],2),'move':clip([0,1],6),'attack':clip([5,2,3,4,5],8,2),'counter':dict(reuse='attack'),'damage':clip([6,7],6),'evade':clip([8,9],7),'death':clip([10,11],4)}
  clips['idle']['loop']=clips['move']['loop']=True
  if state!='bear':
   clips['heal']=clip([0,2,3,4,5],7)
   if class_id=='volva':clips['buff']=dict(reuse='heal',note='Geste magique partagé ; aucun effet de statut supplémentaire dessiné dans cette planche.')
  if equipment=='healing':
   del clips['attack'];del clips['counter']
  profiles.append(dict(classId=class_id,gender='male' if state!='bear' else 'any',equipment=equipment,state=state,note='Promotion chamanique : silhouette dédiée. Variante féminine et transformation intermédiaire non produites.',clips=clips))
# These focused sheets were checked separately: one row per actor/state.
for source,cols,rows,models,animation in [
 ('complete-reload.png',4,4,[('crossbowman','male','crossbow','default'),('ranger','male','crossbow','default'),('pavise_crossbowman','male','crossbow','default'),('sans_crossbow','any','crossbow','default')],'reload'),
 ('complete-block.png',4,6,[('raider','female','axe-shield','default'),('raider','male','sword-shield','default'),('clan_healer','male','axe-shield','default'),('clan_healer','male','sword-shield','default'),('cavalry','any','sword-shield','default'),('sans_guard','any','sword-shield','default')],'block'),
 ('complete-transform.png',6,2,[('hamrammr','male','healing','default'),('hamrammr','any','claws','bear')],'transform'),
]:
 for start_row,(class_id,gender,equipment,state) in enumerate(models):
  profiles.append(dict(classId=class_id,gender=gender,equipment=equipment,state=state,note='Séquence spécifique : '+animation,clips={animation:clip(list(range(cols)),7)}))
# Supplemental dense atlases have wider gutters than their original six-row
# counterparts. Normalize to the union of every USED pose, keeping one stable
# scale per model, all weapons visible and the same foot baseline throughout.
layout_path=ASSETS/'atlas-layout.json'
layouts=json.loads(layout_path.read_text()) if layout_path.exists() else {}
for profile in profiles:
 by_source={}
 for c in profile['clips'].values():
  if 'source' not in c:continue
  by_source.setdefault(c['source'],set()).update((x['row'],x['column']) for x in c['cells'])
 for src,cells in by_source.items():
  if src not in layouts:continue
  rects=[r for r in layouts[src]['frames'] if (r['row'],r['column']) in cells]
  if not rects:continue
  width=max(2*max(r['anchorX']-r['x'],r['x']+r['width']-r['anchorX']) for r in rects)
  height=max(r['height'] for r in rects)/.96
  for c in profile['clips'].values():
   if c.get('source')!=src:continue
   c['frameSize']=dict(width=round(width+4,3),height=round(height+4,3))
   used={(x['row'],x['column']) for x in c['cells']}
   if any(r.get('sourceDefect') or r.get('ambiguous') for r in rects if (r['row'],r['column']) in used):
    c['status']='provisional'
    c['note']='Découpage à vérifier : contact avec un bord ou une silhouette/effet voisin. Ressource conservée sans retouche destructive.' 
(ASSETS/'zzzzzz-complete.sprite.json').write_text(json.dumps(dict(override=True,profiles=profiles),indent=2)+'\n')
print(f'{len(profiles)} profils complémentaires enregistrés')
