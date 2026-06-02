export const WEAPONS={
  M:{name:'Machine Gun', color:'#22e1ff', cd:0.09, key:'M'},
  S:{name:'Spread',      color:'#ff2d95', cd:0.16, key:'S'},
  L:{name:'Laser',       color:'#ffd23a', cd:0.20, key:'L'},
  B:{name:'Bombs',       color:'#39ff14', cd:0.34, key:'B'}
};
export const PUP_CYCLE=['M','S','L','B','R','shield']; // capsule cycles through these

export const LIFE_EVERY=5000;          // earn a free life each time score crosses a multiple of this

export const SHIELD_REGEN_DELAY=4.0;   // seconds without damage before shield starts regenerating
export const SHIELD_REGEN_TIME=2.6;    // seconds per shield point regained

export const WAVES_PER_LEVEL=5;   // waves 1..4 are swarms, wave 5 is the boss
export const NUM_LEVELS=8;
// Per-level background mood: 3 nebula tints, the horizon glow, and the grid colour.
// Keeps the synthwave vibe while each level reads as a distinct place.
export const LEVEL_THEMES=[
  {neb:['157,78,221','255,45,149','34,120,200'], glow:'255,45,149', grid:'157,78,221'}, // 1 violet (default)
  {neb:['34,225,255','56,120,255','120,90,220'], glow:'34,225,255', grid:'56,150,230'},  // 2 cyan
  {neb:['255,45,149','200,60,255','120,40,180'], glow:'255,80,180', grid:'200,60,255'},  // 3 pink
  {neb:['255,120,40','255,45,149','180,40,120'], glow:'255,120,40', grid:'255,90,150'},  // 4 sunset
  {neb:['57,255,140','34,225,255','40,160,120'], glow:'57,255,140', grid:'34,200,180'},  // 5 toxic
  {neb:['60,90,220','120,60,200','30,60,160'],   glow:'90,120,255', grid:'90,90,220'},   // 6 deep blue
  {neb:['255,70,70','255,140,40','180,40,60'],   glow:'255,80,80',  grid:'255,120,80'},  // 7 danger
  {neb:['255,210,60','255,45,149','157,78,221'], glow:'255,210,90', grid:'255,160,200'}, // 8 finale gold
];
export function themeFor(n){ return LEVEL_THEMES[(n-1)%LEVEL_THEMES.length]; }
