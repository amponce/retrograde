import { G, resetGame, setViewport } from '../core/state.js';
import { advance } from '../core/step.js';
import { drainEvents } from '../core/events.js';
import { WAVES_PER_LEVEL } from '../core/config.js';
import { render } from './render.js';
import { ensureAudio, applyAudioEvents, loadProgress, musicTick } from './audio.js';
import { attachInput, buildInput, wireScreenButtons, startDailyToday, startOverdriveRun, startRogueRun, startRogueWith } from './input.js';
import { goMap, chooseUpgrade } from '../core/levels.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const overScreen = document.getElementById('overScreen');
const overScore = document.getElementById('overScore');
const overWave = document.getElementById('overWave');
const dailyCard = document.getElementById('dailyCard');
const runCard = document.getElementById('runCard');
const runTitle = document.getElementById('runTitle');
const runReached = document.getElementById('runReached');
const runScore = document.getElementById('runScore');
const runBest = document.getElementById('runBest');
const roguePick = document.getElementById('roguePick');
const draftScreen = document.getElementById('draftScreen');
const draftEls = [0,1,2].map(i=>document.getElementById('draft'+i));
const dailyDate = document.getElementById('dailyDate');
const dailyScore = document.getElementById('dailyScore');
const dailyBest = document.getElementById('dailyBest');

// Size the drawing buffer to the element's real pixel size so the world fills the
// screen (fullscreen on mobile). G.W/G.H are CSS px; the buffer is scaled by dpr.
function resize(){
  const r=canvas.getBoundingClientRect();
  const dpr=Math.min(window.devicePixelRatio||1,3);
  canvas.width=Math.max(1,Math.round(r.width*dpr));
  canvas.height=Math.max(1,Math.round(r.height*dpr));
  setViewport(Math.round(r.width), Math.round(r.height));
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener('resize',resize);
addEventListener('orientationchange',resize);

// Show/hide the start & game-over DOM overlays from the scene (core no longer touches DOM).
function dailyBestFor(seed){ try{ return +(localStorage.getItem('retrograde_daily_'+seed)||0); }catch(e){ return 0; } }
function recordDailyBest(seed, score){
  try{ const b=dailyBestFor(seed); if(score>b)localStorage.setItem('retrograde_daily_'+seed, String(score)); }catch(e){}
}
function overdriveBest(){ try{ return +(localStorage.getItem('retrograde_overdrive_best')||0); }catch(e){ return 0; } }
function recordOverdriveBest(score){ try{ if(score>overdriveBest())localStorage.setItem('retrograde_overdrive_best', String(score)); }catch(e){} }
function rogueBest(){ try{ return +(localStorage.getItem('retrograde_rogue_best')||0); }catch(e){ return 0; } }
function recordRogueBest(score){ try{ if(score>rogueBest())localStorage.setItem('retrograde_rogue_best', String(score)); }catch(e){} }

let cardShownForSeed = null;
let dailyDateStr = '';
let runCardShown = false;
let draftShown = false;
function syncScreens(){
  startScreen.classList.toggle('hide', G.scene!=='start');
  roguePick.classList.toggle('hide', G.scene!=='roguepick');
  if(G.scene==='over'){
    overScore.textContent='SCORE '+G.score;
    overWave.textContent='Level '+G.level+' · Wave '+G.levelWave+'/'+WAVES_PER_LEVEL;
    overScreen.classList.remove('hide');
  } else {
    overScreen.classList.add('hide');
  }
  if(G.scene==='dailyend'){
    if(cardShownForSeed!==G.dailySeed){
      recordDailyBest(G.dailySeed, G.score);
      dailyDateStr = new Date().toLocaleDateString(undefined,{month:'short',day:'numeric'});
      dailyDate.textContent = dailyDateStr;
      dailyScore.textContent = 'SCORE '+G.score;
      dailyBest.textContent = 'BEST '+dailyBestFor(G.dailySeed);
      cardShownForSeed = G.dailySeed;
    }
    dailyCard.classList.remove('hide');
  } else {
    dailyCard.classList.add('hide');
    cardShownForSeed = null;
    if(dailyShareBtn) dailyShareBtn.textContent='⇪ SHARE';
  }
  if(G.scene==='runend'){
    if(!runCardShown){
      if(G.rogue){
        recordRogueBest(G.score);
        runTitle.textContent = 'ROGUE';
        runReached.textContent = 'SURVIVED '+Math.floor(G.runT)+'s · LVL '+G.plevel;
        runScore.textContent = 'SCORE '+G.score;
        runBest.textContent = 'BEST '+rogueBest();
      } else {
        recordOverdriveBest(G.score);
        runTitle.textContent = 'OVERDRIVE';
        runReached.textContent = 'REACHED LEVEL '+G.level+' · WAVE '+G.levelWave;
        runScore.textContent = 'SCORE '+G.score;
        runBest.textContent = 'BEST '+overdriveBest();
      }
      runCardShown = true;
    }
    runCard.classList.remove('hide');
  } else {
    runCard.classList.add('hide');
    runCardShown = false;
  }
  if(G.scene==='draft' && G.draft){
    if(!draftShown){
      const o=G.draft.options;
      for(let i=0;i<3;i++){ const el=draftEls[i];
        if(o[i]){ el.style.display=''; el.innerHTML='<b>'+o[i].name+'</b><br><span style="font-size:.62em;opacity:.85;letter-spacing:0">'+o[i].desc+'</span>'; }
        else el.style.display='none'; }
      draftShown=true;
    }
    draftScreen.classList.remove('hide');
  } else {
    draftScreen.classList.add('hide');
    draftShown=false;
  }
}

loadProgress();                       // seed G.campaign from localStorage
attachInput(canvas, () => G.scene);
wireScreenButtons();                  // LAUNCH / RETRY buttons
const dailyShareBtn = document.getElementById('dailyShareBtn');
const dailyAgainBtn = document.getElementById('dailyAgainBtn');
const dailyMenuBtn = document.getElementById('dailyMenuBtn');
if(dailyShareBtn) dailyShareBtn.onclick = async () => {
  const text = `RETROGRADE — Daily Beat ${dailyDateStr}: ${G.score} ◎  ${location.origin}`;
  try { if(navigator.share) await navigator.share({ title:'RETROGRADE Daily Beat', text }); else { await navigator.clipboard.writeText(text); dailyShareBtn.textContent='COPIED ✓'; } }
  catch(e){}
};
if(dailyAgainBtn) dailyAgainBtn.onclick = startDailyToday;
if(dailyMenuBtn) dailyMenuBtn.onclick = () => goMap();
const runAgainBtn = document.getElementById('runAgainBtn');
const runMenuBtn = document.getElementById('runMenuBtn');
if(runAgainBtn) runAgainBtn.onclick = () => { (G.rogue ? startRogueRun : startOverdriveRun)(); };
if(runMenuBtn) runMenuBtn.onclick = () => goMap();
draftEls.forEach((el,i)=>{ if(el) el.onclick = () => chooseUpgrade(i); });
const pickMap={pick_bolt:'bolt',pick_spread:'spread',pick_seeker:'seeker',pick_beam:'beam'};
for(const id in pickMap){ const el=document.getElementById(id); if(el) el.onclick = () => startRogueWith(pickMap[id]); }
const rogueBackBtn=document.getElementById('rogueBackBtn'); if(rogueBackBtn) rogueBackBtn.onclick = () => { G.scene='start'; };

let lastT=performance.now(), acc=0; const STEP=1/120;
function frame(now){
  let dt=(now-lastT)/1000; lastT=now; if(dt>0.05)dt=0.05;
  if(G.scene==='play'){
    if(G.freeze>0){ G.freeze-=dt; }
    else { acc+=dt; while(acc>=STEP){ advance(buildInput(), STEP); acc-=STEP; } }
  }
  applyAudioEvents(drainEvents());    // play queued sfx / music, persist saves
  musicTick(dt);
  render(ctx, dt);
  syncScreens();
  requestAnimationFrame(frame);
}
resize(); resetGame(); requestAnimationFrame(frame);

if('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(()=>{}));
