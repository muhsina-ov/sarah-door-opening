/* ==========================================================================
   SARAH & SHADAAT — WEDDING INVITATION INTERACTION ENGINE
   Venue: Safed Baradari, Lucknow | Date: 30 November 2026
   Audio: single 30-second looped track (assets/audio/bgm_30s.mp3)
   ========================================================================== */

// --- Global State ---
let isPlaying = false;
let hasOpened = false;
let isAudioMuted = false;
// Extra 2.5s hold on the open venue before invitation content reveals,
// so the venue stays on screen a little longer after the gate opens.
const VENUE_HOLD_MS = 2500;
let venueHoldTimer = null;

// Target Wedding Date: November 30, 2026, 8:00 PM IST (UTC+05:30)
const WEDDING_TARGET_DATE = new Date('2026-11-30T20:00:00+05:30').getTime();

// --- DOM References ---
const tapOverlay = document.getElementById('tapOverlay');
const doorPoster = document.getElementById('doorPoster');
const doorVideo = document.getElementById('doorVideo');
const venueHallImg = document.getElementById('venueHallImg');
const staticCanvas = document.getElementById('staticFrameCanvas');
const invitationOverlay = document.getElementById('invitationOverlay');
const contentScrollable = document.getElementById('contentScrollable');
const localBgmAudio = document.getElementById('localBgmAudio');
const audioToggleBtn = document.getElementById('audioToggleBtn');
const audioIconOn = document.getElementById('audioIconOn');
const audioIconOff = document.getElementById('audioIconOff');
const replayBtn = document.getElementById('replayBtn');
const openMapBtn = document.getElementById('openMapBtn');
const closeMapModal = document.getElementById('closeMapModal');
const mapModal = document.getElementById('mapModal');
const addToCalendarBtn = document.getElementById('addToCalendarBtn');
const dateRevealContainer = document.getElementById('dateRevealContainer');
const dateRevealCover = document.getElementById('dateRevealCover');
const confettiCanvas = document.getElementById('confettiCanvas');
const lanternsContainer = document.getElementById('lanternsContainer');

// ==========================================================================
// 1. Background Music — single 30-second looped track only
// ==========================================================================
function startAudioPlayback() {
  if (isAudioMuted) return;

  // Play local 30s cut on continuous loop (only audio source in the project)
  if (localBgmAudio) {
    localBgmAudio.volume = 0.85;
    localBgmAudio.loop = true;
    const playPromise = localBgmAudio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('[Audio] Playing 30-second looped soundtrack.');
      }).catch(err => {
        console.warn('[Audio] Autoplay blocked, will retry on next tap:', err);
      });
    }
  }
}

function stopAudioPlayback() {
  if (localBgmAudio) {
    try { localBgmAudio.pause(); } catch(e) {}
  }
}

if (audioToggleBtn) {
  audioToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isAudioMuted = !isAudioMuted;
    if (isAudioMuted) {
      audioIconOn?.classList.add('hidden');
      audioIconOff?.classList.remove('hidden');
      stopAudioPlayback();
    } else {
      audioIconOn?.classList.remove('hidden');
      audioIconOff?.classList.add('hidden');
      startAudioPlayback();
    }
  });
}

// ==========================================================================
// 2. Door Opening & Content Reveal Sequence
// ==========================================================================
function openDoorInvitation(e) {
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation();
  }
  if (isPlaying || hasOpened) return;
  isPlaying = true;

  console.log('[Door] User clicked door image! Starting sequence...');

  // Start background music
  startAudioPlayback();

  // 1. Hide tap callout
  if (tapOverlay) tapOverlay.classList.add('fade-out');

  // 2. Play door video immediately
  if (doorVideo) {
    if (!doorVideo.src || doorVideo.src.endsWith('/')) {
      doorVideo.src = './assets/doors/1.mp4';
    }
    
    // Ensure video is ready to render and elevate above poster
    doorVideo.currentTime = 0;
    doorVideo.muted = true; // Video track is visually driven; audio is handled by localBgmAudio
    doorVideo.classList.add('playing');

    let posterHidden = false;
    const hidePoster = () => {
      if (!posterHidden && doorPoster) {
        posterHidden = true;
        doorPoster.classList.add('fade-out');
      }
    };

    doorVideo.addEventListener('playing', hidePoster, { once: true });
    doorVideo.addEventListener('timeupdate', () => {
      if (doorVideo.currentTime > 0.04) hidePoster();
    });

    const playPromise = doorVideo.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('[Video] Door video playing successfully.');
        setTimeout(hidePoster, 200);
      }).catch(err => {
        console.warn('[Video] Play unmuted blocked or pending, retrying muted:', err);
        doorVideo.muted = true;
        doorVideo.play().then(() => {
          setTimeout(hidePoster, 150);
        }).catch(err2 => {
          console.error('[Video] Play failed, falling back to image reveal:', err2);
          triggerImageTransition();
        });
      });
    }
  } else {
    triggerImageTransition();
  }
}

// Graceful fallback transition (includes venue hold so hall stays visible)
function triggerImageTransition() {
  if (doorPoster) {
    doorPoster.classList.add('fade-out');
  }
  launchFloatingLanterns();
  scheduleRevealWithVenueHold();
}

// Hold the open venue on screen for ~2.5s before showing invitation content
function scheduleRevealWithVenueHold() {
  if (hasOpened) return;
  if (venueHoldTimer) clearTimeout(venueHoldTimer);
  freezeFinalFrame();
  venueHoldTimer = setTimeout(() => {
    revealInvitationContent();
  }, VENUE_HOLD_MS);
}

// Attach persistent listeners to doorVideo for timing and completion
if (doorVideo) {
  doorVideo.addEventListener('timeupdate', () => {
    if (!isPlaying) return;
    const dur = doorVideo.duration || 7.0;

    // Launch floating lanterns softly around 5.5s as couple twirls
    if (doorVideo.currentTime >= 5.5) {
      launchFloatingLanterns();
    }

    // The video plays till the 7th second and then reveals details
    if (!hasOpened && doorVideo.currentTime >= Math.max(6.8, dur - 0.2)) {
      freezeFinalFrame();
      revealInvitationContent();
    }
  });

  doorVideo.addEventListener('ended', () => {
    freezeFinalFrame();
    revealInvitationContent();
  });
}

function freezeFinalFrame() {
  if (!doorVideo || !staticCanvas) return;
  const ctx = staticCanvas.getContext('2d');
  if (!ctx) return;
  staticCanvas.width = doorVideo.videoWidth || 720;
  staticCanvas.height = doorVideo.videoHeight || 1280;
  try {
    ctx.drawImage(doorVideo, 0, 0, staticCanvas.width, staticCanvas.height);
    staticCanvas.classList.add('active');
  } catch(e) {}
}

function revealInvitationContent() {
  if (hasOpened) return;
  hasOpened = true;

  if (invitationOverlay) {
    invitationOverlay.classList.remove('hidden');
    // Force reflow
    void invitationOverlay.offsetWidth;
    invitationOverlay.classList.add('revealed');
  }

  launchConfettiCelebration();
}

function launchFloatingLanterns() {
  if (!lanternsContainer) return;
  lanternsContainer.classList.add('revealed');
  
  // Populate lantern particles if empty
  if (lanternsContainer.children.length === 0) {
    const depths = ['depth-far', 'depth-mid', 'depth-near'];
    for (let i = 0; i < 16; i++) {
      const lantern = document.createElement('div');
      const depth = depths[Math.floor(Math.random() * depths.length)];
      lantern.className = `lantern-item ${depth}`;
      lantern.style.left = `${Math.random() * 92 + 4}%`;
      lantern.style.animationDuration = `${Math.random() * 8 + 10}s`;
      lantern.style.animationDelay = `${Math.random() * 6}s`;
      lantern.style.setProperty('--sway-x', `${(Math.random() - 0.5) * 40}px`);
      lantern.style.setProperty('--rot-deg', `${(Math.random() - 0.5) * 8}deg`);

      lantern.innerHTML = `
        <div class="lantern-paper">
          <div class="lantern-core-flame"></div>
        </div>
        <div class="lantern-tassel"></div>
      `;
      lanternsContainer.appendChild(lantern);
    }
  }
}

// Bind clicks on doorPoster, tapOverlay, mediaStage, doorVideo, and card container
const mediaStage = document.getElementById('mediaStage');
const invitationCard = document.getElementById('invitationContainer');

let lastTapTimestamp = 0;
function handleTapToOpen(e) {
  const now = Date.now();
  if (now - lastTapTimestamp < 300) return;
  lastTapTimestamp = now;
  openDoorInvitation(e);
}

[tapOverlay, doorPoster, mediaStage, doorVideo, invitationCard].forEach(el => {
  if (el) {
    el.addEventListener('click', handleTapToOpen);
    el.addEventListener('pointerup', handleTapToOpen);
  }
});

// Forward wheel scrolling to content once invitation is open
if (contentScrollable) {
  window.addEventListener('wheel', (e) => {
    if (hasOpened) {
      contentScrollable.scrollTop += e.deltaY;
    }
  }, { passive: true });
}

// ==========================================================================
// 3. Tap-to-Reveal Date Card (no scratch)
// ==========================================================================
function initScratchCard() {
  initTapReveal();
}

function initTapReveal() {
  const container = dateRevealContainer || document.getElementById('dateRevealContainer');
  const cover = dateRevealCover || document.getElementById('dateRevealCover');
  if (!container || !cover) return;

  // Date starts hidden behind the tap cover
  container.classList.remove('revealed');

  const reveal = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    container.classList.add('revealed');
  };

  container.addEventListener('click', reveal);
  container.addEventListener('touchend', reveal, { passive: false });
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') reveal(e);
  });
}

// ==========================================================================
// 4. Live Countdown to 30 November 2026, 8:00 PM IST
// ==========================================================================
function updateCountdown() {
  const cdDays = document.getElementById('cdDays');
  const cdHours = document.getElementById('cdHours');
  const cdMins = document.getElementById('cdMins');
  const cdSecs = document.getElementById('cdSecs');
  if (!cdDays || !cdHours || !cdMins || !cdSecs) return;

  const now = Date.now();
  const diff = WEDDING_TARGET_DATE - now;

  if (diff <= 0) {
    cdDays.textContent = '00';
    cdHours.textContent = '00';
    cdMins.textContent = '00';
    cdSecs.textContent = '00';
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);

  cdDays.textContent = days < 10 ? '0' + days : days;
  cdHours.textContent = hours < 10 ? '0' + hours : hours;
  cdMins.textContent = mins < 10 ? '0' + mins : mins;
  cdSecs.textContent = secs < 10 ? '0' + secs : secs;
}

// ==========================================================================
// 5. Celebration Gold Confetti
// ==========================================================================
function launchConfettiCelebration() {
  if (!confettiCanvas) return;
  const ctx = confettiCanvas.getContext('2d');
  if (!ctx) return;

  const rect = confettiCanvas.getBoundingClientRect();
  const width = confettiCanvas.width = rect.width || window.innerWidth;
  const height = confettiCanvas.height = rect.height || window.innerHeight;

  const particles = [];
  const colors = ['#FFF4D0', '#E5C158', '#D4A338', '#FFFFFF', '#F5D77F'];

  for (let i = 0; i < 70; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * -height * 0.5,
      size: Math.random() * 5 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 2.5 + 1.2,
      speedX: (Math.random() - 0.5) * 1.5,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 8,
      opacity: Math.random() * 0.7 + 0.3
    });
  }

  let animationFrame;
  let frameCount = 0;

  function render() {
    ctx.clearRect(0, 0, width, height);
    frameCount++;

    for (let p of particles) {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }

    // Run for ~7 seconds then stop gracefully
    if (frameCount < 400) {
      animationFrame = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, width, height);
    }
  }

  render();
}

// ==========================================================================
// 6. Map Modal & Calendar Generator
// ==========================================================================
if (openMapBtn && mapModal) {
  openMapBtn.addEventListener('click', () => {
    mapModal.classList.remove('hidden');
  });
}

if (closeMapModal && mapModal) {
  closeMapModal.addEventListener('click', () => {
    mapModal.classList.add('hidden');
  });
}

if (mapModal) {
  mapModal.addEventListener('click', (e) => {
    if (e.target === mapModal) mapModal.classList.add('hidden');
  });
}

if (addToCalendarBtn) {
  addToCalendarBtn.addEventListener('click', () => {
    const title = 'Sarah & Shadaat Wedding';
    const location = 'Safed Baradari, Qaisar Bagh, Lucknow, Uttar Pradesh';
    const description = 'Wedding celebration of Sarah & Shadaat at Safed Baradari, Lucknow. 8:00 PM onwards.';
    
    // Google Calendar URL
    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=20261130T143000Z/20261130T183000Z&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;
    
    // Also build standard ICS file for Apple / Outlook
    const icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//InviteStory Studio//Sarah & Shadaat Wedding//EN',
      'BEGIN:VEVENT',
      'UID:sarah-shadaat-wedding-20261130@invitestory.in',
      'DTSTAMP:20260921T000000Z',
      'DTSTART:20261130T143000Z',
      'DTEND:20261130T183000Z',
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Sarah_and_Shadaat_Wedding.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Also offer direct Google Calendar in new tab
    setTimeout(() => {
      window.open(gCalUrl, '_blank', 'noopener,noreferrer');
    }, 300);
  });
}

// ==========================================================================
// 7. Replay Door Opening
// ==========================================================================
if (replayBtn) {
  replayBtn.addEventListener('click', () => {
    isPlaying = false;
    hasOpened = false;
    if (venueHoldTimer) {
      clearTimeout(venueHoldTimer);
      venueHoldTimer = null;
    }

    if (doorPoster) doorPoster.classList.remove('fade-out');
    if (staticCanvas) staticCanvas.classList.remove('active');
    if (doorVideo) {
      doorVideo.pause();
      doorVideo.currentTime = 0;
      doorVideo.classList.remove('playing');
    }
    if (invitationOverlay) {
      invitationOverlay.classList.add('hidden');
      invitationOverlay.classList.remove('revealed');
    }
    if (tapOverlay) tapOverlay.classList.remove('fade-out');
    if (contentScrollable) contentScrollable.scrollTop = 0;
    const dateContainer = dateRevealContainer || document.getElementById('dateRevealContainer');
    if (dateContainer) dateContainer.classList.remove('revealed');

    if (localBgmAudio) {
      localBgmAudio.currentTime = 0;
      if (!isAudioMuted) localBgmAudio.play().catch(() => {});
    }
  });
}

// ==========================================================================
// Initialization on DOM Load
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initScratchCard();
  updateCountdown();
  setInterval(updateCountdown, 1000);
});
