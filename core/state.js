import { LEVEL_THEMES, LIFE_EVERY } from './config.js';
import { rnd } from './rng.js';
// Single mutable simulation-state object. Reassign its PROPERTIES; never the binding.
export const G = {
  W: 560, H: 840,           // logical viewport; set by setViewport()
  scene: 'start',           // game-state machine: 'start'|'map'|'levelselect'|'play'|'paused'|'victory'|'complete'|'over'|'dailyend'
  campaign: { unlocked: 1, stars: {}, coins: 0 },
  theme: LEVEL_THEMES[0],
  uiRects: {},              // hit-test rects written by the screen draws, read by input
  daily: false,             // true while a Daily Beat run is active
  dailySeed: 0,             // the seed of the active daily run
  overdrive: false,         // true while an endless OVERDRIVE run is active
  rogue: false,             // true while a ROGUE (Vampire-Survivors-style) run is active
  onBeat: false,            // set each tick from input.onBeat (is this sim step inside a beat window?)
  groove: { mult: 1, chain: 0, t: 0 },
  run: { fireRate:1, dmg:1, multishot:0, pierce:false, bulletSpd:1, regen:1, picks:[] }, // OVERDRIVE compounding upgrades
  draft: null,              // {options:[{id,name,desc}]} while picking an upgrade between waves
};
export function setViewport(w, h) { G.W = w; G.H = h; }

export function resetGame(){
  G.p={x:G.W/2, y:G.H-120, w:34, h:38, speed:340, vx:0, vy:0,
     weapon:'M', power:1, rapid:0, lives:3, invuln:2, fireCd:0,
     shield:3, shieldMax:3, shieldRegen:0, shieldFlash:0,
     thrust:0, hitFlash:0};
  G.nextLifeAt=LIFE_EVERY; // score threshold for the next free life
  G.bullets=[]; G.enemies=[]; G.ebullets=[]; G.pups=[]; G.parts=[]; G.boss=null;
  G.stars=[]; for(let i=0;i<110;i++)G.stars.push({x:rnd()*G.W,y:rnd()*G.H,z:rnd(),tw:rnd()*6});
  G.grid={off:0};
  G.nebulae=[
    {x:G.W*0.25,y:G.H*0.28,r:200,c:'157,78,221',a:0.10,vy:6},
    {x:G.W*0.72,y:G.H*0.5,r:240,c:'255,45,149',a:0.08,vy:5},
    {x:G.W*0.5,y:G.H*0.12,r:180,c:'34,120,200',a:0.07,vy:7}
  ];
  G.planet={x:G.W*0.78,y:G.H*0.2,r:54,vy:3};
  G.shootingStars=[]; G.shootTimer=2+rnd()*4;
  G.score=0; G.wave=0; G.shake=0; G.freeze=0; G.pupCycleIdx=0;
  G.groove={mult:1, chain:0, t:0}; G.onBeat=false;
  G.daily=false; G.dailySeed=0; G.overdrive=false;
  G.rogue=false; G.runT=0; G.xp=0; G.plevel=1; G.xpNext=8; // ROGUE: run clock + XP/level (earned, not instant)
  G.gems=[]; G.weapons=[]; G.passives=[]; G.magnet=60; G.xpGain=1; // ROGUE: gems, weapon + passive loadout, modest pickup radius (move to collect), XP mult
  G.worldW=G.W; G.worldH=G.H; G.camX=0; G.camY=0;          // ROGUE: large arena + follow-camera (viewport-sized for other modes)
  G.waveNum=0; G.waveT=2.2; G.rogueQueue=[]; G.waveBanner=''; G.waveBannerT=0;  // ROGUE: telegraphed wave director
  G.xpFlash=0; G.levelFlash=0;                              // ROGUE: gem-collect + level-up flashes
  G.p.phase=0; G.p.phaseT=0;                               // ROGUE: PHASE passive (periodic invuln)
  G.run={fireRate:1, dmg:1, multishot:0, pierce:false, bulletSpd:1, regen:1, picks:[]}; G.draft=null;
  G.spawnTimer=0; G.waveActive=false; G.toSpawn=[]; G.betweenWaves=1.2;
}
