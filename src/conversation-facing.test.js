import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {createConversationFacing} from './conversation-facing.js';
test('conversation facing uses the shortest turn and settles on the player',()=>{
 const npc=new Group(),player=new Group();npc.rotation.y=Math.PI-.1;player.position.set(-.1,0,-1);
 const facing=createConversationFacing(npc);facing.face(player);facing.update(.02);
 assert.ok(npc.rotation.y>Math.PI-.1);
 for(let i=0;i<120;i++)facing.update(1/60);
 assert.ok(Math.abs(npc.rotation.y-Math.atan2(-.1,-1))<.001);
 facing.reset();npc.rotation.y=0;facing.update(1);assert.equal(npc.rotation.y,0);
});
test('conversation facing works under a translated and rotated map parent',()=>{
 const map=new Group(),npc=new Group(),player=new Group();map.position.set(5,0,3);map.rotation.y=Math.PI/2;map.add(npc);player.position.set(6,0,3);
 const facing=createConversationFacing(npc);facing.face(player);for(let i=0;i<120;i++)facing.update(1/60);
 assert.ok(Math.abs(npc.rotation.y)<.001);
 player.position.copy(npc.getWorldPosition(player.position));facing.face(player);facing.update(1);assert.ok(Number.isFinite(npc.rotation.y));
});
