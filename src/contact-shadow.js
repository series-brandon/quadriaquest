import * as THREE from 'three';

// A soft local shadow fills the small gap left by the directional shadow bias.
// Tile-sized receivers keep it on the terrain instead of across ledges or voids.
export function createContactShadow(scene, world) {
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { center: { value: new THREE.Vector3() }, radius: { value: new THREE.Vector2(.45,.45) } },
    vertexShader: `varying vec3 worldPoint;
      void main(){vec4 p=modelMatrix*vec4(position,1.0);worldPoint=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader: `varying vec3 worldPoint; uniform vec3 center; uniform vec2 radius;
      void main(){
        float height=max(0.0,center.y-worldPoint.y);
        if(worldPoint.y>center.y+0.04)discard;
        vec2 delta=(worldPoint.xz-center.xz)/(radius+height*0.15);
        float distanceFromCenter=length(delta);
        float softEdge=1.0-smoothstep(0.15,1.0,distanceFromCenter);
        float opacity=softEdge*0.31*exp(-height*3.0);
        if(opacity<0.002)discard;
        gl_FragColor=vec4(0.12,0.16,0.10,opacity);
      }`
  });
  const geometry=new THREE.PlaneGeometry(1,1);
  const receivers=Array.from({length:9},()=>{
    const plane=new THREE.Mesh(geometry,material);plane.rotation.x=-Math.PI/2;
    plane.renderOrder=1;scene.add(plane);return plane;
  });
  return {
    update(position,scale){
      material.uniforms.center.value.copy(position);
      material.uniforms.radius.value.set(.44*scale.x,.44*scale.z);
      const x=Math.round(position.x+6),z=Math.round(position.z+6);
      let i=0;
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
        const tile=world.get(`${x+dx},${z+dz}`),plane=receivers[i++];
        plane.visible=!!tile&&!tile.water;
        if(plane.visible)plane.position.set(tile.x-6,tile.h+.007,tile.z-6);
      }
    }
  };
}
