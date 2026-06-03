import { G } from './state.js';
import { emit } from './events.js';
import { WEAPONS, PUP_CYCLE } from './config.js';

function tryFire(){
  if(G.p.fireCd>0)return;
  const wp=WEAPONS[G.p.weapon];
  let cd=wp.cd; if(G.p.rapid>0)cd*=0.55;
  // higher power fires a touch faster too
  cd*=(1 - (G.p.power-1)*0.06);
  cd*=G.run.fireRate;                 // OVERDRIVE: compounding fire-rate upgrades
  G.p.fireCd=cd;
  const bx=G.p.x, by=G.p.y-20, lv=G.p.power;
  const start=G.bullets.length;       // mark this shot's bullets for run-modifier post-processing
  if(G.p.weapon==='M'){
    const dmg=1+Math.floor((lv-1)/1)*0.5;
    G.bullets.push(mkB(bx,by,0,-760,'#22e1ff',4+lv*0.5,9+lv,dmg));
    if(lv>=2){G.bullets.push(mkB(bx-9,by+4,0,-760,'#22e1ff',4,9,dmg));G.bullets.push(mkB(bx+9,by+4,0,-760,'#22e1ff',4,9,dmg));}
    if(lv>=4){G.bullets.push(mkB(bx-16,by+8,-60,-740,'#22e1ff',4,9,dmg));G.bullets.push(mkB(bx+16,by+8,60,-740,'#22e1ff',4,9,dmg));}
    emit('sfx','shoot');
  } else if(G.p.weapon==='S'){
    const spread=1+lv*2, span=0.5+lv*0.12;
    for(let i=0;i<spread;i++){const a=-Math.PI/2 + (i-(spread-1)/2)*(span/(spread-1));
      G.bullets.push(mkB(bx,by,Math.cos(a)*660,Math.sin(a)*660,'#ff2d95',5,9,1));}
    emit('sfx','shoot');
  } else if(G.p.weapon==='L'){
    G.bullets.push(mkB(bx,by,0,-1150,'#ffd23a',6+lv,26+lv*3,2+lv,true));
    if(lv>=2){G.bullets.push(mkB(bx-12,by,0,-1120,'#ffd23a',4,20,2,true));G.bullets.push(mkB(bx+12,by,0,-1120,'#ffd23a',4,20,2,true));}
    if(lv>=3){G.bullets.push(mkB(bx-22,by+4,0,-1100,'#ffd23a',4,18,2,true));G.bullets.push(mkB(bx+22,by+4,0,-1100,'#ffd23a',4,18,2,true));}
    emit('sfx','laser');
  } else if(G.p.weapon==='B'){
    G.bullets.push(mkB(bx,by,-70,-520,'#39ff14',7+lv,12,1+lv*0.5,false,true));
    G.bullets.push(mkB(bx,by, 70,-520,'#39ff14',7+lv,12,1+lv*0.5,false,true));
    if(lv>=2)G.bullets.push(mkB(bx,by,0,-580,'#39ff14',7+lv,12,1+lv*0.5,false,true));
    if(lv>=3){G.bullets.push(mkB(bx,by,-130,-470,'#39ff14',7,12,1,false,true));G.bullets.push(mkB(bx,by,130,-470,'#39ff14',7,12,1,false,true));}
    emit('sfx','bomb');
  }
  // apply OVERDRIVE run modifiers to everything fired this shot
  const r=G.run;
  for(let i=start;i<G.bullets.length;i++){ const b=G.bullets[i];
    b.dmg*=r.dmg; if(r.pierce)b.pierce=true; if(r.bulletSpd!==1){ b.vx*=r.bulletSpd; b.vy*=r.bulletSpd; } }
  if(r.multishot>0 && G.bullets.length>start){ const base=G.bullets[start];
    for(let m=1;m<=r.multishot;m++){ const s=(m%2)?1:-1, a=0.16*Math.ceil(m/2)*s;
      G.bullets.push({...base, x:base.x+12*Math.ceil(m/2)*s,
        vx:base.vx*Math.cos(a)-base.vy*Math.sin(a), vy:base.vx*Math.sin(a)+base.vy*Math.cos(a)}); } }
}
function mkB(x,y,vx,vy,color,r,len,dmg,pierce=false,bomb=false){
  return {x,y,vx,vy,color,r,len,dmg,pierce,bomb,life:2.2,hits:0};
}
function dropPup(x,y){
  const start=G.pupCycleIdx%PUP_CYCLE.length; G.pupCycleIdx++;
  G.pups.push({x,y,vy:55,idx:start,t:0,cycT:0});
}
function pupKind(pu){ return PUP_CYCLE[pu.idx%PUP_CYCLE.length]; }
function applyPup(kind){
  emit('sfx','pup');
  if(kind==='R'){G.p.rapid=6;}
  else if(kind==='shield'){
    if(G.p.shield>=G.p.shieldMax && G.p.shieldMax<5)G.p.shieldMax++; // already full? upgrade capacity
    G.p.shield=G.p.shieldMax; G.p.shieldRegen=0; G.p.shieldFlash=0.5; emit('sfx','shieldUp');
  }
  else { // weapon letter — switch type but keep your power level (never downgrade)
    if(G.p.weapon===kind)G.p.power=Math.min(4,G.p.power+1); else {G.p.weapon=kind;}
  }
  flash(kind);
}
function flash(kind){
  const label = kind==='R'?'RAPID FIRE': kind==='shield'?'SHIELD': WEAPONS[kind].name.toUpperCase();
  G.pupMsg={text:label,age:0};
}
export { tryFire, mkB, dropPup, pupKind, applyPup, flash };
