import test from 'node:test';
import assert from 'node:assert/strict';
import {BY_ROOM,BY_FUNCTION,ALL_PROPS,unknownKinds} from './prop-catalogue.js';

test('every prop is in the catalogue by room and by function, and every listed kind exists',()=>{
 assert.deepEqual(unknownKinds(),[]);
 const rooms=new Set(Object.values(BY_ROOM).flat()),uses=new Set(Object.values(BY_FUNCTION).flat());
 assert.deepEqual(ALL_PROPS.filter(k=>!rooms.has(k)),[],'without a room');
 assert.deepEqual(ALL_PROPS.filter(k=>!uses.has(k)),[],'without a function');
});
test('every prop has a catalogue description',async()=>{
 const {undescribed,DESCRIPTIONS}=await import('./prop-catalogue.js');
 assert.deepEqual(undescribed(),[]);for(const d of Object.values(DESCRIPTIONS))assert.ok(d.length>10&&d.length<160,d);
});
