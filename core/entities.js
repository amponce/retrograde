import { G } from './state.js';
import { emit } from './events.js';

function spawnEnemy(spec){
  const x=60+Math.random()*(G.W-120);
  const carrier = spec.tier==='carrier';
  G.enemies.push({
    x, y:-40, w:carrier?40:30, h:carrier?38:28,
    pat:spec.pat, t:Math.random()*6, baseX:x, hp:carrier?3+Math.floor(G.wave/2):spec.hp,
    maxhp:carrier?3+Math.floor(G.wave/2):spec.hp, carrier, fireT:0.6+Math.random()*1.2,
    vy:carrier?60:90, amp:40+Math.random()*60, sp:1.2+Math.random()*1.2, flash:0
  });
}
function spawnBoss(tier){
  emit('sfx','bossWarn');
  G.boss={x:G.W/2,y:-120,w:150,h:90,hp:60+tier*40,maxhp:60+tier*40,t:0,phase:'enter',
        fireT:1.4,sweepT:0,flash:0,tier};
}
export { spawnEnemy, spawnBoss };
