import {makeTopHat} from './finale-models.js';
import {makeCompanionTopHat,ironSkullcap,minersCap,wornArcherCap,wornWizardHat,breathHeadband,fishersHat,crudeHelm} from './hat-models.js';

// Worn (non-hand) gear, shared by gameplay and previews. Each body type lists its wear slots; each slot
// has an anchor on that body; each wearable item names its model. Equipping is the equipment system's
// job (slots, inventory); this only says what a worn item looks like and where it sits.
//
// Slimes wear Head today. The slime-native slots proposed in DESIGN.md (*Slime outfits*: Body, Gloves,
// Base, Back, and a Ring on each hand) join by adding a slot here, an anchor in SLIME_ANCHORS and a model per item; the
// shared presentation and the model viewer then pick them up with no other changes.
export const SLIME_WEAR_SLOTS=[{slot:'head',label:'Head'}];
// Where each slime slot sits (in the slime's visual group). `bends` slots ride the body's bend.
export const SLIME_ANCHORS={head:{position:[0,.79,0],bends:true,hideWhileCelebrating:true}};
export const COMPANION_WEAR_SLOTS=[{slot:'head',label:'Head cosmetic'}];
// Models by item id. Placement on a body comes from that body's anchors (companion items carry their own
// fit for the corgi's head; see companion-model.js).
export const WORN_MODELS={hats:makeTopHat,ironSkullcap,minersCap,archerCap:wornArcherCap,wizardHat:wornWizardHat,breathHeadband,fishersHat,crudeHelm,companionHats:makeCompanionTopHat};
