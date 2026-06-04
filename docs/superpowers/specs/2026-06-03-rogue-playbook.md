# RETROGRADE ROGUE — Survivors-like Playbook & Checklist

**Date:** 2026-06-03
**Purpose:** The canonical anatomy of a Vampire-Survivors-style roguelite, used as the build bible for RETROGRADE's ROGUE mode so we build it *right* and track progress. Status keys: ✅ done · 🔶 partial · ⬜ todo.

The genre (Vampire Survivors, Survivor.io, Brotato, 20 Minutes Till Dawn) is built from ~9 systems. A run is fun when the **30-second loop** is tight, the **build** creates power-fantasy + strategy, and **escalation** keeps it on a knife's edge to a climax.

---

## 1. The core loop (the 30-second loop)
Move → weapons auto-fight the horde → kills drop **XP gems** → collect (magnet) → **level up** → pick **1-of-N upgrades** → repeat, escalating.
- ✅ Auto-fire loadout, homing horde, gems→collect→level→draft.

## 2. Run arc (beginning → climax)
Weak start (learn) → mid-run (build comes online = power fantasy) → late (overwhelming) → **a climax/end**, not a flat treadmill. Survivors runs are time-boxed (~15–30 min) with escalating spawn tables + **timed events** (elite waves, a "reaper" at the time cap).
- 🔶 Endless escalation (strength ramps with time).
- ⬜ Run length target + a real climax/finale; ⬜ timed event spikes (elite waves at intervals).

## 3. Weapons & the build (the heart)
- ✅ **Pick a starting weapon** at run start (CHOOSE WEAPON screen: PULSE/SCATTER/SEEKER/LANCE).
- ✅ Weapons **stack** (multiple fire simultaneously) and ✅ **level up**.
- ✅ **Evolutions/fusions** — max a weapon + own its paired passive → the draft offers an EVOLVE into a super (PULSE+Haste→STORM, SCATTER+Splinter→NOVA, SEEKER+Might→SWARM, LANCE+Velocity→RAILGUN).
- ✅ **Passives** distinct from weapons — 9 of them (Might, Haste, Splinter, Velocity, Magnet, Plating, Regen, Thrusters, Growth), each levels and buffs all weapons via G.run.
- ✅ **Slot caps** — 5 weapons + 6 passives; at cap the draft only offers leveling.

## 4. Upgrade-choice design
1-of-3/4 on level-up; categorized (attack/defense/utility); choices create build identity + strategy (bad picks = overwhelmed).
- ✅ 1-of-3 categorized draft.
- ⬜ **Reroll / Skip / Banish** (skip → gold/XP; banish → remove an unwanted option) — adds agency.
- ⬜ Evolutions surfaced in the draft when prerequisites met.

## 5. Enemy director & variety
Spawn tables escalate over time; varied enemies (fast / tank / ranged / splitter / swarm); **elites** with affixes; **bosses/mini-bosses** at time intervals; a "director" scales density + HP with time.
- 🔶 Continuous edge-spawned horde; strength ramps every ~15s. Currently only homing grunts in rogue.
- ⬜ Bring the archetypes (darter/tank/weaver/splitter) into the rogue horde; ⬜ **elites/affixes**; ⬜ interval **bosses/mini-bosses**.

## 6. Pickups & economy
XP gems (tiered values), **gold/coins** (meta currency), **health** pickups (rare, earned), **chests** (big reward from elites), magnet/vacuum pickup.
- ✅ XP gems (single tier).
- ⬜ Tiered gems; ⬜ random **health/shield drops**; ⬜ gold; ⬜ chests from elites.

## 7. Meta-progression (between runs)
Persistent currency → permanent upgrades; unlock new weapons / ships / stages; achievements. The "always progressing" retention hook.
- ⬜ **Ship Souls** currency + a permanent-upgrade/unlock screen.

## 8. Characters / ships
Different starting ships = unique weapon + stat + passive → replay variety & build identity.
- ⬜ Multiple ships (each a starting-weapon + stat archetype).

## 9. Game feel & mobile UX
Hit feedback, gem-collect pop, **level-up fanfare**, the screen-fill power payoff, sound; one-thumb move + auto-everything; readable at small size; run fits a session.
- ✅ One-thumb roam + auto-fire + follow-camera + bloom/hitstop. 🔶 Needs level-up fanfare + XP bar + collect pop.

## Balance rules (the knife's edge)
- Difficulty scales with **time AND player power** so the run never trivializes (our earlier plateau bug).
- **HP scales faster than damage** late → pressure is "can't clear fast enough," not unfair instakills.
- Telegraph threats; keep bullets readable; power-fantasy first, overwhelm earned.

---

## Where ROGUE stands today (built so far)
✅ Core loop · ✅ stacking + leveling weapons · ✅ categorized draft · ✅ gems + magnet · ✅ large scrolling arena + follow-camera · ✅ time-based strength ramp · ✅ music crank · ✅ run-end card + per-mode best.

## Recommended build order (next, by impact)
1. **Pick-your-starter-weapon screen** + a real **passive set with slots** (§3) — makes builds *identities*.
2. **Weapon evolutions/fusions** (§3) — the signature payoff you asked for.
3. **Enemy variety + elites + interval mini-bosses** in the horde (§5) — novelty + threat texture.
4. **Health/shield drops + tiered gems + an XP bar/level-up fanfare** (§6, §9) — feel + earned survival.
5. **Run arc: a finale/climax + timed elite-wave events** (§2).
6. **Ship Souls meta-progression + multiple ships** (§7, §8) — long-term retention; last.

Each ships as its own slice; we check it against this doc so nothing core gets skipped.
