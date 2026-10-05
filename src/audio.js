// Original, lightweight procedural sketches. No audio downloads or external services.
export function createGameAudio(){
 let previewMode=null;let context,buses={},mode='clearing',note=0,nextMusic=0,nextAmbient=0;
 const settings={music:.22,effects:.45,ambience:.25,muted:false};
 try{Object.assign(settings,JSON.parse(localStorage.getItem('quadriaquest-audio')??localStorage.getItem('quadra-audio')??'{}'));}catch{}
 for(const key of ['music','effects','ambience'])settings[key]=Math.max(0,Math.min(1,Number(settings[key])||0));
 let scheduledMusic=null;
 function volume(){scheduledMusic=null;if(!context)return;for(const [key,bus]of Object.entries(buses))bus.gain.setTargetAtTime(settings.muted?0:Math.max(0,Math.min(1,Number(settings[key])||0)),context.currentTime,.1);}
 function unlock(){if(!(window.AudioContext||window.webkitAudioContext))return;if(!context){context=new (window.AudioContext||window.webkitAudioContext)();for(const key of ['music','effects','ambience']){const bus=context.createGain();bus.connect(context.destination);buses[key]=bus;}volume();}if(context.state==='suspended')context.resume().catch(()=>{});}
 function tone(freq,duration=.2,bus='effects',level=.12,type='sine',delay=0,end=freq){if(!context||context.state!=='running')return;const start=context.currentTime+delay,osc=context.createOscillator(),gain=context.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,start);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),start+duration);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(level,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);osc.connect(gain).connect(buses[bus]);osc.start(start);osc.stop(start+duration+.02);}
 function noise(duration,freq,level,bus='effects'){if(!context||context.state!=='running')return;const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1);const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=buffer;filter.type='bandpass';filter.frequency.value=freq;filter.Q.value=.5;gain.gain.setValueAtTime(.0001,context.currentTime);gain.gain.linearRampToValueAtTime(level,context.currentTime+Math.min(.06,duration/4));gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+duration);source.connect(filter).connect(gain).connect(buses[bus]);source.start();source.stop(context.currentTime+duration);}
 function play(kind){const v=.9+Math.random()*.2;
  if(kind==='pickup'){noise(.16,900,.16);tone(700*v,.12,'effects',.05);}
  if(kind==='craft'){noise(.12,1800,.14);tone(330*v,.13,'effects',.08,'triangle');}
  if(kind==='complete'){[440,550,660].forEach((n,i)=>tone(n,.35,'effects',.08,'sine',i*.09));}
  if(kind==='chop'){noise(.13,450,.3);tone(135*v,.13,'effects',.16,'triangle',0,70);}
  if(kind==='mine'){noise(.13,2600,.22);tone(1100*v,.15,'effects',.07,'triangle',0,700);}
  if(kind==='fall'){noise(.8,330,.28);tone(90,.45,'effects',.12,'triangle',0,35);}
  if(kind==='level'){[440,550,660,880].forEach((n,i)=>tone(n,.65,'effects',.1,'sine',i*.14));}
  if(kind==='portal'){tone(220,1.2,'effects',.12,'sine',0,880);tone(330,1.3,'effects',.06,'sine',.15,660);}
  if(kind==='blocked')tone(180,.15,'effects',.08,'triangle',0,100);
  if(kind==='ui')tone(620,.065,'effects',.025);
  if(kind==='wind')noise(4,550,.09,'ambience');
  if(kind==='bird'){for(let i=0;i<3;i++)tone(1400+Math.random()*500,.17,'ambience',.04,'sine',i*.22,2400);}
  if(kind==='insect'){for(let i=0;i<5;i++)tone(3600,.04,'ambience',.012,'sine',i*.12);}
 }

 function update(dt,nextMode,dialogue){mode=previewMode||nextMode||mode;if(!context||context.state!=='running'||document.hidden)return;
  // Schedule only when the target changes; a new automation event every frame grows the audio-thread timeline.
  const musicTarget=settings.muted?0:settings.music*(dialogue?.45:1);if(musicTarget!==scheduledMusic){scheduledMusic=musicTarget;buses.music.gain.setTargetAtTime(musicTarget,context.currentTime,.3);}
  nextMusic-=dt;nextAmbient-=dt;
  if(nextMusic<=0){const melody=[0,7,12,9,7,4,2,7,0,4,9,7];const n=melody[note%melody.length],freq=220*2**(n/12);tone(freq,mode==='intro'?2.8:2,'music',.1,'sine');if(note%4===0)tone(110,3,'music',.065,'triangle');note++;nextMusic=note%12===0?10:mode==='splash'?2.5:mode==='intro'?3.5:1.8;}
  if(nextAmbient<=0){play(['wind','bird','insect'][Math.floor(Math.random()*3)]);nextAmbient=5+Math.random()*8;}
 }
 function set(key,value){settings[key]=key==='muted'?!!value:Math.max(0,Math.min(1,Number(value)||0));volume();try{localStorage.setItem('quadriaquest-audio',JSON.stringify(settings));}catch{}}
 document.addEventListener('visibilitychange',()=>{if(context){if(document.hidden)context.suspend();else context.resume().catch(()=>{});}});
 document.addEventListener('pointerdown',unlock,{once:true});document.addEventListener('keydown',unlock,{once:true});
 document.addEventListener('click',e=>{if(e.target.closest('button'))play('ui');});
 return {play,update,unlock,set,settings,preview(value){previewMode=value;note=0;nextMusic=0;},reset(){for(const [key,value]of Object.entries({music:.22,effects:.45,ambience:.25,muted:false}))set(key,value);previewMode=null;note=0;nextMusic=0;nextAmbient=0;},get ready(){return context?.state==='running';}};
}
export function mountAudioControls(audio){
 const host=document.createElement('dialog');host.id='game-settings';host.setAttribute('aria-labelledby','settings-title');
 host.innerHTML='<div class="settings-heading"><h2 id="settings-title">Settings</h2><button id="close-settings" aria-label="Close settings">×</button></div>';document.body.append(host);
 const content=document.createElement('div');content.className='settings-content';
 content.innerHTML='<h3>Sound</h3>'+['music','effects','ambience'].map(key=>`<label>${key[0].toUpperCase()+key.slice(1)}<input type="range" min="0" max="1" step="0.05" value="${audio.settings[key]}" data-audio="${key}" aria-label="${key} volume"></label>`).join('')+`<label class="mute-setting"><input type="checkbox" id="audio-muted" ${audio.settings.muted?'checked':''}> Mute all</label>`;host.append(content);
 content.querySelectorAll('[data-audio]').forEach(input=>input.oninput=()=>{audio.unlock();audio.set(input.dataset.audio,Number(input.value));});content.querySelector('#audio-muted').onchange=e=>audio.set('muted',e.target.checked);
 host.querySelector('#close-settings').onclick=()=>host.close();
 function refresh(){for(const input of content.querySelectorAll('[data-audio]'))input.value=audio.settings[input.dataset.audio];content.querySelector('#audio-muted').checked=audio.settings.muted;}
 return {open(){host.append(content);refresh();host.showModal();},mount(panel){host.close();panel.append(content);refresh();},close(){host.close();}};
}
