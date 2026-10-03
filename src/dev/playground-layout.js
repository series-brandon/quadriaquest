// Reorganize existing controls without duplicating their gameplay handlers.
export function organizePlayground(panel){
 const commands=new Map(),fieldsets=new Map([...panel.querySelectorAll(':scope > fieldset')].map(f=>[f.querySelector('legend').textContent,f]));
 function section(name,names,open=false){const details=document.createElement('details');details.className='dev-section';details.open=open;const summary=document.createElement('summary');summary.textContent=name;details.append(summary);for(const name of names)details.append(fieldsets.get(name));panel.insertBefore(details,panel.querySelector('#dev-status'));return details;}
 const previews=section('Models & animation',['Animation preview'],true);
 for(const button of [...panel.querySelectorAll(':scope > button')])previews.append(button);
 section('Inventory & skills',['Inventory','Skills']);
 const tutorials=section('Tutorials & objectives',['Tips & objectives','Gathering tutorial prompt','Mining','Tutorial finale']);
 const willow=section('Willowbank',['Willowbank chapter']);
 section('World & water',['Terrain colors','Water animation','Resource picking','Reset']);
 const ui=section('Interface & audio',['UI & audio polish']);
 const feedback=section('Visual feedback',['Visual feedback only']);
 const state=section('Session state',[]);state.append(panel.querySelector('#dev-state'));
 function dropdown(container,selector,label,key){
  const buttons=[...container.querySelectorAll(selector)],form=document.createElement('form'),caption=document.createElement('label'),select=document.createElement('select'),run=document.createElement('button');
  form.className='dev-command';select.id='dev-command-'+key;caption.textContent=label;caption.append(select);run.textContent='Run';run.type='submit';run.dataset.command=key;run.setAttribute('aria-label','Run '+label.toLowerCase());
  const actions=[];buttons.forEach((button,i)=>{actions.push({...button.dataset});const option=document.createElement('option');option.value=String(i);option.textContent=button.textContent;select.append(option);button.remove();});
  form.append(caption,run);form.onsubmit=e=>e.preventDefault();container.append(form);commands.set(key,{select,actions});
 }
 dropdown(tutorials,'button','Tutorial or objective','tutorial');
 dropdown(willow,'button:not([data-willow="enter"]):not([data-willow="reset"]):not([data-willow="stage"]):not([data-willow="preview"])','Chapter action','willow');
 dropdown(ui,'[data-sound]','Sound effect','sound');
 dropdown(feedback,'[data-juice]','Feedback effect','feedback');
 // Remove empty groups left behind when their actions move into a selector.
 for(const fieldset of tutorials.querySelectorAll('fieldset'))fieldset.remove();
 return commands;
}
