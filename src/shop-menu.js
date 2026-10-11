import {shopDialog} from './ui/dialogs/shop-dialog.js';
import {confirmModal} from './ui/modal.js';

// Opens the shared shop screen (ui/dialogs/shop-dialog.js) on the modal host, for any shop id, from a
// shopkeeper, a counter, a stall or the playground. `greeting` is the keeper's line, when one speaks.
// onTrade(changes, 'bought' | 'sold') after each trade (the host's item receipt and sound).
export function createShopMenu({modals,shops,items,inventory,wallet,onTrade=()=>{}}){
 return {
  open(shopId,{greeting=null,title=null}={}){
   const shop=shops.shops[shopId];if(!shop)return false;
   modals.open({id:'shop',title:title||shop.name,size:'wide',flush:true,
    build:()=>shopDialog({shopId,shops,items,inventory,wallet,greeting,onTrade:changes=>onTrade(changes,(changes.gold||0)<0?'bought':'sold'),
     confirm:({message,onConfirm})=>confirmModal(modals,{id:'shop-confirm',title:'Sell your last one?',message,confirm:'Sell',onConfirm})})});
   return true;
  },
  close(){modals.close('shop');},
  get isOpen(){return modals.isOpen('shop');},
 };
}
