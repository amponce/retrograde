import { G } from './state.js';
import { rnd } from './rng.js';

// OVERDRIVE upgrade pool. Most COMPOUND (taken repeatedly they stack); a few are
// one-shot toggles (`once`). Each apply() mutates G.run (weapon/bullet modifiers read
// by weapons.js) or G.p directly.
const POOL = [
  { id:'rapid',   name:'RAPID FIRE',  desc:'+18% fire rate',        apply:()=>{ G.run.fireRate*=0.82; } },
  { id:'dmg',     name:'OVERCHARGE',  desc:'+25% damage',           apply:()=>{ G.run.dmg*=1.25; } },
  { id:'multi',   name:'TWIN CANNON', desc:'+1 extra shot',         apply:()=>{ G.run.multishot+=1; } },
  { id:'spd',     name:'VELOCITY',    desc:'+20% bullet speed',     apply:()=>{ G.run.bulletSpd*=1.2; } },
  { id:'thrust',  name:'THRUSTERS',   desc:'+12% move speed',       apply:()=>{ G.p.speed*=1.12; } },
  { id:'plating', name:'PLATING',     desc:'+1 max shield',         apply:()=>{ G.p.shieldMax++; G.p.shield=G.p.shieldMax; } },
  { id:'regen',   name:'NANO-REGEN',  desc:'+40% shield regen',     apply:()=>{ G.run.regen*=1.4; } },
  { id:'power',   name:'WEAPON UP',   desc:'+1 weapon power',       apply:()=>{ G.p.power=Math.min(4,G.p.power+1); } },
  { id:'pierce',  name:'PIERCE',      desc:'shots pass through',    once:true, apply:()=>{ G.run.pierce=true; } },
  { id:'life',    name:'EXTRA LIFE',  desc:'+1 life',               apply:()=>{ G.p.lives++; } },
];

// Pick `n` distinct offers from the pool, skipping one-shot upgrades already taken.
export function rollDraft(n=3){
  const taken=new Set(G.run.picks);
  const pool=POOL.filter(u=>!(u.once && taken.has(u.id)));
  const chosen=[];
  const bag=pool.slice();
  for(let k=0;k<n && bag.length;k++){
    const i=Math.floor(rnd()*bag.length);
    const u=bag.splice(i,1)[0];
    chosen.push({ id:u.id, name:u.name, desc:u.desc });
  }
  return chosen;
}

export function applyUpgrade(id){
  const u=POOL.find(x=>x.id===id);
  if(!u)return;
  u.apply();
  G.run.picks.push(id);
}
