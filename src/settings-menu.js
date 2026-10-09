import {settingsPage} from './ui/pages/settings-page.js';

// Settings: the same page as a journal tab (journal.js mounts `page()`) and as a popup on the
// modal host (the splash screen's gear button, the playground).
export function createSettingsMenu({audio,quality=null,modals}){
 return {
  page:()=>settingsPage({audio,quality}),
  open(){modals.open({id:'settings',title:'Settings',build:()=>settingsPage({audio,quality})});},
  close(){modals.close('settings');},
  get isOpen(){return modals.isOpen('settings');}
 };
}
