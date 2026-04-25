const video = document.getElementById('video')
const loader = document.getElementById('loader')

const EMOTION_COLORS = {
    happy:     '#22c55e',
    surprised: '#f59e0b',
    neutral:   '#94a3b8',
    sad:       '#60a5fa',
    angry:     '#ef4444',
    fearful:   '#a78bfa',
    disgusted: '#84cc16'
}

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models'),
    faceapi.nets.ageGenderNet.loadFromUri('/models')
]).then(() => {
    loader.style.display = 'none'
    startVideo()
}).catch(err => {
    loader.querySelector('span').textContent = 'Failed to load models: ' + err.message
})

function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => video.srcObject = stream)
        .catch(err => console.error(err))
}

video.addEventListener('play', () => {
    const canvas = faceapi.createCanvasFromMedia(video)
    document.body.append(canvas)
    const displaySize = { width: video.width, height: video.height }
    faceapi.matchDimensions(canvas, displaySize)

    setInterval(async () => {
        const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender()

        const resized = faceapi.resizeResults(detections, displaySize)
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        resized.forEach(det => {
            const { x, y, width, height } = det.detection.box
            const expressions = det.expressions
            const dominant = Object.entries(expressions).reduce((a, b) => a[1] > b[1] ? a : b)[0]
            const color = EMOTION_COLORS[dominant] || '#ffffff'

            // color-coded bounding box
            ctx.strokeStyle = color
            ctx.lineWidth = 3
            ctx.strokeRect(x, y, width, height)

            // age & gender label
            const age = Math.round(det.age)
            const gender = det.gender
            const label = `${gender}, ${age}`
            ctx.fillStyle = color
            ctx.font = 'bold 16px sans-serif'
            ctx.fillText(label, x + 4, y > 20 ? y - 6 : y + 20)

            // dominant emotion badge
            ctx.fillStyle = color
            ctx.globalAlpha = 0.85
            const badgeText = dominant.toUpperCase()
            const textWidth = ctx.measureText(badgeText).width
            ctx.fillRect(x, y + height + 2, textWidth + 12, 22)
            ctx.globalAlpha = 1
            ctx.fillStyle = '#000'
            ctx.font = 'bold 13px sans-serif'
            ctx.fillText(badgeText, x + 6, y + height + 18)
        })

        // still draw landmarks
        faceapi.draw.drawFaceLandmarks(canvas, resized)
    }, 100)
})
