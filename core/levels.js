import { G, resetGame } from './state.js';
import { emit } from './events.js';
import { themeFor, NUM_LEVELS, WAVES_PER_LEVEL, LEVEL_THEMES } from './config.js';
import { rollDraft, applyUpgrade } from './upgrades.js';
import { rnd, seedRNG } from './rng.js';

function levelNodes(){
  const nodes=[]; const cols=[G.W*0.30,G.W*0.7,G.W*0.5];
  for(let i=0;i<NUM_LEVELS;i++){
    const y=G.H-150 - i*((G.H-260)/(NUM_LEVELS-1));
    const x=cols[i%3 === 0 ? 0 : (i%3===1?1:2)];
    nodes.push({n:i+1,x,y,r:34});
  }
  return nodes;
}
function goMap(){ G.scene='map'; emit('music','stop'); }
function openLevelSelect(n){ if(n>G.campaign.unlocked)return; G.selectedLevel=n; G.scene='levelselect'; }
function startLevel(n){
  resetGame(); G.daily=false; G.level=n; G.levelWave=0; G.scene='play';
  G.theme=themeFor(n); G.nebulae.forEach((nb,i)=>nb.c=G.theme.neb[i%G.theme.neb.length]);
  emit('music','start'); beginNextWave();
}
function startDaily(config){
  seedRNG(config.seed);                 // seed BEFORE resetGame so the whole run replays
  resetGame();
  G.daily=true; G.dailySeed=config.seed;
  G.level=config.difficulty; G.levelWave=0; G.scene='play';
  G.theme=LEVEL_THEMES[config.theme % LEVEL_THEMES.length];
  G.nebulae.forEach((nb,i)=>nb.c=G.theme.neb[i%G.theme.neb.length]);
  emit('music','start'); beginNextWave();
}
function startOverdrive(seed){
  seedRNG(seed); resetGame();
  G.overdrive=true; G.level=1; G.levelWave=0; G.scene='play';
  G.theme=themeFor(1); G.nebulae.forEach((nb,i)=>nb.c=G.theme.neb[i%G.theme.neb.length]);
  emit('music','start'); beginNextWave();
}
function startRogue(seed){
  seedRNG(seed); resetGame();
  G.rogue=true; G.level=1; G.scene='play';
  G.theme=themeFor(1); G.nebulae.forEach((nb,i)=>nb.c=G.theme.neb[i%G.theme.neb.length]);
  G.spawnTimer=0.5;              // first swarmer arrives shortly; no waves — continuous horde
  emit('music','start');
}
function beginNextWave(){
  G.levelWave++;
  G.wave=(G.level-1)*WAVES_PER_LEVEL+G.levelWave;
  G.musicIntensity = 1 + Math.floor((G.wave-1)/2);
  G.phase='intermission';
  if(G.levelWave>=WAVES_PER_LEVEL){ G.interT=2.4; G.interLabel='BOSS'; G.interSub='Level '+G.level; emit('sfx','bossWarn'); }
  else { G.interT=1.8; G.interLabel='WAVE '+G.levelWave+'/'+(WAVES_PER_LEVEL); G.interSub='Level '+G.level; }
}
function winLevel(){
  if(G.daily){ G.scene='dailyend'; emit('music','stop'); emit('sfx','life'); return; }
  if(G.overdrive){ // endless: clearing a boss escalates to the next, harder set — never "wins"
    emit('sfx','life'); G.level++; G.levelWave=0;
    G.theme=themeFor(G.level); G.nebulae.forEach((nb,i)=>nb.c=G.theme.neb[i%G.theme.neb.length]);
    offerDraft(); return;   // reward a draft, then continue on pick
  }
  G.scene='victory'; emit('music','stop');
  const reward=500+G.level*250; G.campaign.coins+=reward;
  const newUnlock = Math.max(G.campaign.unlocked, Math.min(NUM_LEVELS, G.level+1));
  const firstClear = !G.campaign.stars[G.level];
  G.campaign.stars[G.level]=Math.max(G.campaign.stars[G.level]||0, 1);
  G.campaign.unlocked=newUnlock; emit('save');
  G.victoryData={level:G.level, reward, firstClear, last:(G.level>=NUM_LEVELS)};
  emit('sfx','life');
}
// OVERDRIVE: between waves, pause into a draft of 3 upgrades; chooseUpgrade resumes.
function offerDraft(){ G.draft={options:rollDraft(3)}; G.scene='draft'; }
function chooseUpgrade(idx){
  if(!G.draft)return;
  const opt=G.draft.options[idx]; if(opt)applyUpgrade(opt.id);
  G.draft=null; G.scene='play';
  if(!G.rogue) beginNextWave();   // ROGUE just resumes the horde; OVERDRIVE/campaign continue the wave flow
}
function startWave(n){
  G.waveActive=true; G.toSpawn=[]; emit('sfx','wave');
  // OVERDRIVE uncaps the curve so it NEVER plateaus (HP + density climb forever vs the
  // compounding build); campaign keeps its tuned, gentler curve.
  const od=G.overdrive;
  const count = od ? Math.min(34, 8 + Math.floor(n*0.55)) : Math.min(22, 8 + Math.floor(n*0.85));
  const hpBase = od ? 1 + Math.floor(n/5) : 1 + Math.floor(n/7);   // OVERDRIVE: HP climbs uncapped (DPS pressure)
  const patterns=['dive','sine','swoop','hover'];
  // archetypes unlock as the level's waves progress — wave 1 basics, each later wave adds a type
  const roster=['grunt'];
  if(G.levelWave>=2)roster.push('darter');
  if(G.levelWave>=3)roster.push('tank');
  if(G.levelWave>=4)roster.push('weaver');
  if(G.level>=3)roster.push('splitter');
  for(let i=0;i<count;i++){
    const pat=patterns[(n+i)%patterns.length];
    let type='grunt';
    if(roster.length>1 && rnd()<0.42) type=roster[1+Math.floor(rnd()*(roster.length-1))]; // ~40% archetypes, rest grunts
    G.toSpawn.push({pat, delay: i*0.44 + rnd()*0.18, hp: hpBase, type});
  }
  // carrier (capsule-dropping) enemies, spread through the wave
  const carriers = od ? Math.min(5, 1 + Math.floor(n/7)) : Math.min(3, 1 + Math.floor(n/6));
  for(let c=0;c<carriers;c++){ const idx=Math.floor((c+1)*count/(carriers+1)); if(G.toSpawn[idx])G.toSpawn[idx].type='carrier'; }
  G.spawnTimer=0;
}
export { levelNodes, goMap, openLevelSelect, startLevel, startDaily, startOverdrive, startRogue, beginNextWave, winLevel, startWave, offerDraft, chooseUpgrade };
