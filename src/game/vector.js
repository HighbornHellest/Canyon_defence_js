// Port of CVector.as

export class Vector2 {
  static MIN_LENGTH = 0.001;

  constructor(x = 0, y = 0) {
    this._x = x;
    this._y = y;
  }

  get numX() {
    return this._x;
  }

  set numX(val) {
    this._x = val;
  }

  get numY() {
    return this._y;
  }

  set numY(val) {
    this._y = val;
  }

  get numLength() {
    return Math.sqrt(this._x * this._x + this._y * this._y);
  }

  set numLength(val) {
    let targetLen = val;
    if (targetLen < Vector2.MIN_LENGTH) {
      targetLen = Vector2.MIN_LENGTH;
    }
    const len = this.numLength;
    if (len) {
      const scale = targetLen / len;
      this._x *= scale;
      this._y *= scale;
    }
  }

  get numRotation() {
    const len = this.numLength;
    if (!len) return 0;
    let deg = (180 * this.getAngleWith(new Vector2(0, -1))) / Math.PI;
    if (this._x < 0) {
      deg *= -1;
    }
    return deg;
  }

  set numRotation(deg) {
    const len = this.numLength;
    this._x = 0;
    this._y = 1;
    this.rotate((-Math.PI * deg) / 180);
    this.numLength = len;
  }

  makeCopy() {
    return new Vector2(this._x, this._y);
  }

  addVector(vec) {
    this._x += vec.numX;
    this._y += vec.numY;
  }

  rotate(angleRad) {
    if (angleRad) {
      const angle = Math.atan2(this._x, this._y) + angleRad;
      const len = this.numLength;
      this._x = len * Math.sin(angle);
      this._y = len * Math.cos(angle);
    }
  }

  getAngleWith(vec) {
    const denom = this.numLength * vec.numLength;
    if (!denom) return 0;
    const dot = (this._x * vec.numX + this._y * vec.numY) / denom;
    return Math.acos(Math.max(-1, Math.min(1, dot)));
  }

  getRadiansFromUp() {
    return Math.atan2(this._x, -this._y);
  }
}
