# Emotion Gym: Mirror Match — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `game.html` + `game.js` — a face-matching game where the player copies displayed emotions using their webcam, with escalating difficulty and a miss-based game-over system.

**Architecture:** Standalone `game.html` page sharing existing `face-api.min.js` and `/models/` weights. All game state lives in `game.js` as plain JS variables — no framework, no backend. Detection loop runs via `setInterval` at 100ms, same pattern as `script.js`.

**Tech Stack:** Vanilla JS, HTML5 Canvas, face-api.js (already present), CSS

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `game.html` | Game UI shell — layout, loader, overlays |
| Create | `game.js` | All game logic: state machine, detection, scoring, UI updates |
| Modify | `index.html` | Add "Play Game" link to `game.html` |

---

### Task 1: game.html scaffold

**Files:**
- Create: `game.html`

- [ ] **Step 1: Create game.html with full layout**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Emotion Gym — Mirror Match</title>
    <script defer src="face-api.min.js"></script>
    <script defer src="game.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            background: #0f0f0f;
            color: #fff;
            font-family: sans-serif;
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* Top bar */
        #topbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 24px;
            background: #1a1a1a;
            font-size: 1.1rem;
            font-weight: bold;
            flex-shrink: 0;
        }
        #misses { font-size: 1.4rem; letter-spacing: 4px; }

        /* Main area */
        #game-area {
            display: flex;
            flex: 1;
            overflow: hidden;
        }

        /* Left: webcam */
        #cam-side {
            position: relative;
            flex: 1;
            background: #000;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        #video {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        #cam-canvas {
            position: absolute;
            top: 0; left: 0;
            width: 100%;
            height: 100%;
        }

        /* Right: target panel */
        #target-side {
            width: 340px;
            flex-shrink: 0;
            background: #1a1a1a;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 16px;
            padding: 24px;
        }
        #target-emoji { font-size: 7rem; line-height: 1; }
        #target-word {
            font-size: 2rem;
            font-weight: bold;
            letter-spacing: 3px;
            text-transform: uppercase;
        }
        #timer-bar-wrap {
            width: 100%;
            height: 14px;
            background: #333;
            border-radius: 7px;
            overflow: hidden;
        }
        #timer-bar {
            height: 100%;
            background: #6ee7b7;
            border-radius: 7px;
            transition: width 0.1s linear, background 0.3s;
            width: 100%;
        }

        /* Flash overlay */
        #flash {
            position: fixed;
            inset: 0;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.15s;
            z-index: 5;
        }
        #flash.green { background: rgba(34,197,94,0.25); }
        #flash.red   { background: rgba(239,68,68,0.25); }
        #flash.show  { opacity: 1; }

        /* Score popup */
        #score-popup {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 2.5rem;
            font-weight: bold;
            color: #22c55e;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s, top 0.4s;
            z-index: 6;
        }

        /* Loader */
        #loader {
            position: fixed;
            inset: 0;
            background: #0f0f0f;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 20;
            gap: 16px;
            font-size: 1.1rem;
        }
        .spinner {
            width: 48px; height: 48px;
            border: 5px solid #333;
            border-top-color: #6ee7b7;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Countdown overlay */
        #countdown {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.75);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 15;
            font-size: 8rem;
            font-weight: bold;
        }
        #countdown.hidden { display: none; }

        /* Game over overlay */
        #gameover {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.85);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 18;
            gap: 20px;
        }
        #gameover.hidden { display: none; }
        #gameover h1 { font-size: 3rem; color: #ef4444; }
        #gameover .stat { font-size: 1.4rem; color: #ccc; }
        #gameover .stat span { color: #fff; font-weight: bold; }
        #btn-replay {
            margin-top: 12px;
            padding: 14px 36px;
            font-size: 1.2rem;
            font-weight: bold;
            background: #6ee7b7;
            color: #000;
            border: none;
            border-radius: 8px;
            cursor: pointer;
        }
        #btn-replay:hover { background: #34d399; }
        #link-live {
            color: #6ee7b7;
            font-size: 0.95rem;
            text-decoration: underline;
            cursor: pointer;
        }
    </style>
</head>
<body>

    <!-- Loader -->
    <div id="loader">
        <div class="spinner"></div>
        <span>Loading models...</span>
    </div>

    <!-- Countdown -->
    <div id="countdown" class="hidden">3</div>

    <!-- Flash -->
    <div id="flash"></div>

    <!-- Score popup -->
    <div id="score-popup"></div>

    <!-- Game Over -->
    <div id="gameover" class="hidden">
        <h1>Game Over</h1>
        <div class="stat">Score: <span id="go-score">0</span></div>
        <div class="stat">Rounds survived: <span id="go-rounds">0</span></div>
        <button id="btn-replay">Play Again</button>
        <a id="link-live" href="index.html">← Live View</a>
    </div>

    <!-- Top bar -->
    <div id="topbar">
        <div>Score: <span id="score-display">0</span></div>
        <div>Round: <span id="round-display">1</span></div>
        <div id="misses">●○○</div>
    </div>

    <!-- Game area -->
    <div id="game-area">
        <div id="cam-side">
            <video id="video" autoplay muted playsinline></video>
            <canvas id="cam-canvas"></canvas>
        </div>
        <div id="target-side">
            <div id="target-emoji">😄</div>
            <div id="target-word">HAPPY</div>
            <div id="timer-bar-wrap">
                <div id="timer-bar"></div>
            </div>
        </div>
    </div>

</body>
</html>
```

- [ ] **Step 2: Open browser and verify layout renders**

```bash
cd /Users/amadi/Summer26/FaceRecEmo/Face-Emotion-Recognition
python3 -m http.server 8080
```

Open `http://localhost:8080/game.html`. Should see dark layout with loader spinner. No JS errors in console (game.js doesn't exist yet — that's fine, ignore that error only).

- [ ] **Step 3: Commit**

```bash
git add game.html
git commit -m "feat: add game.html shell with full layout and overlays"
```

---

### Task 2: game.js — state and constants

**Files:**
- Create: `game.js`

- [ ] **Step 1: Create game.js with constants and state**

```javascript
// ── Constants ──────────────────────────────────────────────
const EMOTION_EMOJI = {
    happy:     '😄',
    surprised: '😮',
    neutral:   '😐',
    sad:       '😢',
    angry:     '😠',
    fearful:   '😨',
    disgusted: '🤢',
}

const EMOTION_COLORS = {
    happy:     '#22c55e',
    surprised: '#f59e0b',
    neutral:   '#94a3b8',
    sad:       '#60a5fa',
    angry:     '#ef4444',
    fearful:   '#a78bfa',
    disgusted: '#84cc16',
}

const ROUNDS = [
    { pool: ['happy', 'surprised', 'neutral'],                              timeMs: 5000 },
    { pool: ['happy', 'surprised', 'neutral'],                              timeMs: 5000 },
    { pool: ['happy', 'surprised', 'neutral'],                              timeMs: 5000 },
    { pool: ['happy', 'surprised', 'neutral', 'sad', 'angry'],             timeMs: 3000 },
    { pool: ['happy', 'surprised', 'neutral', 'sad', 'angry'],             timeMs: 3000 },
    { pool: ['happy', 'surprised', 'neutral', 'sad', 'angry'],             timeMs: 3000 },
]
// Round 7+ uses this
const HARD_ROUND = { pool: Object.keys(EMOTION_EMOJI), timeMs: 1500 }

const MAX_MISSES = 3

// ── State ───────────────────────────────────────────────────
let score        = 0
let round        = 0   // 0-indexed
let misses       = 0
let currentTarget = null
let lastTarget    = null
let timerStart    = null
let timerDuration = null
let timerRaf      = null   // requestAnimationFrame id for timer bar
let detectionInterval = null
let gameActive    = false
```

- [ ] **Step 2: Commit**

```bash
git add game.js
git commit -m "feat: add game.js constants and state"
```

---

### Task 3: game.js — model loading and camera start

**Files:**
- Modify: `game.js` (append)

- [ ] **Step 1: Append model loading and camera start to game.js**

```javascript
// ── DOM refs ────────────────────────────────────────────────
const video       = document.getElementById('video')
const canvas      = document.getElementById('cam-canvas')
const loader      = document.getElementById('loader')
const countdown   = document.getElementById('countdown')
const flash       = document.getElementById('flash')
const scorePopup  = document.getElementById('score-popup')
const gameover    = document.getElementById('gameover')
const scoreDisplay = document.getElementById('score-display')
const roundDisplay = document.getElementById('round-display')
const missDisplay  = document.getElementById('misses')
const targetEmoji  = document.getElementById('target-emoji')
const targetWord   = document.getElementById('target-word')
const timerBar     = document.getElementById('timer-bar')
const goScore      = document.getElementById('go-score')
const goRounds     = document.getElementById('go-rounds')
const btnReplay    = document.getElementById('btn-replay')

// ── Boot ────────────────────────────────────────────────────
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models'),
]).then(() => {
    loader.style.display = 'none'
    startCamera()
}).catch(err => {
    loader.querySelector('span').textContent = 'Failed to load models: ' + err.message
})

function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'user' } } })
        .then(stream => {
            video.srcObject = stream
            video.addEventListener('play', onVideoReady, { once: true })
        })
        .catch(() => {
            loader.style.display = 'flex'
            loader.querySelector('span').textContent = 'Camera access denied. Please allow camera and reload.'
        })
}

function onVideoReady() {
    canvas.width  = video.videoWidth  || 720
    canvas.height = video.videoHeight || 560
    runCountdown()
}
```

- [ ] **Step 2: Verify in browser — loader disappears, camera feed visible**

Reload `http://localhost:8080/game.html`. Loader should hide after models load. Camera feed shows. Console should have no errors.

- [ ] **Step 3: Commit**

```bash
git add game.js
git commit -m "feat: load models and start camera in game.js"
```

---

### Task 4: game.js — countdown and round start

**Files:**
- Modify: `game.js` (append)

- [ ] **Step 1: Append countdown and round logic**

```javascript
// ── Countdown ───────────────────────────────────────────────
function runCountdown() {
    countdown.classList.remove('hidden')
    let count = 3
    countdown.textContent = count

    const tick = setInterval(() => {
        count--
        if (count <= 0) {
            clearInterval(tick)
            countdown.classList.add('hidden')
            startRound()
        } else {
            countdown.textContent = count
        }
    }, 1000)
}

// ── Round helpers ───────────────────────────────────────────
function getRoundConfig(roundIndex) {
    return roundIndex < ROUNDS.length ? ROUNDS[roundIndex] : HARD_ROUND
}

function pickEmotion(pool) {
    const available = pool.filter(e => e !== lastTarget)
    return available[Math.floor(Math.random() * available.length)]
}

// ── Start round ─────────────────────────────────────────────
function startRound() {
    gameActive = true
    const config = getRoundConfig(round)
    currentTarget = pickEmotion(config.pool)
    lastTarget    = currentTarget
    timerDuration = config.timeMs

    // Update UI
    targetEmoji.textContent = EMOTION_EMOJI[currentTarget]
    targetWord.textContent  = currentTarget.toUpperCase()
    roundDisplay.textContent = round + 1
    timerBar.style.background = '#6ee7b7'
    timerBar.style.width = '100%'

    timerStart = performance.now()
    animateTimer()
    startDetection()
}
```

- [ ] **Step 2: Commit**

```bash
git add game.js
git commit -m "feat: add countdown and round start logic"
```

---

### Task 5: game.js — timer bar animation

**Files:**
- Modify: `game.js` (append)

- [ ] **Step 1: Append timer animation**

```javascript
// ── Timer bar ────────────────────────────────────────────────
function animateTimer() {
    if (timerRaf) cancelAnimationFrame(timerRaf)

    function frame(now) {
        if (!gameActive) return
        const elapsed = now - timerStart
        const pct     = Math.max(0, 1 - elapsed / timerDuration)
        timerBar.style.width = (pct * 100) + '%'

        // Color shifts red as time runs low
        if (pct < 0.3) {
            timerBar.style.background = '#ef4444'
        } else if (pct < 0.6) {
            timerBar.style.background = '#f59e0b'
        } else {
            timerBar.style.background = '#6ee7b7'
        }

        if (pct <= 0) {
            onMiss()
        } else {
            timerRaf = requestAnimationFrame(frame)
        }
    }

    timerRaf = requestAnimationFrame(frame)
}
```

- [ ] **Step 2: Verify timer bar animates in browser**

Reload. After countdown, timer bar should drain left to right, turning amber then red. It will freeze at 0 (onMiss not defined yet — that's fine).

- [ ] **Step 3: Commit**

```bash
git add game.js
git commit -m "feat: animated timer bar with color shift"
```

---

### Task 6: game.js — face detection loop

**Files:**
- Modify: `game.js` (append)

- [ ] **Step 1: Append detection loop**

```javascript
// ── Detection ────────────────────────────────────────────────
function startDetection() {
    if (detectionInterval) clearInterval(detectionInterval)

    detectionInterval = setInterval(async () => {
        if (!gameActive) return

        const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions()

        // Draw face box on canvas
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (detections.length === 0) return

        const det = detections[0]
        const expressions = det.expressions
        const entries = Object.entries(expressions)
        const [dominantEmotion, confidence] = entries.reduce((a, b) => a[1] > b[1] ? a : b)

        // Draw color-coded box
        const { x, y, width, height } = det.detection.box
        const scaleX = canvas.width  / (video.videoWidth  || 720)
        const scaleY = canvas.height / (video.videoHeight || 560)
        const color  = EMOTION_COLORS[dominantEmotion] || '#fff'

        ctx.strokeStyle = color
        ctx.lineWidth   = 3
        ctx.strokeRect(x * scaleX, y * scaleY, width * scaleX, height * scaleY)

        // Check for match
        if (dominantEmotion === currentTarget && confidence > 0.5) {
            onHit()
        }
    }, 100)
}

function stopDetection() {
    if (detectionInterval) {
        clearInterval(detectionInterval)
        detectionInterval = null
    }
}
```

- [ ] **Step 2: Verify face box appears in browser**

Reload. After countdown, colored box should appear around face. No hit/miss logic yet — that comes next.

- [ ] **Step 3: Commit**

```bash
git add game.js
git commit -m "feat: face detection loop with color-coded box"
```

---

### Task 7: game.js — hit, miss, scoring

**Files:**
- Modify: `game.js` (append)

- [ ] **Step 1: Append hit/miss/score logic**

```javascript
// ── Hit ──────────────────────────────────────────────────────
function onHit() {
    if (!gameActive) return
    gameActive = false
    stopDetection()
    cancelAnimationFrame(timerRaf)

    const elapsed     = performance.now() - timerStart
    const msRemaining = Math.max(0, timerDuration - elapsed)
    const bonus       = Math.floor(msRemaining / 100)
    const points      = 100 + bonus
    score += points

    scoreDisplay.textContent = score
    showFlash('green')
    showScorePopup('+' + points)

    round++
    setTimeout(startRound, 900)
}

// ── Miss ─────────────────────────────────────────────────────
function onMiss() {
    if (!gameActive) return
    gameActive = false
    stopDetection()

    misses++
    updateMissDots()
    showFlash('red')

    if (misses >= MAX_MISSES) {
        setTimeout(showGameOver, 600)
    } else {
        round++
        setTimeout(startRound, 900)
    }
}

// ── Miss dots ────────────────────────────────────────────────
function updateMissDots() {
    const filled = '●'.repeat(misses)
    const empty  = '○'.repeat(MAX_MISSES - misses)
    missDisplay.textContent = filled + empty
}

// ── Flash ────────────────────────────────────────────────────
function showFlash(color) {
    flash.className = color + ' show'
    setTimeout(() => { flash.className = '' }, 300)
}

// ── Score popup ──────────────────────────────────────────────
function showScorePopup(text) {
    scorePopup.textContent = text
    scorePopup.style.opacity = '1'
    scorePopup.style.top = '45%'
    setTimeout(() => {
        scorePopup.style.opacity = '0'
        scorePopup.style.top = '50%'
    }, 600)
}
```

- [ ] **Step 2: Test hit flow in browser**

Reload. Make a happy face during round 1 — should see green flash, "+1XX" popup, and move to next round with updated score.

- [ ] **Step 3: Test miss flow**

Let timer run out — red flash, miss dot fills. After 3 misses should freeze (game over not wired yet).

- [ ] **Step 4: Commit**

```bash
git add game.js
git commit -m "feat: hit/miss scoring, flash feedback, miss dots"
```

---

### Task 8: game.js — game over and replay

**Files:**
- Modify: `game.js` (append)

- [ ] **Step 1: Append game over and replay logic**

```javascript
// ── Game Over ────────────────────────────────────────────────
function showGameOver() {
    stopDetection()
    cancelAnimationFrame(timerRaf)
    gameActive = false

    goScore.textContent  = score
    goRounds.textContent = round
    gameover.classList.remove('hidden')
}

// ── Replay ───────────────────────────────────────────────────
btnReplay.addEventListener('click', () => {
    // Reset state
    score         = 0
    round         = 0
    misses        = 0
    currentTarget = null
    lastTarget    = null
    gameActive    = false

    // Reset UI
    scoreDisplay.textContent  = '0'
    roundDisplay.textContent  = '1'
    missDisplay.textContent   = '○○○'
    timerBar.style.width      = '100%'
    timerBar.style.background = '#6ee7b7'
    gameover.classList.add('hidden')

    runCountdown()
})
```

- [ ] **Step 2: Test full game loop in browser**

Play through to 3 misses. Game Over screen should show final score and rounds. "Play Again" resets everything and restarts countdown.

- [ ] **Step 3: Commit**

```bash
git add game.js
git commit -m "feat: game over screen and replay"
```

---

### Task 9: Add "Play Game" link to index.html

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add game link to index.html body**

In `index.html`, after the `<video>` tag, add:

```html
    <a href="game.html" style="
        position: fixed;
        bottom: 20px;
        right: 24px;
        background: #6ee7b7;
        color: #000;
        font-weight: bold;
        font-family: sans-serif;
        padding: 10px 20px;
        border-radius: 8px;
        text-decoration: none;
        font-size: 0.95rem;
        z-index: 20;
    ">🎮 Play Emotion Gym</a>
```

- [ ] **Step 2: Verify link appears on index.html**

Reload `http://localhost:8080`. Green button "Play Emotion Gym" should appear bottom-right. Clicking takes you to game.html.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add Play Emotion Gym link to index.html"
```

---

### Task 10: Push and update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Emotion Gym section to README**

In `README.md`, after "## What it does" section, add:

```markdown
## Emotion Gym 🎮

Interactive face game — mirror the displayed emotion before the timer runs out!

- Difficulty escalates across rounds (harder emotions + less time)
- 3 misses = Game Over
- Open `game.html` to play (or click the button from the live view)
```

- [ ] **Step 2: Push everything**

```bash
git add README.md
git commit -m "docs: add Emotion Gym section to README"
git push
```

- [ ] **Step 3: Verify on GitHub**

Check `https://github.com/Lameda12/Face-Emotion-Recognition` — both files visible, README updated.

---

## Self-Review

**Spec coverage:**
- ✅ Separate `game.html` page
- ✅ Model loading with spinner
- ✅ Camera with `facingMode: user`
- ✅ 3-2-1 countdown
- ✅ Round structure with escalating pools and timers
- ✅ No repeat of same emotion back-to-back
- ✅ Match threshold > 0.5 confidence
- ✅ Hit: +100 + speed bonus
- ✅ Miss: 3 misses = Game Over
- ✅ Color-coded face box per dominant emotion
- ✅ Timer bar with color shift
- ✅ Green/red flash + score popup
- ✅ Miss dots ●●○
- ✅ Game Over overlay with score + rounds
- ✅ Play Again resets all state
- ✅ Link back to `index.html`
- ✅ `index.html` gets link to `game.html`
- ✅ Camera denied error handled
- ✅ Model fail error handled
- ✅ No face detected → timer keeps running (detection loop returns early)

**Placeholder scan:** None found.

**Type consistency:** All IDs, variable names, and function calls consistent across tasks.
