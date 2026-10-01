const names={sticks:['Stick','Sticks'],stones:['Stone','Stones'],axes:['Crude Axe','Crude Axes'],logs:['Wooden Log','Wooden Logs']};

export function itemChangeMessage(changes){
  return Object.entries(changes).filter(([,delta])=>delta!==0).map(([item,delta])=>{
    const name=names[item]?.[Math.abs(delta)===1?0:1]||item;
    return `${delta>0?'+':'−'}${Math.abs(delta)} ${name}`;
  }).join(' · ');
}
