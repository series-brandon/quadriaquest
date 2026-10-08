import {computed, signal} from '../../reactive.js';
import {h} from '../dom.js';
import {iconNode} from '../icon.js';
import {keyedList} from '../list.js';
import {progressBar} from '../controls.js';
import {skillProgress} from '../../skills.js';

const whole = n => Math.floor(n).toLocaleString();

// A searchable list of progression tracks with their level and progress: the Skills page and the
// Proficiencies page. Skill records are reactive at their source and combat tracks follow the
// character's revision, so the list follows XP from any source without refresh calls.
//   skills()   → {name: skill}; the set can grow (systems created later, newly trained tracks)
//   track()    reads revisions that change that set or the combat tracks
//   guidance   signal {focus}: the tutorial's lesson opens and highlights that skill
//   noun       'skills' or 'proficiencies' (search label and empty text)
export function skillsPage({skills, track = () => {}, guidance = signal({}), noun = 'skills', empty = 'None yet.'}) {
  const query = signal('');
  const matches = name => name.toLowerCase().includes(query.value.trim().toLowerCase());
  const all = computed(() => (track(), skills()));
  const names = computed(() => Object.keys(all.value));
  const focus = computed(() => guidance.value.focus ?? null);

  const list = keyedList(h('div', {class: 'q-skills', role: 'list'}), names, name => name, item => {
    const name = item.peek();
    const progress = computed(() => (track(), skillProgress(all.value[name] ?? {xp: 0, level: 1})));
    const icon = all.peek()[name]?.icon || name;
    const focused = computed(() => focus.value === name);
    // The lesson's skill opens once; later toggles are the player's.
    return h('details', {
      class: 'q-skill',
      role: 'listitem',
      'data-skill': name,
      'data-guide': focused,
      open: () => focused.value || null,
      hidden: () => !matches(name),
    },
    h('summary', {class: 'q-skill__summary'},
      h('span', {class: 'q-skill__icon', 'aria-hidden': 'true'}, iconNode(icon)),
      h('span', {class: 'q-skill__name'}, name),
      h('b', {class: 'q-skill__level'}, () => `Lv ${progress.value.level}`),
      progressBar({label: () => `${name} progress toward level ${progress.value.level + 1}`, value: () => progress.value.into / progress.value.span})),
    h('div', {class: 'q-skill__body'},
      h('span', null, () => `${whole(progress.value.xp)} total XP`),
      h('span', null, () => `${whole(progress.value.into)} / ${whole(progress.value.span)} XP toward Level ${progress.value.level + 1}`),
      h('span', null, () => `${whole(Math.ceil(progress.value.remaining))} XP to next level`)));
  });

  return h('div', {class: 'q-page q-skills-page'},
    h('input', {
      type: 'search',
      class: 'q-input',
      placeholder: `Search ${noun}…`,
      'aria-label': `Search ${noun}`,
      value: query,
      on: {input: event => { query.value = event.target.value; }},
    }),
    list,
    h('p', {class: 'q-page__help', hidden: () => names.value.some(matches)}, () => (names.value.length ? `No matching ${noun}.` : empty)));
}
