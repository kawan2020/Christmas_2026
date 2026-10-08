// 💡 CHANGE THIS NUMBER TO CONTROL THE NUMBER OF FACES / IMAGES
const TOTAL_IMAGES = 8; 

let currentIndex = 0;
let isFullscreen = false;

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

// 1. Setup Gallery
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

// Helper: Calculate distance between two touch points for pinch-zoom
function getDistance(touches) {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY
  );
}

// 2. Desktop Button Click Navigation
if (prevBtn && nextBtn) {
  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      updateGallery(true, 'right');
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentIndex < TOTAL_IMAGES - 1) {
      currentIndex++;
      updateGallery(true, 'left');
    }
  });
}

// 3. Touch & Mouse Events
let startX = 0;
let startY = 0;
let startTime = 0;
let isDragging = false;
let lastTap = 0;

// Mobile Touch Events
document.addEventListener('touchstart', (e) => {
  if (e.touches.length === 2 && isFullscreen) {
    // Pinch-Zoom Start
    startPinchDistance = getDistance(e.touches);
    initialScale = scale;
    return;
  }

  if (e.touches.length === 1) {
    if (isFullscreen && scale > 1) {
      // Pan Start when zoomed in Image Mode
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
      // Mobile Pinch-Zoom
      e.preventDefault();
      const currentDistance = getDistance(e.touches);
      if (startPinchDistance > 0) {
        scale = Math.min(Math.max(1, initialScale * (currentDistance / startPinchDistance)), 4);
        if (scale === 1) {
          translateX = 0;
          translateY = 0;
        }
        applyImageTransform();
      }
      return;
    }

    if (e.touches.length === 1 && isPanning && scale > 1) {
      // Mobile Pan Image
      e.preventDefault();
      translateX = e.touches[0].clientX - startPanX;
      translateY = e.touches[0].clientY - startPanY;
      applyImageTransform();
      return;
    }
  }
}, { passive: false });

document.addEventListener('touchend', (e) => {
  if (isPanning) {
    isPanning = false;
    return;
  }
  if (e.changedTouches.length === 1 && scale === 1) {
    handleEnd(e.changedTouches[0].clientX);
  }
});

// Laptop Mouse Drag & Pan Events
document.addEventListener('mousedown', (e) => {
  if (e.target === prevBtn || e.target === nextBtn) return;
  
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

  // Double-tap or double-click detection
  const now = new Date().getTime();
  if (now - lastTap < 300 && now - lastTap > 0) {
    toggleFullscreen();
  }
  lastTap = now;
}

function handleEnd(clientX) {
  const diffX = startX - clientX;
  const timeDiff = new Date().getTime() - startTime;
  const velocity = Math.abs(diffX) / (timeDiff || 1);

  if (Math.abs(diffX) > 40) {
    if (diffX > 0 && currentIndex < TOTAL_IMAGES - 1) {
      currentIndex++;
      updateGallery(velocity > 0.6, 'left');
    } else if (diffX < 0 && currentIndex > 0) {
      currentIndex--;
      updateGallery(velocity > 0.6, 'right');
    }
  }
}

// Laptop Mouse Scroll Wheel Support (Zoom in Image Mode, Navigate in 3D Mode)
document.addEventListener('wheel', (e) => {
  if (isFullscreen) {
    e.preventDefault();
    // Laptop Mouse Wheel Zoom in Image Mode
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    scale = Math.min(Math.max(1, scale + delta), 4);
    if (scale === 1) {
      translateX = 0;
      translateY = 0;
    }
    applyImageTransform();
  } else {
    // 3D Box Mode Rotation
    if (e.deltaY > 30 && currentIndex < TOTAL_IMAGES - 1) {
      currentIndex++;
      updateGallery(false, 'left');
    } else if (e.deltaY < -30 && currentIndex > 0) {
      currentIndex--;
      updateGallery(false, 'right');
    }
  }
}, { passive: false });

// 4. Update Gallery
function updateGallery(isFastSwipe = false, direction = '') {
  resetZoomPan();

  if (isFullscreen) {
    const slides = document.querySelectorAll('.slide');
    slides.forEach((slide, idx) => {
      slide.style.display = idx === currentIndex ? 'block' : 'none';
      slide.style.transform = 'none';
      const img = slide.querySelector('img');
      if (img) img.style.transform = 'none';
    });
  } else {
    const angleStep = 360 / TOTAL_IMAGES;
    let targetAngle = currentIndex * -angleStep;

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

  const dotsList = document.querySelectorAll('.dot');
  dotsList.forEach((dot, index) => {
    dot.classList.toggle('active', index === currentIndex);
  });

  if (currentIndex > 0 || isFullscreen) {
    header.classList.add('hidden');
  } else {
    header.classList.remove('hidden');
  }
}

updateGallery();

// 5. Toggle Fullscreen Mode
function toggleFullscreen() {
  isFullscreen = !isFullscreen;
  box.classList.toggle('fullscreen', isFullscreen);
  dotsContainer.classList.toggle('hidden', isFullscreen);

  resetZoomPan();

  if (isFullscreen) {
    header.classList.add('hidden');
    updateGallery();
  } else {
    setupGallery();
    updateGallery();
  }
}