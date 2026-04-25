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
