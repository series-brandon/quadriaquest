import * as THREE from 'three';

const COLORS = { valid: '#60f0a1', invalid: '#ff777b', outline: '#16332c', light: '#ffffff' };

function texture(draw, width = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  draw(ctx);
  const result = new THREE.CanvasTexture(canvas);
  result.colorSpace = THREE.SRGBColorSpace;
  return result;
}

function stroke(ctx, draw, color, width = 7) {
  ctx.lineCap = ctx.lineJoin = 'round';
  for (const [ink, size] of [[COLORS.light, width + 9], [COLORS.outline, width + 5], [color, width]]) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = size;
    ctx.beginPath();
    draw(ctx);
    ctx.stroke();
  }
}

function brackets(valid) {
  return texture(ctx => stroke(ctx, c => {
    for (const [x, y, dx, dy] of [[35,35,1,1],[221,35,-1,1],[221,221,-1,-1],[35,221,1,-1]]) {
      c.moveTo(x + dx * 43, y); c.lineTo(x,y); c.lineTo(x,y + dy * 43);
    }
  }, valid ? COLORS.valid : COLORS.invalid));
}

function badge(valid, label = '') {
  return texture(ctx => {
    ctx.fillStyle = COLORS.outline; ctx.strokeStyle = COLORS.light; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(42, 30, 172, label ? 166 : 145, 35); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(106, label ? 193 : 172); ctx.lineTo(128,225); ctx.lineTo(150,label ? 193 : 172); ctx.fill();
    stroke(ctx, c => {
      if(valid){c.moveTo(88,99);c.lineTo(115,126);c.lineTo(169,73);}
      else {c.moveTo(96,78);c.lineTo(160,130);c.moveTo(160,78);c.lineTo(96,130);}
    },valid ? COLORS.valid : COLORS.invalid,10);
    if(label){ctx.fillStyle=COLORS.light;ctx.textAlign='center';ctx.font='bold 28px sans-serif';ctx.fillText(label,128,169);}
  });
}

export function createFeedback(scene) {
  const validHover = brackets(true), invalidHover = brackets(false);
  const plane = map => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1,1), new THREE.MeshBasicMaterial({map, transparent:true, depthTest:true, depthWrite:false, toneMapped:false, side:THREE.DoubleSide}));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 10; scene.add(m); return m;
  };
  const sprite = map => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({map, transparent:true, depthTest:false, depthWrite:false, toneMapped:false}));
    s.renderOrder=12;scene.add(s);return s;
  };
  const hover = plane(validHover); hover.visible=false;
  const destination = new THREE.Group();scene.add(destination);destination.visible=false;
  const base = plane(validHover);destination.add(base);base.position.y=.025;
  function statusTexture(label, symbol) {
    return texture(ctx=>{
      ctx.fillStyle=COLORS.outline;ctx.strokeStyle=COLORS.light;ctx.lineWidth=4;
      ctx.beginPath();ctx.roundRect(16,24,224,208,30);ctx.fill();ctx.stroke();
      ctx.fillStyle=COLORS.light;ctx.font='600 34px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,128,77);
      if(symbol==='dots'){
        ctx.fillStyle='#b6bfbd';
        for(const x of [98,128,158]){ctx.beginPath();ctx.arc(x,160,7,0,Math.PI*2);ctx.fill();}
      }else if(symbol==='check'){
        stroke(ctx,c=>{c.moveTo(99,160);c.lineTo(121,181);c.lineTo(160,140);},COLORS.valid,8);
      }
    });
  }
  const pendingTexture=statusTexture('Going','dots');
  const workingTextures={Opening:statusTexture('Opening'),Traveling:statusTexture('Traveling'),Gathering:statusTexture('Gathering'),Crafting:statusTexture('Crafting'),Chopping:statusTexture('Chopping')};
  const arrivedTexture=statusTexture('Arrived!','check');
  const doneTexture=statusTexture('Done!','check');
  const spinnerTexture=texture(ctx=>{
    ctx.lineWidth=19;ctx.lineCap='round';ctx.strokeStyle='#315976';
    ctx.beginPath();ctx.arc(128,128,76,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='#65c5ff';ctx.beginPath();ctx.arc(128,128,76,-Math.PI/2,Math.PI*.8);ctx.stroke();
  });
  const pin = sprite(pendingTexture);destination.add(pin);pin.scale.setScalar(1.05);
  const spinner=sprite(spinnerTexture);destination.add(spinner);spinner.scale.setScalar(.32);spinner.renderOrder=13;spinner.visible=false;
  const screenUp=new THREE.Vector3();
  let state='hidden', completionAge=0;
  const pulses=[];
  const pulseTextures=[badge(false),badge(true)];
  const ringTextures=[false,true].map(valid=>texture(ctx=>stroke(ctx,c=>c.arc(128,128,94,0,Math.PI*2),valid?COLORS.valid:COLORS.invalid,8)));
  return {
    hover(t,valid) {
      hover.visible=!!t;
      if(t){hover.position.set(t.x-6,(t.water?.86:t.h)+.035,t.z-6);hover.material.map=valid?validHover:invalidHover;}
    },
    destination(t) {
      state='approaching';completionAge=0;
      destination.visible=true;destination.position.set(t.x-6,t.h,t.z-6);
      pin.material.map=pendingTexture;pin.material.opacity=1;base.material.opacity=1;spinner.visible=false;
    },
    interacting(label='Gathering'){
      if(state!=='approaching')return;
      state='interacting';pin.material.map=workingTextures[label]||workingTextures.Gathering;spinner.visible=true;
    },
    complete(){
      if(state!=='approaching'&&state!=='interacting')return;
      pin.material.map=state==='interacting'?doneTexture:arrivedTexture;
      state='complete';completionAge=0;spinner.visible=false;
    },
    clearDestination(){state='hidden';destination.visible=false;spinner.visible=false;},
    pulse(point,valid) {
      const wave=plane(ringTextures[Number(valid)]), icon=sprite(pulseTextures[Number(valid)]);
      wave.position.copy(point);wave.position.y+=.045;
      icon.position.copy(point);icon.position.y+=.55;icon.scale.setScalar(.65);
      pulses.push({wave,icon,age:0,baseY:icon.position.y});
    },
    update(dt,time,camera) {
      // Screen-space clearance keeps the badge above the one-block character,
      // including when the camera is tilted nearly overhead.
      screenUp.set(0,1,0).applyQuaternion(camera.quaternion);
      let lift=.8+Math.sin(time*4)*.035;
      if(state==='complete'){
        completionAge+=dt;
        const progress=Math.min(1,completionAge/.9);
        lift+=progress*.65;
        pin.material.opacity=1-progress*progress;base.material.opacity=1-progress;
        if(progress===1){state='hidden';destination.visible=false;}
      }
      pin.position.copy(screenUp).multiplyScalar(lift);pin.position.y+=1.05;
      spinner.position.copy(pin.position).addScaledVector(screenUp,-1.05*(160/256-.5));spinner.material.rotation=-time*5;
      base.scale.setScalar(1+Math.sin(time*3)*.035);
      for(let i=pulses.length-1;i>=0;i--){
        const p=pulses[i];p.age+=dt;const progress=Math.min(1,p.age/.75);
        p.wave.scale.setScalar(.45+progress*.95);
        p.wave.material.opacity=1-progress;
        p.icon.material.opacity=1-Math.pow(progress,3);
        p.icon.position.y=p.baseY+progress*.3;
        if(progress===1){scene.remove(p.wave,p.icon);p.wave.geometry.dispose();p.wave.material.dispose();p.icon.material.dispose();pulses.splice(i,1);}
      }
    }
  };
}
