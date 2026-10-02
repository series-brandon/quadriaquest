// One rounded, ink-and-paper vocabulary for navigation, skills, and supplies.
const paths={
 quests:'<path d="M6 3h14v18H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM6 3v18M10 8h6M10 12h6M10 16h4"/>',
 settings:'<path d="m9 3 1-2h4l1 2 3 2 2 0 2 4-1 2v3l1 2-2 4-2 0-3 2-1 2h-4l-1-2-3-2H4l-2-4 1-2v-3L2 9l2-4h2z" transform="translate(1 0) scale(.92)"/><circle cx="12" cy="12" r="4"/>',
 inventory:'<path d="M8 9V7a4 4 0 0 1 8 0v2M5 9h14l1 11H4z"/><path d="M4 13h16M10 13v3h4v-3"/>',
 skills:'<path d="m5 18 5-12 9 5-8 8z"/><circle cx="5" cy="18" r="2"/><circle cx="10" cy="6" r="2"/><circle cx="19" cy="11" r="2"/>',
 crafting:'<path d="m5 20 13-14M14 4l6 6M4 5l15 15M3 3l5 1-4 4z"/>',
 Gathering:'<path d="M5 14V9a1.5 1.5 0 0 1 3 0v3-7a1.5 1.5 0 0 1 3 0v7-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v9l2-3 2 2-5 7H9z"/>',
 axes:'<path d="m7 21 8-17M14 5c3 0 6 1 7 4l-6 5-4-3"/>',
 pickaxes:'<path d="m7 21 7-14M3 9q9-10 18 0-8-4-18 0"/>',
 sticks:'<path d="m5 20 9-16M10 21l8-16M3 16l17-7M8 14l7 4"/>',
 stones:'<path d="m2 17 3-5 5 1 2 6-7 2zm10-8 4-5 5 3 1 5-7 1zm0 10 3-5 5 1 2 5-6 1z"/>',
 stone:'<path d="m3 16 3-10 10-3 6 9-5 9H7zM6 6l6 7 10-1M12 13l-5 8"/>',
 logs:'<path d="m3 15 12-9q5-1 6 4L8 20zM4 10l10-7 4 1"/><ellipse cx="6" cy="17" rx="3" ry="4"/><path d="m10 14 7-5"/>',
 hats:'<path d="m7 16-2-12q7-3 14 0l-2 12M7 12h10"/><ellipse cx="12" cy="17" rx="10" ry="4"/>',
 sound:'<path d="M3 9h4l5-5v16l-5-5H3zM16 8q5 4 0 8M19 4q8 8 0 16"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 expand:'<path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/>',
 check:'<path d="m4 12 5 5L20 6"/>',
};
const aliases={Crafting:'crafting',Lumberjack:'axes',Mining:'pickaxes'};
export function icon(name){return `<svg class="game-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[aliases[name]||name]||paths.skills}</svg>`;}
export const ICON_NAMES=Object.keys(paths);
