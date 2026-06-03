import { G } from './state.js';
import { emit } from './events.js';
import { rnd } from './rng.js';
import { spawnEnemy, spawnBoss } from './entities.js';
import { tryFire, dropPup, pupKind, applyPup } from './weapons.js';
import { startWave, beginNextWave, winLevel } from './levels.js';
import { WAVES_PER_LEVEL, LIFE_EVERY, PUP_CYCLE, SHIELD_REGEN_DELAY, SHIELD_REGEN_TIME } from './config.js';
import { grooveKill, grooveHit, grooveTick, grooveMult } from './groove.js';

// ---------------- Sim helpers ----------------
function boom(x,y,color,n,sp){for(let i=0;i<n;i++){const a=rnd()*6.28,s=sp*(0.3+rnd());
  G.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0.4+rnd()*0.5,age:0,color,r:1.5+rnd()*3});}}
function addShake(m){G.shake=Math.max(G.shake,m);}
function rectHit(a,b){return Math.abs(a.x-b.x)<(a.w/2+b.w/2)&&Math.abs(a.y-b.y)<(a.h/2+b.h/2);}

// ---------------- Simulation tick ----------------
// input contract:
//   { left, right, up, down, fire, mouseActive, mx, my, grab, tx, ty, musicOn }
// The web input adapter folds touch auto-fire into `fire`, and reports the audio
// engine's running state as `musicOn` (used only for the music-off firing fallback).
export function advance(input, dt){
  G.onBeat = !!input.onBeat;
  // starfield + grid scroll
  for(const s of G.stars){s.y+=(40+s.z*120)*dt; if(s.y>G.H){s.y=-4;s.x=rnd()*G.W;} s.tw+=dt*3;}
  G.grid.off=(G.grid.off+dt*120)%60;
  // drifting nebulae + planet (slow, parallax-ish)
  for(const n of G.nebulae){n.y+=n.vy*dt; if(n.y-n.r>G.H){n.y=-n.r;n.x=rnd()*G.W;}}
  G.planet.y+=G.planet.vy*dt; if(G.planet.y-G.planet.r>G.H){G.planet.y=-G.planet.r;G.planet.x=80+rnd()*(G.W-160);}
  // shooting stars
  G.shootTimer-=dt;
  if(G.shootTimer<=0){G.shootTimer=3+rnd()*5;
    const sx=rnd()*G.W, ang=Math.PI*0.25+rnd()*0.3;
    G.shootingStars.push({x:sx,y:-10,vx:Math.cos(ang)*420,vy:Math.sin(ang)*420,life:1.2,age:0});}
  for(const ss of G.shootingStars){ss.x+=ss.vx*dt;ss.y+=ss.vy*dt;ss.age+=dt;}
  G.shootingStars=G.shootingStars.filter(ss=>ss.age<ss.life);

  // player movement
  if(input.grab){ // touch: ease toward the relative target set by the drag delta
    G.p.x+=(input.tx-G.p.x)*Math.min(1,dt*18); G.p.y+=(input.ty-G.p.y)*Math.min(1,dt*18);
    G.p.thrust=1;
  } else if(input.mouseActive){ // desktop mouse: ship eases toward the cursor
    G.p.x+=(input.mx-G.p.x)*Math.min(1,dt*18); G.p.y+=(input.my-G.p.y)*Math.min(1,dt*18);
    G.p.thrust=1;
  } else {
    let mx=(input.right?1:0)-(input.left?1:0), my=(input.down?1:0)-(input.up?1:0);
    G.p.x+=mx*G.p.speed*dt; G.p.y+=my*G.p.speed*dt; G.p.thrust=(input.up?1:0.4);
  }
  G.p.x=Math.max(G.p.w/2,Math.min(G.W-G.p.w/2,G.p.x));
  G.p.y=Math.max(60,Math.min(G.H-50,G.p.y));

  // firing (auto when held)
  G.p.fireCd-=dt;
  if((input.fire||input.mouseActive)&&G.p.fireCd<=0)tryFire(); // mouse control auto-fires
  if(G.p.rapid>0)G.p.rapid-=dt;
  if(G.p.invuln>0)G.p.invuln-=dt;
  if(G.p.hitFlash>0)G.p.hitFlash-=dt;
  if(G.p.shieldFlash>0)G.p.shieldFlash-=dt;
  // shield regen: build the timer when not recently hit, regain a point when full
  if(G.p.shield<G.p.shieldMax){
    G.p.shieldRegen+=dt*G.run.regen;
    if(G.p.shieldRegen>=SHIELD_REGEN_DELAY+SHIELD_REGEN_TIME){
      G.p.shield++; G.p.shieldRegen=SHIELD_REGEN_DELAY; G.p.shieldFlash=0.4; emit('sfx','shieldUp');
    }
  }

  // bullets
  for(const b of G.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    if(b.bomb)b.vy+=240*dt;}
  G.bullets=G.bullets.filter(b=>b.life>0 && b.y>-40 && b.y<G.H+40 && b.x>-40 && b.x<G.W+40);

  // level / wave flow
  if(G.phase==='intermission'){
    G.interT-=dt;
    if(G.interT<=0){
      G.phase='fighting';
      if(G.levelWave>=WAVES_PER_LEVEL){ spawnBoss(G.level); }
      else { startWave(G.wave); }
    }
  } else { // fighting
    if(G.waveActive){
      G.spawnTimer+=dt;
      for(let i=G.toSpawn.length-1;i>=0;i--){if(G.spawnTimer>=G.toSpawn[i].delay){spawnEnemy(G.toSpawn[i]);G.toSpawn.splice(i,1);}}
      if(G.toSpawn.length===0 && G.enemies.length===0 && !G.boss){
        G.waveActive=false;
        addScore(100 + G.wave*50); // wave-clear bonus
        beginNextWave();           // → next wave intermission, or BOSS (OVERDRIVE drafts only on boss clear)
      }
    }
  }

  // enemies
  for(const e of G.enemies){
    e.t+=dt; if(e.flash>0)e.flash-=dt;
    if(e.pat==='dive'){e.y+=e.vy*dt; e.x=e.baseX+Math.sin(e.t*e.sp)*e.amp*0.3;}
    else if(e.pat==='sine'){e.y+=e.vy*0.8*dt; e.x=e.baseX+Math.sin(e.t*e.sp*1.4)*e.amp;}
    else if(e.pat==='swoop'){e.y+=e.vy*dt; e.x=e.baseX+Math.sin(e.t*e.sp)*e.amp*1.4;}
    else if(e.pat==='hover'){e.y+=(e.y<140?e.vy:0)*dt; e.x=e.baseX+Math.sin(e.t*1.6)*e.amp;}
    // charge up, then fire on the next musical beat (handled in web onMusicBeat)
    e.fireT-=dt;
    if(e.fireT<=0 && !e.charged){e.charged=true; e.fireT=1.1+rnd()*1.4;}
    // fallback if music is somehow off: fire on the timer directly
    if(!input.musicOn && e.charged && e.y>0 && e.y<G.H*0.7){e.charged=false;
      const a=Math.atan2(G.p.y-e.y,G.p.x-e.x);
      G.ebullets.push({x:e.x,y:e.y+e.h/2,vx:Math.cos(a)*200,vy:Math.sin(a)*200,r:5,color:'#ff5a2a',life:5});}
  }
  // off bottom
  for(let i=G.enemies.length-1;i>=0;i--){if(G.enemies[i].y>G.H+50)G.enemies.splice(i,1);}

  // boss
  if(G.boss)updateBoss(dt);

  // enemy bullets
  for(const eb of G.ebullets){eb.x+=eb.vx*dt;eb.y+=eb.vy*dt;eb.life-=dt;}
  G.ebullets=G.ebullets.filter(eb=>eb.life>0&&eb.y<G.H+30&&eb.y>-30&&eb.x>-30&&eb.x<G.W+30);

  // bullet vs enemy
  for(const b of G.bullets){
    if(b.vy>0)continue; // player bullets go up
    for(const e of G.enemies){
      if(rectHit({x:b.x,y:b.y,w:b.r*2,h:b.len},e)){
        e.hp-=b.dmg; e.flash=0.1; b.hits++; emit('sfx','hit');
        boom(b.x,b.y,e.carrier?'#ffd23a':'#22e1ff',4,160);
        if(!b.pierce)b.life=0;
        if(e.hp<=0){ killEnemy(e); }
        if(b.bomb){ b.life=0; bombSplash(b.x,b.y); }
        if(!b.pierce)break;
      }
    }
    const bs=G.boss; // capture; killBoss()/bombSplash() may null the global mid-loop
    if(bs && b.life>0 && b.vy<0 && bs.phase!=='enter'){
      if(Math.abs(b.x-bs.x)<bs.w/2 && Math.abs(b.y-bs.y)<bs.h/2){
        bs.hp-=b.dmg; bs.flash=0.06; b.hits++; emit('sfx','hit'); boom(b.x,b.y,'#ffd23a',4,160);
        if(!b.pierce)b.life=0;
        if(b.bomb){b.life=0;bombSplash(b.x,b.y);}
        if(G.boss && G.boss.hp<=0)killBoss();
      }
    }
  }
  G.bullets=G.bullets.filter(b=>b.life>0);

  // player collisions
  if(G.p.invuln<=0){
    for(const e of G.enemies){if(rectHit(G.p,e)){hurtPlayer();killEnemy(e,true);break;}}
    for(let i=G.ebullets.length-1;i>=0;i--){const eb=G.ebullets[i];
      if(Math.abs(eb.x-G.p.x)<G.p.w/2 && Math.abs(eb.y-G.p.y)<G.p.h/2){G.ebullets.splice(i,1);hurtPlayer();break;}}
    if(G.boss && G.boss.phase!=='enter' && rectHit(G.p,G.boss))hurtPlayer();
  }

  // power-ups
  for(const pu of G.pups){pu.y+=pu.vy*dt;pu.t+=dt;pu.cycT+=dt;
    if(pu.cycT>=0.7){pu.cycT=0;pu.idx=(pu.idx+1)%PUP_CYCLE.length;} // advance the letter
    if(Math.abs(pu.x-G.p.x)<G.p.w/2+14 && Math.abs(pu.y-G.p.y)<G.p.h/2+14){pu.dead=true;applyPup(pupKind(pu));}}
  G.pups=G.pups.filter(pu=>!pu.dead && pu.y<G.H+30);

  // particles
  for(const pt of G.parts){pt.age+=dt;pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.vx*=0.96;pt.vy*=0.96;}
  G.parts=G.parts.filter(pt=>pt.age<pt.life);

  grooveTick(dt);
  if(G.shake>0)G.shake=Math.max(0,G.shake-dt*40);
  if(G.pupMsg){G.pupMsg.age+=dt;if(G.pupMsg.age>1.6)G.pupMsg=null;}
  if(G.lifeMsg){G.lifeMsg.age+=dt;if(G.lifeMsg.age>2.0)G.lifeMsg=null;}
  if(G.dropFlash>0)G.dropFlash=Math.max(0,G.dropFlash-dt*2.2);
  if(G.bossFlash>0)G.bossFlash=Math.max(0,G.bossFlash-dt*1.5);
}

function addScore(n){
  G.score+=n;
  while(G.score>=G.nextLifeAt){ // free life every LIFE_EVERY points
    G.nextLifeAt+=LIFE_EVERY; G.p.lives++; emit('sfx','life');
    G.lifeMsg={age:0}; addShake(3);
  }
}
function killEnemy(e,silent){
  const idx=G.enemies.indexOf(e); if(idx>=0)G.enemies.splice(idx,1);
  const ob=G.onBeat;
  addScore(Math.round((e.carrier?50:10)*grooveMult()));   // groove multiplies kill score
  grooveKill(ob);                                          // on-beat kills build the chain
  // beefier, brighter debris on on-beat kills (the trailer money-shot)
  boom(e.x,e.y,e.carrier?'#ffd23a':'#ff2d95',Math.round((e.carrier?20:12)*(ob?1.6:1)),(e.carrier?260:200)*(ob?1.2:1));
  if(ob||e.carrier)G.freeze=Math.max(G.freeze, e.carrier?0.06:0.035); // beat-locked hitstop on significant / on-beat kills
  if(!silent)emit('sfx','boom'); addShake(e.carrier?4:2);
  if(e.carrier)dropPup(e.x,e.y);
}
function bombSplash(x,y){boom(x,y,'#39ff14',16,300);addShake(5);emit('sfx','boom');
  for(const e of G.enemies){if(Math.abs(e.x-x)<70&&Math.abs(e.y-y)<70){e.hp-=3;e.flash=0.1;if(e.hp<=0)killEnemy(e);}}
  if(G.boss&&G.boss.phase!=='enter'&&Math.abs(G.boss.x-x)<90&&Math.abs(G.boss.y-y)<90){G.boss.hp-=4;G.boss.flash=0.08;if(G.boss&&G.boss.hp<=0)killBoss();}}
function hurtPlayer(){
  grooveHit();                       // any hit (even on shield) breaks your groove
  if(G.p.shield>0){
    G.p.shield--; G.p.invuln=1.0; G.p.shieldRegen=0; G.p.shieldFlash=0.4;
    emit('sfx','shieldBreak'); boom(G.p.x,G.p.y,'#22e1ff',16,220); addShake(5);
    return;
  }
  G.p.lives--; G.p.invuln=2.2; G.p.hitFlash=0.4; emit('sfx','hurt'); addShake(9); boom(G.p.x,G.p.y,'#ff2d95',24,300);
  G.freeze=0.08;
  if(G.p.lives<=0)gameOver();
}
function gameOver(){
  if(G.daily){ G.scene='dailyend'; emit('sfx','over'); emit('music','stop'); return; }
  if(G.overdrive){ G.scene='runend'; emit('sfx','over'); emit('music','stop'); return; }
  G.scene='over'; emit('sfx','over'); emit('music','stop');
}

// ---------------- Boss ----------------
function updateBoss(dt){
  const b=G.boss; b.t+=dt; if(b.flash>0)b.flash-=dt;
  if(b.phase==='enter'){b.y+=70*dt; if(b.y>=130){b.y=130;b.phase='fight';}}
  else {
    b.x=G.W/2+Math.sin(b.t*0.7)*(G.W/2-110);
    b.fireT-=dt;
    if(b.fireT<=0){b.fireT=Math.max(0.42,1.3-b.tier*0.22);
      // aimed triple
      const a=Math.atan2(G.p.y-b.y,G.p.x-b.x);
      for(let k=-1;k<=1;k++){const aa=a+k*0.26;
        G.ebullets.push({x:b.x,y:b.y+b.h/2,vx:Math.cos(aa)*230,vy:Math.sin(aa)*230,r:6,color:'#ff5a2a',life:6});}
    }
    b.sweepT-=dt;
    if(b.sweepT<=0){b.sweepT=2.4;
      // radial burst
      const N=10+b.tier*2;
      for(let k=0;k<N;k++){const aa=(k/N)*Math.PI + Math.PI*0.0;
        G.ebullets.push({x:b.x,y:b.y+b.h/2,vx:Math.cos(aa)*150,vy:Math.abs(Math.sin(aa))*150+40,r:5,color:'#9d4edd',life:6});}
    }
  }
}
function killBoss(){
  const tier=G.boss.tier;
  boom(G.boss.x,G.boss.y,'#ffd23a',40,360); boom(G.boss.x,G.boss.y,'#ff2d95',30,300);
  addShake(14); emit('sfx','bossKill'); G.freeze=Math.max(G.freeze,0.12); // web audio maps 'bossKill' → the original cascading triple boom (0/120/240ms)
  addScore(Math.round((300+tier*200)*grooveMult())); grooveKill(G.onBeat); G.boss=null;
  winLevel();
}

export { boom, addShake, rectHit };
