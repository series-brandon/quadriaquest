export const MINIMAP_RADII=[4,6,8,12,16,24];
export function minimapTileAt(x,y,rect,center,radius){
 if(x<rect.left||y<rect.top||x>=rect.left+rect.width||y>=rect.top+rect.height)return null;
 const cells=radius*2+1;return {x:center.x+Math.floor((x-rect.left)/rect.width*cells)-radius,z:center.z+Math.floor((y-rect.top)/rect.height*cells)-radius};
}
export function mountMinimapControls(canvas,{center,move,changed}){
 let zoom=2,start=null,pinched=false,lastDistance=0;const pointers=new Map();
 function scale(direction){const next=Math.max(0,Math.min(MINIMAP_RADII.length-1,zoom+direction));if(next!==zoom){zoom=next;changed();}}
 canvas.tabIndex=0;canvas.setAttribute('role','group');canvas.setAttribute('aria-label','Minimap. Click a tile to move. Scroll or pinch to zoom; plus and minus keys also zoom.');
 canvas.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();if(e.deltaY)scale(e.deltaY>0?1:-1);},{passive:false});
 canvas.addEventListener('keydown',e=>{if(['+','=','-'].includes(e.key)){e.preventDefault();e.stopPropagation();scale(e.key==='-'?1:-1);}});
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.stopPropagation();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1){start={x:e.clientX,y:e.clientY};pinched=false;}else{pinched=true;lastDistance=distance();}});
 function distance(){const [a,b]=[...pointers.values()];return b?Math.hypot(a.x-b.x,a.y-b.y):0;}
 canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size>1){const d=distance();if(lastDistance&&Math.abs(Math.log(d/lastDistance))>.18){scale(d>lastDistance?-1:1);lastDistance=d;}}});
 function end(e,cancelled=false){if(!pointers.has(e.pointerId))return;const tap=!cancelled&&!pinched&&pointers.size===1&&start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<8;pointers.delete(e.pointerId);if(tap){const r=canvas.getBoundingClientRect(),border=4,rect={left:r.left+border,top:r.top+border,width:r.width-border*2,height:r.height-border*2};const t=minimapTileAt(e.clientX,e.clientY,rect,center(),MINIMAP_RADII[zoom]);if(t)move(t);}if(!pointers.size)start=null;}
 canvas.addEventListener('pointerup',e=>end(e));canvas.addEventListener('pointercancel',e=>end(e,true));canvas.addEventListener('lostpointercapture',e=>end(e,true));
 return {get radius(){return MINIMAP_RADII[zoom];},reset(){zoom=2;pointers.clear();start=null;changed();}};
}
