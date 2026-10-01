import './theme-comparison.css';

const themes=[
 {id:'twilight',name:'Twilight Storybook',note:'Quiet magic · plum, ivory & peach',font:'Georgia + humanist sans',title:'A little magic, a long way from home.'},
 {id:'pocket',name:'Pocket Adventure',note:'Friendly & practical · navy, parchment & coral',font:'Rounded, sturdy sans-serif',title:'Big adventures start small.'},
 {id:'clay',name:'Clay & Linen',note:'Soft & tactile · charcoal, linen & terracotta',font:'Open humanist sans-serif',title:'Take your time. Find your way.'},
 {id:'moonlit',name:'Moonlit Arcade',note:'Playful after dark · midnight, lavender & yellow',font:'Chunky rounded title + clean sans',title:'Small slime. Endless possibilities.'}
];
export function mountThemeComparison(api){
 const board=document.createElement('section');board.id='theme-comparison';board.hidden=true;board.setAttribute('aria-label','UI style comparison');
 board.innerHTML=`<header><div><span>QUADRA QUEST / STYLE STUDY</span><h1>Four ways to feel at home.</h1><p>Same content, different palette, lettering, and shapes. These are session-only previews.</p></div><button data-close>Close comparison</button></header><div class="theme-grid">${themes.map(t=>`<article data-theme="${t.id}"><div class="theme-caption"><strong>${t.name}</strong><small>${t.note}</small></div><div class="theme-title"><span class="theme-kicker">A LITTLE SLIME. A BIG ADVENTURE.</span><h2>Quadra <span>Quest</span></h2><p>${t.title}</p><button data-live="${t.id}">Preview on splash →</button></div><div class="theme-dialogue"><span class="theme-kicker">???</span><p>Welcome to the world of Quadra!</p><small>Every adventure starts with something small.</small><button>Click to continue →</button></div><div class="theme-gather"><div><strong>Pick up some items</strong><span>2 / 6 collected</span></div><p>Finish collecting the items off the ground.</p><div class="theme-progress"><i></i></div></div><footer>${t.font}</footer></article>`).join('')}</div>`;
 document.body.append(board);
 const bar=document.createElement('nav');bar.id='theme-preview-bar';bar.hidden=true;bar.setAttribute('aria-label','Theme preview controls');
 bar.innerHTML=`<button data-back>← Compare all</button><select aria-label="Splash theme">${themes.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}<option value="original">Current default (Twilight)</option></select><button data-reset>Finish preview</button>`;
 // Inside the splash so its modal focus handling keeps these controls usable.
 let oldFocus=null;
 const show=()=>{oldFocus=document.activeElement;board.hidden=false;board.querySelector('[data-close]').focus();};
 const clear=()=>{delete document.body.dataset.uiTheme;bar.hidden=true;};
 board.querySelector('[data-close]').onclick=()=>{board.hidden=true;oldFocus?.focus();};
 board.addEventListener('click',e=>{
  const id=e.target.closest('[data-live]')?.dataset.live;if(!id)return;
  board.hidden=true;document.body.dataset.uiTheme=id;api.showSplash();document.getElementById('splash').append(bar);bar.inert=false;bar.hidden=false;bar.querySelector('select').value=id;
 });
 bar.querySelector('select').onchange=e=>{if(e.target.value==='original')delete document.body.dataset.uiTheme;else document.body.dataset.uiTheme=e.target.value;};
 bar.querySelector('[data-back]').onclick=()=>{document.getElementById('splash').querySelector('.splash-start button').click();clear();show();};
 bar.querySelector('[data-reset]').onclick=()=>{document.getElementById('splash').querySelector('.splash-start button').click();clear();};
 document.addEventListener('click',e=>{if(e.target.matches('.splash-start button'))clear();});
 board.addEventListener('keydown',e=>{if(e.key==='Escape')board.querySelector('[data-close]').click();});
 return show;
}
