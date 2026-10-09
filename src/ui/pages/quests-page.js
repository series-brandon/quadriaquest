import {computed, signal} from '../../reactive.js';
import {h} from '../dom.js';
import {keyedList} from '../list.js';
import {progressBar, section} from '../controls.js';

// Quests page: chapters (each a quest line), and the chosen chapter's current tasks with their
// progress and any "Show me how" help, then its completed tasks. Quest state belongs to quests.js;
// the page reads it through `chapters()` and follows `revision`.
//   chapters() → [{title, goals: [{id, title, description, current, total, help}]}]
//   help(id)   runs a task's "Show me how" action
//   chosen     signal: the selected chapter (null: the first with unfinished tasks)
//   viewing    signal: phones show the chosen chapter instead of the list
export function questsPage({chapters, revision, help = () => {}, chosen = signal(null), viewing = signal(false)}) {
  const all = computed(() => (revision.value, chapters()));
  const done = goal => goal.current >= goal.total;
  const selected = computed(() => {
    const list = all.value;
    return list.find(chapter => chapter.title === chosen.value) ?? list.find(chapter => chapter.goals.some(goal => !done(goal))) ?? list[0] ?? null;
  });
  // With a single chapter there's nothing to choose, so phones go straight to it.
  const view = computed(() => (viewing.value || all.value.length === 1 ? 'detail' : 'list'));
  const summary = chapter => {
    const finished = chapter.goals.filter(done).length;
    return finished === chapter.goals.length ? 'Complete' : `${finished} / ${chapter.goals.length} tasks`;
  };

  // A single quest needs no chooser; its title heads the detail.
  const list = keyedList(h('div', {class: 'q-list q-quests__chapters', role: 'list', 'aria-label': 'Quests', hidden: () => all.value.length < 2}), all, chapter => chapter.title, item => {
    const title = item.peek().title;
    return h('button', {
      type: 'button',
      class: 'q-quest',
      'aria-pressed': () => selected.value?.title === title,
      'data-complete': () => item.value.goals.every(done),
      on: {click: () => { chosen.value = title; viewing.value = true; }},
    },
    h('strong', null, title),
    h('small', null, () => summary(item.value)));
  });

  const current = computed(() => selected.value?.goals.filter(goal => !done(goal)) ?? []);
  const finished = computed(() => selected.value?.goals.filter(done) ?? []);
  const task = item => {
    const goal = () => item.value;
    return h('li', {class: 'q-task'},
      h('strong', null, () => goal().title),
      h('p', null, () => goal().description),
      progressBar({label: () => goal().title, value: () => goal().current / goal().total}),
      h('small', null, () => `${goal().current} / ${goal().total}`),
      h('button', {type: 'button', class: 'q-button q-button--quiet', hidden: () => !goal().help, on: {click: () => help(item.peek().id)}}, 'Show me how'));
  };

  const detail = h('section', {class: 'q-quests__detail', 'aria-label': () => selected.value?.title ?? 'Quest', hidden: () => !selected.value},
    h('button', {type: 'button', class: 'q-quests__back', hidden: () => all.value.length < 2, on: {click: () => { viewing.value = false; }}}, 'All quests'),
    h('h3', {class: 'q-quests__title'}, () => selected.value?.title ?? ''),
    h('p', {class: 'q-page__help', hidden: () => current.value.length > 0}, 'Every task in this quest is complete.'),
    keyedList(h('ul', {class: 'q-tasks', 'aria-label': 'Current tasks'}), current, goal => goal.id, task),
    section({title: 'Completed', value: () => String(finished.value.length), hidden: () => !finished.value.length},
      keyedList(h('ul', {class: 'q-tasks q-tasks--done', 'aria-label': 'Completed tasks'}), finished, goal => goal.id, item => h('li', {class: 'q-task q-task--done'}, () => `✓ ${item.value.title}`))));

  return h('div', {class: 'q-page q-quests-page', 'data-view': view},
    h('p', {class: 'q-page__help', hidden: () => all.value.length > 0}, 'Your next adventure will appear here.'),
    h('div', {class: 'q-quests__body', hidden: () => !all.value.length}, list, detail));
}
