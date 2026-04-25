# Emotion Gym: Mirror Match — Design Spec
**Date:** 2026-04-25  
**Project:** Face-Emotion-Recognition  
**Status:** Approved

---

## Overview

A browser-based face emotion game built on top of the existing face-api.js detection project. Player is shown a target emotion and must match it with their face within a time limit. Difficulty escalates over rounds via harder emotions and shorter timers. Lives system — 3 misses ends the game.

---

## Files

| File | Purpose |
|------|---------|
| `game.html` | Game UI — separate from `index.html` |
| `game.js` | All game logic, detection loop, scoring |
| `face-api.min.js` | Shared (existing) |
| `models/` | Shared model weights (existing) |

`index.html` gets a link to `game.html`. `game.html` gets a link back to `index.html`.

---

## Game Flow

```
Load models
  → Spinner while loading
  → Camera start (front-facing, facingMode: user)
  → 3-2-1 countdown overlay
  → Round starts: show target emotion (emoji + word)
  → Detection loop runs every 100ms
  → Player matches dominant detected emotion to target
  → Hit: score awarded, next round
  → Miss (time runs out): miss counter +1
  → 3 misses: Game Over screen
```

---

## Round Structure

| Rounds | Emotion Pool | Timer |
|--------|-------------|-------|
| 1–3 | happy, surprised, neutral | 5s |
| 4–6 | sad, angry + above | 3s |
| 7+ | fearful, disgusted + all | 1.5s |

Emotion selected randomly from pool each round. Same emotion won't repeat twice in a row.

---

## Scoring

- **Base hit:** +100 pts  
- **Speed bonus:** +1 pt per 100ms remaining on clock  
- **Miss:** 0 pts, miss counter increments  
- **3 misses:** Game Over (no lives display — just miss dots ●●○)  
- Score is session-only — resets on page reload

---

## UI Layout

```
┌─────────────────────────────────────────┐
│  Score: 0      Round: 1      ●○○        │  ← top bar
├────────────────────┬────────────────────┤
│                    │                    │
│   Webcam + face    │   😄               │
│   box overlay      │   HAPPY            │
│                    │   [====timer====]  │
│                    │                    │
└────────────────────┴────────────────────┘
```

- Left: live webcam feed, face bounding box with color per dominant emotion  
- Right: target emoji (large), emotion word, countdown timer bar  
- Top bar: score, round number, miss dots  
- On match: brief green flash + "+100" popup  
- On miss: brief red flash  

---

## Emotion → Emoji Map

| Emotion | Emoji |
|---------|-------|
| happy | 😄 |
| surprised | 😮 |
| neutral | 😐 |
| sad | 😢 |
| angry | 😠 |
| fearful | 😨 |
| disgusted | 🤢 |

---

## Game Over Screen

Overlaid on top of game:
- "Game Over" heading  
- Final score  
- Rounds survived  
- "Play Again" button (resets state, restarts from round 1)  
- "Live View" link → `index.html`  

---

## Detection Logic

- Run `faceapi.detectAllFaces(...).withFaceExpressions()` every 100ms (same as existing)  
- Take first detected face  
- Extract dominant emotion via `Object.entries(expressions).reduce(max)`  
- Compare to `currentTarget` — if match, trigger hit  
- No landmark or age/gender needed in game mode (performance)  

---

## Match Threshold

Dominant emotion must be the target AND confidence > 0.5 to count as a hit. Prevents accidental triggers.

---

## Camera

- `facingMode: { ideal: 'user' }` — front camera default, works on phone and desktop  
- No camera switcher in v1  

---

## Error Handling

- Model load fail → show error message, no crash  
- Camera denied → show "Allow camera access" message  
- No face detected → timer keeps running, no hit registered  

---

## Out of Scope (v1)

- Score persistence / localStorage  
- Multiple game modes  
- Multiplayer  
- Camera switcher  
