// State
let state = {
    photoCount: 0,
    photos: [],
    selectedFrame: 'simple-white',
    width: 640,
    height: 480
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
            setTimeout(() => captureNextPhoto(current + 1), 1000);
        }
    }, 1000);
}

function takePhoto() {
    flashOverlay.classList.add('flash-active');
    setTimeout(() => { flashOverlay.classList.remove('flash-active'); }, 500);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.translate(tempCanvas.width, 0);
    tempCtx.scale(-1, 1);

    tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    state.photos.push(tempCanvas.toDataURL('image/png'));
}

function finishCapture() {
    const stream = video.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
    }
    showSection('frame-page');
}

// 4. Result Generation - NATURAL ASPECT RATIO GRID
async function generateResult() {
    if (state.photos.length === 0) return;

    const frameType = state.selectedFrame;
    const padding = 15;
    const outerPadding = 30;
    const headerHeight = 60;
    const footerHeight = 50;

    const loadImage = (src) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    };

    try {
        const images = await Promise.all(state.photos.map(loadImage));

        // Get original aspect ratio from first image
        const originalWidth = images[0].width;
        const originalHeight = images[0].height;
        const aspectRatio = originalWidth / originalHeight;

        // Define colors based on frame
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

        // Grid layout
        let cols = 2;
        let rows;
        if (images.length === 3) {
            rows = 2;
        } else if (images.length === 4) {
            rows = 2;
        } else if (images.length === 5) {
            rows = 3;
        }

        // Calculate photo size maintaining aspect ratio
        const targetPhotoWidth = 350;
        const targetPhotoHeight = targetPhotoWidth / aspectRatio; // Maintain aspect ratio!

        // Calculate canvas size based on content
        const contentWidth = (targetPhotoWidth * 2) + padding;
        const contentHeight = (targetPhotoHeight * rows) + (padding * (rows - 1));

        const canvasWidth = contentWidth + (outerPadding * 2);
        const canvasHeight = contentHeight + headerHeight + footerHeight + (outerPadding * 2);

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Fill Background
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Header
        ctx.font = 'bold 24px "Outfit", sans-serif';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.fillText('PHOTOBOX MEMORIES', canvasWidth / 2, outerPadding + 30);

        // Draw Photos in Grid
        const startY = outerPadding + headerHeight;
        const startX = outerPadding;

        let photoIndex = 0;

        for (let row = 0; row < rows; row++) {
            let photosInRow = 2;
            let rowStartX = startX;

            // Center single photo in last row for 3 or 5 photos
            if (images.length === 3 && row === 1) {
                photosInRow = 1;
                rowStartX = startX + (targetPhotoWidth + padding) / 2;
            }
            if (images.length === 5 && row === 2) {
                photosInRow = 1;
                rowStartX = startX + (targetPhotoWidth + padding) / 2;
            }

            for (let col = 0; col < photosInRow; col++) {
                if (photoIndex >= images.length) break;

                const x = rowStartX + (col * (targetPhotoWidth + padding));
                const y = startY + (row * (targetPhotoHeight + padding));

                const img = images[photoIndex];

                // Draw Border for Neon
                if (frameType === 'neon') {
                    ctx.strokeStyle = borderColor;
                    ctx.lineWidth = borderWidth;
                    ctx.strokeRect(x - borderWidth / 2, y - borderWidth / 2,
                        targetPhotoWidth + borderWidth, targetPhotoHeight + borderWidth);
                }

                // Draw border for other frames
                if (frameType === 'simple-white') {
                    ctx.strokeStyle = '#e0e0e0';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x, y, targetPhotoWidth, targetPhotoHeight);
                } else if (frameType === 'simple-black') {
                    ctx.strokeStyle = '#404040';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x, y, targetPhotoWidth, targetPhotoHeight);
                }

                // Draw photo maintaining aspect ratio
                ctx.drawImage(img, x, y, targetPhotoWidth, targetPhotoHeight);
                photoIndex++;
            }
        }

        // Draw Footer
        ctx.font = '16px "Outfit", sans-serif';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';

        const date = new Date().toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        ctx.fillText(date, canvasWidth / 2, canvasHeight - outerPadding + 5);

        // Draw decorative emojis based on frame theme
        ctx.font = '24px sans-serif';

        if (frameType === 'simple-white') {
            // Cute/romantic theme
            ctx.fillText('✨', outerPadding - 5, outerPadding + 35);
            ctx.fillText('💕', canvasWidth - outerPadding - 15, outerPadding + 35);
            ctx.fillText('🌸', outerPadding + 15, canvasHeight - 15);
            ctx.fillText('💖', canvasWidth - outerPadding - 35, canvasHeight - 15);
        } else if (frameType === 'simple-black') {
            // Night/cool theme
            ctx.fillText('🌙', outerPadding - 5, outerPadding + 35);
            ctx.fillText('⭐', canvasWidth - outerPadding - 15, outerPadding + 35);
            ctx.fillText('🖤', outerPadding + 15, canvasHeight - 15);
            ctx.fillText('✨', canvasWidth - outerPadding - 35, canvasHeight - 15);
        } else if (frameType === 'neon') {
            // Cyber/tech theme
            ctx.fillText('⚡', outerPadding - 5, outerPadding + 35);
            ctx.fillText('🔥', canvasWidth - outerPadding - 15, outerPadding + 35);
            ctx.fillText('💜', outerPadding + 15, canvasHeight - 15);
            ctx.fillText('💙', canvasWidth - outerPadding - 35, canvasHeight - 15);
        }

    } catch (err) {
        console.error("Error generating result:", err);
        alert("Terjadi kesalahan saat memproses foto.");
    }
}

// Frame Selection Logic
function selectFrame(frameName) {
    state.selectedFrame = frameName;

    const buttons = document.querySelectorAll('#frame-container button');
    buttons.forEach(btn => {
        if (btn.onclick.toString().includes(frameName)) {
            btn.classList.add('ring-4', 'ring-purple-500');
        } else {
            btn.classList.remove('ring-4', 'ring-purple-500');
        }
    });

    if (!sections.result.classList.contains('hidden')) {
        generateResult();
    }
}

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
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    canvas.toBlob(async blob => {
        const file = new File([blob], "photobox_memories.png", { type: "image/png" });

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

        downloadImage();

        const msg = isMobile
            ? "Foto sudah didownload! Buka Instagram, pilih '+' lalu pilih foto dari gallery. 📸"
            : "Foto sudah didownload! Transfer ke HP dan upload ke Instagram ya!";

        alert(msg);
    });
}
