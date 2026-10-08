import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from './ui/test-dom.js';
import * as THREE from 'three';
import {showSkillReward,clearSkillRewards} from './skills.js';

installDom();

test('XP awards close together share one notice; another skill stacks beside it',()=>{
 clearSkillRewards();
 const at=new THREE.Vector3(),notices=()=>[...document.querySelectorAll('.floating-xp')].map(n=>n.textContent);
 showSkillReward({skillName:'Melee Power',xp:12},at);
 showSkillReward({skillName:'Melee Power',xp:12},at);
 assert.deepEqual(notices(),['+24 Melee Power Exp.!'],'a one-two adds up in one notice');
 showSkillReward({skillName:'Dual Wield',xp:5},at);
 assert.deepEqual(notices(),['+24 Melee Power Exp.!','+5 Dual Wield Exp.!'],'a different skill gets its own notice');
 clearSkillRewards();assert.deepEqual(notices(),[]);
});
