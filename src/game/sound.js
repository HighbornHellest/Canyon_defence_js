// Web Audio API sound manager using packed SFX audio sprite + looping mainLoop.mp3

import { SOUND } from './constants.js';

class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicEnabled = true;
    this.sfxVolume = 0.7;
    this.musicVolume = 0.55;
    this.inMission = false;

    this.sfxManifest = null;
    this.sfxBuffer = null;
    this.sfxPromise = null;
    this.musicBuffer = null;
    this.musicPromise = null;
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
    this._loadSfxSprite();
    this._loadMusic();
  }

  _loadSfxSprite() {
    if (this.sfxPromise) return this.sfxPromise;
    this.sfxPromise = Promise.all([
      fetch('/assets/canyon/sounds/sfx.json').then((r) => (r.ok ? r.json() : null)),
      fetch('/assets/canyon/sounds/sfx.mp3').then((r) => (r.ok ? r.arrayBuffer() : null)),
    ])
      .then(async ([manifest, ab]) => {
        if (!manifest || !ab || !this.ctx) return null;
        this.sfxManifest = manifest;
        this.sfxBuffer = await this.ctx.decodeAudioData(ab);
        return this.sfxBuffer;
      })
      .catch(() => null);
    return this.sfxPromise;
  }

  _loadMusic() {
    if (this.musicPromise) return this.musicPromise;
    this.musicPromise = fetch('/assets/canyon/sounds/mainLoop.mp3')
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((ab) => (ab && this.ctx ? this.ctx.decodeAudioData(ab) : null))
      .then((decoded) => {
        if (decoded) this.musicBuffer = decoded;
        return decoded;
      })
      .catch(() => null);
    return this.musicPromise;
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

    this._loadMusic().then((buf) => {
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

    const span = this.sfxManifest ? this.sfxManifest[String(soundId)] : null;
    if (this.sfxBuffer && span) {
      const [startSec, durSec] = span;
      const src = ctx.createBufferSource();
      src.buffer = this.sfxBuffer;
      if (soundId === SOUND.HIT) {
        const gain = ctx.createGain();
        gain.gain.value = 0.35;
        src.connect(gain);
        gain.connect(this.sfxGain);
      } else {
        src.connect(this.sfxGain);
      }
      src.start(0, startSec, durSec);
      return;
    }

    // Fallback synth while sfx.mp3 decodes
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
