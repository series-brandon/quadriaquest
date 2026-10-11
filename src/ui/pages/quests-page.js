import {computed, signal} from '../../reactive.js';
import {h} from '../dom.js';
import {iconNode} from '../icon.js';
import {keyedList} from '../list.js';
import {progressBar, section} from '../controls.js';

// Quests page: the started quests (in progress, then Completed), and a chosen quest's objectives
// in their place (current, then Completed) with a way back. An objective may have parts, equal
// pieces done in any order (Collect 3 Rocks, Collect 3 Sticks). Quest state belongs to quests.js;
// the page reads it through `chapters()` and follows `revision`.
//   chapters() → [{title, complete, goals: [{id, title, description, current, total, parts, help}]}]
//                parts (optional): [{label, current, total}] listed under the objective
//   help(id)   runs an objective's "Show me how" action
//   chosen     signal: the open quest's title (owned by the host so tutorials can open one)
//   viewing    signal: true while a quest is open instead of the list
export function questsPage({chapters, revision, help = () => {}, chosen = signal(null), viewing = signal(false)}) {
  const all = computed(() => (revision.value, chapters()));
  const done = goal => goal.current >= goal.total;
  const active = computed(() => all.value.filter(quest => !quest.complete));
  const completed = computed(() => all.value.filter(quest => quest.complete));
  const selected = computed(() => all.value.find(quest => quest.title === chosen.value) ?? null);
  // A quest that goes away (a reset) returns to the list.
  const view = computed(() => (viewing.value && selected.value ? 'detail' : 'list'));
  const open = title => { chosen.value = title; viewing.value = true; };

  // A quest in the list: its title and, while in progress, what to do now.
  const summary = quest => {
    if (quest.complete) return 'Complete';
    const now = quest.goals.filter(goal => !done(goal));
    return now.length ? now.map(goal => goal.title).join(' · ') : 'Next objective on its way';
  };
  const questButton = item => h('button', {
    type: 'button',
    class: 'q-quest',
    'data-complete': () => item.value.complete,
    on: {click: () => open(item.peek().title)},
  },
  h('strong', null, () => item.value.title),
  h('small', null, () => summary(item.value)));
  const questList = (label, items) => keyedList(h('div', {class: 'q-list q-quests__list', role: 'list', 'aria-label': label}), items, quest => quest.title, questButton);

  const list = h('section', {class: 'q-quests__index', 'aria-label': 'Quests', hidden: () => view.value !== 'list'},
    h('p', {class: 'q-page__help', hidden: () => all.value.length > 0}, 'Your next adventure will appear here.'),
    h('h3', {class: 'q-label', hidden: () => !all.value.length}, 'In progress'),
    h('p', {class: 'q-page__help', hidden: () => !all.value.length || active.value.length > 0}, 'No quests in progress.'),
    questList('Quests in progress', active),
    section({title: 'Completed', value: () => String(completed.value.length), hidden: () => !completed.value.length},
      questList('Completed quests', completed)));

  const current = computed(() => selected.value?.goals.filter(goal => !done(goal)) ?? []);
  const finished = computed(() => selected.value?.goals.filter(done) ?? []);
  const objective = item => {
    const goal = () => item.value;
    return h('li', {class: 'q-task'},
      h('strong', null, () => goal().title),
      h('p', null, () => goal().description),
      // Parts track separately (Collect 3 Rocks 1 / 3); an objective without parts has one bar.
      keyedList(h('ul', {class: 'q-task__parts', 'aria-label': 'Objective parts', hidden: () => !goal().parts}), computed(() => goal().parts ?? []), part => part.label, part => {
        const complete = () => part.value.current >= part.value.total;
        return h('li', {class: 'q-task__part', 'data-complete': complete},
          h('span', null, () => `${complete() ? '✓ ' : ''}${part.value.label}`),
          h('small', null, () => `${part.value.current} / ${part.value.total}`),
          progressBar({label: () => part.value.label, value: () => part.value.current / part.value.total}));
      }),
      h('div', {class: 'q-task__progress', hidden: () => !!goal().parts},
        progressBar({label: () => goal().title, value: () => goal().current / goal().total}),
        h('small', null, () => `${goal().current} / ${goal().total}`)),
      h('button', {type: 'button', class: 'q-button q-button--quiet', hidden: () => !goal().help, on: {click: () => help(item.peek().id)}}, 'Show me how'));
  };

  const detail = h('section', {class: 'q-quests__detail', 'aria-label': () => selected.value?.title ?? 'Quest', hidden: () => view.value !== 'detail'},
    h('button', {type: 'button', class: 'q-back q-quests__back', on: {click: () => { viewing.value = false; }}}, iconNode('back'), h('span', null, 'All quests')),
    h('h3', {class: 'q-quests__title'}, () => selected.value?.title ?? ''),
    h('h4', {class: 'q-label', hidden: () => !current.value.length}, () => (current.value.length > 1 ? 'Current objectives' : 'Current objective')),
    h('p', {class: 'q-page__help', hidden: () => current.value.length > 0}, () => (selected.value?.complete ? 'Every objective in this quest is complete.' : 'Your next objective will appear here.')),
    keyedList(h('ul', {class: 'q-tasks', 'aria-label': 'Current objectives'}), current, goal => goal.id, objective),
    section({title: 'Completed', value: () => String(finished.value.length), hidden: () => !finished.value.length},
      keyedList(h('ul', {class: 'q-tasks q-tasks--done', 'aria-label': 'Completed objectives'}), finished, goal => goal.id, item => h('li', {class: 'q-task q-task--done'}, () => `✓ ${item.value.title}`))));

  return h('div', {class: 'q-page q-quests-page', 'data-view': view}, list, detail);
}
