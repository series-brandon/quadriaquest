import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {computed, signal} from '../reactive.js';
import {h} from '../ui/dom.js';
import {keyedList} from '../ui/list.js';
import {onCleanup} from '../ui/scope.js';
import {MODEL_CATALOG} from './model-catalog.js';
import {HAND_ITEMS, HANDEDNESS, ATTACK_MOTIONS, BLOCK_MOTIONS, ATTACK_HANDS, previewAttackHands, previewDamageTypes} from './preview-loadout.js';
import './model-viewer.css';

const STATIC_MOTIONS = ['Static', 'Closed', 'Open', 'Broken', 'Repaired'];
const PROPS = ['Generic item', 'Raw Pondfish', 'Top Hat'];
const MODELS = [...MODEL_CATALOG].sort((a, b) => a.name.localeCompare(b.name));
const title = s => s[0].toUpperCase() + s.slice(1);

// Development model viewer on the modal host: every shared 3D model with the motions it supports,
// played through its production animation functions. Lives only in the playground build.
//   createModelViewer(modals).show()
export function createModelViewer(modals) {
  return {
    show() {
      if (modals.isOpen('dev-model-viewer')) return;
      modals.open({id: 'dev-model-viewer', title: 'Model viewer', size: 'large', flush: true, build: () => modelViewer()});
    },
  };
}

function modelViewer() {
  // Choices. Loadout fields use '' for "none / default", as the preview loadout expects.
  const model = signal('Slime'), motion = signal('Idle'), expression = signal('default'), prop = signal(PROPS[0]), paused = signal(false);
  const loadout = {rightHand: signal(''), leftHand: signal(''), handedness: signal('right'), style: signal('weapon'), attackMotion: signal(''), blockMotion: signal(''), attackHands: signal(''), rightDamageType: signal(''), leftDamageType: signal('')};
  const settings = () => Object.fromEntries(Object.entries(loadout).map(([key, value]) => [key, value.peek()]));

  const entry = computed(() => MODEL_CATALOG.find(item => item.name === model.value));
  const motions = computed(() => {
    const list = entry.value.motions, first = list.includes('Idle') ? 'Idle' : list.includes('Static') ? 'Static' : list[0];
    return [first, ...list.filter(m => m !== first).sort((a, b) => a.localeCompare(b))];
  });
  const expressions = computed(() => [['default', entry.value.expressions ? 'Default' : 'Not applicable'], ...[...(entry.value.expressions || [])].sort((a, b) => a.localeCompare(b)).map(e => [e, e])]);
  const slime = computed(() => !!entry.value.loadout);
  // The loadout rules build a real equipment instance (which writes its own signals), so they run
  // when the loadout changes and publish their results, never inside a computation.
  const damage = signal({right: null, left: null}), note = signal('');
  function readLoadout() {
    damage.value = previewDamageTypes(settings());
    const hands = previewAttackHands(settings()), requested = loadout.attackHands.peek();
    const requestedLabel = ATTACK_HANDS.find(([id]) => id === requested)?.[1];
    const fallback = requested && requested !== hands.resolved ? ` (${requestedLabel} isn't available with this loadout)` : '';
    note.value = `Attacks: ${loadout.style.peek() === 'magic' ? 'spell (no hand)' : hands.label + fallback}. ${[loadout.rightHand.peek(), loadout.leftHand.peek()].includes('bows') ? 'Bow uses both hands. ' : ''}Casting keeps equipment visible; skilling tools temporarily replace it.`;
  }
  const animated = computed(() => !STATIC_MOTIONS.includes(motion.value));

  // Three.js stage, owned by this view: disposed when the dialog closes.
  let canvas, stage;
  const renderer = new THREE.WebGLRenderer({canvas: canvas = h('canvas', {'aria-label': 'Model preview: drag to rotate, scroll or pinch to zoom'}), alpha: true, antialias: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fffce8', '#879981', 2.6));
  const sun = new THREE.DirectionalLight('#fff3d3', 3);
  sun.position.set(-8, 19, 5);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100), controls = new OrbitControls(camera, canvas);
  Object.assign(controls, {enablePan: false, rotateSpeed: 0.7, minPolarAngle: 0.05, maxPolarAngle: Math.PI - 0.05});
  let instance = null, age = 0, last = 0, frame = 0, radius = 1;
  const center = new THREE.Vector3();
  const update = (time = age, dt = 0) => instance?.update?.(time, motion.peek(), dt, expression.peek(), prop.peek(), settings());

  function disposeModel() {
    if (!instance) return;
    scene.remove(instance.group);
    const geometries = new Set(), materials = new Set();
    instance.group.traverse(o => {
      if (o.geometry) geometries.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) materials.add(m);
    });
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    instance = null;
  }
  function fit(reset = false) {
    const direction = reset ? new THREE.Vector3(0.45, 0.3, 1).normalize() : camera.position.clone().sub(controls.target).normalize();
    const half = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(1, camera.aspect)), distance = radius / Math.sin(half) * 1.15;
    controls.target.copy(center);
    camera.position.copy(center).addScaledVector(direction, distance);
    Object.assign(controls, {minDistance: radius * 0.8, maxDistance: radius * 12});
    camera.near = Math.max(0.001, radius / 100);
    camera.far = radius * 40;
    camera.updateProjectionMatrix();
    controls.update();
  }
  // Bounds over the motion's extremes, so celebrations and corgi poses stay in frame.
  function measure() {
    const bounds = new THREE.Box3().makeEmpty();
    const include = () => {
      instance.group.updateMatrixWorld(true);
      instance.group.traverseVisible(o => { if (!o.geometry) return; o.geometry.computeBoundingBox(); bounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); });
    };
    include();
    const samples = motion.peek() === 'Celebration' ? [1.2] : model.peek() === 'Corgi' && motion.peek() === 'Sleeping' ? [2, 3, 4, 5.8] : model.peek() === 'Corgi' && motion.peek() === 'Petting' ? [0.5, 1.2, 1.85, 2.3] : [];
    for (const time of samples) { update(time); include(); }
    if (samples.length) update();
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    center.copy(sphere.center);
    radius = Math.max(0.2, sphere.radius);
  }
  function load() {
    disposeModel();
    motion.value = motions.peek()[0];
    expression.value = 'default';
    instance = entry.peek().create(renderer);
    update(0);
    scene.add(instance.group);
    measure();
    age = 0;
    paused.value = false;
    fit(true);
  }
  function resize() {
    const {width, height} = stage.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    fit();
  }
  function draw(now) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (!paused.peek()) { age += dt; update(age, dt); }
    controls.update();
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  }
  const changeLoadout = () => {
    // A two-handed item frees the other hand.
    if (loadout.rightHand.peek() === 'bows') loadout.leftHand.value = '';
    if (loadout.leftHand.peek() === 'bows') loadout.rightHand.value = '';
    readLoadout();
    const choices = damage.peek();
    loadout.rightDamageType.value = choices.right?.selected || '';
    loadout.leftDamageType.value = choices.left?.selected || '';
    update(); measure(); fit();
  };

  const field = ({label, options, value, onChange = next => { value.value = next; }, hidden = null, disabled = null}) => h('label', {class: 'q-viewer__field', hidden},
    label,
    keyedList(h('select', {class: 'q-select', disabled, on: {change: event => onChange(event.target.value)}}), options, ([id]) => id,
      option => h('option', {value: option.peek()[0], selected: () => value.value === option.peek()[0]}, option.peek()[1])));
  const loadoutField = (label, key, options, extra = {}) => field({label, options, value: loadout[key], onChange: next => { loadout[key].value = next; changeLoadout(); }, ...extra});

  readLoadout();
  stage = h('div', {class: 'q-viewer__stage'}, canvas);
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  load();
  frame = requestAnimationFrame(now => { last = now; resize(); draw(now); });
  onCleanup(() => { cancelAnimationFrame(frame); observer.disconnect(); disposeModel(); controls.dispose(); renderer.dispose(); });

  return h('div', {class: 'q-viewer'},
    h('div', {class: 'q-viewer__controls'},
      field({label: 'Model', options: computed(() => MODELS.map(item => [item.name, item.name])), value: model, onChange: next => { model.value = next; load(); }}),
      field({label: 'Animation', options: computed(() => motions.value.map(m => [m, m])), value: motion, disabled: () => motions.value.length === 1,
        onChange: next => { motion.value = next; age = 0; update(0); measure(); fit(); }}),
      field({label: 'Expression', options: expressions, value: expression, disabled: () => !entry.value.expressions, onChange: next => { expression.value = next; update(); }}),
      field({label: 'Held item', options: computed(() => PROPS.map(p => [p, p])), value: prop, hidden: () => motion.value !== 'Celebration', onChange: next => { prop.value = next; update(); measure(); fit(); }}),
      loadoutField('Combat style', 'style', computed(() => [['weapon', 'Weapon'], ['magic', 'Magic']]), {hidden: () => !slime.value || motion.value !== 'Attack'}),
      loadoutField('Attack motion', 'attackMotion', computed(() => ATTACK_MOTIONS), {hidden: () => !slime.value || motion.value !== 'Attack'}),
      loadoutField('Block motion', 'blockMotion', computed(() => BLOCK_MOTIONS), {hidden: () => !slime.value || motion.value !== 'Block'}),
      h('div', {class: 'q-viewer__playback'},
        h('button', {type: 'button', class: 'q-button q-button--quiet', disabled: () => !animated.value, 'aria-pressed': paused, on: {click: () => { paused.value = !paused.peek(); }}}, () => (paused.value ? 'Play' : 'Pause')),
        h('button', {type: 'button', class: 'q-button q-button--quiet', on: {click: () => { age = 0; update(0); }}}, 'Restart'),
        h('button', {type: 'button', class: 'q-button q-button--quiet', on: {click: () => fit(true)}}, 'Reset view')),
      h('div', {class: 'q-viewer__loadout', hidden: () => !slime.value},
        loadoutField('Right hand', 'rightHand', computed(() => HAND_ITEMS)),
        loadoutField('Right hand damage', 'rightDamageType', computed(() => (damage.value.right?.types || []).map(t => [t, title(t)])), {hidden: () => !damage.value.right}),
        loadoutField('Left hand', 'leftHand', computed(() => HAND_ITEMS)),
        loadoutField('Left hand damage', 'leftDamageType', computed(() => (damage.value.left?.types || []).map(t => [t, title(t)])), {hidden: () => !damage.value.left}),
        loadoutField('Dominant hand', 'handedness', computed(() => HANDEDNESS)),
        loadoutField('Attack hands', 'attackHands', computed(() => ATTACK_HANDS)),
        h('button', {type: 'button', class: 'q-button q-button--quiet', on: {click: () => { for (const [key, value] of Object.entries(loadout)) value.value = key === 'style' ? 'weapon' : key === 'handedness' ? 'right' : ''; changeLoadout(); }}}, 'Reset loadout'),
        h('p', {class: 'q-page__help'}, note))),
    stage,
    h('p', {class: 'q-viewer__hint'}, 'Drag to rotate · scroll or pinch to zoom. Uses the same models and animation functions as the game.'));
}
