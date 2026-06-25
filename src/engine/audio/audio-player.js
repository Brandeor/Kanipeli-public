export function createAudioPlayer(music, { createAudioContext = defaultCreateAudioContext } = {}) {
  let audioCtx = null;
  let musicTimer = null;
  let musicStep = 0;
  let currentMusicMode = "";
  let musicEnabled = false;
  let soundOn = true;

  function stopMusicTimer() {
    if (musicTimer) {
      window.clearTimeout(musicTimer);
      musicTimer = null;
    }
  }

  function playTone(freq, start, duration, type, gainValue) {
    if (!soundOn || !audioCtx || !musicEnabled) return;
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(gainValue, start + 0.01);
    gain.gain.setValueAtTime(gainValue, start + duration * 0.72);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function playSfx(name) {
    if (!soundOn || !audioCtx || !musicEnabled) return;
    const now = audioCtx.currentTime;
    const tone = (freq, offset, duration, type = "square", gain = 0.08) => {
      playTone(freq, now + offset, duration, type, gain);
    };

    if (name === "jump") {
      tone(392, 0, 0.05, "square", 0.055);
      tone(587.33, 0.045, 0.08, "square", 0.045);
    } else if (name === "carrot") {
      tone(659.25, 0, 0.045, "square", 0.05);
      tone(880, 0.045, 0.06, "square", 0.045);
    } else if (name === "gold") {
      tone(880, 0, 0.05, "square", 0.055);
      tone(1174.66, 0.055, 0.06, "square", 0.05);
      tone(1567.98, 0.12, 0.09, "square", 0.045);
    } else if (name === "turbo") {
      tone(220, 0, 0.04, "sawtooth", 0.045);
      tone(440, 0.045, 0.05, "sawtooth", 0.045);
      tone(880, 0.1, 0.12, "sawtooth", 0.04);
    } else if (name === "shotgun") {
      tone(92.5, 0, 0.07, "sawtooth", 0.12);
      tone(138.59, 0.025, 0.06, "square", 0.09);
    } else if (name === "hit") {
      tone(196, 0, 0.045, "square", 0.075);
      tone(146.83, 0.045, 0.07, "square", 0.06);
    } else if (name === "hurt") {
      tone(220, 0, 0.08, "sawtooth", 0.08);
      tone(164.81, 0.075, 0.11, "sawtooth", 0.065);
    } else if (name === "click") {
      tone(587.33, 0, 0.035, "square", 0.045);
      tone(293.66, 0.035, 0.035, "square", 0.035);
    } else if (name === "bossAttack") {
      tone(311.13, 0, 0.06, "square", 0.055);
      tone(233.08, 0.06, 0.08, "square", 0.05);
    } else if (name === "win") {
      tone(523.25, 0, 0.08, "square", 0.05);
      tone(659.25, 0.08, 0.08, "square", 0.05);
      tone(783.99, 0.16, 0.12, "square", 0.045);
      tone(1046.5, 0.3, 0.18, "square", 0.04);
    }
  }

  function scheduleMusicStep() {
    if (!soundOn || !audioCtx || !musicEnabled) return;
    const mode = currentMusicMode || "level";
    const theme = music[mode] || music.level;
    const stepDuration = 60 / theme.bpm / 2;
    const now = audioCtx.currentTime;
    const lead = theme.lead[musicStep % theme.lead.length];
    const bass = theme.bass[Math.floor(musicStep / 2) % theme.bass.length];

    playTone(bass, now, stepDuration * 0.78, "square", mode === "boss" ? 0.055 : 0.045);
    if (musicStep % 2 === 0 || mode === "boss") {
      playTone(lead, now + 0.015, stepDuration * 0.62, "square", mode === "boss" ? 0.045 : 0.035);
    }
    if (mode === "boss" && musicStep % 4 === 2) {
      playTone(lead * 1.5, now + stepDuration * 0.45, stepDuration * 0.28, "square", 0.025);
    }

    musicStep += 1;
    musicTimer = window.setTimeout(scheduleMusicStep, stepDuration * 1000);
  }

  function setMusicMode(mode) {
    if (!soundOn || !musicEnabled) return;
    if (mode === currentMusicMode) return;
    currentMusicMode = mode;
    musicStep = 0;
    stopMusicTimer();
    scheduleMusicStep();
  }

  function start(mode = "level") {
    if (!soundOn) return;
    if (!audioCtx) audioCtx = createAudioContext();
    audioCtx.resume();
    if (!musicEnabled) {
      musicEnabled = true;
      currentMusicMode = "";
    }
    setMusicMode(mode);
  }

  function setSoundOn(nextSoundOn) {
    soundOn = nextSoundOn;
    if (!soundOn) {
      stopMusicTimer();
      musicEnabled = false;
    }
  }

  return {
    playSfx,
    setMusicMode,
    setSoundOn,
    start,
  };
}

function defaultCreateAudioContext() {
  return new (window.AudioContext || window.webkitAudioContext)();
}
