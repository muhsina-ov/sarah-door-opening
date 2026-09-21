/* ==========================================================================
   SARAH SAMIA & SHADAAT HANIF — WEDDING INVITATION INTERACTION ENGINE
   Venue: Safed Baradari, Lucknow | Date: 30 November 2026
   ========================================================================== */

// --- Global State ---
let isPlaying = false;
let hasOpened = false;
let isAudioMuted = false;
let ytPlayer = null;
let audioCtx = null;
let synthInterval = null;

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
const quickRevealBtn = document.getElementById('quickRevealBtn');
const scratchCanvas = document.getElementById('scratchCanvas');
const scratchHint = document.getElementById('scratchHint');
const confettiCanvas = document.getElementById('confettiCanvas');
const lanternsContainer = document.getElementById('lanternsContainer');

// ==========================================================================
// 1. YouTube & Web Audio Background Music
// ==========================================================================
window.onYouTubeIframeAPIReady = function() {
  const container = document.getElementById('youtubePlayerContainer');
  if (!container) return;
  
  // Extract video id from container or fallback to royal instrumental
  let videoId = 'kYJjZ3L1Y9A'; // Jashn-E-Bahaaraa Official Flute Instrumental (A.R. Rahman)
  const url = container.getAttribute('data-youtube-url');
  if (url) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) videoId = match[1];
  }

  try {
    ytPlayer = new YT.Player('youtubePlayerContainer', {
      videoId: videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        loop: 1,
        playlist: videoId,
        modestbranding: 1,
        rel: 0,
        playsinline: 1
      },
      events: {
        onReady: (event) => {
          if (!isAudioMuted) event.target.setVolume(75);
        },
        onError: () => {
          console.log('[Audio] YouTube playback notice; will use royal synthesizer fallback on tap.');
        }
      }
    });
  } catch(e) {
    console.warn('[Audio] YT Player init exception:', e);
  }
};

function startAudioPlayback() {
  if (isAudioMuted) return;

  // 1. Play local 30s cut of Jashn-E-Bahaaraa on continuous loop
  if (localBgmAudio) {
    localBgmAudio.volume = 0.85;
    localBgmAudio.loop = true;
    const playPromise = localBgmAudio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('[Audio] Playing local 30-second Jashn-E-Bahaaraa looped soundtrack.');
      }).catch(err => {
        console.warn('[Audio] Local audio play error, trying YouTube/synth fallback:', err);
        fallbackToYouTubeOrSynth();
      });
      return;
    }
  }

  fallbackToYouTubeOrSynth();
}

function fallbackToYouTubeOrSynth() {
  let ytStarted = false;
  if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
    try {
      ytPlayer.unMute();
      ytPlayer.setVolume(75);
      ytPlayer.playVideo();
      ytStarted = true;
    } catch(e) {}
  }
  if (!ytStarted) {
    playRoyalAmbientSynth();
  }
}

function stopAudioPlayback() {
  if (localBgmAudio) {
    try { localBgmAudio.pause(); } catch(e) {}
  }
  if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
    try { ytPlayer.pauseVideo(); } catch(e) {}
  }
  if (synthInterval) {
    clearInterval(synthInterval);
    synthInterval = null;
  }
}

function playRoyalAmbientSynth() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Royal Indian Raag Bhimpalasi / Yaman frequencies (Sitar / Tanpura chords)
    const notes = [220, 261.63, 293.66, 329.63, 392.00, 440, 523.25];
    let noteIndex = 0;

    const playChime = () => {
      if (isAudioMuted || !audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(notes[noteIndex % notes.length], audioCtx.currentTime);
      noteIndex++;

      gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 3.0);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 3.0);
    };

    playChime();
    synthInterval = setInterval(playChime, 1400);
  } catch(e) {
    console.warn('Synth note error:', e);
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
      doorVideo.load();
    }
    
    // Ensure video is ready to render and elevate above poster
    doorVideo.currentTime = 0;
    doorVideo.muted = isAudioMuted;
    doorVideo.classList.add('playing');

    const hidePoster = () => {
      if (doorPoster) doorPoster.classList.add('fade-out');
    };

    doorVideo.addEventListener('playing', hidePoster, { once: true });
    doorVideo.addEventListener('timeupdate', () => {
      if (doorVideo.currentTime > 0.04) hidePoster();
    }, { once: true });

    const playPromise = doorVideo.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('[Video] Door video playing successfully.');
        hidePoster();
      }).catch(err => {
        console.warn('[Video] Play unmuted blocked by browser policy, retrying muted:', err);
        doorVideo.muted = true;
        doorVideo.play().then(() => {
          hidePoster();
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

// Graceful fallback transition
function triggerImageTransition() {
  if (doorPoster) {
    doorPoster.classList.add('fade-out');
  }
  launchFloatingLanterns();
  setTimeout(() => {
    revealInvitationContent();
  }, 1800);
}

// Attach persistent listeners to doorVideo for timing and completion
if (doorVideo) {
  doorVideo.addEventListener('timeupdate', () => {
    if (!isPlaying) return;
    const dur = doorVideo.duration || 6.0;
    if (doorVideo.currentTime >= Math.max(1, dur - 2.5)) {
      launchFloatingLanterns();
    }
    if (!hasOpened && doorVideo.currentTime >= Math.max(2, dur - 0.6)) {
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

// Bind clicks on doorPoster, tapOverlay, mediaStage, and doorVideo
const mediaStage = document.getElementById('mediaStage');
[tapOverlay, doorPoster, mediaStage, doorVideo].forEach(el => {
  if (el) {
    el.addEventListener('click', openDoorInvitation);
    el.addEventListener('touchstart', openDoorInvitation, { passive: true });
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
// 3. Scratch Card Canvas (Gold Foil Reveal)
// ==========================================================================
function initScratchCard() {
  if (!scratchCanvas) return;
  const ctx = scratchCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const rect = scratchCanvas.getBoundingClientRect();
  const width = scratchCanvas.width = rect.width || 340;
  const height = scratchCanvas.height = rect.height || 140;

  // Draw shimmering gold foil pattern
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#E5C158');
  grad.addColorStop(0.3, '#FFF4D0');
  grad.addColorStop(0.6, '#D4A338');
  grad.addColorStop(1, '#996C18');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle metallic texture noise / sparkles
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  for (let i = 0; i < 400; i++) {
    const rx = Math.random() * width;
    const ry = Math.random() * height;
    ctx.fillRect(rx, ry, 2, 2);
  }

  // Elegant royal seal in center
  ctx.fillStyle = '#21180A';
  ctx.font = '600 12px Cinzel, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '3px';
  ctx.fillText('✦ SCRATCH TO REVEAL ✦', width / 2, height / 2 - 8);
  ctx.font = '500 9px Montserrat, sans-serif';
  ctx.fillStyle = '#4A3B1C';
  ctx.letterSpacing = '1.5px';
  ctx.fillText('SWIPE TO UNVEIL WEDDING DATE', width / 2, height / 2 + 12);

  let isScratching = false;
  let scratchedPixels = 0;
  const totalPixels = width * height;

  function scratch(x, y) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2, false);
    ctx.fill();

    if (scratchHint) scratchHint.style.opacity = '0';

    checkScratchProgress();
  }

  function getCoords(e) {
    const r = scratchCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - r.left,
      y: clientY - r.top
    };
  }

  scratchCanvas.addEventListener('mousedown', (e) => {
    isScratching = true;
    const { x, y } = getCoords(e);
    scratch(x, y);
  });

  window.addEventListener('mousemove', (e) => {
    if (!isScratching) return;
    const { x, y } = getCoords(e);
    scratch(x, y);
  });

  window.addEventListener('mouseup', () => { isScratching = false; });

  scratchCanvas.addEventListener('touchstart', (e) => {
    isScratching = true;
    const { x, y } = getCoords(e);
    scratch(x, y);
  }, { passive: true });

  scratchCanvas.addEventListener('touchmove', (e) => {
    if (!isScratching) return;
    const { x, y } = getCoords(e);
    scratch(x, y);
  }, { passive: true });

  scratchCanvas.addEventListener('touchend', () => { isScratching = false; });

  function checkScratchProgress() {
    scratchedPixels++;
    if (scratchedPixels % 12 === 0) {
      try {
        const imgData = ctx.getImageData(0, 0, width, height);
        let clearCount = 0;
        for (let i = 3; i < imgData.data.length; i += 16) {
          if (imgData.data[i] === 0) clearCount++;
        }
        const pct = clearCount / (imgData.data.length / 16);
        if (pct > 0.38) {
          revealScratchCardFull();
        }
      } catch(e) {}
    }
  }

  function revealScratchCardFull() {
    scratchCanvas.classList.add('fade-out');
    if (scratchHint) scratchHint.style.display = 'none';
    if (quickRevealBtn) quickRevealBtn.style.display = 'none';
  }

  if (quickRevealBtn) {
    quickRevealBtn.addEventListener('click', revealScratchCardFull);
  }
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
    const title = 'Sarah Samia & Shadaat Hanif Wedding';
    const location = 'Safed Baradari, Qaisar Bagh, Lucknow, Uttar Pradesh';
    const description = 'Wedding celebration of Sarah Samia & Shadaat Hanif at Safed Baradari, Lucknow. 8:00 PM onwards.';
    
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
