import {computed, Signal} from '../reactive.js';
import {bind, createScope, runInScope} from './scope.js';

// Element builders: `h` for HTML, `svg` for SVG. Views are built once; reactive props and
// children then update only the node they belong to. A prop or child is reactive when it is
// a signal or a function.
//
//   h('button', {class: 'q-action', 'aria-pressed': () => queued.value, on: {click: queue}}, label)
//
// Props:
//   on       {event: handler}           addEventListener
//   ref      (element) => void          receives the element once built
//   class    string                     replaces the class attribute
//   classes  {name: boolean}            toggles individual classes
//   style    {'property': value}        setProperty; use CSS names, including --custom-properties
//   hidden, disabled, inert, checked, selected, value   set as element properties
//   aria-*   booleans become "true"/"false"
//   others   attributes; false/null/undefined removes, true sets an empty attribute

const PROPERTIES = new Set(['hidden', 'disabled', 'inert', 'checked', 'selected', 'value']);
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export function isReactive(value) {
  return value instanceof Signal || typeof value === 'function';
}

// Functions become computeds so a binding writes only when its result changes,
// not every time one of its sources does (e.g. fractional regeneration every frame).
function reactive(value, write) {
  if (!isReactive(value)) {
    write(value);
    return;
  }
  const source = value instanceof Signal ? value : computed(value);
  bind(() => write(source.value));
}

function setAttribute(element, name, value) {
  if (PROPERTIES.has(name)) {
    element[name] = value ?? (name === 'value' ? '' : false);
  } else if (name.startsWith('aria-') && typeof value === 'boolean') {
    element.setAttribute(name, String(value));
  } else if (value === false || value == null) {
    element.removeAttribute(name);
  } else {
    element.setAttribute(name, value === true ? '' : String(value));
  }
}

function applyProp(element, name, value) {
  if (name === 'on') {
    for (const [type, handler] of Object.entries(value)) element.addEventListener(type, handler);
  } else if (name === 'ref') {
    value(element);
  } else if (name === 'class') {
    // An attribute (not className) so the same path works for SVG elements.
    reactive(value, next => element.setAttribute('class', next ?? ''));
  } else if (name === 'classes') {
    for (const [token, on] of Object.entries(value)) reactive(on, next => element.classList.toggle(token, !!next));
  } else if (name === 'style') {
    for (const [property, style] of Object.entries(value)) {
      reactive(style, next => element.style.setProperty(property, next == null ? '' : String(next)));
    }
  } else {
    reactive(value, next => setAttribute(element, name, next));
  }
}

export function append(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || typeof child === 'boolean') continue;
    if (typeof child === 'object' && 'nodeType' in child) {
      parent.append(child);
    } else if (isReactive(child)) {
      const text = document.createTextNode('');
      reactive(child, next => {
        text.data = next == null ? '' : String(next);
      });
      parent.append(text);
    } else {
      parent.append(String(child));
    }
  }
  return parent;
}

function assemble(element, props, children) {
  if (props) for (const [name, value] of Object.entries(props)) applyProp(element, name, value);
  return append(element, children);
}

export function h(tag, props = null, ...children) {
  return assemble(document.createElement(tag), props, children);
}

export function svg(tag, props = null, ...children) {
  return assemble(document.createElementNS(SVG_NAMESPACE, tag), props, children);
}

// Builds a view in its own scope. `dispose` stops its bindings and removes it.
export function mount(build) {
  const scope = createScope();
  const node = runInScope(scope, build);
  return {
    node,
    dispose() {
      scope.dispose();
      node.remove();
    },
  };
}
