import { G, resetGame } from './state.js';
import { emit } from './events.js';
import { themeFor, NUM_LEVELS, WAVES_PER_LEVEL, LEVEL_THEMES } from './config.js';
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
  G.scene='victory'; emit('music','stop');
  const reward=500+G.level*250; G.campaign.coins+=reward;
  const newUnlock = Math.max(G.campaign.unlocked, Math.min(NUM_LEVELS, G.level+1));
  const firstClear = !G.campaign.stars[G.level];
  G.campaign.stars[G.level]=Math.max(G.campaign.stars[G.level]||0, 1);
  G.campaign.unlocked=newUnlock; emit('save');
  G.victoryData={level:G.level, reward, firstClear, last:(G.level>=NUM_LEVELS)};
  emit('sfx','life');
}
function startWave(n){
  G.waveActive=true; G.toSpawn=[]; emit('sfx','wave');
  const count = Math.min(28, 9 + Math.floor(n*1.1)); // gentle ramp on the global wave number
  const patterns=['dive','sine','swoop','hover'];
  for(let i=0;i<count;i++){
    const pat=patterns[(n+i)%patterns.length];
    G.toSpawn.push({pat, delay: i*0.40 + rnd()*0.18, hp: 1+Math.floor(n/5), tier:'grunt'});
  }
  // a few carrier (capsule-dropping) enemies, spread through the wave (capped so late levels stay fair)
  const carriers=Math.min(3, 1+Math.floor(n/5));
  for(let c=0;c<carriers;c++){ const idx=Math.floor((c+1)*count/(carriers+1)); if(G.toSpawn[idx])G.toSpawn[idx].tier='carrier'; }
  G.spawnTimer=0;
}
export { levelNodes, goMap, openLevelSelect, startLevel, startDaily, beginNextWave, winLevel, startWave };
