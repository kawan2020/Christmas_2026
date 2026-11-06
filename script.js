// 💡 CHANGE THIS NUMBER TO CONTROL THE NUMBER OF FACES / IMAGES
const TOTAL_IMAGES = 8; 

// ==========================================
// 💡 AUDIO & SOUND CONFIGURATION CONTROLS
// ==========================================
const AUDIO_CONFIG = {
  BACKGROUND_VOLUME: 0.007, // 💡 Background music volume (0.0 to 1.0)
  EFFECT1_VOLUME: 0.02,    // 💡 Tap sound volume (0.0 to 1.0)
  EFFECT2_VOLUME: 0.02   // 💡 Swipe sound volume (0.0 to 1.0)
};

// ==========================================
// 💡 PARTICLE SYSTEM CONFIGURATION CONTROLS
// ==========================================
const PARTICLE_CONFIG = {
  COUNT: 600,                        // Number of particles on screen
  COLOR: 'rgba(255, 255, 255, 0.9)', // Particle color (grey) & transparency
  MIN_SIZE: 0.3,                    // Minimum particle radius (px)
  MAX_SIZE: 2.5,                    // Maximum particle radius (px)
  BASE_SPEED: 0.7                   // Natural drift speed
};

let currentIndex = 0;
let rotationStepCount = 0; 
let isFullscreen = false;
let isInitialSpinning = true;
let hasSpinned = false; 

// Zoom & Pan state for Image Mode
let scale = 1;
let translateX = 0;
let translateY = 0;
let startPinchDistance = 0;
let initialScale = 1;
let isPanning = false;
let startPanX = 0;
let startPanY = 0;

const box = document.getElementById('box');
const header = document.getElementById('main-header');
const dotsContainer = document.getElementById('pagination-dots');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

// Audio elements
const bgMusic = document.getElementById('bg-music');
const soundTap = document.getElementById('sound-tap');
const soundSwipe = document.getElementById('sound-swipe');
const audioToggleBtn = document.getElementById('audio-toggle-btn');
const audioIcon = document.getElementById('audio-icon');

let isMuted = false;
let hasInteractedForAudio = false;

// ==========================================
// AUDIO SYSTEM & CONTROLS
// ==========================================
function initAudio() {
  if (bgMusic) bgMusic.volume = AUDIO_CONFIG.BACKGROUND_VOLUME;
  if (soundTap) soundTap.volume = AUDIO_CONFIG.EFFECT1_VOLUME;
  if (soundSwipe) soundSwipe.volume = AUDIO_CONFIG.EFFECT2_VOLUME;

  // Attempt autoplay immediately on load
  attemptPlayMusic();
}

function attemptPlayMusic() {
  if (bgMusic && !isMuted) {
    bgMusic.play().then(() => {
      hasInteractedForAudio = true;
    }).catch(() => {
      // Browser blocked autoplay; will start on first touch interaction
      hasInteractedForAudio = false;
    });
  }
}

function playTapSound() {
  if (isMuted || !soundTap) return;
  soundTap.currentTime = 0;
  soundTap.play().catch(() => {});
}

function playSwipeSound() {
  if (isMuted || !soundSwipe) return;
  soundSwipe.currentTime = 0;
  soundSwipe.play().catch(() => {});
}

// Toggle Mute / Play Button
if (audioToggleBtn) {
  audioToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Stop click from triggering gallery zoom
    isMuted = !isMuted;

    if (isMuted) {
      bgMusic.pause();
      audioIcon.textContent = '🔇';
      audioToggleBtn.classList.add('muted');
      audioToggleBtn.classList.remove('playing');
    } else {
      bgMusic.play();
      audioIcon.textContent = '🔊';
      audioToggleBtn.classList.remove('muted');
      audioToggleBtn.classList.add('playing');
    }
  });
}

function getZOffset() {
  const width = box.offsetWidth;
  const angleRad = (360 / TOTAL_IMAGES / 2) * (Math.PI / 180);
  return Math.round((width / 2) / Math.tan(angleRad));
}

let zOffset = getZOffset();

// ==========================================
// 1. PARTICLE ENGINE WITH BOX MOTION PHYSICS
// ==========================================
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let airVelocityX = 0;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * (PARTICLE_CONFIG.MAX_SIZE - PARTICLE_CONFIG.MIN_SIZE) + PARTICLE_CONFIG.MIN_SIZE;
    this.vx = (Math.random() - 0.5) * PARTICLE_CONFIG.BASE_SPEED;
    this.vy = (Math.random() - 0.5) * PARTICLE_CONFIG.BASE_SPEED;
  }

  update() {
    this.x += this.vx + airVelocityX;
    this.y += this.vy;

    if (this.x < 0) this.x = canvas.width;
    if (this.x > canvas.width) this.x = 0;
    if (this.y < 0) this.y = canvas.height;
    if (this.y > canvas.height) this.y = 0;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = PARTICLE_CONFIG.COLOR;
    ctx.fill();
  }
}

function initParticles() {
  particles = [];
  for (let i = 0; i < PARTICLE_CONFIG.COUNT; i++) {
    particles.push(new Particle());
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  airVelocityX *= 0.95;

  particles.forEach(p => {
    p.update();
    p.draw();
  });
  requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();

function pushParticles(force) {
  airVelocityX = force;
}

// ==========================================
// 2. SETUP & FIXED SINGLE-DIRECTION INTRO SPIN
// ==========================================
function setupGallery() {
  box.innerHTML = '';
  dotsContainer.innerHTML = '';
  zOffset = getZOffset();

  const angleStep = 360 / TOTAL_IMAGES;

  for (let i = 1; i <= TOTAL_IMAGES; i++) {
    const slide = document.createElement('div');
    slide.className = 'slide';

    const img = document.createElement('img');
    img.src = `images/image${i}.jpg`;
    img.alt = `Image ${i}`;
    slide.appendChild(img);

    const angle = (i - 1) * angleStep;
    slide.style.transform = `rotateY(${angle}deg) translateZ(${zOffset}px)`;

    box.appendChild(slide);

    const dot = document.createElement('div');
    dot.className = `dot ${i === 1 ? 'active' : ''}`;
    dotsContainer.appendChild(dot);
  }

  runIntroSpin();
}

function runIntroSpin() {
  if (hasSpinned) {
    updateGallery();
    return;
  }
  hasSpinned = true;
  isInitialSpinning = true;

  box.style.transition = 'none';
  box.style.transform = `translateZ(-${zOffset}px) rotateY(-360deg)`;

  void box.offsetHeight;

  box.style.transition = 'transform 2.5s cubic-bezier(0.1, 0.8, 0.2, 1)';
  box.style.transform = `translateZ(-${zOffset}px) rotateY(0deg)`;

  pushParticles(-4.5);

  setTimeout(() => {
    box.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    rotationStepCount = 0;
    currentIndex = 0;

    updateGallery();
    isInitialSpinning = false;
  }, 2500);
}

setupGallery();
initAudio();

window.addEventListener('resize', () => {
  if (!isFullscreen) setupGallery();
});

function resetZoomPan() {
  scale = 1;
  translateX = 0;
  translateY = 0;
  applyImageTransform();
}

function applyImageTransform() {
  if (!isFullscreen) return;
  const activeSlide = document.querySelectorAll('.slide')[currentIndex];
  if (activeSlide) {
    const img = activeSlide.querySelector('img');
    if (img) {
      img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      img.style.transition = isPanning ? 'none' : 'transform 0.1s ease-out';
    }
  }
}

function getDistance(touches) {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY
  );
}

// 3. Desktop Button Navigation Controls
if (prevBtn && nextBtn) {
  prevBtn.addEventListener('click', () => {
    if (isInitialSpinning || currentIndex <= 0) return;
    playSwipeSound();
    rotationStepCount--;
    currentIndex--;
    pushParticles(3.5);
    updateGallery(true, 'right');
  });

  nextBtn.addEventListener('click', () => {
    if (isInitialSpinning || currentIndex >= TOTAL_IMAGES - 1) return;
    playSwipeSound();
    rotationStepCount++;
    currentIndex++;
    pushParticles(-3.5);
    updateGallery(true, 'left');
  });
}

// 4. Touch & Mouse Event Handlers
let startX = 0;
let startY = 0;
let startTime = 0;
let isDragging = false;
let lastTap = 0;

document.addEventListener('touchstart', (e) => {
  // Unlock autoplay on first physical interaction if blocked by browser
  if (!hasInteractedForAudio) {
    attemptPlayMusic();
  }

  if (isInitialSpinning) return;

  if (e.touches.length === 2 && isFullscreen) {
    startPinchDistance = getDistance(e.touches);
    initialScale = scale;
    return;
  }

  if (e.touches.length === 1) {
    if (isFullscreen && scale > 1) {
      isPanning = true;
      startPanX = e.touches[0].clientX - translateX;
      startPanY = e.touches[0].clientY - translateY;
    } else {
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
  if (isFullscreen) {
    if (e.touches.length === 2) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches);
      if (startPinchDistance > 0) {
        scale = Math.min(Math.max(1, initialScale * (currentDistance / startPinchDistance)), 4);
        if (scale === 1) { translateX = 0; translateY = 0; }
        applyImageTransform();
      }
      return;
    }

    if (e.touches.length === 1 && isPanning && scale > 1) {
      e.preventDefault();
      translateX = e.touches[0].clientX - startPanX;
      translateY = e.touches[0].clientY - startPanY;
      applyImageTransform();
      return;
    }
  }
}, { passive: false });

document.addEventListener('touchend', (e) => {
  if (isPanning) { isPanning = false; return; }
  if (e.changedTouches.length === 1 && scale === 1) {
    handleEnd(e.changedTouches[0].clientX);
  }
});

document.addEventListener('mousedown', (e) => {
  if (!hasInteractedForAudio) {
    attemptPlayMusic();
  }

  if (isInitialSpinning || e.target === prevBtn || e.target === nextBtn || e.target.closest('#audio-toggle-btn')) return;
  
  if (isFullscreen && scale > 1) {
    isPanning = true;
    startPanX = e.clientX - translateX;
    startPanY = e.clientY - translateY;
    return;
  }

  isDragging = true;
  handleStart(e.clientX, e.clientY);
});

document.addEventListener('mousemove', (e) => {
  if (isFullscreen && isPanning && scale > 1) {
    translateX = e.clientX - startPanX;
    translateY = e.clientY - startPanY;
    applyImageTransform();
  }
});

document.addEventListener('mouseup', (e) => {
  if (isPanning) {
    isPanning = false;
    return;
  }
  if (isDragging) {
    isDragging = false;
    handleEnd(e.clientX);
  }
});

function handleStart(clientX, clientY) {
  startX = clientX;
  startY = clientY;
  startTime = new Date().getTime();

  const now = new Date().getTime();
  if (now - lastTap < 300 && now - lastTap > 0) {
    toggleFullscreen();
  } else {
    // Single tap sound effect
    playTapSound();
  }
  lastTap = now;
}

// LINEAR BOUNDARY SWIPE LOGIC WITH SWIPE SOUND EFFECT
function handleEnd(clientX) {
  const diffX = startX - clientX;
  const timeDiff = new Date().getTime() - startTime;
  const velocity = Math.abs(diffX) / (timeDiff || 1);

  if (Math.abs(diffX) > 40) {
    if (diffX > 0 && currentIndex < TOTAL_IMAGES - 1) {
      // Swipe Left -> Next Image
      playSwipeSound();
      pushParticles(-3.5 * velocity);
      rotationStepCount++;
      currentIndex++;
      updateGallery(velocity > 0.6, 'left');
    } else if (diffX < 0 && currentIndex > 0) {
      // Swipe Right -> Previous Image
      playSwipeSound();
      pushParticles(3.5 * velocity);
      rotationStepCount--;
      currentIndex--;
      updateGallery(velocity > 0.6, 'right');
    }
  }
}

document.addEventListener('wheel', (e) => {
  if (isInitialSpinning) return;

  if (isFullscreen) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    scale = Math.min(Math.max(1, scale + delta), 4);
    if (scale === 1) { translateX = 0; translateY = 0; }
    applyImageTransform();
  } else {
    if (e.deltaY > 30 && currentIndex < TOTAL_IMAGES - 1) {
      playSwipeSound();
      rotationStepCount++;
      currentIndex++;
      pushParticles(-3.0);
      updateGallery(false, 'left');
    } else if (e.deltaY < -30 && currentIndex > 0) {
      playSwipeSound();
      rotationStepCount--;
      currentIndex--;
      pushParticles(3.0);
      updateGallery(false, 'right');
    }
  }
}, { passive: false });

// 5. Update Gallery Display
function updateGallery(isFastSwipe = false, direction = '') {
  resetZoomPan();

  const slides = document.querySelectorAll('.slide');

  if (isFullscreen) {
    slides.forEach((slide, idx) => {
      slide.style.display = idx === currentIndex ? 'block' : 'none';
      slide.style.transform = 'none';
      const img = slide.querySelector('img');
      if (img) img.style.transform = 'none';
    });
  } else {
    const angleStep = 360 / TOTAL_IMAGES;

    slides.forEach((slide, idx) => {
      slide.style.display = 'block';
      const angle = idx * angleStep;
      slide.style.transform = `rotateY(${angle}deg) translateZ(${zOffset}px)`;
    });

    let targetAngle = rotationStepCount * -angleStep;

    let overshoot = 0;
    if (isFastSwipe) {
      overshoot = direction === 'left' ? -12 : 12;
    }

    box.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    box.style.transform = `translateZ(-${zOffset}px) rotateY(${targetAngle + overshoot}deg)`;

    if (overshoot !== 0) {
      setTimeout(() => {
        box.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
        box.style.transform = `translateZ(-${zOffset}px) rotateY(${targetAngle}deg)`;
      }, 250);
    }
  }

  // Update Dots Indicator
  const dotsList = document.querySelectorAll('.dot');
  dotsList.forEach((dot, index) => {
    dot.classList.toggle('active', index === currentIndex);
  });

  // Header Visibility
  if (currentIndex > 0 || isFullscreen) {
    header.classList.add('hidden');
  } else {
    header.classList.remove('hidden');
  }
}

// 6. Toggle Fullscreen Mode
function toggleFullscreen() {
  isFullscreen = !isFullscreen;
  box.classList.toggle('fullscreen', isFullscreen);
  dotsContainer.classList.toggle('hidden', isFullscreen);

  resetZoomPan();
  updateGallery();
}