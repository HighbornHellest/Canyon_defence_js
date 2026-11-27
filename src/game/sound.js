// Web Audio API procedural sound synthesizer replacing CSoundService.as

import { SOUND } from './constants.js';

class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.sfxVolume = 0.55;
    this.lastPlayed = new Map();
  }

  ensureContext() {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  setVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
  }

  play(soundId, throttleMs = 35) {
    if (this.muted || this.sfxVolume <= 0) return;
    if (soundId === SOUND.MAINLOOP) return;

    const nowMs = performance.now();
    const prev = this.lastPlayed.get(soundId) || 0;
    if (nowMs - prev < throttleMs) return;
    this.lastPlayed.set(soundId, nowMs);

    const ctx = this.ensureContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const v = this.sfxVolume;

    switch (soundId) {
      case SOUND.SWITCH:
        this._tone(ctx, t, 'triangle', 580, 740, 0.045, 0.14 * v);
        break;
      case SOUND.ERROR:
        this._tone(ctx, t, 'sawtooth', 180, 120, 0.16, 0.22 * v);
        break;
      case SOUND.QUEST:
        this._tone(ctx, t, 'triangle', 523.25, 523.25, 0.08, 0.2 * v);
        this._tone(ctx, t + 0.07, 'triangle', 659.25, 659.25, 0.08, 0.2 * v);
        this._tone(ctx, t + 0.14, 'triangle', 783.99, 1046.5, 0.16, 0.22 * v);
        break;
      case SOUND.CONSTRUCTION:
        this._tone(ctx, t, 'square', 140, 70, 0.09, 0.22 * v);
        this._tone(ctx, t + 0.05, 'triangle', 260, 180, 0.08, 0.16 * v);
        break;
      case SOUND.SELL:
        this._tone(ctx, t, 'sine', 660, 880, 0.07, 0.18 * v);
        this._tone(ctx, t + 0.06, 'sine', 880, 1180, 0.09, 0.18 * v);
        break;
      case SOUND.POPDEAD:
        this._tone(ctx, t, 'sawtooth', 320, 95, 0.28, 0.3 * v);
        break;
      case SOUND.MISSILETURRETSHOT:
        this._noise(ctx, t, 0.09, 1400, 0.14 * v);
        this._tone(ctx, t, 'sawtooth', 420, 210, 0.09, 0.1 * v);
        break;
      case SOUND.MORTARSHOT:
        this._tone(ctx, t, 'sine', 160, 52, 0.18, 0.28 * v);
        this._noise(ctx, t, 0.14, 500, 0.16 * v);
        break;
      case SOUND.TESLATOWERSHOT:
        this._tone(ctx, t, 'sawtooth', 980, 320, 0.14, 0.16 * v);
        this._tone(ctx, t + 0.03, 'square', 1320, 480, 0.1, 0.1 * v);
        break;
      case SOUND.GUTLINGLASERSHOT:
        this._tone(ctx, t, 'sine', 1200, 520, 0.045, 0.1 * v);
        break;
      case SOUND.NULIFICATORSHOT:
        this._tone(ctx, t, 'sine', 420, 960, 0.16, 0.18 * v);
        break;
      case SOUND.AAGUNSHOT:
        this._noise(ctx, t, 0.04, 2400, 0.12 * v);
        this._tone(ctx, t, 'square', 340, 140, 0.04, 0.09 * v);
        break;
      case SOUND.GOOCANNONSHOT:
        this._tone(ctx, t, 'sine', 280, 160, 0.1, 0.15 * v);
        break;
      case SOUND.CHAINGUNSHOT:
        this._tone(ctx, t, 'triangle', 760, 380, 0.08, 0.14 * v);
        break;
      case SOUND.GAUSSCANNONSHOT:
        this._tone(ctx, t, 'sawtooth', 880, 190, 0.13, 0.2 * v);
        this._noise(ctx, t, 0.07, 3000, 0.12 * v);
        break;
      case SOUND.OILSPRAYSHOT:
        this._noise(ctx, t, 0.11, 900, 0.14 * v);
        break;
      case SOUND.NUCLEARLAUNCH:
        this._tone(ctx, t, 'sawtooth', 120, 420, 0.45, 0.25 * v);
        this._noise(ctx, t, 0.45, 800, 0.2 * v);
        break;
      case SOUND.NUCLEAREXPLOSION:
        this._noise(ctx, t, 0.55, 420, 0.36 * v);
        this._tone(ctx, t, 'sine', 110, 32, 0.5, 0.36 * v);
        break;
      case SOUND.TIMESTOP:
        this._tone(ctx, t, 'sine', 960, 180, 0.45, 0.24 * v);
        this._tone(ctx, t + 0.04, 'triangle', 720, 140, 0.4, 0.16 * v);
        break;
      case SOUND.BIGEXPLOSION:
        this._noise(ctx, t, 0.28, 480, 0.28 * v);
        this._tone(ctx, t, 'sine', 130, 40, 0.25, 0.26 * v);
        break;
      case SOUND.MEDIUMEXPLOSION:
        this._noise(ctx, t, 0.18, 700, 0.2 * v);
        this._tone(ctx, t, 'sine', 150, 55, 0.15, 0.18 * v);
        break;
      case SOUND.SMALLEXPLOSION:
        this._noise(ctx, t, 0.1, 1100, 0.14 * v);
        break;
      case SOUND.HIT:
        this._noise(ctx, t, 0.025, 1600, 0.05 * v);
        break;
      default:
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
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  _noise(ctx, startTime, duration, cutoffHz, gainPeak) {
    const sampleRate = ctx.sampleRate;
    const frameCount = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoffHz, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainPeak, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(startTime);
    src.stop(startTime + duration + 0.01);
  }
}

export const soundService = new SoundManager();
