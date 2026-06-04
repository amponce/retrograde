import { G } from './state.js';
import { emit } from './events.js';
import { rnd } from './rng.js';

// ROGUE loadout: WEAPONS (each auto-fires its own pattern, stack + level up) and PASSIVES
// (stat multipliers via G.run / G.p that buff ALL weapons). Slot caps force trade-offs;
// building badly = under-gunned and overwhelmed.

export const ROGUE_WEAPONS = {
  bolt:   { name:'PULSE',   desc:'fast bolts at the nearest foe', max:6 },
  spread: { name:'SCATTER', desc:'wide fan, crowd control',       max:6 },
  seeker: { name:'SEEKER',  desc:'homing missiles',               max:6 },
  beam:   { name:'LANCE',   desc:'slow, piercing, heavy hits',    max:6 },
};
const MAX_WEAPONS = 5;
export const STARTERS = ['bolt','spread','seeker','beam'];

export const ROGUE_PASSIVES = {
  might:   { name:'MIGHT',     desc:'+18% damage',           max:5, apply:()=>{ G.run.dmg*=1.18; } },
  haste:   { name:'HASTE',     desc:'+12% fire rate',        max:5, apply:()=>{ G.run.fireRate*=0.88; } },
  splinter:{ name:'SPLINTER',  desc:'+1 projectile',         max:4, apply:()=>{ G.run.multishot+=1; } },
  velocity:{ name:'VELOCITY',  desc:'+18% projectile speed', max:4, apply:()=>{ G.run.bulletSpd*=1.18; } },
  magnet:  { name:'MAGNET',    desc:'gems pull from farther',max:5, apply:()=>{ G.magnet+=42; } },
  plating: { name:'PLATING',   desc:'+1 max shield (refill)',max:4, apply:()=>{ G.p.shieldMax++; G.p.shield=G.p.shieldMax; } },
  regen:   { name:'NANO-REGEN',desc:'+40% shield regen',     max:4, apply:()=>{ G.run.regen*=1.4; } },
  thrust:  { name:'THRUSTERS', desc:'+12% move speed',       max:4, apply:()=>{ G.p.speed*=1.12; } },
  growth:  { name:'GROWTH',    desc:'+20% XP from gems',     max:4, apply:()=>{ G.xpGain*=1.2; } },
};
const MAX_PASSIVES = 6;

function nearest(){ let b=null,bd=1e18; for(const e of G.enemies){const dx=e.x-G.p.x,dy=e.y-G.p.y,d=dx*dx+dy*dy; if(d<bd){bd=d;b=e;}} return b; }
function pb(x,y,vx,vy,dmg,extra){ G.bullets.push(Object.assign({x,y,vx,vy,color:'#39ffd0',r:5,len:11,dmg,pierce:false,bomb:false,life:2.4,hits:0},extra||{})); }

function weaponBaseCd(w){
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
  const r=G.run;
  for(const w of G.weapons){
    w.fireT-=dt;
    if(w.fireT<=0){
      w.fireT=weaponBaseCd(w)*r.fireRate;        // HASTE passive
      const st=G.bullets.length; fireWeapon(w);
      for(let i=st;i<G.bullets.length;i++){ const b=G.bullets[i]; // MIGHT / VELOCITY / PIERCE passives
        b.dmg*=r.dmg; if(r.pierce)b.pierce=true; if(r.bulletSpd!==1){ b.vx*=r.bulletSpd; b.vy*=r.bulletSpd; } }
      if(r.multishot>0 && G.bullets.length>st){ const base=G.bullets[st]; // SPLINTER passive
        for(let m=1;m<=r.multishot;m++){ const s=(m%2)?1:-1, a=0.14*Math.ceil(m/2)*s;
          G.bullets.push({...base, vx:base.vx*Math.cos(a)-base.vy*Math.sin(a), vy:base.vx*Math.sin(a)+base.vy*Math.cos(a)}); } }
    }
  }
}

// 1-of-3 draft mixing weapons (attack) and passives (defense/utility), honoring slot caps.
export function rollRogueDraft(){
  const opts=[];
  for(const w of G.weapons){ const def=ROGUE_WEAPONS[w.id];
    if(w.lvl<def.max) opts.push({kind:'wup',id:w.id,name:def.name+' Lv'+(w.lvl+1),desc:'level up your '+def.name.toLowerCase()}); }
  if(G.weapons.length<MAX_WEAPONS) for(const id in ROGUE_WEAPONS){ if(!G.weapons.some(w=>w.id===id))
    opts.push({kind:'wnew',id,name:'+ '+ROGUE_WEAPONS[id].name,desc:ROGUE_WEAPONS[id].desc}); }
  for(const p of G.passives){ const def=ROGUE_PASSIVES[p.id];
    if(p.lvl<def.max) opts.push({kind:'pup',id:p.id,name:def.name+' Lv'+(p.lvl+1),desc:def.desc}); }
  if(G.passives.length<MAX_PASSIVES) for(const id in ROGUE_PASSIVES){ if(!G.passives.some(p=>p.id===id))
    opts.push({kind:'pnew',id,name:ROGUE_PASSIVES[id].name,desc:ROGUE_PASSIVES[id].desc}); }
  const out=[], bag=opts.slice();
  for(let k=0;k<3 && bag.length;k++) out.push(bag.splice(Math.floor(rnd()*bag.length),1)[0]);
  return out;
}
export function applyRogueChoice(o){
  if(!o)return;
  if(o.kind==='wnew') G.weapons.push({id:o.id,lvl:1,fireT:0});
  else if(o.kind==='wup'){ const w=G.weapons.find(w=>w.id===o.id); if(w)w.lvl++; }
  else if(o.kind==='pnew'){ G.passives.push({id:o.id,lvl:1}); ROGUE_PASSIVES[o.id].apply(); }
  else if(o.kind==='pup'){ const p=G.passives.find(p=>p.id===o.id); if(p){ p.lvl++; ROGUE_PASSIVES[o.id].apply(); } }
}
