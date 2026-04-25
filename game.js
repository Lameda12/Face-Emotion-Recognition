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
const HARD_ROUND = { pool: Object.keys(EMOTION_EMOJI), timeMs: 1500 }

const MAX_MISSES = 3

// ── State ───────────────────────────────────────────────────
let score             = 0
let round             = 0
let misses            = 0
let currentTarget     = null
let lastTarget        = null
let timerStart        = null
let timerDuration     = null
let timerRaf          = null
let detectionInterval = null
let gameActive        = false

// ── DOM refs ────────────────────────────────────────────────
const video        = document.getElementById('video')
const canvas       = document.getElementById('cam-canvas')
const loader       = document.getElementById('loader')
const countdown    = document.getElementById('countdown')
const flash        = document.getElementById('flash')
const scorePopup   = document.getElementById('score-popup')
const gameover     = document.getElementById('gameover')
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
    const config  = getRoundConfig(round)
    currentTarget = pickEmotion(config.pool)
    lastTarget    = currentTarget
    timerDuration = config.timeMs

    targetEmoji.textContent  = EMOTION_EMOJI[currentTarget]
    targetWord.textContent   = currentTarget.toUpperCase()
    roundDisplay.textContent = round + 1
    timerBar.style.background = '#6ee7b7'
    timerBar.style.width      = '100%'

    timerStart = performance.now()
    animateTimer()
    startDetection()
}

// ── Timer bar ────────────────────────────────────────────────
function animateTimer() {
    if (timerRaf) cancelAnimationFrame(timerRaf)

    function frame(now) {
        if (!gameActive) return
        const elapsed = now - timerStart
        const pct     = Math.max(0, 1 - elapsed / timerDuration)
        timerBar.style.width = (pct * 100) + '%'

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

// ── Detection ────────────────────────────────────────────────
function startDetection() {
    if (detectionInterval) clearInterval(detectionInterval)

    detectionInterval = setInterval(async () => {
        if (!gameActive) return

        const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions()

        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (detections.length === 0) return

        const det        = detections[0]
        const expressions = det.expressions
        const entries    = Object.entries(expressions)
        const [dominantEmotion, confidence] = entries.reduce((a, b) => a[1] > b[1] ? a : b)

        const { x, y, width, height } = det.detection.box
        const scaleX = canvas.width  / (video.videoWidth  || 720)
        const scaleY = canvas.height / (video.videoHeight || 560)
        const color  = EMOTION_COLORS[dominantEmotion] || '#fff'

        ctx.strokeStyle = color
        ctx.lineWidth   = 3
        ctx.strokeRect(x * scaleX, y * scaleY, width * scaleX, height * scaleY)

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
