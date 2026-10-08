import {signal} from '../../reactive.js';
import {h} from '../dom.js';

// How the player wants to play, asked during the opening. Each option is a combat mode preset
// (docs/COMBAT.md, Modes, policies and overrides); the copy is player-facing.
export const PLAY_STYLES = [
  {
    mode: 'pacifist',
    title: 'I’m a lover, not a fighter',
    label: 'Pacifist',
    description: 'You won’t be able to attack other creatures, even in self defense. You will however not draw the ire of many creatures, and you have a host of abilities that will be used automatically to help keep you safe.',
    like: 'Animal Crossing',
  },
  {
    mode: 'simple',
    title: 'I wanna fight stuff, but nothing complicated',
    label: 'Simple',
    description: 'You’ll be able to fight anything you want. You will automatically use the appropriate equipment and abilities for your desired class. Nothing complicated here, just click and kick butt!',
    like: 'Stardew Valley',
  },
  {
    mode: 'expert',
    title: 'I want to control every aspect of my game',
    label: 'Expert',
    description: 'This game will be what you make it. You can completely control the flow of combat by managing spells, abilities, auras, and even how you dual wield. This gives you the ultimate control but is also the most complex by far.',
    like: 'RuneScape',
  },
];

// A radio group of play styles: the chosen one shows its description, then one confirm button.
export function modeChoice({value = signal('simple'), onConfirm}) {
  const chosen = () => PLAY_STYLES.find(style => style.mode === value.value);
  return h('div', {class: 'q-mode-choice'},
    h('fieldset', {class: 'q-mode-choice__options'},
      h('legend', {class: 'q-visually-hidden'}, 'How would you like to play?'),
      PLAY_STYLES.map(style => h('label', {class: 'q-mode-option', 'data-selected': () => value.value === style.mode},
        h('input', {type: 'radio', name: 'play-style', value: style.mode, checked: () => value.value === style.mode, on: {change: () => { value.value = style.mode; }}}),
        h('span', {class: 'q-mode-option__head'},
          h('strong', null, style.title),
          h('span', {class: 'q-mode-option__mode'}, style.label)),
        h('span', {class: 'q-mode-option__more', hidden: () => value.value !== style.mode},
          h('span', null, style.description),
          h('small', null, `You might like this mode if you like: ${style.like}`))))),
    h('p', {class: 'q-mode-choice__note'}, 'There’s no pressure! You can freely swap between any of these modes at any time, and you can even set up your own custom settings to play how you want.'),
    h('button', {type: 'button', class: 'q-mode-choice__confirm', on: {click: () => onConfirm(value.value)}}, () => `Play as ${chosen().label}`));
}
