// Port of CAbility.as

import { ABILITY_TYPE } from './constants.js';

export class Ability {
  constructor(type, initialSources = 0) {
    this.numType = type;
    switch (type) {
      case ABILITY_TYPE.SELL:
      case ABILITY_TYPE.MONEYBONUS:
      case ABILITY_TYPE.TOWERBONUS:
        this._numCooldown = 0;
        break;
      case ABILITY_TYPE.MISSILE:
      case ABILITY_TYPE.WALL:
      case ABILITY_TYPE.TIMEBOMB:
        this._numCooldown = 5400;
        break;
      default:
        this._numCooldown = 0;
    }
    this._numTimer = 0;
    this._boolAvailable = false;
    this._numSources = 0;
    this.numSources = initialSources;
  }

  get numSources() {
    return this._numSources;
  }

  set numSources(val) {
    this._numSources = Math.max(0, val);
    this.boolAvailable = this._numSources > 0;
  }

  get boolAvailable() {
    return this._boolAvailable;
  }

  set boolAvailable(val) {
    if (!this._boolAvailable && val) {
      this.numTimer = 0;
    }
    this._boolAvailable = val;
  }

  get numTimer() {
    return this._numTimer;
  }

  set numTimer(val) {
    this._numTimer = Math.max(0, val);
  }

  get isReady() {
    return this._boolAvailable && this._numTimer === 0;
  }

  get progressRatio() {
    if (!this._numCooldown) return 1;
    return 1 - this._numTimer / this._numCooldown;
  }

  get secondsRemaining() {
    if (!this._boolAvailable || this._numTimer <= 0) return 0;
    const rate = Math.max(1, this._numSources);
    return Math.ceil(this._numTimer / (24 * rate));
  }

  tick() {
    if (this._boolAvailable && this._numTimer > 0) {
      this.numTimer = this._numTimer - this._numSources;
    }
  }

  reset() {
    this.numTimer = this._numCooldown;
    return this.numTimer > 0;
  }
}
