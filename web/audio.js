import { G } from '../core/state.js';

// ---------------- Audio (procedural, no files) ----------------
let actx=null;
export function ensureAudio(){
  if(!actx){
    try{actx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){actx=null;return;}
    // iOS 16.4+: play audio like a media app so the silent/ringer switch doesn't mute it.
    try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch(e){}
    // iOS drops the context to 'suspended'/'interrupted' on backgrounding, Control Center,
    // a notification or a call and never auto-resumes — leaving the game permanently silent.
    // Re-resume whenever it leaves 'running' (only while visible, so we don't fight a
    // deliberate background suspend). resume() inside a gesture is the supported iOS unlock.
    actx.addEventListener('statechange',()=>{ if(actx.state!=='running'&&!document.hidden)actx.resume().catch(()=>{}); });
    // Suspend audio when backgrounded (mitigates an iOS 26 standalone-PWA audio glitch) and
    // reassert it on foreground / bfcache restore. Registered once, on first unlock.
    document.addEventListener('visibilitychange',()=>{ if(!actx)return; if(document.hidden)actx.suspend().catch(()=>{}); else actx.resume().catch(()=>{}); });
    addEventListener('pageshow',()=>{ if(actx)actx.resume().catch(()=>{}); });
  }
  if(actx.state!=='running')actx.resume().catch(()=>{});
}
function tone(f,d,type='square',vol=0.08,slide=null){
  if(!actx)return;
  try{
    const o=actx.createOscillator(),g=actx.createGain();
    o.type=type;o.frequency.setValueAtTime(f,actx.currentTime);
    if(slide)o.frequency.exponentialRampToValueAtTime(slide,actx.currentTime+d);
    g.gain.setValueAtTime(vol,actx.currentTime);g.gain.exponentialRampToValueAtTime(0.0001,actx.currentTime+d);
    o.connect(g).connect(actx.destination);o.start();o.stop(actx.currentTime+d);
  }catch(e){}
}
function noise(d,vol=0.1,hp=500){
  if(!actx)return;
  try{
    const n=actx.createBufferSource();const buf=actx.createBuffer(1,actx.sampleRate*d,actx.sampleRate);
    const dat=buf.getChannelData(0);for(let i=0;i<dat.length;i++)dat[i]=(Math.random()*2-1)*(1-i/dat.length);
    n.buffer=buf;const g=actx.createGain();g.gain.value=vol;const f=actx.createBiquadFilter();f.type='highpass';f.frequency.value=hp;
    n.connect(f).connect(g).connect(actx.destination);n.start();
  }catch(e){}
}
const sfx={
  shoot:()=>tone(820,0.07,'square',0.04,420),
  laser:()=>tone(1200,0.12,'sawtooth',0.05,300),
  bomb:()=>tone(180,0.16,'square',0.06,80),
  hit:()=>noise(0.06,0.05,1200),
  boom:()=>{tone(140,0.22,'sawtooth',0.12,50);noise(0.22,0.12,300);},
  pup:()=>{[660,880,1180].forEach((f,i)=>setTimeout(()=>tone(f,0.1,'triangle',0.09),i*60));},
  hurt:()=>{tone(220,0.3,'sawtooth',0.12,60);noise(0.2,0.12,200);},
  wave:()=>{[440,587,740].forEach((f,i)=>setTimeout(()=>tone(f,0.18,'square',0.08),i*90));},
  life:()=>{[523,659,784,1046,1318].forEach((f,i)=>setTimeout(()=>tone(f,0.16,'triangle',0.1),i*80));},
  shieldUp:()=>{tone(330,0.18,'sine',0.08,560);setTimeout(()=>tone(560,0.16,'sine',0.07,760),80);},
  shieldBreak:()=>{tone(420,0.2,'sawtooth',0.1,160);noise(0.15,0.1,400);},
  bossWarn:()=>{tone(110,0.5,'sawtooth',0.1,90);},
  over:()=>{[440,330,247,165].forEach((f,i)=>setTimeout(()=>tone(f,0.3,'sawtooth',0.1),i*160));}
};

// ---------------- MUSIC ENGINE (choreographed synthwave, procedural) ----------------
// A look-ahead scheduler queues notes on the precise Web Audio clock. The renderer reads
// MUSIC.beatPulse / MUSIC.kickPulse; onMusicBeat() choreographs enemy fire on the beat.
export const MUSIC={
  on:false, bpm:112, step:0, nextNoteTime:0, scheduleAhead:0.12,
  beatPulse:0, kickPulse:0, intensity:1, bar:0, beatQueue:[],
  master:null, filter:null
};
const BASS_ROOTS=[55.00, 49.00, 36.71, 41.20]; // A1, G1, D1, E1 (driving minor progression)
const LEAD_SCALE=[440.00,523.25,587.33,659.25,783.99,880.00]; // A pentatonic
function mStepDur(){ return 60/MUSIC.bpm/4; } // 16th-note duration

function musicStart(){
  if(!actx||MUSIC.on)return;
  // Don't schedule the fade-in/notes against a frozen clock; start once the context is live.
  if(actx.state!=='running'){ actx.resume().then(musicStart).catch(()=>{}); return; }
  MUSIC.on=true; MUSIC.step=0; MUSIC.bar=0; MUSIC.beatQueue=[];
  MUSIC.master=actx.createGain(); MUSIC.master.gain.value=0.0;
  MUSIC.master.gain.linearRampToValueAtTime(0.85, actx.currentTime+1.5);
  MUSIC.filter=actx.createBiquadFilter(); MUSIC.filter.type='lowpass'; MUSIC.filter.frequency.value=1200;
  MUSIC.filter.connect(MUSIC.master); MUSIC.master.connect(actx.destination);
  MUSIC.nextNoteTime=actx.currentTime+0.08;
}
function musicStop(){
  if(!MUSIC.on)return; MUSIC.on=false;
  try{ MUSIC.master.gain.cancelScheduledValues(actx.currentTime);
    MUSIC.master.gain.setValueAtTime(MUSIC.master.gain.value,actx.currentTime);
    MUSIC.master.gain.linearRampToValueAtTime(0.0001,actx.currentTime+0.4);}catch(e){}
}
function musicSetIntensity(t){
  MUSIC.intensity=Math.max(1,Math.min(5,t));
  MUSIC.bpm = 108 + (MUSIC.intensity-1)*8; // 108 -> 140 bpm
  if(MUSIC.filter)try{MUSIC.filter.frequency.setTargetAtTime(900 + MUSIC.intensity*520, actx.currentTime, 0.5);}catch(e){}
}
function mVoice(freq,t,dur,type,vol,target,slideTo){
  try{const o=actx.createOscillator(),g=actx.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t);
    if(slideTo)o.frequency.exponentialRampToValueAtTime(slideTo,t+dur);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g).connect(target||MUSIC.master);o.start(t);o.stop(t+dur+0.02);
  }catch(e){}
}
function mKick(t){try{const o=actx.createOscillator(),g=actx.createGain();
  o.type='sine';o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(45,t+0.12);
  g.gain.setValueAtTime(0.9,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.18);
  o.connect(g).connect(MUSIC.master);o.start(t);o.stop(t+0.2);}catch(e){}}
function mSnare(t){try{const n=actx.createBufferSource();const buf=actx.createBuffer(1,actx.sampleRate*0.2,actx.sampleRate);
  const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
  n.buffer=buf;const g=actx.createGain();g.gain.setValueAtTime(0.5,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.18);
  const f=actx.createBiquadFilter();f.type='highpass';f.frequency.value=1400;
  n.connect(f).connect(g).connect(MUSIC.master);n.start(t);}catch(e){}}
function mHat(t,open){try{const dur=open?0.12:0.04;const n=actx.createBufferSource();
  const buf=actx.createBuffer(1,actx.sampleRate*dur,actx.sampleRate);const d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
  n.buffer=buf;const g=actx.createGain();g.gain.setValueAtTime(0.16,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  const f=actx.createBiquadFilter();f.type='highpass';f.frequency.value=7000;
  n.connect(f).connect(g).connect(MUSIC.master);n.start(t);}catch(e){}}

function musicScheduleStep(stepIdx,t){
  const I=MUSIC.intensity, inStep=stepIdx%16, bar=Math.floor(stepIdx/16);
  const phrase=Math.floor(bar/4)%4, root=BASS_ROOTS[phrase];
  const dropBar=(bar%8===7);
  if(inStep%4===0) mKick(t);
  if(I>=4 && inStep===10) mKick(t);
  if(inStep===4||inStep===12) mSnare(t);
  if(I>=2 && inStep%2===0) mHat(t,false);
  if(I>=3 && inStep%2===1) mHat(t,inStep%8===7);
  const bassOn = (I>=3 ? true : inStep%2===0);
  if(bassOn){const seq=[1,1,2,1,1,1.5,2,1, 1,1,2,1,1,2,3,2];
    mVoice(root*seq[inStep], t, mStepDur()*0.9, 'sawtooth', 0.16, MUSIC.filter, null);}
  if(I>=2 && (inStep===0||inStep===6||inStep===10)){
    const note=LEAD_SCALE[(bar+inStep)%LEAD_SCALE.length];
    mVoice(note, t, mStepDur()*1.6, 'square', I>=4?0.09:0.06, MUSIC.master, null);}
  if(dropBar && inStep>=12){const ramp=440+(inStep-12)*120; mVoice(ramp,t,mStepDur(),'sawtooth',0.05,MUSIC.master,ramp*1.2);}
  if(inStep%4===0) MUSIC.beatQueue.push({t, bar, beatInBar:inStep/4, drop:(bar%8===0 && inStep===0)});
}

// ---------------- Beat choreography ----------------
// Called exactly on each quarter-note. Enemies that are "charged" fire as a volley on
// the beat (snare beats = the big volleys), so combat visibly dances with the track.
// This is the audio->sim feedback path: it mutates G on the music clock (core's advance()
// handles only the music-off fallback via input.musicOn).
let beatVisual=0, beatNum=0;
function onMusicBeat(ev){
  if(G.scene!=='play')return;
  beatVisual=1; beatNum=(beatNum+1)%4;
  const onSnare=(ev.beatInBar===1||ev.beatInBar===3);
  // charged enemies fire on the beat; snare beats = full volley, off-beats = lighter
  let fired=0, cap=onSnare?99:2;
  for(const e of G.enemies){
    if(e.charged && e.y>0 && e.y<G.H*0.72 && fired<cap){
      e.charged=false; fired++;
      const a=Math.atan2(G.p.y-e.y,G.p.x-e.x);
      const spd=190+MUSIC.intensity*16;
      G.ebullets.push({x:e.x,y:e.y+e.h/2,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:5,color:'#ff5a2a',life:5});
      if(e.carrier && MUSIC.intensity>=3){ // carriers add a small fan on the beat
        G.ebullets.push({x:e.x,y:e.y+e.h/2,vx:Math.cos(a-0.25)*spd,vy:Math.sin(a-0.25)*spd,r:5,color:'#ff5a2a',life:5});
        G.ebullets.push({x:e.x,y:e.y+e.h/2,vx:Math.cos(a+0.25)*spd,vy:Math.sin(a+0.25)*spd,r:5,color:'#ff5a2a',life:5});
      }
    }
  }
  // on the downbeat of a phrase, nudge the boss's radial burst to land on the beat
  if(ev.drop){
    G.dropFlash=1; // synced bass-drop screen flash
    if(G.boss && G.boss.phase!=='enter'){ G.boss.sweepT=0.02; }
  }
}

let appliedIntensity=null;
// Called once per frame from the main loop. Schedules look-ahead notes, fires beat
// choreography, syncs intensity from G.musicIntensity, and decays the visual pulses
// (these decays used to live in the sim's update(); they are audio/visual state).
export function musicTick(dt=0){
  if(MUSIC.on && actx){
    if(G.musicIntensity!=null && G.musicIntensity!==appliedIntensity){ appliedIntensity=G.musicIntensity; musicSetIntensity(G.musicIntensity); }
    while(MUSIC.nextNoteTime < actx.currentTime + MUSIC.scheduleAhead){
      musicScheduleStep(MUSIC.step, MUSIC.nextNoteTime);
      MUSIC.nextNoteTime += mStepDur(); MUSIC.step++;
    }
    const now=actx.currentTime;
    for(let i=MUSIC.beatQueue.length-1;i>=0;i--){
      if(MUSIC.beatQueue[i].t<=now){const ev=MUSIC.beatQueue[i];MUSIC.beatQueue.splice(i,1);
        MUSIC.beatPulse=1; MUSIC.kickPulse=1; MUSIC.bar=ev.bar; onMusicBeat(ev);}
    }
  }
  if(beatVisual>0)beatVisual=Math.max(0,beatVisual-dt*3.5);
  if(MUSIC.beatPulse>0)MUSIC.beatPulse=Math.max(0,MUSIC.beatPulse-dt*4);
  if(MUSIC.kickPulse>0)MUSIC.kickPulse=Math.max(0,MUSIC.kickPulse-dt*5);
}

// Pause/resume music gain ducking (KeyP), driven by the input adapter.
export function pauseMusic(){ if(MUSIC.master&&actx)try{MUSIC.master.gain.setTargetAtTime(0.0,actx.currentTime,0.05);}catch(e){} }
export function resumeMusic(){ if(MUSIC.master&&actx)try{MUSIC.master.gain.setTargetAtTime(0.85,actx.currentTime,0.1);}catch(e){} }

// ---------------- Persistence (localStorage) ----------------
function saveProgress(){try{localStorage.setItem('retrograde_save',JSON.stringify(G.campaign));}catch(e){}}
export function loadProgress(){try{const s=localStorage.getItem('retrograde_save');if(s){const d=JSON.parse(s);G.campaign.unlocked=d.unlocked||1;G.campaign.stars=d.stars||{};G.campaign.coins=d.coins||0;}}catch(e){}}

// Drain the core's sensory-event queue each frame and realize it as audio/persistence.
export function applyAudioEvents(events){
  for(const e of events){
    if(e.type==='sfx'){
      if(e.name==='bossKill'){ sfx.boom(); setTimeout(()=>sfx.boom(),120); setTimeout(()=>sfx.boom(),240); } // original killBoss cascade
      else if(sfx[e.name]) sfx[e.name]();
    }
    else if(e.type==='music'){ if(e.name==='start')musicStart(); else if(e.name==='stop')musicStop(); }
    else if(e.type==='save') saveProgress();
  }
}
