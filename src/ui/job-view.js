import {h} from './dom.js';
import {iconNode} from './icon.js';
import {progressBar} from './controls.js';
import {formatGold} from '../economy.js';

// One job (jobs.js) as a card: what to do, who it's for and where to hand it in, progress, reward, and
// its actions ({label, run, disabled?, quiet?}). Shared by the Quests page's Jobs and the job board.
export const jobReward = job => [formatGold(job.gold), job.xp ? `${job.xp[1]} ${job.xp[0]} XP` : null].filter(Boolean).join(' · ');
export const jobWhere = job => (job.kind === 'deliver' ? (job.delivered ? `Return to ${job.giverName}` : `Talk to ${job.recipient.name}${job.recipient.where ? ` (${job.recipient.where})` : ''}`)
  : job.handIn === 'board' ? 'Hand in at a noticeboard' : `Hand in to ${job.giverName}`);

export function jobCard(item, actions = () => []) {
  const job = () => item.value;
  return h('article', {class: 'q-job', 'data-ready': () => !!job().ready, 'data-kind': () => job().kind},
    h('div', {class: 'q-job__head'},
      h('span', {class: 'q-job__icon', 'aria-hidden': 'true'}, iconNode(job().item || 'jobs')),
      h('div', {class: 'q-job__title'},
        h('strong', null, () => job().title),
        h('small', null, () => [job().giverName || job().giver, job().note].filter(Boolean).join(' · ')))),
    h('div', {class: 'q-job__progress', hidden: () => !job().progress},
      progressBar({label: () => job().title, value: () => (job().progress ? job().progress.have / job().progress.need : 0)}),
      h('small', null, () => (job().progress ? `${job().progress.have} / ${job().progress.need}` : ''))),
    h('p', {class: 'q-job__where', hidden: () => !job().progress}, () => (job().progress ? (job().ready ? `Ready: ${jobWhere(job())}` : jobWhere(job())) : '')),
    h('p', {class: 'q-job__reward'}, iconNode('gold'), h('span', null, () => jobReward(job()))),
    h('div', {class: 'q-job__actions'},
      ...actions(item).map(action => h('button', {type: 'button', class: action.quiet ? 'q-button q-button--small q-button--quiet' : 'q-button q-button--small',
        disabled: () => !!action.disabled?.(), title: () => action.reason?.() || null, on: {click: () => action.run()}}, action.label))));
}
