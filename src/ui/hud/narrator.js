import {signal} from '../../reactive.js';
import {h, mount} from '../dom.js';

// The narrator's dialogue box ("???"): one owner for the box, its markup and its input. Tutorials
// and areas call `show` with a line and what happens next instead of writing to the box.
//
// show({
//   text,             the line (also the box's accessible name)
//   speaker,          name badge (default '???')
//   presentation,     'conversation' (default) or 'customize' (the opening's character creation)
//   input,            the line carries its own controls; clicks on the box don't advance
//   prompt,           show "Click / tap to continue" (default: when `next` is set and not `input`)
//   size,             'tall' for rich controls that need more room than one line
//   next,             called when the player advances (click or Enter/Space on the box); the
//                     caller decides what follows, including ignoring the advance
//   controls,         () => nodes, built in their own scope and disposed with the line
// })
// The box keeps the ids `dialogue`, `dialogue-line`, `dialogue-controls` and `dialogue-prompt`:
// layout rules shared with other HUD pieces, tests and perf scenarios address them.
export function createNarrator({parent = document.body} = {}) {
  const visible = signal(false);
  const line = signal({text: '', speaker: '???', presentation: 'conversation', input: false, prompt: false, size: null});
  let next = null, controlsView = null, controlsHost;

  const advance = () => { if (!line.peek().input) next?.(); };
  const view = mount(() => h('section', {
    id: 'dialogue',
    class: 'q-narrator',
    hidden: () => !visible.value,
    'aria-label': () => line.value.text || 'Dialogue',
    tabindex: () => (line.value.input ? '-1' : '0'),
    'data-presentation': () => line.value.presentation,
    'data-input': () => String(line.value.input),
    'data-size': () => line.value.size,
    on: {
      click: event => { if (!event.target.closest?.('button,input,label,select,textarea')) advance(); },
      keydown: event => {
        if (event.target !== view.node || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        advance();
      },
    },
  },
  h('div', {class: 'q-narrator__speaker'}, () => line.value.speaker),
  h('p', {id: 'dialogue-line', class: 'q-narrator__line', 'aria-live': 'polite'}, () => line.value.text),
  h('div', {id: 'dialogue-controls', class: 'q-narrator__controls', ref: element => { controlsHost = element; }}),
  h('span', {id: 'dialogue-prompt', class: 'q-narrator__prompt', hidden: () => !line.value.prompt}, 'Click / tap to continue ▸')));
  parent.append(view.node);

  const clearControls = () => {
    controlsView?.dispose();
    controlsView = null;
  };

  return {
    node: view.node,
    visible,
    show({text, speaker = '???', presentation = 'conversation', input = false, prompt, size = null, next: then = null, controls = null}) {
      clearControls();
      next = then;
      line.value = {text, speaker, presentation, input, size, prompt: prompt ?? (!!then && !input)};
      if (controls) {
        controlsView = mount(() => h('div', {class: 'q-narrator__controls-content'}, controls()));
        controlsHost.append(controlsView.node);
      }
      visible.value = true;
    },
    // Shows or hides "Click / tap to continue" for the current line (e.g. while a camera pans).
    setPrompt(on) { line.value = {...line.peek(), prompt: !!on}; },
    hide() {
      clearControls();
      next = null;
      visible.value = false;
    },
  };
}
