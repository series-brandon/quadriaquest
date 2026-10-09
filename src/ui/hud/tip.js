import {computed, signal} from '../../reactive.js';
import {h, mount} from '../dom.js';
import {keyedList} from '../list.js';

const EMPTY = {title: '', text: '', emphasis: [], count: '', progress: null, complete: false, action: null, help: null};

// The tutorial tip: a titled card with guidance text, an optional count and progress bar, a
// Continue/Dismiss action and an optional "Show me how". One owner for the box; lessons describe
// what to show and which of their callbacks the buttons run.
//
// show({title, text, emphasis, count, progress, complete, action, help}) replaces the tip:
//   emphasis   item names to highlight in the text (e.g. ['Sticks', 'Crude Axe'])
//   count      a short counter ("3 / 6 collected")
//   progress   0–1 shows the progress bar; null hides it
//   complete   the success styling
//   action     {label, disabled?, onPress} for the Continue button, or null for none
//   help       {label?, onPress} for "Show me how", or null
// update(patch) and updateAction(patch) change parts of the current tip; hide() closes it.
// setSkip({label, onPress} | null): the tutorial's "Skip this part" link. It belongs to the tutorial
// chapter, not to one tip, so replacing the tip keeps it.
// The ids (`gather-tutorial`, `tutorial-title`, `tutorial-copy`, `tutorial-count`,
// `tutorial-progress`, `tutorial-continue`, `tutorial-help`) stay for tests and the journal lock.
export function createTip({parent = document.body} = {}) {
  const visible = signal(false);
  const state = signal(EMPTY), skip = signal(null);
  // The text split into plain runs and emphasised item names.
  const parts = computed(() => {
    const {text, emphasis} = state.value;
    if (!emphasis?.length) return [{key: `0:${text}`, text, strong: false}];
    const terms = new Set(emphasis);
    const pattern = new RegExp(`(${emphasis.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
    return text.split(pattern).filter(Boolean).map((run, index) => ({key: `${index}:${run}`, text: run, strong: terms.has(run)}));
  });

  const view = mount(() => h('section', {id: 'gather-tutorial', class: 'q-tip', 'aria-label': 'Tutorial', hidden: () => !visible.value, 'data-complete': () => state.value.complete},
    h('div', {class: 'q-tip__head'},
      h('span', {id: 'tutorial-title', class: 'q-tip__title'}, () => state.value.title),
      h('span', {id: 'tutorial-count', class: 'q-tip__count', 'aria-live': 'polite'}, () => state.value.count)),
    keyedList(h('p', {id: 'tutorial-copy', class: 'q-tip__copy', 'aria-live': 'polite'}), parts, part => part.key,
      part => (part.peek().strong ? h('strong', {class: 'q-tip__item'}, part.peek().text) : document.createTextNode(part.peek().text))),
    h('div', {class: 'q-tip__track', hidden: () => state.value.progress === null},
      h('div', {id: 'tutorial-progress', class: 'q-tip__progress', style: {transform: () => `scaleX(${Math.max(0, Math.min(1, state.value.progress ?? 0))})`}})),
    h('div', {class: 'q-tip__actions'},
      h('button', {id: 'tutorial-skip', type: 'button', class: 'q-tip__skip', hidden: () => !skip.value, on: {click: event => { event.stopPropagation(); skip.peek()?.onPress?.(); }}}, () => skip.value?.label ?? 'Skip this part'),
      h('button', {id: 'tutorial-help', type: 'button', class: 'q-tip__help', hidden: () => !state.value.help, on: {click: () => state.peek().help?.onPress?.()}}, () => state.value.help?.label ?? 'Show me how'),
      h('button', {id: 'tutorial-continue', type: 'button', class: 'q-tip__continue', hidden: () => !state.value.action, disabled: () => !!state.value.action?.disabled,
        on: {click: event => { event.stopPropagation(); const action = state.peek().action; if (action && !action.disabled) action.onPress?.(); }}},
      () => state.value.action?.label ?? 'Continue'))));
  parent.append(view.node);

  return {
    node: view.node,
    visible,
    show(next) {
      state.value = {...EMPTY, ...next};
      visible.value = true;
    },
    update(patch) { state.value = {...state.peek(), ...patch}; },
    updateAction(patch) { state.value = {...state.peek(), action: patch && {...state.peek().action, ...patch}}; },
    get state() { return state.peek(); },
    hide() { visible.value = false; },
    setSkip(value) { skip.value = value || null; },
    get skip() { return skip.peek(); },
  };
}
