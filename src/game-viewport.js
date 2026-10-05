// The game container is fixed-position. Refresh its bounds on resize, not per frame.
let bounds;
export function measureGameViewport(){
 if(typeof document==='undefined')return {left:0,top:0,width:1,height:1};
 bounds=document.getElementById('game').getBoundingClientRect();return bounds;
}
export function gameViewport(){return bounds||measureGameViewport();}
