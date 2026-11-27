// Port of CMap.as

import {
  ALTITUDE_AIR,
  ALTITUDE_BOTH,
  ALTITUDE_GROUND,
  CELL_BUILDING,
  CELL_ROCK,
  CELL_VOID,
  CELL_WALL,
  MAPS,
  MATRIX_CELL_HEIGHT,
  MATRIX_CELL_WIDTH,
  MATRIX_HEIGHT,
  MATRIX_WIDTH,
  PLAYFIELD_SIZE,
} from './constants.js';
import { Enemy } from './entities.js';

export class GameMap {
  constructor() {
    this.width = MATRIX_WIDTH;
    this.height = MATRIX_HEIGHT;
    this.matrixPattern = new Int32Array(this.width * this.height);
    this.matrixCache = new Int32Array(this.width * this.height);
    this.buildings = [];
    this.walls = []; // { i, j }
    this.groundEnemies = [];
    this.airEnemies = [];
    this.blasts = [];
    this.gfx = [];
    this.showGrid = false;
    this.nextBuildingDepth = 1;
    this.mapDef = MAPS[1];
  }

  get noEnemies() {
    return this.groundEnemies.length === 0 && this.airEnemies.length === 0;
  }

  loadMap(mapId) {
    const def = MAPS[mapId] || MAPS[1];
    this.mapDef = def;
    this.buildings = [];
    this.walls = [];
    this.groundEnemies = [];
    this.airEnemies = [];
    this.blasts = [];
    this.gfx = [];
    this.nextBuildingDepth = 1;

    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        this.matrixPattern[i * this.width + j] = def.grid[i][j] === 1 ? CELL_ROCK : CELL_VOID;
      }
    }

    this.markCacheMatrix();
    this.writeMatrixFromCache();
    return true;
  }

  markCacheMatrix(newWallI = undefined, newWallJ = undefined) {
    for (let idx = 0; idx < this.matrixPattern.length; idx++) {
      this.matrixCache[idx] = this.matrixPattern[idx];
      if (this.matrixCache[idx] < CELL_VOID) {
        this.matrixCache[idx] = CELL_VOID;
      }
    }

    if (newWallI !== undefined && newWallJ !== undefined) {
      const wIdx = newWallI * this.width + newWallJ;
      if (this.matrixCache[wIdx] > CELL_VOID) {
        return false;
      }
      this.matrixCache[wIdx] = CELL_WALL;
    }

    let dist = 1;
    let frontier = this.getExitCells(this.matrixCache);
    for (const cell of frontier) {
      this.matrixCache[cell.i * this.width + cell.j] = CELL_VOID - dist;
    }

    while (frontier.length > 0) {
      dist += 1;
      const nextFrontier = [];
      for (const cell of frontier) {
        const neighbors = [
          { i: cell.i - 1, j: cell.j },
          { i: cell.i + 1, j: cell.j },
          { i: cell.i, j: cell.j - 1 },
          { i: cell.i, j: cell.j + 1 },
        ];
        for (const n of neighbors) {
          if (n.i < 0 || n.i >= this.height || n.j < 0 || n.j >= this.width) continue;
          const nIdx = n.i * this.width + n.j;
          if (this.matrixCache[nIdx] === CELL_VOID) {
            this.matrixCache[nIdx] = CELL_VOID - dist;
            nextFrontier.push(n);
          }
        }
      }
      frontier = nextFrontier;
    }

    for (let idx = 0; idx < this.matrixCache.length; idx++) {
      if (this.matrixCache[idx] === CELL_VOID) {
        return false;
      }
    }

    // Also ensure no existing ground enemy gets stranded inside a closed pocket
    for (const enemy of this.groundEnemies) {
      const ci = Math.floor(enemy.y / MATRIX_CELL_HEIGHT);
      const cj = Math.floor(enemy.x / MATRIX_CELL_WIDTH);
      if (ci >= 0 && ci < this.height && cj >= 0 && cj < this.width) {
        if (this.matrixCache[ci * this.width + cj] >= CELL_VOID) {
          return false;
        }
      }
    }

    return true;
  }

  writeMatrixFromCache() {
    for (let idx = 0; idx < this.matrixPattern.length; idx++) {
      this.matrixPattern[idx] = this.matrixCache[idx];
    }
  }

  addWall(i, j) {
    this.walls.push({ i, j });
    this.writeMatrixFromCache();
    for (const enemy of this.groundEnemies) {
      enemy.updateWaypoint();
    }
  }

  cellHitTest(px, py) {
    const j = Math.floor(px / MATRIX_CELL_WIDTH);
    const i = Math.floor(py / MATRIX_CELL_HEIGHT);
    const out = i < 0 || j < 0 || i >= this.height || j >= this.width;
    return {
      out,
      i: out ? undefined : i,
      j: out ? undefined : j,
      x: out ? 0 : j * MATRIX_CELL_WIDTH,
      y: out ? 0 : i * MATRIX_CELL_HEIGHT,
      free: false,
    };
  }

  checkPlacingSpace(i, j, pattern = { width: 1, height: 1, cells: [1] }) {
    if (i === undefined || j === undefined) return false;
    if (i < 0 || j < 0 || i + pattern.height > this.height || j + pattern.width > this.width) {
      return false;
    }
    for (let r = 0; r < pattern.height; r++) {
      for (let c = 0; c < pattern.width; c++) {
        if (pattern.cells[r * pattern.width + c] !== 0) {
          const cellVal = this.matrixPattern[(r + i) * this.width + (c + j)];
          if (cellVal !== CELL_ROCK && cellVal !== CELL_WALL) {
            return false;
          }
        }
      }
    }
    return true;
  }

  checkBuildingSpace(i, j) {
    if (i === undefined || j === undefined) return false;
    return this.matrixPattern[i * this.width + j] >= CELL_BUILDING;
  }

  checkWallSpace(i, j) {
    if (i === undefined || j === undefined) return false;
    if (
      this.matrixPattern[i * this.width + j] > CELL_VOID ||
      i === 0 ||
      j === 0 ||
      i === this.height - 1 ||
      j === this.width - 1
    ) {
      return false;
    }
    return true;
  }

  isHitWithGroundEnemy(cellI, cellJ) {
    const x1 = cellJ * MATRIX_CELL_WIDTH;
    const y1 = cellI * MATRIX_CELL_HEIGHT;
    const x2 = x1 + MATRIX_CELL_WIDTH;
    const y2 = y1 + MATRIX_CELL_HEIGHT;
    for (const enemy of this.groundEnemies) {
      const half = enemy.hitRadius;
      if (enemy.x + half > x1 && enemy.x - half < x2 && enemy.y + half > y1 && enemy.y - half < y2) {
        return true;
      }
    }
    return false;
  }

  addBuilding(building) {
    building.depth = this.nextBuildingDepth++;
    building.installed = true;
    this.buildings.push(building);

    for (let r = 0; r < building.pattern.height; r++) {
      for (let c = 0; c < building.pattern.width; c++) {
        if (building.pattern.cells[r * building.pattern.width + c] === 1) {
          this.matrixPattern[(r + building.cellI) * this.width + (c + building.cellJ)] =
            CELL_BUILDING + building.depth;
        }
      }
    }
    return true;
  }

  getBuildingAt(i, j) {
    if (i === undefined || j === undefined) return null;
    const val = this.matrixPattern[i * this.width + j];
    if (val < CELL_BUILDING) return null;
    const depth = val - CELL_BUILDING;
    return this.buildings.find((b) => b.depth === depth) || null;
  }

  deleteBuilding(building) {
    if (!building) return;
    const idx = this.buildings.indexOf(building);
    if (idx === -1) return;

    const hasWallUnder = this.walls.some((w) => w.i === building.cellI && w.j === building.cellJ);
    for (let r = 0; r < building.pattern.height; r++) {
      for (let c = 0; c < building.pattern.width; c++) {
        if (building.pattern.cells[r * building.pattern.width + c] === 1) {
          this.matrixPattern[(r + building.cellI) * this.width + (c + building.cellJ)] = hasWallUnder
            ? CELL_WALL
            : CELL_ROCK;
        }
      }
    }
    this.buildings.splice(idx, 1);
  }

  getEntryCells() {
    const entries = [];
    for (let j = 0; j < this.width; j++) {
      if (this.matrixPattern[j] <= CELL_VOID) {
        entries.push({ i: 0, j });
      }
    }
    for (let i = 0; i < this.height; i++) {
      if (this.matrixPattern[i * this.width] <= CELL_VOID) {
        entries.push({ i, j: 0 });
      }
    }
    return entries;
  }

  getExitCells(matrix = this.matrixPattern) {
    const exits = [];
    for (let j = 0; j < this.width; j++) {
      if (matrix[(this.height - 1) * this.width + j] <= CELL_VOID) {
        exits.push({ i: this.height - 1, j });
      }
    }
    for (let i = 0; i < this.height; i++) {
      if (matrix[(i + 1) * this.width - 1] <= CELL_VOID) {
        exits.push({ i, j: this.width - 1 });
      }
    }
    return exits;
  }

  getNextCell(cellI, cellJ) {
    const currentVal = this.matrixPattern[cellI * this.width + cellJ];
    const neighbors = [
      { i: cellI - 1, j: cellJ },
      { i: cellI + 1, j: cellJ },
      { i: cellI, j: cellJ - 1 },
      { i: cellI, j: cellJ + 1 },
    ];
    for (const n of neighbors) {
      if (n.i < 0 || n.i >= this.height || n.j < 0 || n.j >= this.width) continue;
      const nVal = this.matrixPattern[n.i * this.width + n.j];
      if (nVal === currentVal + 1 && nVal <= CELL_VOID) {
        return n;
      }
    }
    return undefined;
  }

  addEnemy(type, level, initialEffect, waveIndex) {
    const isAir = Enemy.isAirType(type);
    let cellI;
    let cellJ;

    if (isAir) {
      cellI = 0;
      cellJ = 4 + Math.floor(Math.random() * 6);
    } else {
      const entries = this.getEntryCells();
      const pick = entries[Math.floor(Math.random() * entries.length)] || { i: 0, j: 0 };
      cellI = pick.i;
      cellJ = pick.j;
    }

    const enemy = new Enemy(this, type, level, cellI, cellJ);
    enemy.x = cellJ * MATRIX_CELL_WIDTH + MATRIX_CELL_WIDTH / 2;
    enemy.y = cellI * MATRIX_CELL_HEIGHT + MATRIX_CELL_HEIGHT / 2;

    if (cellI === 0) {
      enemy.y -= MATRIX_CELL_HEIGHT;
      enemy.x += Math.floor(Math.random() * 16) - 8;
      enemy.y -= 35 * waveIndex;
      enemy.vectSpeed.numX = 0;
      enemy.vectSpeed.numY = enemy.maxSpeed;
    } else if (cellJ === 0) {
      enemy.x -= MATRIX_CELL_WIDTH;
      enemy.y += Math.floor(Math.random() * 16) - 8;
      enemy.x -= 35 * waveIndex;
      enemy.vectSpeed.numX = enemy.maxSpeed;
      enemy.vectSpeed.numY = 0;
    }

    if (isAir) {
      enemy.waypointX = enemy.x;
      enemy.waypointY = PLAYFIELD_SIZE + MATRIX_CELL_HEIGHT / 2;
      this.airEnemies.push(enemy);
    } else {
      enemy.updateWaypoint();
      this.groundEnemies.push(enemy);
    }

    if (initialEffect) {
      enemy.applyEffect(initialEffect);
    }
    return enemy;
  }

  getNearestEnemy(x, y, range, altitude, forbidden = null) {
    let bestDist = 999999;
    let best = null;

    if (altitude === ALTITUDE_GROUND || altitude === ALTITUDE_BOTH) {
      for (const e of this.groundEnemies) {
        if (!e.exists || e === forbidden || e.x <= 0 || e.y <= 0) continue;
        const d = e.getDistanceFrom(x, y);
        if (d <= range && d < bestDist) {
          bestDist = d;
          best = e;
        }
      }
    }

    if (altitude === ALTITUDE_AIR || altitude === ALTITUDE_BOTH) {
      for (const e of this.airEnemies) {
        if (!e.exists || e === forbidden || e.x <= 0 || e.y <= 0) continue;
        const d = e.getDistanceFrom(x, y);
        if (d <= range && d < bestDist) {
          bestDist = d;
          best = e;
        }
      }
    }

    return best;
  }

  applySplashEffect(effectTemplate, centerX, centerY, radius, altitude) {
    if (altitude === ALTITUDE_GROUND || altitude === ALTITUDE_BOTH) {
      for (const e of this.groundEnemies) {
        if (!e.exists) continue;
        if (e.getDistanceFrom(centerX, centerY) <= radius) {
          e.applyEffect(effectTemplate.makeCopy());
        }
      }
    }
    if (altitude === ALTITUDE_AIR || altitude === ALTITUDE_BOTH) {
      for (const e of this.airEnemies) {
        if (!e.exists) continue;
        if (e.getDistanceFrom(centerX, centerY) <= radius) {
          e.applyEffect(effectTemplate.makeCopy());
        }
      }
    }
  }

  removeEnemy(enemy) {
    enemy.exists = false;
    let idx = this.groundEnemies.indexOf(enemy);
    if (idx !== -1) {
      this.groundEnemies.splice(idx, 1);
      return;
    }
    idx = this.airEnemies.indexOf(enemy);
    if (idx !== -1) {
      this.airEnemies.splice(idx, 1);
    }
  }
}
