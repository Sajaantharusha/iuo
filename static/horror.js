// NIGHTMARE TERMINAL // ASCII HORROR CORE ENGINE

const ASCII_RAMP = " .'`^,:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

const THEME_COLORS = {
  red: { text: "#ff2233", glow: "rgba(255, 20, 40, 0.7)", center: "#ff99aa" },
  green: { text: "#00ff66", glow: "rgba(0, 255, 100, 0.7)", center: "#ccffdd" },
  amber: { text: "#ffaa00", glow: "rgba(255, 170, 0, 0.7)", center: "#ffe6aa" },
  cyan: { text: "#00eeff", glow: "rgba(0, 238, 255, 0.7)", center: "#ccf8ff" },
  white: { text: "#ffffff", glow: "rgba(240, 240, 240, 0.7)", center: "#ffffff" },
};

// DOM Elements
const horrorVideo = document.getElementById("horrorVideo");
const asciiCanvas = document.getElementById("asciiCanvas");
const webcamVideo = document.getElementById("webcamVideo");
const ctx = asciiCanvas.getContext("2d");

const toggleAudioBtn = document.getElementById("toggleAudioBtn");
const audioState = document.getElementById("audioState");
const currentFeedName = document.getElementById("currentFeedName");
const vhsTime = document.getElementById("vhsTime");

const jumpscareOverlay = document.getElementById("jumpscareOverlay");
const blackoutOverlay = document.getElementById("blackoutOverlay");
const panicBtn = document.getElementById("panicBtn");
const lightsBtn = document.getElementById("lightsBtn");
const glitchBtn = document.getElementById("glitchBtn");

const terminalLog = document.getElementById("terminalLog");
const terminalInput = document.getElementById("terminalInput");

const densitySlider = document.getElementById("densitySlider");
const densityVal = document.getElementById("densityVal");
const glowSlider = document.getElementById("glowSlider");
const glowVal = document.getElementById("glowVal");
const canvasThemeSelect = document.getElementById("canvasThemeSelect");
const toggleCanvasMode = document.getElementById("toggleCanvasMode");

const convertForm = document.getElementById("convertForm");
const presetGroup = document.getElementById("presetGroup");
const uploadGroup = document.getElementById("uploadGroup");
const progressBox = document.getElementById("progressBox");
const progressStatus = document.getElementById("progressStatus");
const progressPct = document.getElementById("progressPct");
const progressBarFill = document.getElementById("progressBarFill");
const progressCounter = document.getElementById("progressCounter");
const vaultList = document.getElementById("vaultList");
const refreshVaultBtn = document.getElementById("refreshVaultBtn");

// State
let audioCtx = null;
let isAudioActive = false;
let droneGain = null;
let heartbeatInterval = null;
let isRealtimeCanvasActive = false;
let isWebcamActive = false;
let currentTheme = "red";
let canvasDensity = 110;
let canvasGlow = 1.4;
let lightsOut = false;

// --------------------------------------------------------------------------
// 1. PROCEDURAL WEB AUDIO HORROR SYNTHESIZER
// --------------------------------------------------------------------------
function initAudio() {
  if (audioCtx) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();

  // Binaural Drone
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  droneGain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  osc1.type = "sawtooth";
  osc1.frequency.setValueAtTime(55, audioCtx.currentTime); // A1 note
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(58.5, audioCtx.currentTime); // detuned for eerie beating

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(140, audioCtx.currentTime);

  droneGain.gain.setValueAtTime(0.001, audioCtx.currentTime);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(droneGain);
  droneGain.connect(audioCtx.destination);

  osc1.start();
  osc2.start();

  // Start heartbeat
  startHeartbeat(72);
}

function startHeartbeat(bpm) {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  const intervalMs = (60 / bpm) * 1000;
  heartbeatInterval = setInterval(() => {
    if (!isAudioActive || !audioCtx) return;
    playHeartbeatThump();
  }, intervalMs);
}

function playHeartbeatThump() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  // Double beat: lub-dub
  [0, 0.16].forEach((offset) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(75, now + offset);
    osc.frequency.exponentialRampToValueAtTime(32, now + offset + 0.12);

    gain.gain.setValueAtTime(0.35, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now + offset);
    osc.stop(now + offset + 0.16);
  });
}

function playJumpscareSound() {
  if (!audioCtx) initAudio();
  if (audioCtx.state === "suspended") audioCtx.resume();
  const now = audioCtx.currentTime;

  // Loud screech / distorted metal blast
  const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 1.5, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseBuffer.length; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  const whiteNoise = audioCtx.createBufferSource();
  whiteNoise.buffer = noiseBuffer;

  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(2400, now);
  noiseFilter.Q.setValueAtTime(3.0, now);

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.9, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 1.4);

  whiteNoise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);

  // Sub bass drop
  const sub = audioCtx.createOscillator();
  const subGain = audioCtx.createGain();
  sub.type = "triangle";
  sub.frequency.setValueAtTime(120, now);
  sub.frequency.exponentialRampToValueAtTime(25, now + 1.2);

  subGain.gain.setValueAtTime(0.8, now);
  subGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

  sub.connect(subGain);
  subGain.connect(audioCtx.destination);

  whiteNoise.start(now);
  sub.start(now);
  whiteNoise.stop(now + 1.5);
  sub.stop(now + 1.5);
}

function playGlitchSound() {
  if (!audioCtx) initAudio();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(800 + Math.random() * 600, now);
  osc.frequency.setValueAtTime(200 + Math.random() * 200, now + 0.05);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.linearRampToValueAtTime(0.001, now + 0.18);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

// Toggle Audio
toggleAudioBtn.addEventListener("click", () => {
  if (!audioCtx) initAudio();
  if (audioCtx.state === "suspended") audioCtx.resume();

  isAudioActive = !isAudioActive;
  if (isAudioActive) {
    audioState.textContent = "ON";
    toggleAudioBtn.style.borderColor = "var(--glow-red)";
    toggleAudioBtn.style.color = "#fff";
    droneGain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 0.8);
    horrorVideo.muted = false;
    logTerminal("SYS", "HORROR AUDIO SYNTHESIZER: ACTIVE. BINAURAL DRONE RUNNING.");
  } else {
    audioState.textContent = "OFF";
    toggleAudioBtn.style.borderColor = "";
    toggleAudioBtn.style.color = "";
    droneGain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    horrorVideo.muted = true;
    logTerminal("SYS", "AUDIO SYNTHESIZER MUTED.");
  }
});

// --------------------------------------------------------------------------
// 2. SURVEILLANCE CAMERA SWITCHER
// --------------------------------------------------------------------------
const FEEDS = {
  cam1: {
    name: "CAM-01 [BASEMENT: KNIFE FIGURE]",
    src: "/media/workspace/Figure_holding_knife_in_ASCII_838a52b9.mp4",
    isAscii: false,
  },
  cam2: {
    name: "CAM-02 [CORRIDOR: HORROR MASK]",
    src: "/media/workspace/ASCII_horror_mask_and_knife_bddd7f8b.mp4",
    isAscii: false,
  },
  cam1_ascii: {
    name: "CAM-01 [BASEMENT: GLOWING ASCII]",
    src: "/media/workspace/red_knife_horror.mp4",
    isAscii: true,
  },
  cam2_ascii: {
    name: "CAM-02 [CORRIDOR: HD ASCII]",
    src: "/media/workspace/red_ascii_horror_hd.mp4",
    isAscii: true,
  },
};

function switchFeed(feedKey) {
  stopWebcam();
  const feed = FEEDS[feedKey];
  if (!feed) return;

  currentFeedName.textContent = feed.name;
  currentFeedName.setAttribute("data-text", feed.name);
  horrorVideo.style.display = "block";
  asciiCanvas.style.display = isRealtimeCanvasActive ? "block" : "none";

  horrorVideo.src = feed.src;
  horrorVideo.load();
  horrorVideo.play().catch(() => {});

  document.querySelectorAll(".cam-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.feed === feedKey);
  });

  playGlitchSound();
  logTerminal("SYS", `FEED SWITCHED TO: ${feed.name}`);
}

document.querySelectorAll(".cam-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.id === "webcamBtn") return;
    switchFeed(btn.dataset.feed);
  });
});

// --------------------------------------------------------------------------
// 3. WEBCAM ASCII HORROR STALKER MODE
// --------------------------------------------------------------------------
const webcamBtn = document.getElementById("webcamBtn");

webcamBtn.addEventListener("click", async () => {
  if (isWebcamActive) {
    stopWebcam();
    switchFeed("cam1");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    webcamVideo.srcObject = stream;
    await webcamVideo.play();

    isWebcamActive = true;
    isRealtimeCanvasActive = true;
    horrorVideo.style.display = "none";
    asciiCanvas.style.display = "block";

    webcamBtn.classList.add("active");
    webcamBtn.textContent = "🛑 STOP WEBCAM";
    currentFeedName.textContent = "LIVE SUBJECT FEED [WEBCAM ASCII]";
    logTerminal("ALERT", "WEBCAM ENGAGED. SUBJECT FACIAL SCANNING ACTIVE IN ASCII.");
  } catch (err) {
    logTerminal("WARN", "WEBCAM ACCESS DENIED OR UNAVAILABLE: " + err.message);
  }
});

function stopWebcam() {
  if (webcamVideo.srcObject) {
    webcamVideo.srcObject.getTracks().forEach((t) => t.stop());
    webcamVideo.srcObject = null;
  }
  isWebcamActive = false;
  webcamBtn.classList.remove("active");
  webcamBtn.textContent = "👁️ WEBCAM ASCII";
}

// --------------------------------------------------------------------------
// 4. REAL-TIME ASCII CANVAS SHADER
// --------------------------------------------------------------------------
toggleCanvasMode.addEventListener("click", () => {
  isRealtimeCanvasActive = !isRealtimeCanvasActive;
  asciiCanvas.style.display = isRealtimeCanvasActive ? "block" : "none";
  toggleCanvasMode.textContent = isRealtimeCanvasActive ? "DISABLE REALTIME CANVAS" : "ENABLE REALTIME CANVAS";
  toggleCanvasMode.style.borderColor = isRealtimeCanvasActive ? "var(--glow-red)" : "";
  logTerminal("SYS", `REALTIME ASCII CANVAS: ${isRealtimeCanvasActive ? "ENABLED" : "DISABLED"}`);
});

densitySlider.addEventListener("input", (e) => {
  canvasDensity = parseInt(e.target.value);
  densityVal.textContent = canvasDensity;
});

glowSlider.addEventListener("input", (e) => {
  canvasGlow = parseFloat(e.target.value);
  glowVal.textContent = canvasGlow;
});

canvasThemeSelect.addEventListener("change", (e) => {
  currentTheme = e.target.value;
  logTerminal("SYS", `ASCII THEME UPDATED: ${currentTheme.toUpperCase()}`);
});

// Hidden memory canvas for frame downsampling
const offCanvas = document.createElement("canvas");
const offCtx = offCanvas.getContext("2d", { willReadFrequently: true });

function renderRealtimeAscii() {
  requestAnimationFrame(renderRealtimeAscii);
  if (!isRealtimeCanvasActive && !isWebcamActive) return;

  const source = isWebcamActive ? webcamVideo : horrorVideo;
  if (!source || source.readyState < 2) return;

  const srcW = source.videoWidth || 640;
  const srcH = source.videoHeight || 360;

  const cols = canvasDensity;
  const charAspect = 0.55;
  const rows = Math.max(10, Math.floor(cols * (srcH / srcW) * charAspect));

  offCanvas.width = cols;
  offCanvas.height = rows;
  offCtx.drawImage(source, 0, 0, cols, rows);

  const imgData = offCtx.getImageData(0, 0, cols, rows);
  const data = imgData.data;

  // Target canvas dimensions
  const cellW = 8;
  const cellH = 14;
  asciiCanvas.width = cols * cellW;
  asciiCanvas.height = rows * cellH;

  ctx.fillStyle = "#030102";
  ctx.fillRect(0, 0, asciiCanvas.width, asciiCanvas.height);

  ctx.font = "bold 11px monospace";
  ctx.textBaseline = "top";

  const theme = THEME_COLORS[currentTheme] || THEME_COLORS.red;

  // Glow layer setup
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = 6 * canvasGlow;
  ctx.fillStyle = theme.text;

  const rampLen = ASCII_RAMP.length;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = (y * cols + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Luminance
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      if (lum < 0.08) continue; // Skip near black

      const charIdx = Math.floor(lum * (rampLen - 1));
      const char = ASCII_RAMP[charIdx];

      ctx.fillText(char, x * cellW, y * cellH);
    }
  }

  // Vignette overlay on canvas
  const grad = ctx.createRadialGradient(
    asciiCanvas.width / 2,
    asciiCanvas.height / 2,
    asciiCanvas.width * 0.25,
    asciiCanvas.width / 2,
    asciiCanvas.height / 2,
    asciiCanvas.width * 0.65
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.65)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, asciiCanvas.width, asciiCanvas.height);
}

renderRealtimeAscii();

// --------------------------------------------------------------------------
// 5. JUMPSCARE & PANIC EFFECTS
// --------------------------------------------------------------------------
panicBtn.addEventListener("click", triggerJumpscare);

function triggerJumpscare() {
  playJumpscareSound();
  jumpscareOverlay.style.display = "flex";
  logTerminal("ALERT", "CRITICAL WARNING: ENTITY BREACH IN PROXIMITY!");

  startHeartbeat(140); // Rapid pounding heartbeat

  setTimeout(() => {
    jumpscareOverlay.style.display = "none";
    startHeartbeat(75);
  }, 1600);
}

lightsBtn.addEventListener("click", () => {
  lightsOut = !lightsOut;
  blackoutOverlay.style.display = lightsOut ? "flex" : "none";
  lightsBtn.textContent = lightsOut ? "💡 RESTORE LIGHTS" : "💡 LIGHTS OUT";

  if (lightsOut) {
    playGlitchSound();
    startHeartbeat(115);
    logTerminal("WARN", "POWER RELAYS TRIPPED. EMERGENCY BACKUP FAILING. HE IS IN THE ROOM.");
  } else {
    startHeartbeat(72);
    logTerminal("SYS", "POWER RESTORED. PERIMETER SECURED.");
  }
});

glitchBtn.addEventListener("click", () => {
  playGlitchSound();
  const crt = document.getElementById("crtMonitor");
  crt.style.filter = "invert(1) contrast(3) hue-rotate(90deg)";
  crt.style.transform = "skewX(4deg) scale(1.02)";
  setTimeout(() => {
    crt.style.filter = "";
    crt.style.transform = "";
  }, 350);
  logTerminal("SYS", "TRANSMISSION INTERFERENCE: STATIC ANOMALY DETECTED.");
});

// --------------------------------------------------------------------------
// 6. INTERACTIVE HORROR TERMINAL
// --------------------------------------------------------------------------
function logTerminal(type, text) {
  const line = document.createElement("div");
  line.className = `line ${type.toLowerCase()}`;
  line.textContent = `> [${type}] ${text}`;
  terminalLog.appendChild(line);
  terminalLog.scrollTop = terminalLog.scrollHeight;
}

terminalInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const cmd = terminalInput.value.trim();
    if (!cmd) return;
    terminalInput.value = "";

    const userLine = document.createElement("div");
    userLine.className = "line cmd";
    userLine.textContent = `OPERATOR@VAULT:~$ ${cmd}`;
    terminalLog.appendChild(userLine);

    handleCommand(cmd.toLowerCase());
    terminalLog.scrollTop = terminalLog.scrollHeight;
  }
});

function handleCommand(cmd) {
  if (cmd === "help") {
    logTerminal("REPLY", "AVAILABLE COMMANDS:");
    logTerminal("REPLY", "  status       - System integrity and entity threat report");
    logTerminal("REPLY", "  knife        - Scan entity weapon signature");
    logTerminal("REPLY", "  scan         - Radar pulse anomaly detection");
    logTerminal("REPLY", "  lights off   - Kill auxiliary lighting in sector");
    logTerminal("REPLY", "  lights on    - Restore power grid");
    logTerminal("REPLY", "  jumpscare    - Emergency threat encounter");
    logTerminal("REPLY", "  cam 1        - Switch to Basement Knife Figure");
    logTerminal("REPLY", "  cam 2        - Switch to Corridor Ghostface");
    logTerminal("REPLY", "  escape       - Route calculation for extraction");
    logTerminal("REPLY", "  clear        - Clear terminal log");
  } else if (cmd === "status") {
    logTerminal("ALERT", "FACILITY STATUS: COMPROMISED. DOORS: UNRESPONSIVE.");
    logTerminal("ALERT", "TARGET PROXIMITY: 4.2 METERS AND CLOSING.");
  } else if (cmd === "knife") {
    logTerminal("WARN", "WEAPON SIGNATURE: 8-INCH TACTICAL COMBAT BLADE.");
    logTerminal("WARN", "STATUS: RAISED AND PREPARED FOR THRUST.");
  } else if (cmd === "scan") {
    playGlitchSound();
    logTerminal("SYS", "RADAR PULSE INITIATED... PING...");
    setTimeout(() => {
      logTerminal("ALERT", "ANOMALY CONFIRMED: MASS RESEMBLING HUMAN CLOAKED IN CODE.");
    }, 800);
  } else if (cmd === "lights off") {
    lightsBtn.click();
  } else if (cmd === "lights on") {
    if (lightsOut) lightsBtn.click();
  } else if (cmd === "jumpscare") {
    triggerJumpscare();
  } else if (cmd === "cam 1" || cmd === "cam1") {
    switchFeed("cam1");
  } else if (cmd === "cam 2" || cmd === "cam2") {
    switchFeed("cam2");
  } else if (cmd === "escape") {
    logTerminal("ALERT", "ERROR 0x666: ALL FIREWALLS SEALED. THERE IS NO WAY OUT.");
  } else if (cmd === "clear") {
    terminalLog.innerHTML = "";
    logTerminal("SYS", "TERMINAL CONSOLE CLEARED.");
  } else if (cmd === "911") {
    logTerminal("ALERT", "DIALING 911... DEAD AIR TONE. PHONE LINES SEVERED FROM OUTSIDE.");
  } else {
    logTerminal("WARN", `UNKNOWN COMMAND '${cmd}'. TYPE 'help' FOR INSTRUCTIONS.`);
  }
}

// --------------------------------------------------------------------------
// 7. TAB NAVIGATION
// --------------------------------------------------------------------------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));

    btn.classList.add("active");
    const target = document.getElementById(btn.dataset.tab);
    if (target) target.classList.add("active");

    if (btn.dataset.tab === "vaultTab") {
      fetchVaultVideos();
    }
  });
});

// --------------------------------------------------------------------------
// 8. HORROR ASCII VIDEO CONVERTER STUDIO
// --------------------------------------------------------------------------
document.querySelectorAll("input[name='video_source']").forEach((radio) => {
  radio.addEventListener("change", (e) => {
    if (e.target.value === "preset") {
      presetGroup.style.display = "block";
      uploadGroup.style.display = "none";
    } else {
      presetGroup.style.display = "none";
      uploadGroup.style.display = "block";
    }
  });
});

convertForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(convertForm);

  progressBox.style.display = "flex";
  progressStatus.textContent = "Status: Initializing conversion pipeline...";
  progressPct.textContent = "0%";
  progressBarFill.style.width = "0%";
  progressCounter.textContent = "Processing frames...";

  try {
    const res = await fetch("/api/convert", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to start conversion");

    const jobId = data.job_id;
    pollJobProgress(jobId);
  } catch (err) {
    progressStatus.textContent = "Error: " + err.message;
  }
});

function pollJobProgress(jobId) {
  const interval = setInterval(async () => {
    try {
      const res = await fetch(`/api/job/${jobId}`);
      const job = await res.json();

      if (job.status === "processing") {
        progressStatus.textContent = "Status: Rendering glowing ASCII frames...";
        progressPct.textContent = `${job.progress}%`;
        progressBarFill.style.width = `${job.progress}%`;
        progressCounter.textContent = `${job.processed} / ${job.total} frames`;
      } else if (job.status === "completed") {
        clearInterval(interval);
        progressStatus.textContent = "Status: Conversion Complete!";
        progressPct.textContent = "100%";
        progressBarFill.style.width = "100%";
        progressCounter.textContent = `Saved: ${job.output_url}`;

        logTerminal("SYS", `CONVERSION FINISHED: ${job.output_url}`);

        // Automatically switch video to newly converted file
        horrorVideo.src = job.output_url;
        horrorVideo.load();
        horrorVideo.play().catch(() => {});
        currentFeedName.textContent = `CONVERTED ASCII [${job.theme.toUpperCase()}]`;

        fetchVaultVideos();
      } else if (job.status === "failed") {
        clearInterval(interval);
        progressStatus.textContent = "Failed: " + job.error;
        logTerminal("ALERT", "CONVERSION ERROR: " + job.error);
      }
    } catch (err) {
      clearInterval(interval);
    }
  }, 1000);
}

// --------------------------------------------------------------------------
// 9. HORROR VAULT (RECORDED ARCHIVES)
// --------------------------------------------------------------------------
async function fetchVaultVideos() {
  try {
    const res = await fetch("/api/videos");
    const data = await res.json();
    vaultList.innerHTML = "";

    if (!data.videos || data.videos.length === 0) {
      vaultList.innerHTML = '<div class="vault-empty">No videos found.</div>';
      return;
    }

    data.videos.forEach((vid) => {
      const item = document.createElement("div");
      item.className = "vault-item";
      item.innerHTML = `
        <div class="vault-item-info">
          <div class="vault-item-name">${vid.name}</div>
          <div class="vault-item-size">${vid.size_mb} MB • ${vid.type.toUpperCase()}</div>
        </div>
        <div class="vault-item-actions">
          <button class="terminal-btn btn-sm play-vault-btn" data-url="${vid.path}" data-name="${vid.name}">PLAY</button>
        </div>
      `;
      vaultList.appendChild(item);
    });

    document.querySelectorAll(".play-vault-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        stopWebcam();
        horrorVideo.style.display = "block";
        asciiCanvas.style.display = isRealtimeCanvasActive ? "block" : "none";
        horrorVideo.src = btn.dataset.url;
        horrorVideo.load();
        horrorVideo.play().catch(() => {});
        currentFeedName.textContent = `VAULT: ${btn.dataset.name}`;
        playGlitchSound();
        logTerminal("SYS", `LOADED ARCHIVE: ${btn.dataset.name}`);
      });
    });
  } catch (err) {
    vaultList.innerHTML = '<div class="vault-empty">Error loading videos.</div>';
  }
}

refreshVaultBtn.addEventListener("click", fetchVaultVideos);

// VHS Time update loop
setInterval(() => {
  const d = new Date();
  const hrs = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  const secs = String(d.getSeconds()).padStart(2, "0");
  vhsTime.textContent = `${hrs}:${mins}:${secs}`;
}, 1000);

// Auto-play default horror video muted until user enables audio
horrorVideo.muted = true;
horrorVideo.play().catch(() => {});
fetchVaultVideos();

