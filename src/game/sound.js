// Web Audio API sound manager using original Canyon Defense MP3 assets with procedural fallback

import { SOUND } from './constants.js';

const SOUND_FILES = {
  [SOUND.MAINLOOP]: '/assets/canyon/sounds/mainLoop.mp3',
  [SOUND.QUEST]: '/assets/canyon/sounds/quest.mp3',
  [SOUND.ERROR]: '/assets/canyon/sounds/error.mp3',
  [SOUND.NUCLEAREXPLOSION]: '/assets/canyon/sounds/nuclearExplosion.mp3',
  [SOUND.SWITCH]: '/assets/canyon/sounds/switch.mp3',
  [SOUND.POPDEAD]: '/assets/canyon/sounds/popDead.mp3',
  [SOUND.NUCLEARLAUNCH]: '/assets/canyon/sounds/nuclearLaunch.mp3',
  [SOUND.TIMESTOP]: '/assets/canyon/sounds/timeStop.mp3',
  [SOUND.CONSTRUCTION]: '/assets/canyon/sounds/construction.mp3',
  [SOUND.SELL]: '/assets/canyon/sounds/sell.mp3',
  [SOUND.BIGEXPLOSION]: '/assets/canyon/sounds/bigExplosion.mp3',
  [SOUND.MEDIUMEXPLOSION]: '/assets/canyon/sounds/mediumExplosion.mp3',
  [SOUND.SMALLEXPLOSION]: '/assets/canyon/sounds/smallExplosion.mp3',
  [SOUND.NULIFICATORSHOT]: '/assets/canyon/sounds/NulificatorShot.mp3',
  [SOUND.TESLATOWERSHOT]: '/assets/canyon/sounds/teslaTowerShot.mp3',
  [SOUND.GAUSSCANNONSHOT]: '/assets/canyon/sounds/gaussCannonShot.mp3',
  [SOUND.GUTLINGLASERSHOT]: '/assets/canyon/sounds/gutlingLaserShot.mp3',
  [SOUND.OILSPRAYSHOT]: '/assets/canyon/sounds/oilSprayShot.mp3',
  [SOUND.CHAINGUNSHOT]: '/assets/canyon/sounds/chainGunShot.mp3',
  [SOUND.GOOCANNONSHOT]: '/assets/canyon/sounds/gooCannonShot.mp3',
  [SOUND.MORTARSHOT]: '/assets/canyon/sounds/mortarShot.mp3',
  [SOUND.AAGUNSHOT]: '/assets/canyon/sounds/aaGunShot.mp3',
  [SOUND.MISSILETURRETSHOT]: '/assets/canyon/sounds/missileTurretShot.mp3',
  [SOUND.HIT]: '/assets/canyon/sounds/hit.mp3',
};

class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicEnabled = true;
    this.sfxVolume = 0.7;
    this.musicVolume = 0.55;
    this.inMission = false;

    this.buffers = new Map();
    this.loadingPromises = new Map();
    this.lastPlayed = new Map();

    this.musicSource = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicStarted = false;
  }

  ensureContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain.connect(this.ctx.destination);
      this.musicGain.connect(this.ctx.destination);
      this._syncGains();
      this.preloadAll();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  unlock() {
    const ctx = this.ensureContext();
    if (ctx && this.musicEnabled && !this.muted && !this.musicStarted) {
      this.startMusicLoop();
    }
  }

  preloadAll() {
    for (const [idStr, url] of Object.entries(SOUND_FILES)) {
      const id = Number(idStr);
      this._loadBuffer(id, url);
    }
  }

  _loadBuffer(soundId, url) {
    if (this.buffers.has(soundId)) {
      return Promise.resolve(this.buffers.get(soundId));
    }
    if (this.loadingPromises.has(soundId)) {
      return this.loadingPromises.get(soundId);
    }
    const p = fetch(url)
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((ab) => {
        if (!ab || !this.ctx) return null;
        return this.ctx.decodeAudioData(ab);
      })
      .then((decoded) => {
        if (decoded) {
          this.buffers.set(soundId, decoded);
        }
        return decoded;
      })
      .catch(() => null);
    this.loadingPromises.set(soundId, p);
    return p;
  }

  _syncGains() {
    if (!this.ctx || !this.sfxGain || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const sfx = this.muted ? 0 : this.sfxVolume;
    // Original CGame.as ducks background loop to 30% during missions
    const missionDuck = this.inMission ? 0.3 : 0.75;
    const mus = this.muted || !this.musicEnabled ? 0 : this.musicVolume * missionDuck;
    this.sfxGain.gain.setTargetAtTime(sfx, now, 0.03);
    this.musicGain.gain.setTargetAtTime(mus, now, 0.06);
  }

  setMusicMissionMode(inMission) {
    this.inMission = Boolean(inMission);
    this._syncGains();
  }

  startMusicLoop() {
    const ctx = this.ensureContext();
    if (!ctx || this.musicStarted) return;
    this.musicStarted = true;

    this._loadBuffer(SOUND.MAINLOOP, SOUND_FILES[SOUND.MAINLOOP]).then((buf) => {
      if (!buf || !this.ctx || this.musicSource) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(this.musicGain);
      src.start(0);
      this.musicSource = src;
      this._syncGains();
    });
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    this._syncGains();
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    this._syncGains();
    if (!this.muted && this.musicEnabled && !this.musicStarted) {
      this.startMusicLoop();
    }
    return this.muted;
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = Boolean(enabled);
    if (this.musicEnabled && !this.muted && !this.musicStarted) {
      this.startMusicLoop();
    }
    this._syncGains();
  }

  isMusicEnabled() {
    return this.musicEnabled;
  }

  setVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    this._syncGains();
  }

  setMusicVolume(vol) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    this._syncGains();
  }

  play(soundId, throttleMs = 35) {
    if (this.muted || this.sfxVolume <= 0) return;
    if (soundId === SOUND.MAINLOOP) {
      this.startMusicLoop();
      return;
    }

    const nowMs = performance.now();
    const prev = this.lastPlayed.get(soundId) || 0;
    if (nowMs - prev < throttleMs) return;
    this.lastPlayed.set(soundId, nowMs);

    const ctx = this.ensureContext();
    if (!ctx) return;

    if (this.musicEnabled && !this.musicStarted) {
      this.startMusicLoop();
    }

    const buf = this.buffers.get(soundId);
    if (buf) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      if (soundId === SOUND.HIT) {
        const gain = ctx.createGain();
        gain.gain.value = 0.35;
        src.connect(gain);
        gain.connect(this.sfxGain);
      } else {
        src.connect(this.sfxGain);
      }
      src.start(0);
      return;
    }

    // Fallback synth while MP3 buffers are still decoding
    this._playFallbackSynth(ctx, soundId);
  }

  _playFallbackSynth(ctx, soundId) {
    const t = ctx.currentTime;
    const v = 0.6;
    switch (soundId) {
      case SOUND.SWITCH:
        this._tone(ctx, t, 'triangle', 580, 740, 0.045, 0.14 * v);
        break;
      case SOUND.ERROR:
        this._tone(ctx, t, 'sawtooth', 180, 120, 0.16, 0.22 * v);
        break;
      case SOUND.QUEST:
        this._tone(ctx, t, 'triangle', 523.25, 1046.5, 0.2, 0.2 * v);
        break;
      case SOUND.CONSTRUCTION:
        this._tone(ctx, t, 'square', 140, 70, 0.09, 0.2 * v);
        break;
      case SOUND.SELL:
        this._tone(ctx, t, 'sine', 660, 1180, 0.12, 0.18 * v);
        break;
      default:
        this._tone(ctx, t, 'triangle', 320, 140, 0.08, 0.1 * v);
        break;
    }
  }

  _tone(ctx, startTime, type, freqStart, freqEnd, duration, gainPeak) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), startTime + duration);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain || ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }
}

export const soundService = new SoundManager();
