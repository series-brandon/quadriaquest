import {signal} from './reactive.js';

// A guide target by id; tab ids also match their copy in the phone tab bar (`data-tab`).
const target = id => ['#' + id, `[data-tab="${id}"]`];

// null means free use; an empty list means only the separate tutorial prompt may advance.
export function journalTutorialActions(stage, guidedTarget = null) {
  if (/^(quests|skills|inventory)-/.test(stage)) {
    // The skills lesson lives on the Character tab.
    if (stage.endsWith('-menu')) return target('open-' + ({skills: 'character'}[stage.split('-')[0]] ?? stage.split('-')[0]));
    if (stage === 'inventory-select') return ['[data-item="sticks"]'];
    // The skills lesson highlights the Skills section, then the Gathering row.
    if (stage === 'skills-section') return ['#character-panel [role="tab"][data-guide]'];
    if (stage === 'skills-select') return ['[data-skill][data-guide] > summary'];
    return [];
  }
  // The axe lesson follows its guide: the Crafting tab, the recipe, then its Craft button.
  if (stage === 'craft-menu' || stage === 'retry') return target(guidedTarget ?? 'open-crafting');
  if (stage === 'recipe') return guidedTarget ? target(guidedTarget) : [];
  return guidedTarget ? target(guidedTarget) : null;
}

export function mountJournalTutorialLock(host, controller) {
  const controls = 'button,input,select,textarea,summary,a[href]';
  // Whether a guided step restricts the journal; the journal and HUD read it reactively.
  const locked = signal(false);
  function actions() {
    // The visible guided control (a guide may mark two, such as a back button and the recipe
    // beside it, when the layout shows only one).
    const guided = [...host.querySelectorAll('.gold-guide[id],.gold-guide[data-tab]')].find(node => !node.closest('[hidden]') && !node.disabled && (node.checkVisibility?.() ?? true));
    return journalTutorialActions(controller.stage, guided && (guided.id || guided.dataset.tab));
  }
  function allowed(node, rules = actions()) {
    return rules === null || !!node.closest('#gather-tutorial') || rules.some(selector => node.matches(selector));
  }
  // Capture before any panel or toggle handlers. This also covers keyboard-generated clicks
  // and newly inserted tabs before the observer has updated their disabled appearance.
  for (const type of ['click', 'keydown', 'input', 'change']) host.addEventListener(type, event => {
    const node = event.target.closest(controls);
    if (node && !allowed(node)) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  function sync() {
    const rules = actions();
    locked.value = rules !== null;
    for (const node of host.querySelectorAll(controls)) {
      const blocked = !allowed(node, rules);
      // Inert leaves recipe/equipment availability's native disabled state untouched.
      if (node.inert !== blocked) node.inert = blocked;
      if (blocked && node.getAttribute('data-tutorial-locked') !== 'true') {
        node.setAttribute('data-tutorial-locked', 'true');node.setAttribute('aria-disabled', 'true');
      } else if (!blocked && node.hasAttribute('data-tutorial-locked')) {
        node.removeAttribute('data-tutorial-locked');node.removeAttribute('aria-disabled');
      }
    }
  }
  // Lesson transitions can change only dialogue outside the journal. Never depend
  // on journal DOM mutations to release a formerly inert required control.
  controller.onStageChange(() => queueMicrotask(sync));
  // Guide highlights (.gold-guide) and newly rendered controls can change the rules or need
  // locking without a stage change. Legacy: retire once guides are tutorial state.
  if (globalThis.MutationObserver && host instanceof globalThis.Node) {
    new MutationObserver(sync).observe(host, {subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class', 'disabled']});
  }
  sync();
  return {sync, lockedState: locked, get locked(){return actions() !== null;}};
}
