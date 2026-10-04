// null means free use; an empty list means only the separate tutorial prompt may advance.
export function journalTutorialActions(stage, guidedTarget = null) {
  if (/^(quests|skills|inventory)-/.test(stage)) {
    if (stage.endsWith('-toggle')) return ['#game-menu-toggle'];
    if (stage.endsWith('-menu')) return ['#open-' + stage.split('-')[0]];
    if (stage === 'inventory-select') return ['[data-item="sticks"]'];
    return [];
  }
  if (stage === 'menu' || stage === 'retry') return ['#game-menu-toggle'];
  if (stage === 'craft-menu') return ['#open-crafting'];
  if (stage === 'recipe') return ['#craft-axe'];
  return guidedTarget ? ['#' + guidedTarget] : null;
}

export function mountJournalTutorialLock(host, controller) {
  const controls = 'button,input,select,textarea,summary,a[href]';
  function actions() {
    const target = [...host.querySelectorAll('.gold-guide[id]')].find(node => !node.closest('[hidden]') && !node.disabled);
    return journalTutorialActions(controller.stage, target?.id);
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
    for (const node of host.querySelectorAll(controls)) {
      const locked = !allowed(node, rules);
      // Inert leaves recipe/equipment availability's native disabled state untouched.
      if (node.inert !== locked) node.inert = locked;
      if (locked && node.getAttribute('data-tutorial-locked') !== 'true') {
        node.setAttribute('data-tutorial-locked', 'true');node.setAttribute('aria-disabled', 'true');
      } else if (!locked && node.hasAttribute('data-tutorial-locked')) {
        node.removeAttribute('data-tutorial-locked');node.removeAttribute('aria-disabled');
      }
    }
  }
  // Lesson transitions can change only dialogue outside the journal. Never depend
  // on journal DOM mutations to release a formerly inert required control.
  controller.onStageChange(() => queueMicrotask(sync));
  return {sync, get locked(){return actions() !== null;}};
}
