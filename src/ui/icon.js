import {icon} from '../icons.js';

// Icons are trusted static SVG markup, so this is the one place UI code parses HTML.
const templates = new Map();

export function iconNode(name) {
  let template = templates.get(name);
  if (!template) {
    template = document.createElement('template');
    template.innerHTML = icon(name);
    templates.set(name, template);
  }
  return template.content.firstElementChild.cloneNode(true);
}
