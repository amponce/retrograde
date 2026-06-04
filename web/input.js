import { G } from '../core/state.js';
import { tryFire } from '../core/weapons.js';
import { goMap, openLevelSelect, startLevel, startDaily, startOverdrive, startRogue } from '../core/levels.js';
import { seedRNG } from '../core/rng.js';
import { dailySeed, dailyConfig } from '../core/daily.js';
import { ensureAudio, pauseMusic, resumeMusic, MUSIC, onBeatNow } from './audio.js';

// Platform input state (held keys, pointer mode). Lives in the adapter, not the sim.
const keys={};
let fireHeld=false, mouseCtrl=false;
let mx=0, my=0;                 // desktop cursor target
let grab=false, tx=0, ty=0;     // touch drag target
let dragId=null, dragAnchor=null;
let canvasEl=null, getScene=()=>G.scene, isTouch=false, autoFire=false;

function canvasXY(clientX,clientY){const r=canvasEl.getBoundingClientRect();return {x:(clientX-r.left)/r.width*G.W,y:(clientY-r.top)/r.height*G.H};}

// tap/click router for non-play screens (map, level-select, victory, complete)
function inRect(x,y,r){return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;}
function handleTap(x,y){
  ensureAudio();
  const s=getScene();
  if(s==='map'){
    for(const nd of (G.uiRects.nodes||[])){
      if(nd.n<=G.campaign.unlocked && Math.hypot(x-nd.x,y-nd.y)<nd.r+8){ openLevelSelect(nd.n); return; }
    }
  } else if(s==='levelselect'){
    if(G.uiRects.play && inRect(x,y,G.uiRects.play)){ seedRNG((Math.random()*0x100000000)>>>0); startLevel(G.selectedLevel); return; }
    if(G.uiRects.closeLS && inRect(x,y,G.uiRects.closeLS)){ goMap(); return; }
  } else if(s==='victory'){
    if(G.uiRects.vNext && inRect(x,y,G.uiRects.vNext)){
      if(G.victoryData && G.victoryData.last){ G.scene='complete'; return; }
      goMap(); return;
    }
  } else if(s==='complete'){
    if(G.uiRects.cAgain && inRect(x,y,G.uiRects.cAgain)){ goMap(); return; }
  }
}

// Build the input struct advance(input,dt) consumes, from current adapter state.
export function buildInput(){
  return {
    left: keys['ArrowLeft']||keys['KeyA'],
    right: keys['ArrowRight']||keys['KeyD'],
    up: keys['ArrowUp']||keys['KeyW'],
    down: keys['ArrowDown']||keys['KeyS'],
    fire: fireHeld||autoFire,        // touch auto-fires; mouseActive auto-fires separately
    mouseActive: mouseCtrl,
    mx, my, grab, tx, ty,
    musicOn: MUSIC.on,               // music-off firing fallback in the sim reads this
    onBeat: onBeatNow(),             // sim awards groove for kills inside the beat window
  };
}

export function attachInput(canvas, sceneGetter){
  canvasEl=canvas; if(sceneGetter)getScene=sceneGetter;
  isTouch=(('ontouchstart'in window)||navigator.maxTouchPoints>0||window.matchMedia('(pointer:coarse)').matches);
  if(isTouch)document.body.classList.add('touch-on');
  autoFire=isTouch; // on touch you're busy dragging — ship auto-fires during play

  // ---------------- Keyboard ----------------
  window.addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyW','KeyA','KeyS','KeyD','KeyP'].includes(e.code))e.preventDefault();
    ensureAudio();
    // pressing a movement key hands control back from the mouse to the keyboard
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD'].includes(e.code))mouseCtrl=false;
    if(!keys[e.code]){
      if(e.code==='Space'){fireHeld=true; if(getScene()==='play')tryFire();}
      if(e.code==='KeyP'&&getScene()==='play'){G.scene='paused'; pauseMusic();}
      else if(e.code==='KeyP'&&getScene()==='paused'){G.scene='play'; resumeMusic();}
    }
    keys[e.code]=true;
  });
  window.addEventListener('keyup',e=>{keys[e.code]=false; if(e.code==='Space')fireHeld=false;});

  // ---------------- Touch ----------------
  canvas.addEventListener('touchstart',e=>{e.preventDefault();ensureAudio();
    const t=e.changedTouches[0]; const pt=canvasXY(t.clientX,t.clientY);
    if(getScene()==='play'){
      if(dragId===null){dragId=t.identifier; dragAnchor={fx:pt.x,fy:pt.y,sx:G.p.x,sy:G.p.y}; grab=true; tx=G.p.x; ty=G.p.y;}
    } else { handleTap(pt.x,pt.y); }
  },{passive:false});
  canvas.addEventListener('touchmove',e=>{e.preventDefault();
    for(const t of e.changedTouches){if(t.identifier===dragId && dragAnchor){const pt=canvasXY(t.clientX,t.clientY);
      // RELATIVE: ship moves by the same delta your finger swiped from where it started
      tx = dragAnchor.sx + (pt.x-dragAnchor.fx);
      ty = dragAnchor.sy + (pt.y-dragAnchor.fy);
    }}
  },{passive:false});
  canvas.addEventListener('touchend',e=>{for(const t of e.changedTouches){if(t.identifier===dragId){dragId=null;grab=false;dragAnchor=null;}}});
  canvas.addEventListener('click',e=>{ if(getScene()==='play')return; const pt=canvasXY(e.clientX,e.clientY); handleTap(pt.x,pt.y); });

  // ---------------- Mouse (desktop) ----------------
  // Ship follows the cursor and auto-fires while playing; coexists with keyboard.
  if(!isTouch){
    canvas.addEventListener('mousemove',e=>{ if(getScene()!=='play')return; const pt=canvasXY(e.clientX,e.clientY); mx=pt.x; my=pt.y; mouseCtrl=true; });
    canvas.addEventListener('mousedown',e=>{ ensureAudio(); if(getScene()==='play'){const pt=canvasXY(e.clientX,e.clientY); mx=pt.x; my=pt.y; mouseCtrl=true; tryFire();} });
    canvas.addEventListener('mouseleave',()=>{ mouseCtrl=false; });
  }

  // ---------------- On-screen fire button (touch) ----------------
  const fireBtn=document.getElementById('tFire');
  if(fireBtn){
    const dn=ev=>{ev.preventDefault();ensureAudio();fireHeld=true;fireBtn.classList.add('press');if(getScene()==='play')tryFire();};
    const up=ev=>{if(ev)ev.preventDefault();fireHeld=false;fireBtn.classList.remove('press');};
    fireBtn.addEventListener('pointerdown',dn);fireBtn.addEventListener('pointerup',up);
    fireBtn.addEventListener('pointercancel',up);fireBtn.addEventListener('pointerleave',up);
    fireBtn.addEventListener('touchstart',dn,{passive:false});fireBtn.addEventListener('touchend',up,{passive:false});
  }
}

export function startDailyToday(){ ensureAudio(); startDaily(dailyConfig(dailySeed(new Date()))); }
export function startOverdriveRun(){ ensureAudio(); startOverdrive((Math.random()*0x100000000)>>>0); } // fresh random seed each run
export function startRogueRun(){ ensureAudio(); G.scene='roguepick'; }   // open the starter-pick screen
export function startRogueWith(id){ ensureAudio(); startRogue((Math.random()*0x100000000)>>>0, id); }

// LAUNCH / RETRY DOM buttons. The over/start overlays themselves are shown/hidden by
// main.js based on G.scene; these handlers just unlock audio and route to the map.
export function wireScreenButtons(){
  const startBtn=document.getElementById('startBtn');
  const overBtn=document.getElementById('overBtn');
  if(startBtn){ startBtn.addEventListener('pointerdown',ensureAudio,{passive:true}); startBtn.onclick=()=>{ensureAudio();goMap();}; }
  if(overBtn){ overBtn.onclick=()=>{ensureAudio();goMap();}; }
  const dailyBtn=document.getElementById('dailyBtn');
  if(dailyBtn){ dailyBtn.onclick=startDailyToday; }
  const overdriveBtn=document.getElementById('overdriveBtn');
  if(overdriveBtn){ overdriveBtn.onclick=startOverdriveRun; }
  const rogueBtn=document.getElementById('rogueBtn');
  if(rogueBtn){ rogueBtn.onclick=startRogueRun; }
}
