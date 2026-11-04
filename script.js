// 💡 CHANGE THIS NUMBER TO CONTROL THE NUMBER OF FACES / IMAGES
const TOTAL_IMAGES = 8; 

// ==========================================
// 💡 PARTICLE SYSTEM CONFIGURATION CONTROLS
// ==========================================
const PARTICLE_CONFIG = {
  COUNT: 500,                        // Number of particles on screen
  COLOR: 'rgba(255, 255, 255, 0.9)', // Particle color (grey) & transparency
  MIN_SIZE: 0.3,                    // Minimum particle radius (px)
  MAX_SIZE: 2.5,                    // Maximum particle radius (px)
  BASE_SPEED: 0.7                  // Natural drift speed
};

let currentIndex = 0;
let rotationStepCount = 0; // Continuous rotation counter
let isFullscreen = false;
let isInitialSpinning = true;
let hasSpinned = false; // Scenario A Guard Flag

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
// 2. SETUP & SCENARIO A: SINGLE ONE-SHOT INTRO SPIN
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

// Initial 2.5-Second Smooth Spin
function runIntroSpin() {
  if (hasSpinned) {
    updateGallery();
    return;
  }
  hasSpinned = true;
  isInitialSpinning = true;

  // 1. Lock starting position at 0 degrees instantly
  box.style.transition = 'none';
  box.style.transform = `translateZ(-${zOffset}px) rotateY(0deg)`;

  // 2. Force DOM reflow to lock 0deg anchor frame
  void box.offsetHeight;

  // 3. Apply 2.5s transition curve
  box.style.transition = 'transform 2.5s cubic-bezier(0.1, 0.8, 0.2, 1)';
  
  // 4. Perform exactly -360 degrees (1 full rotation)
  const introRotationAngle = -360;
  box.style.transform = `translateZ(-${zOffset}px) rotateY(${introRotationAngle}deg)`;

  pushParticles(-4.5);

  setTimeout(() => {
    box.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    rotationStepCount = TOTAL_IMAGES;
    currentIndex = 0;

    isInitialSpinning = false;
  }, 2500);
}

setupGallery();

window.addEventListener('resize', () => {
  if (!isFullscreen) setupGallery();
});

// Reset Zoom & Pan transforms
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
    if (isInitialSpinning) return;
    rotationStepCount--;
    currentIndex = (currentIndex - 1 + TOTAL_IMAGES) % TOTAL_IMAGES;
    pushParticles(3.5);
    updateGallery(true, 'right');
  });

  nextBtn.addEventListener('click', () => {
    if (isInitialSpinning) return;
    rotationStepCount++;
    currentIndex = (currentIndex + 1) % TOTAL_IMAGES;
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
  if (isInitialSpinning || e.target === prevBtn || e.target === nextBtn) return;
  
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
  if (isPanning) { isPanning = false; return; }
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
  }
  lastTap = now;
}

// 💡 SWIPE NAVIGATION: Works in both 3D Box mode AND Full Page mode (at 1x zoom)
function handleEnd(clientX) {
  const diffX = startX - clientX;
  const timeDiff = new Date().getTime() - startTime;
  const velocity = Math.abs(diffX) / (timeDiff || 1);

  if (Math.abs(diffX) > 40) {
    pushParticles(diffX > 0 ? -3.5 * velocity : 3.5 * velocity);

    if (diffX > 0) {
      // Swipe Left -> Next Image
      rotationStepCount++;
      currentIndex = (currentIndex + 1) % TOTAL_IMAGES;
      updateGallery(velocity > 0.6, 'left');
    } else {
      // Swipe Right -> Previous Image
      rotationStepCount--;
      currentIndex = (currentIndex - 1 + TOTAL_IMAGES) % TOTAL_IMAGES;
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
    if (e.deltaY > 30) {
      rotationStepCount++;
      currentIndex = (currentIndex + 1) % TOTAL_IMAGES;
      pushParticles(-3.0);
      updateGallery(false, 'left');
    } else if (e.deltaY < -30) {
      rotationStepCount--;
      currentIndex = (currentIndex - 1 + TOTAL_IMAGES) % TOTAL_IMAGES;
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
    // Full Page Mode: Show only the active slide full screen
    slides.forEach((slide, idx) => {
      slide.style.display = idx === currentIndex ? 'block' : 'none';
      slide.style.transform = 'none';
      const img = slide.querySelector('img');
      if (img) img.style.transform = 'none';
    });
  } else {
    // 3D Box Mode: Restore 3D face layout
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

  // Update Dots
  const dotsList = document.querySelectorAll('.dot');
  dotsList.forEach((dot, index) => {
    dot.classList.toggle('active', index === currentIndex);
  });

  // Header visibility
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