# RETROGRADE — PWA

A neon synthwave space shooter. Campaign of 8 levels (5 waves + a boss each), Contra-style weapon power-ups, rechargeable shields, free lives, and a procedural soundtrack the combat is choreographed to. Installable, plays offline, portrait orientation, drag-to-fly touch controls with auto-fire.

## Files (everything in this folder)
- `index.html` — the game (Vercel serves this automatically)
- `manifest.webmanifest` — PWA manifest (portrait, fullscreen)
- `sw.js` — service worker (offline + installability)
- `icon-180/192/512.png`, `icon-maskable-512.png` — app icons
- `vercel.json` — correct headers for the service worker + manifest

## Deploy to Vercel (static, no build step)
1. Put this whole `retrograde` folder's contents in your project root.
2. Drag-and-drop the folder at vercel.com (Add New → Project), or run `vercel` in the folder, or push to GitHub and Import.
3. No framework, no build command, no output dir needed. Vercel serves `index.html` and provides HTTPS (required for PWAs).

## Install on iPhone / iPad
1. Open the Vercel URL in **Safari**.
2. Share → **Add to Home Screen** → Add.
3. Launch from the icon — fullscreen, offline, no browser bars.

## Install on Android / Chrome
Open the URL → Chrome offers "Install app" (or ⋮ menu → Install app).

## Controls
- **Touch:** drag anywhere to fly (relative — the ship follows your swipe). Auto-fires while playing. Tap menu buttons/level nodes.
- **Desktop:** arrows/WASD to fly, hold Space to fire, P to pause. Click menu buttons.

## Progress
Campaign progress (unlocked levels, coins, stars) saves to the device via localStorage. Clearing the final level shows Campaign Complete with Play Again.

## Updating after deploy
Bump the cache name in `sw.js` (e.g. `retrograde-v1` → `v2`) so installed devices fetch the new build.
