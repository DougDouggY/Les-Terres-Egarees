"""Metadata only: never edits, crops or regenerates raster images."""
import json
from pathlib import Path
root=Path(__file__).resolve().parent.parent
plan=json.loads((root/'scripts/visual-plan.json').read_text())
profiles=[]
for sheet in plan:
 for index,unit in enumerate(sheet['units']):
  class_id,equipment,state,gender,*layout=unit
  row=index*2; special=layout[0] if layout else ''
  def clip(r,frames,fps=4,status='functional',note=None):
   value=dict(source='tactical/'+sheet['name']+'.png',columns=4,rows=sheet['rows'],row=r,frames=frames,fps=fps,recolor='magenta',status=status)
   if note:value['note']=note
   return value
  clips=dict(idle=clip(row,[0,1],2),move=clip(row,[2,3],6),attack=clip(row+1,[0,1],5),counter=dict(reuse='attack'),damage=clip(row+1,[2,0],3),death=clip(row+1,[2,3],3))
  clips['damage'].update(cells=[dict(row=row+1,column=2),dict(row=row,column=0)],loop=False,note='Recul puis retour à la pose de repos.')
  clips['death'].update(loop=False,note='Recul puis chute au sol, deux poses.')
  if special=='kneel-death':clips['death'].update(status='provisional',note='Pose finale agenouillée : chute au sol à compléter.')
  if class_id in ['cavalry','mounted_spearman']:clips['charge']=dict(reuse='move',status='provisional',note='Galop réutilisé ; transition de charge spécifique à compléter.')
  if special=='healer':
   clips['heal']=clips.pop('attack');clips.pop('counter')
  if special=='banner':
   clips.pop('damage');clips.pop('death');clips['banner']=clip(row+1,[2,3],3)
  if special=='fortify':
   clips.pop('damage');clips.pop('death');clips['fortify']=clip(row+1,[2,3],3)
  if special=='reload':
   clips.pop('move');clips['reload']=clip(row,[2,3],3)
  if special=='heavy':clips['move']=clip(row,[0,2],4,'provisional','Cycle de marche incomplet : poses de préparation, à retravailler.')
  profile=dict(classId=class_id,equipment=equipment,state=state,gender=gender,lot=sheet['lot'],clips=clips)
  if special=='recruit':profile['note']='Référence de recrue à valider : petit bouclier d’entraînement illustré ; aucun équipement de partie n’est modifié.'
  profiles.append(profile)
# Same-class special actions, shared between compatible weapon states.
def add_action(id,equipment,state,gender,name,row,source='lot4-actions',provisional=False,note=None):
 profile=next((p for p in profiles if (p['classId'],p['equipment'],p['state'],p['gender'])==(id,equipment,state,gender)),None)
 if profile is None: return
 value=dict(source='tactical/'+source+'.png',columns=4,rows=6,row=row,frames=[0,1,2,3],fps=4,recolor='magenta',status='provisional' if provisional else 'functional')
 if note:value['note']=note
 profile['clips'][name]=value
for id,eq,gender,name,row in [('sorcerer','spell','male','heal',0),('clan_healer','axe-shield','male','heal',1),('clan_healer','sword-shield','male','heal',1),('necromancer','spell','male','summon',2),('sans_necromancer','spell','any','summon',3),('archmage','spell','male','area',4),('archmage','spell','male','heal',5)]:add_action(id,eq,'default',gender,name,row)
for id,eq,gender,row in [('huscarl','axe-shield','male',0),('honor_guard','sword-shield','any',1),('guard_knight','sword-shield','any',2),('royal_guard','lance-shield','any',3),('huscarl','sword-shield','male',4)]:
 add_action(id,eq,'default',gender,'block',row,'lot4-defense',True,'Poses défensives présentes ; véritable levée du bouclier et impact à retravailler.')
 if id=='huscarl':
  p=next(p for p in profiles if p['classId']==id and p['equipment']==eq)
  p['clips']['intercept']=dict(reuse='block',status='provisional',note='Défense réutilisée ; transition d’interception à compléter.')
add_action('necromancer','spell','default','male','heal',5,'lot4-defense')
# Mages carry the same book/staff during healing: no second character generation.
import copy
for id in ['sorcerer','necromancer','archmage']:
 p=next(p for p in profiles if p['classId']==id and p['equipment']=='spell');q=copy.deepcopy(p);q['equipment']='healing';q['clips'].pop('attack',None);q['clips'].pop('counter',None);q['note']='Même ressource de classe, livre et bâton conservés pendant les soins.';profiles.append(q)
(root/'src/assets/tactical/zz-production.sprite.json').write_text(json.dumps(dict(override=True,profiles=profiles),indent=2)+'\n')
