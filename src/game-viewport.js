export function gameViewport(){
 if(typeof document==='undefined')return {left:0,top:0,width:1,height:1};
 return document.getElementById('game').getBoundingClientRect();
}
