// Group controls while preserving the real gameplay handlers on each button.
export function organizePlayground(panel){
 const commands=new Map(),fieldsets=new Map([...panel.querySelectorAll(':scope > fieldset')].map(f=>[f.querySelector('legend').textContent,f]));
 function section(name,names,open=false){const details=document.createElement('details');details.className='dev-section';details.open=open;const summary=document.createElement('summary');summary.textContent=name;details.append(summary);for(const name of names)details.append(fieldsets.get(name));panel.insertBefore(details,panel.querySelector('#dev-status'));return details;}
 const previews=section('Models & animation',['Animation preview'],true);
 for(const button of [...panel.querySelectorAll(':scope > button')])previews.append(button);
 previews.querySelector('summary').after(previews.querySelector('[data-dev="models"]'));
 section('Inventory & skills',['Inventory','Skills','Player health']);
 const tutorials=section('Tutorials & objectives',['Tutorial checkpoints','Objective feedback','Reset']);
 section('Companions',['Companions']);
 section('Combat',['Combat practice','Training systems']);
 section('World & water',['Travel practice','Terrain colors','Water animation','Resource picking','Fishing practice','Carpentry practice']);
 const ui=section('Interface & audio',['UI & audio polish']);
 const feedback=section('Visual feedback',['Visual feedback only']);
 section('Session state',[]).append(panel.querySelector('#dev-state'));
 function dropdown(container,selector,label,key){
  const buttons=[...container.querySelectorAll(selector)],form=document.createElement('form'),caption=document.createElement('label'),select=document.createElement('select'),run=document.createElement('button');
  form.className='dev-command';select.id='dev-command-'+key;caption.textContent=label;caption.append(select);run.textContent='Run';run.type='submit';run.dataset.command=key;run.setAttribute('aria-label','Run '+label.toLowerCase());
  const actions=[];buttons.forEach((button,i)=>{actions.push({...button.dataset});const option=document.createElement('option');option.value=String(i);option.textContent=button.textContent;select.append(option);button.remove();});
  form.append(caption,run);form.onsubmit=e=>e.preventDefault();container.append(form);commands.set(key,{select,actions});
 }
 dropdown(tutorials,'[data-reset]','Reset clearing objects','reset');
 dropdown(tutorials,'[data-objective]','Objective feedback','objective');
 dropdown(ui,'[data-sound]','Sound effect','sound');
 dropdown(feedback,'[data-juice]','Feedback effect','feedback');
 // Label above the selector, action alongside it—same layout for every paired control.
 for(const [id,selector] of [['dev-travel','[data-dev="travel"]'],['dev-checkpoint','[data-dev="checkpoint"]'],['dev-interface','[data-dev="interface"]'],['dev-health','[data-dev="health"]'],['dev-combat','[data-dev="combat"]'],['dev-companion-action','[data-companion="action"]'],['dev-companion-animation','[data-companion="preview"]']]){
  const label=panel.querySelector('#'+id).closest('label'),button=panel.querySelector(selector),row=document.createElement('div');row.className='dev-command';label.before(row);row.append(label,button);
 }
 for(const fieldset of panel.querySelectorAll('fieldset'))if(!fieldset.querySelector('button,input,select,details,p'))fieldset.remove();
 return commands;
}
