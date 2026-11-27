// Port of CBuilding.as, CEnemy.as, CBlast.as, and frame GFX sprites

import {
  ALTITUDE_AIR,
  ALTITUDE_BOTH,
  ALTITUDE_GROUND,
  BLAST_TYPE,
  BUILDING_META,
  BUILDING_TYPE,
  CELL_VOID,
  EFFECT_TYPE,
  ENEMY_REWARDS,
  ENEMY_TYPE,
  MATRIX_CELL_HEIGHT,
  MATRIX_CELL_WIDTH,
  MATRIX_HEIGHT,
  MATRIX_WIDTH,
  PLAYFIELD_SIZE,
  SOUND,
} from './constants.js';
import { Effect } from './effect.js';
import { Vector2 } from './vector.js';
import { soundService } from './sound.js';

export class Building {
  static RANGE_BONUS = 0;
  static ENEMY_TURN_TOLERANCE = 0.1;

  constructor(type, cellI = 0, cellJ = 0) {
    this.numType = type;
    this.meta = BUILDING_META[type];
    this.cellI = cellI;
    this.cellJ = cellJ;
    this.x = cellJ * MATRIX_CELL_WIDTH + MATRIX_CELL_WIDTH / 2;
    this.y = cellI * MATRIX_CELL_HEIGHT + MATRIX_CELL_HEIGHT / 2;
    this.pattern = { width: 1, height: 1, cells: [1] };
    this.isTower = this.meta.isTower;
    this.baseRange = this.meta.range || 0;
    this.turnSpeed = this.meta.turnSpeed || 0;
    this.aimingAltitude = this.meta.altitude || ALTITUDE_GROUND;
    this.reloadTime = this.meta.reload || 0;
    this.reloadTimer = this.reloadTime;
    this.price = this.meta.price;
    this.direction = new Vector2(0, -1);
    this.target = null;
    this.installed = false;
    this.depth = 0;
    this.recoilFrames = 0;
    this.kills = 0;
  }

  get numRange() {
    return this.baseRange * (1 + Building.RANGE_BONUS);
  }

  setCell(i, j) {
    this.cellI = i;
    this.cellJ = j;
    this.x = j * MATRIX_CELL_WIDTH + MATRIX_CELL_WIDTH / 2;
    this.y = i * MATRIX_CELL_HEIGHT + MATRIX_CELL_HEIGHT / 2;
  }

  process(map, callbacks) {
    if (this.recoilFrames > 0) this.recoilFrames -= 1;
    if (!this.isTower) return;

    if (this.reloadTimer > 0) {
      this.reloadTimer -= 1;
    }

    if (this.target && !this.target.exists) {
      this.target = null;
    }

    if (!this.target) {
      this.target = map.getNearestEnemy(this.x, this.y, Math.floor(this.numRange), this.aimingAltitude);
    }

    if (this.target) {
      const dist = this.target.getDistanceFrom(this.x, this.y);
      if (dist > this.numRange || Number.isNaN(dist)) {
        this.target = null;
        return;
      }

      const toTarget = new Vector2(this.target.x - this.x, this.target.y - this.y);
      const angle = this.direction.getAngleWith(toTarget);

      if (angle <= Building.ENEMY_TURN_TOLERANCE) {
        if (this.reloadTimer === 0) {
          const shot = {
            x: this.x,
            y: this.y,
            direction: this.direction.makeCopy(),
            altitude: this.target.numAltitude,
            sourceBuilding: this,
          };

          switch (this.numType) {
            case BUILDING_TYPE.TOWER_1_1:
              shot.type = BLAST_TYPE.ROCKET;
              shot.targetsEnemy = true;
              shot.target = this.target;
              shot.speed = 3;
              soundService.play(SOUND.MISSILETURRETSHOT);
              break;
            case BUILDING_TYPE.TOWER_1_2:
              shot.type = BLAST_TYPE.BALL;
              shot.targetsEnemy = false;
              shot.targetX = this.target.x;
              shot.targetY = this.target.y;
              shot.speed = 3;
              soundService.play(SOUND.MORTARSHOT);
              break;
            case BUILDING_TYPE.TOWER_1_3:
              shot.type = BLAST_TYPE.ELECTRICFIELD;
              shot.targetsEnemy = false;
              shot.targetX = this.x;
              shot.targetY = this.y;
              shot.speed = 0;
              soundService.play(SOUND.TESLATOWERSHOT);
              break;
            case BUILDING_TYPE.TOWER_1_4:
              shot.type = BLAST_TYPE.LASERBEAM;
              shot.targetsEnemy = true;
              shot.target = this.target;
              shot.speed = toTarget.numLength;
              soundService.play(SOUND.GUTLINGLASERSHOT);
              break;
            case BUILDING_TYPE.TOWER_1_5:
              shot.type = BLAST_TYPE.NULIFYBALL;
              shot.targetsEnemy = true;
              shot.target = this.target;
              shot.speed = 4;
              soundService.play(SOUND.NULIFICATORSHOT);
              break;
            case BUILDING_TYPE.TOWER_2_1:
              shot.type = BLAST_TYPE.AASHELL;
              shot.targetsEnemy = true;
              shot.target = this.target;
              shot.speed = toTarget.numLength;
              soundService.play(SOUND.AAGUNSHOT);
              break;
            case BUILDING_TYPE.TOWER_2_2:
              shot.type = BLAST_TYPE.SLOWSHOT;
              shot.targetsEnemy = true;
              shot.target = this.target;
              shot.speed = 4;
              soundService.play(SOUND.GOOCANNONSHOT);
              break;
            case BUILDING_TYPE.TOWER_2_3:
              shot.type = BLAST_TYPE.CHAINBLAST;
              shot.targetsEnemy = true;
              shot.target = this.target;
              shot.speed = 7;
              soundService.play(SOUND.CHAINGUNSHOT);
              break;
            case BUILDING_TYPE.TOWER_2_4:
              shot.type = BLAST_TYPE.GAUSSRAIL;
              shot.targetsEnemy = true;
              shot.target = this.target;
              shot.speed = toTarget.numLength;
              soundService.play(SOUND.GAUSSCANNONSHOT);
              break;
            case BUILDING_TYPE.TOWER_2_5:
              shot.type = BLAST_TYPE.CONFUSEBALL;
              shot.targetsEnemy = true;
              shot.target = this.target;
              shot.speed = 5;
              soundService.play(SOUND.OILSPRAYSHOT);
              break;
            default:
              break;
          }

          callbacks.onShoot(shot);
          this.reloadTimer = this.reloadTime;
          this.recoilFrames = 4;
        }
      } else if (this.turnSpeed === 0) {
        this.direction.numX = toTarget.numX;
        this.direction.numY = toTarget.numY;
        this.direction.numLength = 1;
      } else {
        const cross = toTarget.numX * this.direction.numY - this.direction.numX * toTarget.numY;
        const step = Math.min(this.turnSpeed, angle);
        if (cross > 0) {
          this.direction.rotate(step);
        } else {
          this.direction.rotate(-step);
        }
      }
    }
  }
}

export class Enemy {
  static WAYPOINT_TURN_TOLERANCE = 0.1;
  static MIN_SPEED = 0.35;

  static isAirType(type) {
    return type === ENEMY_TYPE.PLANE || type === ENEMY_TYPE.INSECT || type === ENEMY_TYPE.SCORPIO;
  }

  constructor(mapRef, type, level, cellI, cellJ) {
    this.mapReference = mapRef;
    this.numType = type;
    this.level = level;
    this.cellI = cellI;
    this.cellJ = cellJ;
    this.oldCellI = cellI;
    this.oldCellJ = cellJ;
    this.exists = true;
    this.nearExit = false;
    this.effects = [];
    this.numAltitude = Enemy.isAirType(type) ? ALTITUDE_AIR : ALTITUDE_GROUND;
    this.x = 0;
    this.y = 0;
    this.waypointX = 0;
    this.waypointY = 0;

    // Visual flags derived from active effects each tick
    this.hasFast = false;
    this.hasSlow = false;
    this.hasRepair = false;
    this.hasShield = false;
    this.hasConfuse = false;
    this.hasTimeStop = false;

    this._initStats(type, level);
  }

  _initStats(type, level) {
    switch (type) {
      case ENEMY_TYPE.BAGGI:
        this.maxSpeed = 2;
        this.turnSpeed = 0.11;
        this.vectSpeed = new Vector2(1, 1);
        this.maxHealth = 15;
        this.deathEffect = 'explosion_small';
        this.hitRadius = 8;
        break;
      case ENEMY_TYPE.TRICYCLE:
        this.maxSpeed = 1.7;
        this.turnSpeed = 0.1;
        this.vectSpeed = new Vector2(1, 1);
        this.maxHealth = 35;
        this.deathEffect = 'explosion_medium';
        this.hitRadius = 10;
        break;
      case ENEMY_TYPE.CAR:
        this.maxSpeed = 1.5;
        this.turnSpeed = 0.08;
        this.vectSpeed = new Vector2(1, 1);
        this.maxHealth = 70;
        this.deathEffect = 'explosion_medium';
        this.hitRadius = 11;
        break;
      case ENEMY_TYPE.HOWERTANK:
        this.maxSpeed = 1.1;
        this.turnSpeed = 0.06;
        this.vectSpeed = new Vector2(1, 1);
        this.maxHealth = 120;
        this.deathEffect = 'explosion_big';
        this.hitRadius = 13;
        break;
      case ENEMY_TYPE.PLANE:
        this.maxSpeed = 1.8;
        this.turnSpeed = 0.11;
        this.vectSpeed = new Vector2(0, 1);
        this.maxHealth = 8;
        this.deathEffect = 'explosion_small';
        this.hitRadius = 10;
        break;
      case ENEMY_TYPE.INSECT:
        this.maxSpeed = 1.5;
        this.turnSpeed = 0.16;
        this.vectSpeed = new Vector2(0, 1);
        this.maxHealth = 20;
        this.deathEffect = 'explosion_medium';
        this.hitRadius = 11;
        break;
      case ENEMY_TYPE.SCORPIO:
        this.maxSpeed = 1.2;
        this.turnSpeed = 0.06;
        this.vectSpeed = new Vector2(0, 1);
        this.maxHealth = 40;
        this.deathEffect = 'explosion_big';
        this.hitRadius = 13;
        break;
      default:
        this.maxSpeed = 1.5;
        this.turnSpeed = 0.1;
        this.vectSpeed = new Vector2(1, 1);
        this.maxHealth = 20;
        this.deathEffect = 'explosion_small';
        this.hitRadius = 10;
    }

    this.vectSpeed.numLength = this.maxSpeed;
    this.maxHealth += Math.round(1.2 * (level - 1) * this.maxHealth);
    this.health = this.maxHealth;
    this.barWidth = Math.min(34, Math.max(16, (this.maxHealth >= 100 ? 100 : this.maxHealth) / 2.2));
    this.reward = ENEMY_REWARDS[type - 1] * (1 + 0.5 * (level - 1));
  }

  updateWaypoint() {
    const next = this.mapReference.getNextCell(this.cellI, this.cellJ);
    if (!next) {
      return false;
    }
    if (this.cellJ === next.j) {
      if (this.cellI < next.i) {
        this.waypointX = (this.cellJ + 0.5) * MATRIX_CELL_WIDTH;
        this.waypointY = (this.cellI + 1) * MATRIX_CELL_HEIGHT;
      } else {
        this.waypointX = (this.cellJ + 0.5) * MATRIX_CELL_WIDTH;
        this.waypointY = this.cellI * MATRIX_CELL_HEIGHT;
      }
    }
    if (this.cellI === next.i) {
      if (this.cellJ < next.j) {
        this.waypointX = (this.cellJ + 1) * MATRIX_CELL_WIDTH;
        this.waypointY = (this.cellI + 0.5) * MATRIX_CELL_HEIGHT;
      } else {
        this.waypointX = this.cellJ * MATRIX_CELL_WIDTH;
        this.waypointY = (this.cellI + 0.5) * MATRIX_CELL_HEIGHT;
      }
    }
    return true;
  }

  getDistanceFrom(x, y) {
    const dx = this.x - x;
    const dy = this.y - y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  applyEffect(effect) {
    this.effects.push(effect);
  }

  process(callbacks) {
    if (!this.exists) return;

    this.vectSpeed.numLength = this.maxSpeed;

    let tookDamage = false;
    let hasFast = false;
    let hasSlow = false;
    let hasClear = false;
    let hasRepair = false;
    let hasShield = false;
    let hasTimeStop = false;
    let hasConfuse = false;

    let speedBoost = 0;
    let speedSlow = 0;
    let normalDamage = 0;
    let repairHeal = 0;
    let pierceDamage = 0;
    let shieldPass = 1;
    let confusePenalty = 0;

    for (let i = 0; i < this.effects.length; i++) {
      const ef = this.effects[i];
      switch (ef.numType) {
        case EFFECT_TYPE.DAMAGE:
          tookDamage = true;
          normalDamage += ef.objParams.damage;
          break;
        case EFFECT_TYPE.FAST:
          hasFast = true;
          speedBoost += this.vectSpeed.numLength * ef.objParams.percent;
          break;
        case EFFECT_TYPE.SLOW:
          hasSlow = true;
          speedSlow += this.vectSpeed.numLength * ef.objParams.percent;
          break;
        case EFFECT_TYPE.CLEAR:
          hasClear = true;
          break;
        case EFFECT_TYPE.REPAIR:
          hasRepair = true;
          repairHeal += this.maxHealth * ef.objParams.percent;
          break;
        case EFFECT_TYPE.SHIELD:
          hasShield = true;
          shieldPass = Math.min(shieldPass, ef.objParams.pass);
          break;
        case EFFECT_TYPE.PIERCEDAMAGE:
          tookDamage = true;
          pierceDamage += ef.objParams.damage;
          break;
        case EFFECT_TYPE.CONFUSE:
          hasConfuse = true;
          confusePenalty += this.turnSpeed * ef.objParams.percent;
          if (confusePenalty >= this.turnSpeed) confusePenalty = this.turnSpeed;
          break;
        case EFFECT_TYPE.TIMESTOP:
          hasSlow = true;
          hasTimeStop = true;
          break;
        default:
          break;
      }

      if (ef.tick()) {
        this.effects.splice(i, 1);
        i -= 1;
      }
    }

    this.hasFast = hasFast;
    this.hasSlow = hasSlow;
    this.hasRepair = hasRepair;
    this.hasShield = hasShield;
    this.hasConfuse = hasConfuse;
    this.hasTimeStop = hasTimeStop;

    this.vectSpeed.numLength += speedBoost - speedSlow;
    if (this.vectSpeed.numLength < Enemy.MIN_SPEED) {
      this.vectSpeed.numLength = Enemy.MIN_SPEED;
    }

    let effectiveTurnSpeed = this.turnSpeed - confusePenalty;
    if (hasTimeStop) {
      this.vectSpeed.numLength = 0;
      effectiveTurnSpeed = 0;
    }

    if (hasClear) {
      this.effects = [];
      this.hasFast = false;
      this.hasSlow = false;
      this.hasRepair = false;
      this.hasShield = false;
      this.hasConfuse = false;
      this.hasTimeStop = false;
    }

    this.health = Math.max(
      0,
      Math.min(this.maxHealth, this.health + repairHeal - pierceDamage - shieldPass * normalDamage)
    );

    if (tookDamage) {
      soundService.play(SOUND.HIT, 75);
    }

    if (this.health === 0) {
      callbacks.onEnemyDead(this, {
        symbol: this.deathEffect,
        x: this.x,
        y: this.y,
        altitude: this.numAltitude,
      });
      return;
    }

    const desired = new Vector2(0, 0);
    if (this.nearExit) {
      if (this.x - 16 > PLAYFIELD_SIZE || this.y - 16 > PLAYFIELD_SIZE) {
        callbacks.onEnemyPassed(this);
        return;
      }
      if (this.cellI === MATRIX_HEIGHT - 1) {
        desired.numY = 1;
      }
      if (this.cellJ === MATRIX_WIDTH - 1) {
        desired.numX = 1;
      }
    } else {
      desired.numX = this.waypointX - this.x;
      desired.numY = this.waypointY - this.y;
    }

    if (this.numAltitude !== ALTITUDE_AIR && desired.numLength > 0.001) {
      const angle = this.vectSpeed.getAngleWith(desired);
      if (angle > Enemy.WAYPOINT_TURN_TOLERANCE) {
        const cross = desired.numX * this.vectSpeed.numY - this.vectSpeed.numX * desired.numY;
        const rot = Math.min(effectiveTurnSpeed, angle);
        if (cross > 0) {
          this.vectSpeed.rotate(rot);
        } else {
          this.vectSpeed.rotate(-rot);
        }
      }
    }

    const prevX = this.x;
    const prevY = this.y;
    this.x += this.vectSpeed.numX;
    this.y += this.vectSpeed.numY;

    let newJ = Math.floor(this.x / MATRIX_CELL_WIDTH);
    let newI = Math.floor(this.y / MATRIX_CELL_HEIGHT);

    if (
      this.numAltitude !== ALTITUDE_AIR &&
      newI >= 0 &&
      newI < MATRIX_HEIGHT &&
      newJ >= 0 &&
      newJ < MATRIX_WIDTH &&
      this.mapReference.matrixPattern[newI * MATRIX_WIDTH + newJ] > CELL_VOID
    ) {
      this.vectSpeed.numLength = 0.1;
      this.x = prevX;
      this.y = prevY;
      newI = -1;
      newJ = -1;
    }

    if (newI >= 0 && newJ >= 0 && (this.cellI !== newI || this.cellJ !== newJ)) {
      this.oldCellI = this.cellI;
      this.oldCellJ = this.cellJ;
      this.cellJ = newJ;
      this.cellI = newI;
      if (this.numAltitude === ALTITUDE_AIR || !this.updateWaypoint()) {
        this.nearExit = true;
      }
    }
  }
}

export class Blast {
  static DAMAGE_BONUS = 0;
  static TARGET_HIT_TOLERANCE = 10;
  static TARGET_TURN_TOLERANCE = 0.1;
  static TTL = 100;

  constructor(params) {
    this.x = params.x;
    this.y = params.y;
    this.startX = params.x;
    this.startY = params.y;
    this.numType = params.type;
    this.numAltitude = params.altitude;
    this.numSpeed = params.speed;
    this.vectSpeed = params.direction.makeCopy();
    this.vectSpeed.numLength = this.numSpeed;
    this.targetsEnemy = params.targetsEnemy;
    this.target = params.targetsEnemy ? params.target : null;
    this.targetX = params.targetsEnemy ? 0 : params.targetX;
    this.targetY = params.targetsEnemy ? 0 : params.targetY;
    this.liveTimer = Blast.TTL;
    this.alive = true;
    this.chainBounces = 1;
    this.beamTrail = [];
    this._initType();
  }

  _initType() {
    const mult = 1 + Blast.DAMAGE_BONUS;
    this.turnSpeed = 0;
    this.damage = 0;
    this.splashRadius = 0;
    this.effectSymbol = null;

    switch (this.numType) {
      case BLAST_TYPE.ROCKET:
        this.turnSpeed = 0.2;
        this.damage = 5 * mult;
        break;
      case BLAST_TYPE.BALL:
        this.turnSpeed = 0.05;
        this.damage = 20 * mult;
        this.splashRadius = 25;
        this.effectSymbol = 'splash';
        break;
      case BLAST_TYPE.SLOWSHOT:
        this.turnSpeed = 0.1;
        this.damage = 1 * mult;
        this.splashRadius = 15;
        this.effectSymbol = 'slowsplash';
        break;
      case BLAST_TYPE.ELECTRICFIELD:
        this.turnSpeed = 0;
        this.damage = 10 * mult;
        this.splashRadius = 60 * (1 + Building.RANGE_BONUS);
        this.effectSymbol = 'electricfield';
        break;
      case BLAST_TYPE.NULIFYBALL:
        this.turnSpeed = 0.1;
        break;
      case BLAST_TYPE.LASERBEAM:
        this.turnSpeed = 0;
        this.damage = 2 * mult;
        break;
      case BLAST_TYPE.AASHELL:
        this.turnSpeed = 0;
        this.damage = 1 * mult;
        this.effectSymbol = 'aablast';
        break;
      case BLAST_TYPE.MISSILE:
        this.turnSpeed = 0.1;
        this.damage = 25 * mult;
        this.splashRadius = 100;
        this.effectSymbol = 'missileblast';
        break;
      case BLAST_TYPE.CHAINBLAST:
        this.turnSpeed = Math.PI;
        this.damage = 8 * mult;
        this.chainBounces = 1;
        break;
      case BLAST_TYPE.GAUSSRAIL:
        this.turnSpeed = 0;
        this.damage = 8 * mult;
        break;
      case BLAST_TYPE.CONFUSEBALL:
        this.turnSpeed = 0.5;
        this.damage = 3 * mult;
        break;
      default:
        break;
    }
  }

  process(map, callbacks) {
    if (!this.alive) return;

    if (this.targetsEnemy && (!this.target || !this.target.exists)) {
      this.liveTimer -= 1;
      if (this.liveTimer <= 0) {
        this.alive = false;
        return;
      }
    } else {
      const tx = this.targetsEnemy ? this.target.x : this.targetX;
      const ty = this.targetsEnemy ? this.target.y : this.targetY;
      const toTarget = new Vector2(tx - this.x, ty - this.y);

      if (toTarget.numLength <= Blast.TARGET_HIT_TOLERANCE) {
        switch (this.numType) {
          case BLAST_TYPE.ROCKET:
          case BLAST_TYPE.AASHELL:
            this.target.applyEffect(new Effect(EFFECT_TYPE.DAMAGE, { damage: this.damage }));
            break;
          case BLAST_TYPE.CHAINBLAST:
            this.target.applyEffect(
              new Effect(EFFECT_TYPE.DAMAGE, { damage: this.damage / this.chainBounces })
            );
            break;
          case BLAST_TYPE.MISSILE:
            map.applySplashEffect(
              new Effect(EFFECT_TYPE.PIERCEDAMAGE, { damage: this.damage }),
              tx,
              ty,
              this.splashRadius,
              this.numAltitude
            );
          // falls through intentionally matching CBlast.as!
          case BLAST_TYPE.BALL:
          case BLAST_TYPE.ELECTRICFIELD:
            map.applySplashEffect(
              new Effect(EFFECT_TYPE.DAMAGE, { damage: this.damage }),
              tx,
              ty,
              this.splashRadius,
              this.numAltitude
            );
            break;
          case BLAST_TYPE.SLOWSHOT:
            this.target.applyEffect(new Effect(EFFECT_TYPE.DAMAGE, { damage: this.damage }));
            map.applySplashEffect(
              new Effect(EFFECT_TYPE.SLOW, { percent: 0.25 }, 36),
              tx,
              ty,
              this.splashRadius,
              this.numAltitude
            );
            break;
          case BLAST_TYPE.NULIFYBALL:
            this.target.applyEffect(new Effect(EFFECT_TYPE.CLEAR));
            break;
          case BLAST_TYPE.LASERBEAM:
          case BLAST_TYPE.GAUSSRAIL:
            this.target.applyEffect(new Effect(EFFECT_TYPE.PIERCEDAMAGE, { damage: this.damage }));
            break;
          case BLAST_TYPE.CONFUSEBALL:
            this.target.applyEffect(new Effect(EFFECT_TYPE.DAMAGE, { damage: this.damage }));
            this.target.applyEffect(new Effect(EFFECT_TYPE.CONFUSE, { percent: 0.7 }, 60));
            break;
          default:
            break;
        }

        if (this.numType === BLAST_TYPE.LASERBEAM || this.numType === BLAST_TYPE.GAUSSRAIL) {
          callbacks.onCreateGfx({
            symbol: this.numType === BLAST_TYPE.LASERBEAM ? 'laserbeam' : 'gaussrail',
            x: this.startX,
            y: this.startY,
            endX: tx,
            endY: ty,
            altitude: this.numAltitude,
          });
        }

        if (this.effectSymbol) {
          const gfx = {
            symbol: this.effectSymbol,
            x: this.x,
            y: this.y,
            altitude: this.numAltitude,
          };
          if (this.numType === BLAST_TYPE.ELECTRICFIELD) {
            gfx.altitude = ALTITUDE_AIR;
            gfx.radius = this.splashRadius;
          }
          callbacks.onCreateGfx(gfx);
        }

        if (this.numType === BLAST_TYPE.CHAINBLAST && this.chainBounces < 3) {
          const prevTarget = this.target;
          this.chainBounces += 1;
          this.target = map.getNearestEnemy(this.x, this.y, 50, ALTITUDE_GROUND, prevTarget);
          if (!this.target || !this.target.exists) {
            this.alive = false;
            return;
          }
          callbacks.onCreateGfx({
            symbol: 'chainarc',
            x: prevTarget.x,
            y: prevTarget.y,
            endX: this.target.x,
            endY: this.target.y,
            altitude: ALTITUDE_GROUND,
          });
        } else {
          this.alive = false;
          return;
        }
      }

      const angle = this.vectSpeed.getAngleWith(toTarget);
      if (angle > Blast.TARGET_TURN_TOLERANCE && this.turnSpeed > 0) {
        const cross = toTarget.numX * this.vectSpeed.numY - this.vectSpeed.numX * toTarget.numY;
        const rot = Math.min(this.turnSpeed, angle);
        if (cross > 0) {
          this.vectSpeed.rotate(rot);
        } else {
          this.vectSpeed.rotate(-rot);
        }
      }
    }

    this.x += this.vectSpeed.numX;
    this.y += this.vectSpeed.numY;
  }
}

export class GfxEffect {
  constructor(params) {
    this.symbol = params.symbol;
    this.x = params.x;
    this.y = params.y;
    this.endX = params.endX ?? params.x;
    this.endY = params.endY ?? params.y;
    this.altitude = params.altitude ?? ALTITUDE_GROUND;
    this.radius = params.radius ?? 0;
    this.frame = 0;

    switch (this.symbol) {
      case 'explosion_big':
        this.maxFrames = 15;
        soundService.play(SOUND.BIGEXPLOSION);
        break;
      case 'explosion_medium':
        this.maxFrames = 9;
        soundService.play(SOUND.MEDIUMEXPLOSION);
        break;
      case 'explosion_small':
        this.maxFrames = 9;
        soundService.play(SOUND.SMALLEXPLOSION);
        break;
      case 'missileblast':
        this.maxFrames = 12;
        soundService.play(SOUND.NUCLEAREXPLOSION);
        break;
      case 'electricfield':
        this.maxFrames = 6;
        break;
      case 'aablast':
      case 'splash':
      case 'slowsplash':
        this.maxFrames = 5;
        break;
      case 'laserbeam':
      case 'gaussrail':
      case 'chainarc':
        this.maxFrames = 3;
        break;
      case 'timestop_wave':
        this.maxFrames = 16;
        break;
      default:
        this.maxFrames = 6;
    }
  }

  get alive() {
    return this.frame < this.maxFrames;
  }

  tick() {
    this.frame += 1;
  }
}
