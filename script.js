// State
let state = {
    photoCount: 0,
    photos: [], // Array to store captured Photo Blobs/Data URLs
    selectedFrame: 'simple-white',
    width: 640,
    height: 480 // Will be set based on video aspect ratio
};

// DOM Elements
const sections = {
    landing: document.getElementById('landing-page'),
    camera: document.getElementById('camera-page'),
    frame: document.getElementById('frame-page'),
    result: document.getElementById('result-page')
};

const video = document.getElementById('video-feed');
const canvas = document.getElementById('result-canvas');
const ctx = canvas.getContext('2d');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownText = document.getElementById('countdown-text');
const flashOverlay = document.getElementById('flash-overlay');
const currentPhotoSpan = document.getElementById('current-photo-count');
const totalPhotoSpan = document.getElementById('total-photo-count');

// Navigation
function showSection(sectionId) {
    Object.values(sections).forEach(sec => sec.classList.add('hidden'));
    Object.values(sections).forEach(sec => sec.classList.remove('flex'));

    const target = document.getElementById(sectionId);
    target.classList.remove('hidden');
    target.classList.add('flex');
}

// 1. Selection
function selectPhotoCount(count) {
    state.photoCount = count;
    totalPhotoSpan.textContent = count;
    currentPhotoSpan.textContent = 0;
    startCamera();
}

// 2. Camera Logic
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        video.srcObject = stream;
        showSection('camera-page');
    } catch (err) {
        alert("Gagal mengakses kamera: " + err.message);
        console.error(err);
    }
}

// 3. Photo Capture Sequence
function startPhotoSequence() {
    document.getElementById('start-camera-btn').classList.add('hidden');
    state.photos = [];
    captureNextPhoto(1);
}

function captureNextPhoto(current) {
    if (current > state.photoCount) {
        finishCapture();
        return;
    }

    currentPhotoSpan.textContent = current;

    // Countdown
    let count = 3;
    countdownOverlay.classList.remove('hidden');
    countdownText.textContent = count;

    const timer = setInterval(() => {
        count--;
        if (count > 0) {
            countdownText.textContent = count;
        } else {
            clearInterval(timer);
            takePhoto();
            countdownOverlay.classList.add('hidden');

            // Wait a bit before next photo
            setTimeout(() => captureNextPhoto(current + 1), 1000);
        }
    }, 1000);
}

function takePhoto() {
    // Flash effect
    flashOverlay.classList.add('flash-active');
    setTimeout(() => { flashOverlay.classList.remove('flash-active'); }, 500);

    // Capture frame from video
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');

    // Flip horizontally because video is mirrored
    tempCtx.translate(tempCanvas.width, 0);
    tempCtx.scale(-1, 1);

    tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    state.photos.push(tempCanvas.toDataURL('image/png'));
}

function finishCapture() {
    // Stop camera
    const stream = video.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
    }

    // Navigate to Frame Selection
    showSection('frame-page');
}

// 4. Result Generation - COMPACT VERTICAL STRIP (SQUARE-ISH)
async function generateResult() {
    if (state.photos.length === 0) return;

    const frameType = state.selectedFrame;
    const padding = 30; // Padding between photos
    const sidePadding = 40; // Left/right padding
    const headerHeight = 70; // Space for header
    const footerHeight = 80; // Space for footer

    // Fixed width for compact result - good for mobile
    const photoWidth = 500;

    // Helper to load image
    const loadImage = (src) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    };

    try {
        // Load all images first
        const images = await Promise.all(state.photos.map(loadImage));

        // Calculate individual photo height (maintaining aspect ratio)
        const firstImg = images[0];
        const photoHeight = (firstImg.height / firstImg.width) * photoWidth;

        // Define Canvas Colors based on Frame
        let bg = '#ffffff';
        let textColor = '#000000';
        let borderColor = 'transparent';
        let borderWidth = 0;

        if (frameType === 'simple-black') {
            bg = '#1a1a1a';
            textColor = '#ffffff';
        } else if (frameType === 'neon') {
            bg = '#000000';
            textColor = '#ff00ff';
            borderColor = '#00ffff';
            borderWidth = 3;
        }

        // Calculate total canvas dimensions
        const canvasWidth = photoWidth + (sidePadding * 2);
        const totalPhotoHeight = (photoHeight * images.length) + (padding * (images.length - 1));
        const canvasHeight = headerHeight + totalPhotoHeight + footerHeight + (padding * 2);

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Fill Background
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Header
        ctx.font = 'bold 28px "Outfit", sans-serif';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.fillText('PHOTOBOX MEMORIES', canvasWidth / 2, headerHeight - 25);

        // Draw Photos Vertically
        let currentY = headerHeight + padding;

        images.forEach((img) => {
            const x = sidePadding;

            // Draw Border for Neon frame
            if (frameType === 'neon') {
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = borderWidth;
                ctx.strokeRect(x - borderWidth, currentY - borderWidth,
                    photoWidth + (borderWidth * 2), photoHeight + (borderWidth * 2));
            }

            // Draw subtle border for other frames
            if (frameType === 'simple-white') {
                ctx.strokeStyle = '#e0e0e0';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, currentY, photoWidth, photoHeight);
            } else if (frameType === 'simple-black') {
                ctx.strokeStyle = '#404040';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, currentY, photoWidth, photoHeight);
            }

            // Draw the photo
            ctx.drawImage(img, x, currentY, photoWidth, photoHeight);
            currentY += photoHeight + padding;
        });

        // Draw Footer
        ctx.font = '18px "Outfit", sans-serif';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';

        const date = new Date().toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        ctx.fillText(date, canvasWidth / 2, canvasHeight - footerHeight + 35);

    } catch (err) {
        console.error("Error generating result:", err);
        alert("Terjadi kesalahan saat memproses foto. Silakan coba lagi.");
    }
}

// Frame Selection Logic
function selectFrame(frameName) {
    state.selectedFrame = frameName;

    // Update UI to show selection
    const buttons = document.querySelectorAll('#frame-container button');
    buttons.forEach(btn => {
        if (btn.onclick.toString().includes(frameName)) {
            btn.classList.add('ring-4', 'ring-purple-500');
        } else {
            btn.classList.remove('ring-4', 'ring-purple-500');
        }
    });

    // If we are already on result page, regenerate
    if (!sections.result.classList.contains('hidden')) {
        generateResult();
    }
}

// Initial Call to setup default
selectFrame('simple-white');

// Tools
function downloadImage() {
    const link = document.createElement('a');
    link.download = `photobox-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
}

function resetApp() {
    location.reload();
}

async function shareToInstagram() {
    // Instagram doesn't support direct web sharing, but we can try mobile share API
    // and fallback to download for desktop

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    canvas.toBlob(async blob => {
        const file = new File([blob], "photobox_memories.png", { type: "image/png" });

        // Try Web Share API on mobile devices
        if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    title: 'Photobox Memories',
                    text: 'Check out my photobox moments! 📸✨',
                    files: [file]
                });
                return;
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.log('Share failed', err);
                }
            }
        }

        // Fallback: download the image with instructions
        downloadImage();

        // Show helpful message
        const msg = isMobile
            ? "Foto sudah didownload! Buka Instagram app, pilih '+' untuk post baru, lalu pilih foto dari gallery. 📸"
            : "Foto sudah didownload! Untuk share ke Instagram:\n1. Buka Instagram di HP kamu\n2. Tap '+' untuk post baru\n3. Pilih foto yang baru didownload\n\n💡 Tip: Transfer foto ke HP kamu dulu ya!";

        alert(msg);
    });
}
