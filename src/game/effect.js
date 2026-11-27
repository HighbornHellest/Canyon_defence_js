// Port of CEffect.as

export class Effect {
  constructor(type, params = undefined, duration = undefined) {
    this.numType = type;
    this.objParams = params;
    this._numDuration = duration;
    this._numTimer = duration === undefined ? 0 : duration;
  }

  tick() {
    if (this._numTimer === 0) {
      return true;
    }
    this._numTimer -= 1;
    return false;
  }

  makeCopy() {
    return new Effect(this.numType, this.objParams ? { ...this.objParams } : undefined, this._numDuration);
  }
}
