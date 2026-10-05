export function validCampTile(tile,{occupied=false,reachable=true}={}){
 return !!tile&&!tile.blocked&&!tile.water&&tile.buildable!==false&&!occupied&&reachable;
}

