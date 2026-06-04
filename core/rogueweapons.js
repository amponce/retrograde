import { G } from './state.js';
import { emit } from './events.js';
import { rnd } from './rng.js';

// ROGUE is a Vampire-Survivors-style loadout: your starter weapon stays, and each
// level-up can ADD a new weapon (they all auto-fire together) or LEVEL an owned one.
// Choices are categorized — attack (weapons), defense (shield), utility (magnet/speed) —
// so building badly leaves you under-gunned and overwhelmed.

export const ROGUE_WEAPONS = {
  bolt:   { name:'PULSE',   max:6 },   // fast forward bolts at the nearest foe
  spread: { name:'SCATTER', max:6 },   // wide fan — crowd control
  seeker: { name:'SEEKER',  max:6 },   // homing missiles
  beam:   { name:'LANCE',   max:6 },   // slow, piercing, high-damage
};
const MAX_WEAPONS = 5;

function nearest(){ let b=null,bd=1e18; for(const e of G.enemies){const dx=e.x-G.p.x,dy=e.y-G.p.y,d=dx*dx+dy*dy; if(d<bd){bd=d;b=e;}} return b; }
function pb(x,y,vx,vy,dmg,extra){ G.bullets.push(Object.assign({x,y,vx,vy,color:'#39ffd0',r:5,len:11,dmg,pierce:false,bomb:false,life:2.4,hits:0},extra||{})); }

function weaponCd(w){
  if(w.id==='bolt')   return Math.max(0.11, 0.42 - w.lvl*0.04);
  if(w.id==='spread') return Math.max(0.34, 0.80 - w.lvl*0.05);
  if(w.id==='seeker') return Math.max(0.45, 1.00 - w.lvl*0.07);
  return Math.max(0.55, 1.20 - w.lvl*0.08); // beam
}
function fireWeapon(w){
  const l=w.lvl, tgt=nearest(); const ang=tgt?Math.atan2(tgt.y-G.p.y,tgt.x-G.p.x):-Math.PI/2;
  if(w.id==='bolt'){ const n=1+Math.floor(l/2), dmg=2+l, spd=760;
    for(let i=0;i<n;i++){const a=ang+(i-(n-1)/2)*0.12; pb(G.p.x,G.p.y,Math.cos(a)*spd,Math.sin(a)*spd,dmg);} emit('sfx','shoot'); }
  else if(w.id==='spread'){ const n=3+l*2, span=0.9+l*0.08, dmg=1.4+l*0.6, spd=560;
    for(let i=0;i<n;i++){const a=ang+(i-(n-1)/2)*(span/(n-1)); pb(G.p.x,G.p.y,Math.cos(a)*spd,Math.sin(a)*spd,dmg,{color:'#ff2d95'});} emit('sfx','shoot'); }
  else if(w.id==='seeker'){ const n=l, dmg=3+l*1.2, spd=420;
    for(let i=0;i<n;i++){const a=ang+(rnd()-0.5)*1.4; pb(G.p.x,G.p.y,Math.cos(a)*spd,Math.sin(a)*spd,dmg,{seek:true,color:'#ffd23a',r:6});} emit('sfx','laser'); }
  else if(w.id==='beam'){ const dmg=5+l*2.5, spd=1150;
    pb(G.p.x,G.p.y,Math.cos(ang)*spd,Math.sin(ang)*spd,dmg,{pierce:true,color:'#22e1ff',r:6,len:26}); emit('sfx','laser'); }
}
export function tickRogueWeapons(dt){
  for(const w of G.weapons){ w.fireT-=dt; if(w.fireT<=0){ w.fireT=weaponCd(w); fireWeapon(w); } }
}

// Build a 1-of-3 draft from attack / defense / utility categories, based on the loadout.
export function rollRogueDraft(){
  const opts=[];
  for(const w of G.weapons){ const def=ROGUE_WEAPONS[w.id];
    if(w.lvl<def.max) opts.push({kind:'wup',id:w.id,name:def.name+' Lv'+(w.lvl+1),desc:'level up your '+def.name.toLowerCase()}); }
  if(G.weapons.length<MAX_WEAPONS){ for(const id in ROGUE_WEAPONS){ if(!G.weapons.some(w=>w.id===id))
    opts.push({kind:'wnew',id,name:'+ '+ROGUE_WEAPONS[id].name,desc:'add a new weapon'}); } }
  opts.push({kind:'magnet',name:'MAGNET',desc:'gems pull in from farther'});
  opts.push({kind:'shield',name:'PLATING',desc:'+1 max shield, refilled'});
  opts.push({kind:'speed', name:'THRUSTERS',desc:'+12% move speed'});
  const out=[], bag=opts.slice();
  for(let k=0;k<3 && bag.length;k++) out.push(bag.splice(Math.floor(rnd()*bag.length),1)[0]);
  return out;
}
export function applyRogueChoice(o){
  if(!o)return;
  if(o.kind==='wnew') G.weapons.push({id:o.id,lvl:1,fireT:0});
  else if(o.kind==='wup'){ const w=G.weapons.find(w=>w.id===o.id); if(w)w.lvl++; }
  else if(o.kind==='magnet') G.magnet+=44;
  else if(o.kind==='shield'){ G.p.shieldMax++; G.p.shield=G.p.shieldMax; }
  else if(o.kind==='speed') G.p.speed*=1.12;
}
