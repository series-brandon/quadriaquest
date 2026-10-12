import {computed, signal} from '../../reactive.js';
import {h} from '../dom.js';
import {keyedList} from '../list.js';
import {jobCard} from '../job-view.js';
import {BOARD_LIMIT} from '../../jobs.js';

// The job board (a noticeboard; docs/ECONOMY.md, Jobs): the posted jobs to take, and your board jobs to
// hand in or abandon. Everything is the jobs system's (jobs.js); `onHandIn(result)` lets the host show
// the reward. Works at any noticeboard in any map.
export function jobBoard({jobs, onHandIn = () => {}}) {
  const status = signal('');
  const offers = computed(() => jobs.offers);
  const mine = computed(() => jobs.active.filter(job => job.handIn === 'board'));
  const full = computed(() => mine.value.length >= BOARD_LIMIT);
  return h('div', {class: 'q-board'},
    h('p', {class: 'q-page__status', role: 'status', hidden: () => !status.value}, status),
    h('h3', {class: 'q-label'}, () => `Your board jobs · ${mine.value.length} / ${BOARD_LIMIT}`),
    h('p', {class: 'q-page__help', hidden: () => mine.value.length > 0}, 'Take a job below. Bring what it asks for back to any noticeboard.'),
    keyedList(h('div', {class: 'q-list q-jobs', role: 'list', 'aria-label': 'Your board jobs'}), mine, job => job.key, item => jobCard(item, () => [
      {label: 'Hand in', disabled: () => !item.value.ready, run: () => { const r = jobs.handIn(item.peek().key); status.value = r.ok ? `Done: ${r.job.title}.` : r.reason; if (r.ok) onHandIn(r); }},
      {label: 'Abandon', quiet: true, run: () => { jobs.abandon(item.peek().key); status.value = ''; }}])),
    h('h3', {class: 'q-label'}, 'Posted jobs'),
    h('p', {class: 'q-page__help', hidden: () => offers.value.length > 0}, 'New jobs go up soon.'),
    keyedList(h('div', {class: 'q-list q-jobs', role: 'list', 'aria-label': 'Posted jobs'}), offers, offer => offer.id, item => jobCard(item, () => [
      {label: 'Take job', disabled: () => full.value, reason: () => (full.value ? `You can take ${BOARD_LIMIT} board jobs at a time.` : ''),
        run: () => { const r = jobs.take(item.peek().id); status.value = r.ok ? `Taken: ${r.job ? item.peek().title : ''}.` : r.reason; }}])));
}
