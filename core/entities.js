import { G } from './state.js';
import { emit } from './events.js';
import { rnd } from './rng.js';

function spawnEnemy(spec){
  const type=spec.type||'grunt';
  const x=60+rnd()*(G.W-120);
  // per-archetype stats — same wave COUNT, varied composition (keeps tuned difficulty,
  // adds variety). Movement reuses spec.pat; vy/amp/sp differentiate the feel.
  let w=30,h=28,hp=spec.hp,vy=90,amp=40+rnd()*60,sp=1.2+rnd()*1.2,fireT=0.6+rnd()*1.2,carrier=false;
  if(type==='carrier'){ w=40;h=38;hp=3+Math.floor(G.wave/2);vy=60;carrier=true; }       // drops capsules
  else if(type==='darter'){ w=24;h=24;hp=Math.max(1,spec.hp-1);vy=175;amp=30+rnd()*40;sp=2.2+rnd()*1.4;fireT=2.2+rnd()*1.6; } // fast, fragile, rushes
  else if(type==='tank'){ w=46;h=42;hp=spec.hp+5;vy=42;amp=18+rnd()*20;sp=0.7+rnd()*0.5;fireT=1.4+rnd()*1.2; }                 // slow, high-HP wall
  else if(type==='weaver'){ w=30;h=26;hp=spec.hp;vy=78;amp=95+rnd()*55;sp=1.8+rnd()*0.9;fireT=0.9+rnd()*1.0; }                 // wide weave, hard to hit
  else if(type==='splitter'){ w=34;h=30;hp=spec.hp+1;vy=78;amp=40+rnd()*40;sp=1.1+rnd()*0.7;fireT=1.2+rnd()*1.2; }             // splits into two on death
  G.enemies.push({ x, y:-40, w, h, pat:spec.pat, t:rnd()*6, baseX:x,
    hp, maxhp:hp, carrier, type, fireT, vy, amp, sp, flash:0 });
}
function spawnBoss(tier){
  emit('sfx','bossWarn');
  G.boss={x:G.W/2,y:-120,w:150,h:90,hp:60+tier*40,maxhp:60+tier*40,t:0,phase:'enter',
        fireT:1.4,sweepT:0,flash:0,tier};
}
export { spawnEnemy, spawnBoss };
