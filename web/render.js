import { G } from '../core/state.js';
import { MUSIC } from './audio.js';
import { WEAPONS, NUM_LEVELS, LIFE_EVERY, WAVES_PER_LEVEL, SHIELD_REGEN_DELAY, SHIELD_REGEN_TIME } from '../core/config.js';
import { pupKind } from '../core/weapons.js';
import { levelNodes } from '../core/levels.js';

// The 2D context is supplied each frame by render(); the draw helpers read this module var.
let ctx;

function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}

// ---------------- Campaign screen renders ----------------
function drawMenuBG(){
  // reuse the space background (stars/nebulae/planet) without the combat grid
  ctx.fillStyle='#0a0413';ctx.fillRect(0,0,G.W,G.H);
  for(const n of G.nebulae){const g=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r);
    g.addColorStop(0,`rgba(${n.c},${n.a})`);g.addColorStop(1,`rgba(${n.c},0)`);
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,7);ctx.fill();}
  for(const s of G.stars){const tw=0.4+Math.sin(s.tw)*0.3+s.z*0.3;
    ctx.globalAlpha=Math.max(0.1,tw);ctx.fillStyle=s.z>0.8?'#c9a6ff':'#dfe9ff';
    const sz=1+s.z*1.6;ctx.fillRect(s.x,s.y,sz,sz);}
  ctx.globalAlpha=1;
}
function drawTopBar(){
  ctx.fillStyle='rgba(7,3,15,.6)';rr(0,0,G.W,52,0);ctx.fill();
  ctx.fillStyle='#ffd23a';ctx.font="700 18px 'Audiowide', sans-serif";ctx.textBaseline='middle';ctx.textAlign='left';
  ctx.save();ctx.shadowBlur=8;ctx.shadowColor='#ffd23a';ctx.fillText('◎ '+G.campaign.coins,16,28);ctx.restore();
  ctx.fillStyle='#22e1ff';ctx.font="400 20px 'Audiowide', sans-serif";ctx.textAlign='right';
  ctx.save();ctx.shadowBlur=10;ctx.shadowColor='#22e1ff';ctx.fillText('RETROGRADE',G.W-16,28);ctx.restore();
  ctx.textAlign='left';
}
function drawMap(){
  drawMenuBG();
  const nodes=levelNodes(); G.uiRects.nodes=nodes;
  // connecting path
  ctx.strokeStyle='rgba(34,225,255,.35)';ctx.lineWidth=3;ctx.beginPath();
  for(let i=0;i<nodes.length;i++){const nd=nodes[i];if(i===0)ctx.moveTo(nd.x,nd.y);else ctx.lineTo(nd.x,nd.y);}
  ctx.stroke();
  for(const nd of nodes){
    const unlocked = nd.n<=G.campaign.unlocked;
    const cleared = (G.campaign.stars[nd.n]||0)>0;
    ctx.save();ctx.shadowBlur=unlocked?16:0;ctx.shadowColor=cleared?'#39ff14':'#22e1ff';
    ctx.fillStyle=unlocked?(cleared?'rgba(57,255,20,.25)':'rgba(34,225,255,.22)'):'rgba(90,90,120,.25)';
    ctx.beginPath();ctx.arc(nd.x,nd.y,nd.r,0,7);ctx.fill();
    ctx.lineWidth=3;ctx.strokeStyle=unlocked?(cleared?'#39ff14':'#22e1ff'):'rgba(150,150,180,.5)';
    ctx.beginPath();ctx.arc(nd.x,nd.y,nd.r,0,7);ctx.stroke();ctx.restore();
    if(unlocked){
      ctx.fillStyle='#fff';ctx.font="400 24px 'Audiowide', sans-serif";ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(nd.n,nd.x,nd.y+1);
      if(cleared){ctx.fillStyle='#ffd23a';ctx.font="16px sans-serif";ctx.fillText('★',nd.x,nd.y+nd.r+14);}
    } else {
      ctx.fillStyle='rgba(255,255,255,.7)';ctx.font="20px sans-serif";ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('🔒',nd.x,nd.y+1);
    }
  }
  ctx.textAlign='left';ctx.textBaseline='alphabetic';
  drawTopBar();
  ctx.fillStyle='#cfe9ff';ctx.font="600 15px Rajdhani";ctx.textAlign='center';
  ctx.fillText('Select a level',G.W/2,G.H-26);ctx.textAlign='left';
}
function drawLevelSelect(){
  drawMap(); // map behind
  // dim
  ctx.fillStyle='rgba(7,3,15,.7)';ctx.fillRect(0,0,G.W,G.H);
  const pw=G.W*0.8, ph=G.H*0.42, px=(G.W-pw)/2, py=(G.H-ph)/2;
  ctx.save();ctx.shadowBlur=20;ctx.shadowColor='#22e1ff';
  ctx.fillStyle='rgba(13,18,40,.96)';rr(px,py,pw,ph,16);ctx.fill();
  ctx.lineWidth=2;ctx.strokeStyle='#22e1ff';rr(px,py,pw,ph,16);ctx.stroke();ctx.restore();
  // header
  ctx.fillStyle='#22e1ff';ctx.font="400 26px 'Audiowide', sans-serif";ctx.textAlign='center';
  ctx.save();ctx.shadowBlur=12;ctx.shadowColor='#22e1ff';ctx.fillText('LEVEL '+G.selectedLevel,G.W/2,py+40);ctx.restore();
  ctx.fillStyle='#9fb8d0';ctx.font="600 15px Rajdhani";
  ctx.fillText(G.selectedLevel<=2?'Difficulty: Normal':G.selectedLevel<=5?'Difficulty: Hard':'Difficulty: Insane',G.W/2,py+68);
  ctx.fillStyle='#cfe9ff';ctx.font="600 14px Rajdhani";
  ctx.fillText('5 waves · boss finale · drag to fly, auto-fire',G.W/2,py+96);
  // PLAY button
  const bw=200,bh=56,bx=(G.W-bw)/2,by=py+ph-80;
  G.uiRects.play={x:bx,y:by,w:bw,h:bh};
  ctx.save();ctx.shadowBlur=18;ctx.shadowColor='#ff2d95';
  ctx.fillStyle='#ff2d95';rr(bx,by,bw,bh,10);ctx.fill();ctx.restore();
  ctx.fillStyle='#fff';ctx.font="400 22px 'Audiowide', sans-serif";ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('▶ PLAY',G.W/2,by+bh/2);
  // close (back to map)
  const cs=34, cx=px+pw-cs-10, cy=py+10; G.uiRects.closeLS={x:cx,y:cy,w:cs,h:cs};
  ctx.fillStyle='rgba(255,45,149,.85)';ctx.beginPath();ctx.arc(cx+cs/2,cy+cs/2,cs/2,0,7);ctx.fill();
  ctx.fillStyle='#fff';ctx.font="700 20px sans-serif";ctx.fillText('✕',cx+cs/2,cy+cs/2+1);
  ctx.textAlign='left';ctx.textBaseline='alphabetic';
}
function drawVictory(){
  drawMenuBG();
  const d=G.victoryData||{level:1,reward:750};
  ctx.textAlign='center';
  ctx.fillStyle='#ffd23a';ctx.font="400 44px 'Audiowide', sans-serif";
  ctx.save();ctx.shadowBlur=20;ctx.shadowColor='#ffd23a';ctx.fillText('★ VICTORY ★',G.W/2,G.H*0.28);ctx.restore();
  ctx.fillStyle='#fff';ctx.font="400 26px 'Audiowide', sans-serif";ctx.fillText('LEVEL '+d.level,G.W/2,G.H*0.36);
  ctx.fillStyle='#39ff14';ctx.font="700 22px 'Audiowide', sans-serif";
  ctx.save();ctx.shadowBlur=12;ctx.shadowColor='#39ff14';ctx.fillText('COMPLETED',G.W/2,G.H*0.42);ctx.restore();
  // reward
  ctx.fillStyle='#ffd23a';ctx.font="700 20px 'Audiowide', sans-serif";ctx.fillText('◎ +'+d.reward,G.W/2,G.H*0.50);
  if(d.firstClear){ctx.fillStyle='#22e1ff';ctx.font="600 16px Rajdhani";ctx.fillText('★ first clear bonus',G.W/2,G.H*0.545);}
  // NEXT button
  const bw=220,bh=58,bx=(G.W-bw)/2,by=G.H*0.62;
  G.uiRects.vNext={x:bx,y:by,w:bw,h:bh};
  ctx.save();ctx.shadowBlur=18;ctx.shadowColor='#22e1ff';ctx.fillStyle='#22b8d8';rr(bx,by,bw,bh,10);ctx.fill();ctx.restore();
  ctx.fillStyle='#fff';ctx.font="400 20px 'Audiowide', sans-serif";ctx.textBaseline='middle';
  ctx.fillText(d.last?'FINISH ▶':'CONTINUE ▶',G.W/2,by+bh/2);
  ctx.textAlign='left';ctx.textBaseline='alphabetic';
}
function drawComplete(){
  drawMenuBG();
  ctx.textAlign='center';
  ctx.fillStyle='#ff2d95';ctx.font="400 40px 'Audiowide', sans-serif";
  ctx.save();ctx.shadowBlur=22;ctx.shadowColor='#ff2d95';ctx.fillText('CAMPAIGN',G.W/2,G.H*0.34);ctx.fillText('COMPLETE',G.W/2,G.H*0.42);ctx.restore();
  ctx.fillStyle='#cfe9ff';ctx.font="600 16px Rajdhani";ctx.fillText('You cleared all '+NUM_LEVELS+' levels, pilot.',G.W/2,G.H*0.50);
  const bw=220,bh=58,bx=(G.W-bw)/2,by=G.H*0.60;
  G.uiRects.cAgain={x:bx,y:by,w:bw,h:bh};
  ctx.save();ctx.shadowBlur=18;ctx.shadowColor='#39ff14';ctx.fillStyle='#2faf5f';rr(bx,by,bw,bh,10);ctx.fill();ctx.restore();
  ctx.fillStyle='#fff';ctx.font="400 20px 'Audiowide', sans-serif";ctx.textBaseline='middle';
  ctx.fillText('↻ PLAY AGAIN',G.W/2,by+bh/2);
  ctx.textAlign='left';ctx.textBaseline='alphabetic';
}

// ---------------- Play-scene renders ----------------
function drawBG(){
  ctx.fillStyle='#0a0413';ctx.fillRect(0,0,G.W,G.H);
  // soft nebula clouds (very dim, behind stars)
  for(const n of G.nebulae){
    const g=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r);
    g.addColorStop(0,`rgba(${n.c},${n.a})`);g.addColorStop(1,`rgba(${n.c},0)`);
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,7);ctx.fill();
  }
  // distant planet with crescent shading + ring
  const pl=G.planet;
  ctx.save();
  const pg=ctx.createRadialGradient(pl.x-pl.r*0.3,pl.y-pl.r*0.3,pl.r*0.2,pl.x,pl.y,pl.r);
  pg.addColorStop(0,'rgba(120,90,200,.55)');pg.addColorStop(.7,'rgba(70,40,120,.4)');pg.addColorStop(1,'rgba(40,20,70,.25)');
  ctx.fillStyle=pg;ctx.beginPath();ctx.arc(pl.x,pl.y,pl.r,0,7);ctx.fill();
  // shadow crescent
  ctx.globalAlpha=0.35;ctx.fillStyle='#0a0413';ctx.beginPath();ctx.arc(pl.x+pl.r*0.4,pl.y,pl.r,0,7);ctx.fill();ctx.globalAlpha=1;
  // ring
  ctx.strokeStyle='rgba(157,78,221,.3)';ctx.lineWidth=3;
  ctx.beginPath();ctx.ellipse(pl.x,pl.y,pl.r*1.5,pl.r*0.4,-0.4,0,7);ctx.stroke();
  ctx.restore();
  // twinkling layered stars
  for(const s of G.stars){
    const tw=0.4+Math.sin(s.tw)*0.3+s.z*0.3;
    ctx.globalAlpha=Math.max(0.1,tw);ctx.fillStyle=s.z>0.8?'#c9a6ff':'#dfe9ff';
    const sz=1+s.z*1.6;ctx.fillRect(s.x,s.y,sz,sz);}
  ctx.globalAlpha=1;
  // shooting stars
  for(const ss of G.shootingStars){const a=Math.max(0,1-ss.age/ss.life);
    ctx.globalAlpha=a;ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.shadowBlur=8;ctx.shadowColor='#9d4edd';
    ctx.beginPath();ctx.moveTo(ss.x,ss.y);ctx.lineTo(ss.x-ss.vx*0.03,ss.y-ss.vy*0.03);ctx.stroke();ctx.shadowBlur=0;}
  ctx.globalAlpha=1;
  // faint horizon glow + grid (low, dim) — pulses on the beat
  const horizon=G.H*0.74;
  const beat=MUSIC.kickPulse||0;
  const hg=ctx.createLinearGradient(0,horizon-70,0,horizon+6);
  hg.addColorStop(0,`rgba(${G.theme.grid},0)`);hg.addColorStop(1,`rgba(${G.theme.glow},${0.16+beat*0.22})`);
  ctx.fillStyle=hg;ctx.fillRect(0,horizon-70,G.W,80);
  ctx.strokeStyle=`rgba(${G.theme.grid},${0.26+beat*0.4})`;ctx.lineWidth=1+beat*1.5;
  for(let i=0;i<12;i++){
    const t=i/12; const y=horizon + Math.pow(t,1.9)*(G.H-horizon);
    ctx.globalAlpha=(0.3*(1-t)+0.05)*(1+beat*0.8); ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(G.W,y);ctx.stroke();
  }
  ctx.globalAlpha=1;
  const vp=G.W/2;
  for(let i=-7;i<=7;i++){ctx.globalAlpha=0.15*(1+beat*0.6); ctx.beginPath();ctx.moveTo(vp+i*10,horizon);ctx.lineTo(vp+i*120,G.H);ctx.stroke();}
  ctx.globalAlpha=1;
}

function glowDot(x,y,r,color,blur=14){ctx.save();ctx.shadowBlur=blur;ctx.shadowColor=color;ctx.fillStyle=color;
  ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();ctx.restore();}

function drawPlayer(){
  const p=G.p, x=p.x,y=p.y;
  // invulnerability shown as a faint pulsing ring (no more blinking out)
  if(p.invuln>0 && p.shield<=0){
    ctx.save();ctx.globalAlpha=0.35+Math.sin(Date.now()*0.02)*0.25;
    ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.shadowBlur=10;ctx.shadowColor='#ff8a3d';
    ctx.beginPath();ctx.arc(x,y,26,0,7);ctx.stroke();ctx.restore();
  }
  const hit=p.hitFlash>0;
  // twin thrust flames (warm, flicker)
  const fl=7+Math.random()*7*(p.thrust);
  ctx.save();ctx.shadowBlur=14;ctx.shadowColor='#ff8a3d';ctx.fillStyle='#ffd23a';
  for(const ex of [-7,7]){ ctx.beginPath();ctx.moveTo(x+ex-3,y+12);ctx.lineTo(x+ex+3,y+12);ctx.lineTo(x+ex,y+12+fl);ctx.closePath();ctx.fill(); }
  ctx.restore();
  // engine glow
  ctx.save();ctx.shadowBlur=10;ctx.shadowColor='#39ffd0';ctx.fillStyle='rgba(57,255,208,.9)';
  ctx.beginPath();ctx.arc(x-7,y+11,2.4,0,7);ctx.arc(x+7,y+11,2.4,0,7);ctx.fill();ctx.restore();
  // hull — sleek arrowhead: dark gradient core + glowing neon edge
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x,y-22);                 // nose
  ctx.lineTo(x+9,y-2);
  ctx.lineTo(x+18,y+15);              // right wingtip
  ctx.lineTo(x+7,y+11);
  ctx.lineTo(x,y+17);                 // tail notch
  ctx.lineTo(x-7,y+11);
  ctx.lineTo(x-18,y+15);             // left wingtip
  ctx.lineTo(x-9,y-2);
  ctx.closePath();
  const g=ctx.createLinearGradient(x,y-22,x,y+17);
  if(hit){ g.addColorStop(0,'#fff'); g.addColorStop(1,'#fff'); }
  else { g.addColorStop(0,'#0c3b39'); g.addColorStop(0.5,'#16998a'); g.addColorStop(1,'#0c3b39'); }
  ctx.fillStyle=g; ctx.fill();
  ctx.lineWidth=2; ctx.strokeStyle=hit?'#fff':'#39ffd0'; ctx.shadowBlur=14; ctx.shadowColor='#39ffd0'; ctx.stroke();
  // spine highlight
  ctx.shadowBlur=0; ctx.strokeStyle=hit?'#fff':'rgba(180,255,240,.8)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(x,y-18); ctx.lineTo(x,y+12); ctx.stroke();
  ctx.restore();
  // cockpit — glowing canopy
  ctx.save();ctx.shadowBlur=10;ctx.shadowColor='#22e1ff';ctx.fillStyle=hit?'#fff':'#9ffcff';
  ctx.beginPath();ctx.ellipse(x,y-4,3.2,7,0,0,7);ctx.fill();ctx.restore();
  // shield bubble — brightness/thickness scales with remaining shield points
  if(p.shield>0){
    const base=0.25+0.18*p.shield, fl=Math.max(0,p.shieldFlash);
    ctx.save();
    ctx.strokeStyle=`rgba(34,225,255,${Math.min(0.9,base+0.3*Math.sin(Date.now()*0.008)+fl)})`;
    ctx.lineWidth=2+p.shield*0.6;ctx.shadowBlur=12+fl*16;ctx.shadowColor='#22e1ff';
    ctx.beginPath();ctx.arc(x,y,28,0,7);ctx.stroke();
    // hex segments to read shield count
    ctx.lineWidth=2;ctx.globalAlpha=0.5+fl;
    for(let i=0;i<p.shield;i++){const a0=(i/p.shieldMax)*6.283-1.57, a1=((i+0.8)/p.shieldMax)*6.283-1.57;
      ctx.beginPath();ctx.arc(x,y,31,a0,a1);ctx.stroke();}
    ctx.restore();
  }
}

function drawEnemy(e){
  const x=e.x,y=e.y, fl=e.flash>0;
  ctx.save();
  if(e.carrier){
    const w=e.w/2,h=e.h/2;
    // engine glow behind
    ctx.shadowBlur=12;ctx.shadowColor='#22e1ff';ctx.fillStyle='rgba(34,225,255,.7)';
    ctx.beginPath();ctx.ellipse(x-w*0.55,y-h-2,3,6,0,0,7);ctx.ellipse(x+w*0.55,y-h-2,3,6,0,0,7);ctx.fill();
    // main hull (battle-cruiser, nose down)
    ctx.shadowBlur=12;ctx.shadowColor='#ff8a3d';ctx.fillStyle=fl?'#fff':'#e85f1f';
    ctx.beginPath();
    ctx.moveTo(x,y+h);                 // nose
    ctx.lineTo(x+w*0.45,y+h*0.35);
    ctx.lineTo(x+w,y-h*0.25);          // right wing
    ctx.lineTo(x+w*0.65,y-h*0.7);
    ctx.lineTo(x+w*0.5,y-h);           // right engine mount
    ctx.lineTo(x-w*0.5,y-h);
    ctx.lineTo(x-w*0.65,y-h*0.7);
    ctx.lineTo(x-w,y-h*0.25);          // left wing
    ctx.lineTo(x-w*0.45,y+h*0.35);
    ctx.closePath();ctx.fill();
    // raised spine plating
    ctx.fillStyle=fl?'#fff':'#ff7a2d';
    ctx.beginPath();ctx.moveTo(x,y+h*0.6);ctx.lineTo(x+w*0.35,y-h*0.5);ctx.lineTo(x-w*0.35,y-h*0.5);ctx.closePath();ctx.fill();
    // bridge canopy (glowing)
    ctx.shadowBlur=8;ctx.shadowColor='#ffd23a';ctx.fillStyle=fl?'#fff':'#ffe27a';
    ctx.beginPath();ctx.ellipse(x,y-h*0.05,w*0.32,h*0.22,0,0,7);ctx.fill();
    // side cannons
    ctx.shadowBlur=0;ctx.fillStyle=fl?'#fff':'#9d4edd';
    ctx.fillRect(x+w*0.78,y-h*0.1,5,12);ctx.fillRect(x-w*0.78-5,y-h*0.1,5,12);
    // hp pips
    for(let i=0;i<e.maxhp;i++){ctx.fillStyle=i<e.hp?'#39ff14':'rgba(255,255,255,.2)';ctx.fillRect(x-e.w/2+i*7,y+e.h/2+4,5,3);}
  } else {
    const w=e.w/2,h=e.h/2;
    // twin engine glow
    ctx.shadowBlur=8;ctx.shadowColor='#22e1ff';ctx.fillStyle='rgba(34,225,255,.7)';
    ctx.beginPath();ctx.ellipse(x-w*0.4,y-h-1,2.2,4,0,0,7);ctx.ellipse(x+w*0.4,y-h-1,2.2,4,0,0,7);ctx.fill();
    // hull — swept-wing fighter, nose down (tinted per archetype; size varies via e.w/e.h)
    const hull = e.type==='darter'?'#ff8a3d': e.type==='tank'?'#b06bff': e.type==='weaver'?'#ff5ad0': e.type==='splitter'?'#ff6b6b':'#ff3d9a';
    ctx.shadowBlur=10;ctx.shadowColor=hull;ctx.fillStyle=fl?'#fff':hull;
    ctx.beginPath();
    ctx.moveTo(x,y+h);                 // nose
    ctx.lineTo(x+w*0.35,y+h*0.1);
    ctx.lineTo(x+w,y-h*0.5);           // right wingtip (swept back)
    ctx.lineTo(x+w*0.45,y-h*0.55);
    ctx.lineTo(x+w*0.4,y-h);           // right engine
    ctx.lineTo(x-w*0.4,y-h);           // left engine
    ctx.lineTo(x-w*0.45,y-h*0.55);
    ctx.lineTo(x-w,y-h*0.5);           // left wingtip
    ctx.lineTo(x-w*0.35,y+h*0.1);
    ctx.closePath();ctx.fill();
    // canopy
    ctx.shadowBlur=8;ctx.shadowColor='#ffd23a';ctx.fillStyle=fl?'#fff':'#ffd23a';
    ctx.beginPath();ctx.ellipse(x,y-h*0.05,2.6,4.5,0,0,7);ctx.fill();
  }
  if(e.charged){
    // about-to-fire pulse — a quick red charge glow on the enemy itself (no aim line)
    ctx.save();
    ctx.globalAlpha=0.3+0.3*Math.sin(Date.now()*0.018);
    ctx.strokeStyle='#ff3b2f'; ctx.lineWidth=2; ctx.shadowBlur=10; ctx.shadowColor='#ff3b2f';
    ctx.beginPath(); ctx.arc(x,y,e.w*0.7,0,7); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawBoss(){
  const b=G.boss,x=b.x,y=b.y,fl=b.flash>0;
  ctx.save();ctx.shadowBlur=20;ctx.shadowColor='#9d4edd';
  ctx.fillStyle=fl?'#fff':'#7a2fb0';
  rr(x-b.w/2,y-b.h/2,b.w,b.h,16);ctx.fill();
  ctx.fillStyle=fl?'#fff':'#ff2d95';rr(x-b.w/2+14,y-b.h/2+12,b.w-28,18,8);ctx.fill();
  // eyes
  ctx.shadowColor='#22e1ff';ctx.fillStyle='#22e1ff';
  ctx.beginPath();ctx.arc(x-30,y+6,8,0,7);ctx.arc(x+30,y+6,8,0,7);ctx.fill();
  // cannons
  ctx.fillStyle=fl?'#fff':'#ffd23a';ctx.fillRect(x-50,y+b.h/2-6,10,16);ctx.fillRect(x+40,y+b.h/2-6,10,16);
  ctx.restore();
  // hp bar
  const bw=G.W-80, frac=Math.max(0,b.hp/b.maxhp);
  ctx.fillStyle='rgba(0,0,0,.5)';rr(40,18,bw,12,6);ctx.fill();
  ctx.fillStyle='#ff2d95';ctx.save();ctx.shadowBlur=10;ctx.shadowColor='#ff2d95';rr(40,18,bw*frac,12,6);ctx.fill();ctx.restore();
  ctx.fillStyle='#fff';ctx.font="700 12px Rajdhani";ctx.textAlign='center';ctx.fillText('BOSS',G.W/2,28);ctx.textAlign='left';
}

function drawBullet(b){
  if(b.bomb){glowDot(b.x,b.y,b.r,b.color,12);
    ctx.save();ctx.globalAlpha=0.6;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,b.r*0.4,0,7);ctx.fill();ctx.restore();return;}
  ctx.save();ctx.shadowBlur=12;ctx.shadowColor=b.color;ctx.fillStyle=b.color;
  rr(b.x-b.r/2,b.y-b.len/2,b.r,b.len,b.r/2);ctx.fill();
  ctx.fillStyle='#fff';ctx.globalAlpha=0.8;rr(b.x-b.r/4,b.y-b.len/2,b.r/2,b.len*0.5,1);ctx.fill();
  ctx.restore();
}
function drawEB(eb){
  ctx.save();
  ctx.shadowBlur=10; ctx.shadowColor='#ff3b2f';
  ctx.fillStyle='#ff3b2f'; ctx.beginPath(); ctx.arc(eb.x,eb.y,eb.r+1,0,7); ctx.fill();
  ctx.shadowBlur=0;
  ctx.lineWidth=1.5; ctx.strokeStyle='rgba(10,4,19,.9)'; ctx.beginPath(); ctx.arc(eb.x,eb.y,eb.r+1,0,7); ctx.stroke(); // dark outline
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(eb.x,eb.y,eb.r*0.45,0,7); ctx.fill(); // hot core
  ctx.restore();
}

function drawPup(pu){
  const kind=pupKind(pu);
  const x=pu.x,y=pu.y,bob=Math.sin(pu.t*4)*2;
  const col = kind==='R'?'#fff': kind==='shield'?'#9d4edd': WEAPONS[kind].color;
  const label = kind==='shield'?'◇':kind;
  const pulse=1+Math.max(0,(0.12-pu.cycT))/0.12*0.25; // little pop right after letter changes
  ctx.save();ctx.translate(x,y+bob);ctx.scale(pulse,pulse);
  ctx.shadowBlur=16;ctx.shadowColor=col;
  ctx.fillStyle='rgba(7,3,15,.7)';rr(-15,-13,30,26,8);ctx.fill();
  ctx.lineWidth=2.5;ctx.strokeStyle=col;rr(-15,-13,30,26,8);ctx.stroke();
  ctx.shadowBlur=0;ctx.fillStyle=col;ctx.font="700 17px 'Audiowide', sans-serif";ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(label,0,1);
  ctx.restore();ctx.textAlign='left';ctx.textBaseline='alphabetic';
}

function drawParticles(){
  ctx.save(); ctx.globalCompositeOperation='lighter';        // additive bloom — explosions glow and stack
  for(const pt of G.parts){ctx.globalAlpha=Math.max(0,1-pt.age/pt.life);
    glowDot(pt.x,pt.y,pt.r*1.3,pt.color,11);}
  ctx.restore(); ctx.globalAlpha=1;
}

function drawHUD(){
  const p=G.p;
  // score
  ctx.fillStyle='#e9f6ff';ctx.font="700 20px 'Audiowide', sans-serif";ctx.textBaseline='middle';
  ctx.save();ctx.shadowBlur=8;ctx.shadowColor='#22e1ff';ctx.fillText(String(G.score).padStart(6,'0'),16,30);ctx.restore();
  // wave
  ctx.fillStyle='#9fb8d0';ctx.font="600 13px Rajdhani";
  ctx.fillText(G.overdrive ? '⚡ OVERDRIVE  ·  LVL '+G.level+'  ·  WAVE '+G.levelWave
                           : 'LVL '+G.level+'  ·  WAVE '+Math.min(G.levelWave,WAVES_PER_LEVEL)+'/'+WAVES_PER_LEVEL, 16,50);
  // beat-pulsing music indicator (equalizer bars that jump on the beat)
  if(MUSIC.on){const bx=72,by=46,beat=MUSIC.beatPulse||0;
    for(let i=0;i<3;i++){const hgt=4+ (i===1?beat*10:beat*6) + Math.sin(Date.now()*0.01+i)*1.5;
      ctx.fillStyle=`rgba(34,225,255,${0.5+beat*0.5})`;ctx.fillRect(bx+i*5,by-hgt,3,hgt);}
  }
  if(G.groove && G.groove.mult>1){
    const m=G.groove.mult;
    ctx.save();
    ctx.font="700 "+(16+m)+"px 'Audiowide', sans-serif"; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.shadowBlur=10; ctx.shadowColor='#39ff14'; ctx.fillStyle='#39ff14';
    ctx.fillText('×'+m, 92, 30);
    ctx.restore();
    ctx.textBaseline='alphabetic';
  }
  // lives (ships) — cap the drawn icons so a high life count can't overrun the score
  const shownLives=Math.min(p.lives,5);
  for(let i=0;i<shownLives;i++){const lx=G.W-24-i*26, ly=28;
    ctx.save();ctx.shadowBlur=8;ctx.shadowColor='#22e1ff';ctx.fillStyle='#22e1ff';
    ctx.beginPath();ctx.moveTo(lx,ly-8);ctx.lineTo(lx+7,ly+7);ctx.lineTo(lx,ly+4);ctx.lineTo(lx-7,ly+7);ctx.closePath();ctx.fill();ctx.restore();}
  if(p.lives>5){ ctx.save();ctx.fillStyle='#22e1ff';ctx.font="700 13px 'Audiowide', sans-serif";ctx.textAlign='right';ctx.textBaseline='middle';
    ctx.shadowBlur=6;ctx.shadowColor='#22e1ff';ctx.fillText('×'+p.lives, G.W-24-5*26+10, 28);ctx.restore();ctx.textAlign='left';ctx.textBaseline='alphabetic'; }
  // weapon indicator
  const wp=WEAPONS[p.weapon];
  ctx.fillStyle=wp.color;ctx.font="700 14px 'Audiowide', sans-serif";
  ctx.save();ctx.shadowBlur=8;ctx.shadowColor=wp.color;
  ctx.fillText(p.weapon+' L'+p.power,G.W-40,52);ctx.restore();
  ctx.fillStyle='#9fb8d0';ctx.font="600 11px Rajdhani";ctx.textAlign='right';ctx.fillText(wp.name,G.W-58,52);ctx.textAlign='left';
  if(p.rapid>0){ctx.fillStyle='#fff';ctx.font="600 11px Rajdhani";ctx.fillText('RAPID',16,66);}
  // shield pips (filled = active, ghost = regenerating)
  {const sx=16,sy=78;ctx.font="600 11px Rajdhani";ctx.fillStyle='#22e1ff';ctx.fillText('SHIELD',sx,sy);
   for(let i=0;i<p.shieldMax;i++){const px=sx+50+i*13, filled=i<p.shield;
     const regenNext = (i===p.shield) && p.shield<p.shieldMax;
     const rp = regenNext ? Math.max(0,(p.shieldRegen-SHIELD_REGEN_DELAY)/SHIELD_REGEN_TIME) : 0;
     ctx.save();ctx.shadowBlur=filled?8:0;ctx.shadowColor='#22e1ff';
     ctx.strokeStyle='rgba(34,225,255,.5)';ctx.lineWidth=1.5;
     ctx.beginPath();ctx.arc(px,sy-4,5,0,7);ctx.stroke();
     if(filled){ctx.fillStyle='#22e1ff';ctx.beginPath();ctx.arc(px,sy-4,5,0,7);ctx.fill();}
     else if(rp>0){ctx.fillStyle='rgba(34,225,255,.4)';ctx.beginPath();ctx.arc(px,sy-4,5,-1.57,-1.57+rp*6.283);ctx.lineTo(px,sy-4);ctx.fill();}
     ctx.restore();}}
  // power-up flash message
  if(G.pupMsg){const a=G.pupMsg.age<0.2?G.pupMsg.age/0.2:Math.max(0,1-(G.pupMsg.age-0.2)/1.4);
    ctx.globalAlpha=a;ctx.fillStyle='#fff';ctx.font="700 26px 'Audiowide', sans-serif";ctx.textAlign='center';
    ctx.save();ctx.shadowBlur=14;ctx.shadowColor='#ffd23a';ctx.fillText(G.pupMsg.text,G.W/2,G.H*0.4);ctx.restore();
    ctx.textAlign='left';ctx.globalAlpha=1;}
  // extra-life banner
  if(G.lifeMsg){const a=G.lifeMsg.age<0.3?G.lifeMsg.age/0.3:Math.max(0,1-(G.lifeMsg.age-0.3)/1.7);
    ctx.globalAlpha=a;ctx.fillStyle='#39ff14';ctx.font="700 30px 'Audiowide', sans-serif";ctx.textAlign='center';
    ctx.save();ctx.shadowBlur=18;ctx.shadowColor='#39ff14';ctx.fillText('EXTRA LIFE!',G.W/2,G.H*0.46);ctx.restore();
    ctx.textAlign='left';ctx.globalAlpha=1;}
  // progress toward next life (thin bar under score)
  {const frac=1-((G.nextLifeAt-G.score)/LIFE_EVERY);const bw=120;
   ctx.fillStyle='rgba(255,255,255,.12)';rr(16,38,bw,3,1.5);ctx.fill();
   ctx.fillStyle='#39ff14';rr(16,38,bw*Math.max(0,Math.min(1,frac)),3,1.5);ctx.fill();}
  // intermission banner (WAVE n/5 or BOSS) with a sweeping line, like the reference
  if(G.phase==='intermission' && G.interT>0){
    const a=Math.min(1, G.interT<0.4?G.interT/0.4:1);
    ctx.globalAlpha=a;
    const isBoss=(G.interLabel==='BOSS');
    ctx.strokeStyle=isBoss?'rgba(255,45,149,.8)':'rgba(255,210,58,.8)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(0,G.H*0.42);ctx.lineTo(G.W,G.H*0.42);ctx.stroke();
    ctx.fillStyle=isBoss?'#ff2d95':'#ffd23a';ctx.font="400 "+(isBoss?52:40)+"px 'Audiowide', sans-serif";ctx.textAlign='center';
    ctx.save();ctx.shadowBlur=18;ctx.shadowColor=isBoss?'#ff2d95':'#ffd23a';
    ctx.fillText(G.interLabel,G.W/2,G.H*0.40);ctx.restore();
    ctx.fillStyle='#cfe9ff';ctx.font="600 16px Rajdhani";ctx.fillText(G.interSub,G.W/2,G.H*0.46);
    ctx.textAlign='left';ctx.globalAlpha=1;
  }
}

function drawPaused(){
  ctx.fillStyle='rgba(7,3,15,.7)';ctx.fillRect(0,0,G.W,G.H);
  ctx.fillStyle='#22e1ff';ctx.font="400 40px 'Audiowide', sans-serif";ctx.textAlign='center';
  ctx.save();ctx.shadowBlur=16;ctx.shadowColor='#22e1ff';ctx.fillText('PAUSED',G.W/2,G.H/2);ctx.restore();
  ctx.fillStyle='#9fb8d0';ctx.font="600 14px Rajdhani";ctx.fillText('press P to resume',G.W/2,G.H/2+34);ctx.textAlign='left';
}

// The combat scene (also drawn behind the start/over DOM overlays).
function drawScene(){
  ctx.save();
  if(G.shake>0)ctx.translate((Math.random()-0.5)*G.shake,(Math.random()-0.5)*G.shake);
  const k=1+(MUSIC.kickPulse||0)*0.012;            // gentle breathe on the kick
  ctx.translate(G.W/2,G.H/2); ctx.scale(k,k); ctx.translate(-G.W/2,-G.H/2);
  drawBG();
  for(const pu of G.pups)drawPup(pu);
  for(const b of G.bullets)drawBullet(b);
  for(const e of G.enemies)drawEnemy(e);
  if(G.boss)drawBoss();
  for(const eb of G.ebullets)drawEB(eb);
  drawParticles();
  drawPlayer();
  // bass-drop screen flash (synced to the music drop)
  if(G.dropFlash>0){ctx.save();ctx.globalAlpha=G.dropFlash*0.18;ctx.fillStyle='#ff2d95';ctx.fillRect(0,0,G.W,G.H);
    ctx.globalAlpha=G.dropFlash*0.5;ctx.strokeStyle='#22e1ff';ctx.lineWidth=6;ctx.strokeRect(3,3,G.W-6,G.H-6);ctx.restore();}
  ctx.restore();
  drawHUD();
  if(G.scene==='paused')drawPaused();
}

// keep menu background alive (stars twinkle, nebulae drift) on non-play screens
function animateMenu(dt){
  for(const s of G.stars){s.tw+=dt*3;}
  for(const n of G.nebulae){n.y+=n.vy*dt*0.3; if(n.y-n.r>G.H){n.y=-n.r;n.x=Math.random()*G.W;}}
}

// ---------------- Post-processing (procedural "premium synthwave" pass) ----------------
// All effects work in DEVICE pixels (transform reset), so they're independent of the dpr
// scale the scene is drawn with. Bloom: downscale + blur the whole frame, add it back.
let _bloom;
function postFX(){
  const cv=ctx.canvas, w=cv.width, h=cv.height; if(w<2||h<2)return;
  const bw=Math.max(1,w>>1), bh=Math.max(1,h>>1);
  if(!_bloom) _bloom=document.createElement('canvas');
  if(_bloom.width!==bw||_bloom.height!==bh){ _bloom.width=bw; _bloom.height=bh; }
  const bx=_bloom.getContext('2d');
  bx.clearRect(0,0,bw,bh);
  bx.filter='blur(4px)'; bx.drawImage(cv,0,0,bw,bh); bx.filter='none';   // blurred half-res copy
  ctx.save(); ctx.setTransform(1,0,0,1,0,0);
  ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=0.5;            // add the glow back
  ctx.drawImage(_bloom,0,0,w,h);
  ctx.restore(); ctx.globalAlpha=1;
}
function overlayFX(){
  const cv=ctx.canvas, w=cv.width, h=cv.height;
  ctx.save(); ctx.setTransform(1,0,0,1,0,0);
  // vignette — darken the edges for depth/focus
  const g=ctx.createRadialGradient(w/2,h*0.46,Math.min(w,h)*0.32,w/2,h/2,Math.max(w,h)*0.72);
  g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,0.42)');
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
  // faint CRT scanlines
  ctx.globalAlpha=0.05; ctx.fillStyle='#000';
  for(let y=0;y<h;y+=3) ctx.fillRect(0,y,w,1);
  ctx.restore(); ctx.globalAlpha=1;
}

// Single entry point: dispatches by scene (was the rAF loop's scene switch), then post-FX.
export function render(_ctx, dt=0){
  ctx=_ctx;
  const s=G.scene;
  if(s==='map'){ animateMenu(dt); drawMap(); }
  else if(s==='levelselect'){ animateMenu(dt); drawLevelSelect(); }
  else if(s==='victory'){ animateMenu(dt); drawVictory(); }
  else if(s==='complete'){ animateMenu(dt); drawComplete(); }
  else { drawScene(); } // play, paused, over, start
  postFX(); overlayFX();
}
