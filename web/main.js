import { G, resetGame, setViewport } from '../core/state.js';
import { advance } from '../core/step.js';
import { drainEvents } from '../core/events.js';
import { WAVES_PER_LEVEL } from '../core/config.js';
import { render } from './render.js';
import { ensureAudio, applyAudioEvents, loadProgress, musicTick } from './audio.js';
import { attachInput, buildInput, wireScreenButtons } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const overScreen = document.getElementById('overScreen');
const overScore = document.getElementById('overScore');
const overWave = document.getElementById('overWave');

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
function syncScreens(){
  startScreen.classList.toggle('hide', G.scene!=='start');
  if(G.scene==='over'){
    overScore.textContent='SCORE '+G.score;
    overWave.textContent='Level '+G.level+' · Wave '+G.levelWave+'/'+WAVES_PER_LEVEL;
    overScreen.classList.remove('hide');
  } else {
    overScreen.classList.add('hide');
  }
}

loadProgress();                       // seed G.campaign from localStorage
attachInput(canvas, () => G.scene);
wireScreenButtons();                  // LAUNCH / RETRY buttons

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
