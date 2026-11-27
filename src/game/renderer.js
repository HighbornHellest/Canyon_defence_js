// Pure HTML5 Canvas 2D renderer for Canyon Defense

import {
  ABILITY_TYPE,
  ALTITUDE_AIR,
  BLAST_TYPE,
  BUILDING_TYPE,
  CELL_ROCK,
  ENEMY_TYPE,
  MAPS,
  MATRIX_CELL_HEIGHT,
  MATRIX_CELL_WIDTH,
  MATRIX_HEIGHT,
  MATRIX_WIDTH,
  PLAYFIELD_SIZE,
} from './constants.js';

export class GameRenderer {
  constructor() {
    this.terrainCanvas = document.createElement('canvas');
    this.terrainCanvas.width = PLAYFIELD_SIZE;
    this.terrainCanvas.height = PLAYFIELD_SIZE;
    this.terrainMapId = null;
  }

  ensureTerrain(map) {
    if (this.terrainMapId === map.mapDef.id) return;
    this.terrainMapId = map.mapDef.id;
    this._renderTerrainToCanvas(this.terrainCanvas, map.mapDef.grid);
  }

  _renderTerrainToCanvas(canvas, grid) {
    const ctx = canvas.getContext('2d');
    const w = MATRIX_WIDTH;
    const h = MATRIX_HEIGHT;
    const cw = MATRIX_CELL_WIDTH;
    const ch = MATRIX_CELL_HEIGHT;

    // 1. Desert sand base
    const sandGrad = ctx.createLinearGradient(0, 0, PLAYFIELD_SIZE, PLAYFIELD_SIZE);
    sandGrad.addColorStop(0, '#dfc088');
    sandGrad.addColorStop(0.5, '#d5af72');
    sandGrad.addColorStop(1, '#c89f60');
    ctx.fillStyle = sandGrad;
    ctx.fillRect(0, 0, PLAYFIELD_SIZE, PLAYFIELD_SIZE);

    // Subtle sand ripples & pebbles (deterministic pseudo-random)
    let seed = 4219;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    ctx.strokeStyle = 'rgba(155, 112, 58, 0.14)';
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 55; k++) {
      const rx = rand() * PLAYFIELD_SIZE;
      const ry = rand() * PLAYFIELD_SIZE;
      const len = 14 + rand() * 26;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.quadraticCurveTo(rx + len * 0.5, ry - 3, rx + len, ry + 1);
      ctx.stroke();
    }

    for (let k = 0; k < 140; k++) {
      const px = rand() * PLAYFIELD_SIZE;
      const py = rand() * PLAYFIELD_SIZE;
      const r = 0.7 + rand() * 1.4;
      ctx.fillStyle = rand() > 0.5 ? 'rgba(120, 82, 38, 0.22)' : 'rgba(255, 240, 210, 0.25)';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Canyon cliff shadows onto sand
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        if (grid[i][j] === 1) {
          ctx.fillStyle = 'rgba(42, 22, 10, 0.26)';
          ctx.fillRect(j * cw + 4, i * ch + 5, cw, ch);
        }
      }
    }

    // 3. Rock mesa tiles with beveled canyon cliff sides
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        if (grid[i][j] !== 1) continue;
        const x = j * cw;
        const y = i * ch;

        const topOpen = i === 0 || grid[i - 1][j] === 0;
        const botOpen = i === h - 1 || grid[i + 1][j] === 0;
        const leftOpen = j === 0 || grid[i][j - 1] === 0;
        const rightOpen = j === w - 1 || grid[i][j + 1] === 0;

        // Rock plateau surface
        ctx.fillStyle = '#925736';
        ctx.fillRect(x, y, cw, ch);

        // Subtle strata shading
        ctx.fillStyle = (i + j) % 2 === 0 ? 'rgba(255, 210, 170, 0.05)' : 'rgba(40, 15, 5, 0.06)';
        ctx.fillRect(x, y, cw, ch);

        // Cliff bevels on exposed edges
        if (topOpen) {
          ctx.fillStyle = '#b4724a';
          ctx.fillRect(x, y, cw, 3);
        }
        if (leftOpen) {
          ctx.fillStyle = '#a86741';
          ctx.fillRect(x, y, 3, ch);
        }
        if (botOpen) {
          ctx.fillStyle = '#5c311a';
          ctx.fillRect(x, y + ch - 5, cw, 5);
        }
        if (rightOpen) {
          ctx.fillStyle = '#6a391f';
          ctx.fillRect(x + cw - 4, y, 4, ch);
        }

        // Subtle rock surface crack
        if ((i * 7 + j * 13) % 5 === 0) {
          ctx.strokeStyle = 'rgba(65, 32, 16, 0.28)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 7, y + 10);
          ctx.lineTo(x + 15, y + 16);
          ctx.lineTo(x + 22, y + 14);
          ctx.stroke();
        }
      }
    }

    // 4. Entry & Exit directional markers on border sand cells
    ctx.save();
    for (let j = 0; j < w; j++) {
      if (grid[0][j] === 0) {
        this._drawChevron(ctx, j * cw + cw / 2, 9, Math.PI / 2, '#16a34a');
      }
      if (grid[h - 1][j] === 0) {
        this._drawChevron(ctx, j * cw + cw / 2, PLAYFIELD_SIZE - 9, Math.PI / 2, '#dc2626');
      }
    }
    for (let i = 0; i < h; i++) {
      if (grid[i][0] === 0) {
        this._drawChevron(ctx, 9, i * ch + ch / 2, 0, '#16a34a');
      }
      if (grid[i][w - 1] === 0) {
        this._drawChevron(ctx, PLAYFIELD_SIZE - 9, i * ch + ch / 2, 0, '#dc2626');
      }
    }
    ctx.restore();
  }

  _drawChevron(ctx, x, y, angle, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.72;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, -5);
    ctx.lineTo(2, 0);
    ctx.lineTo(-4, 5);
    ctx.stroke();
    ctx.restore();
  }

  renderMapPreview(canvas, mapId) {
    const def = MAPS[mapId] || MAPS[1];
    const tmp = document.createElement('canvas');
    tmp.width = PLAYFIELD_SIZE;
    tmp.height = PLAYFIELD_SIZE;
    this._renderTerrainToCanvas(tmp, def.grid);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
  }

  renderMission(ctx, game, animTick) {
    const map = game.map;
    this.ensureTerrain(map);

    ctx.clearRect(0, 0, PLAYFIELD_SIZE, PLAYFIELD_SIZE);
    ctx.drawImage(this.terrainCanvas, 0, 0);

    // Walls (shadows first, then wall blocks)
    for (const w of map.walls) {
      const wx = w.j * MATRIX_CELL_WIDTH;
      const wy = w.i * MATRIX_CELL_HEIGHT;
      ctx.fillStyle = 'rgba(20, 12, 6, 0.36)';
      ctx.fillRect(wx + 4, wy + 5, MATRIX_CELL_WIDTH - 2, MATRIX_CELL_HEIGHT - 2);

      this._drawWallTile(ctx, wx, wy);
    }

    // Ground effects (under buildings/air)
    for (const fx of map.gfx) {
      if (fx.altitude !== ALTITUDE_AIR) {
        this._drawGfx(ctx, fx);
      }
    }

    // Ground enemies
    for (const enemy of map.groundEnemies) {
      this._drawEnemy(ctx, enemy, animTick);
    }

    // Grid overlay when placing/selling
    if (map.showGrid) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 0.75;
      for (let i = 1; i < MATRIX_HEIGHT; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * MATRIX_CELL_HEIGHT);
        ctx.lineTo(PLAYFIELD_SIZE, i * MATRIX_CELL_HEIGHT);
        ctx.stroke();
      }
      for (let j = 1; j < MATRIX_WIDTH; j++) {
        ctx.beginPath();
        ctx.moveTo(j * MATRIX_CELL_WIDTH, 0);
        ctx.lineTo(j * MATRIX_CELL_WIDTH, PLAYFIELD_SIZE);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Buildings & Towers
    for (const bld of map.buildings) {
      this.drawBuilding(ctx, bld.numType, bld.x, bld.y, bld.direction.getRadiansFromUp(), bld.recoilFrames, animTick);
    }

    // Blasts
    for (const blast of map.blasts) {
      this._drawBlast(ctx, blast, animTick);
    }

    // Air enemies (drawn above buildings with ground shadow)
    for (const enemy of map.airEnemies) {
      this._drawEnemy(ctx, enemy, animTick);
    }

    // Air / top-layer effects
    for (const fx of map.gfx) {
      if (fx.altitude === ALTITUDE_AIR) {
        this._drawGfx(ctx, fx);
      }
    }

    // Health bars (top info layer)
    for (const enemy of map.groundEnemies) {
      this._drawHealthBar(ctx, enemy);
    }
    for (const enemy of map.airEnemies) {
      this._drawHealthBar(ctx, enemy);
    }

    // Hovered installed tower range ring
    if (game.hoveredBuilding && game.hoveredBuilding.isTower && game.cursor.mode === 'clear' && !game.paused) {
      this._drawRangeRing(ctx, game.hoveredBuilding.x, game.hoveredBuilding.y, game.hoveredBuilding.numRange, 'rgba(245, 158, 11, 0.85)');
    }

    // Cursor ghost (building placement, wall, sell, missile, timebomb)
    this._drawCursor(ctx, game, animTick);
  }

  _drawWallTile(ctx, wx, wy) {
    ctx.save();
    ctx.fillStyle = '#5c554c';
    ctx.fillRect(wx + 2, wy + 2, MATRIX_CELL_WIDTH - 4, MATRIX_CELL_HEIGHT - 4);
    ctx.strokeStyle = '#312c26';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(wx + 2, wy + 2, MATRIX_CELL_WIDTH - 4, MATRIX_CELL_HEIGHT - 4);

    // Top bevel & steel ribs
    ctx.fillStyle = '#7b7368';
    ctx.fillRect(wx + 4, wy + 4, MATRIX_CELL_WIDTH - 8, MATRIX_CELL_HEIGHT - 10);
    ctx.fillStyle = '#403a34';
    ctx.fillRect(wx + 6, wy + 13, MATRIX_CELL_WIDTH - 12, 4);
    // Corner bolts
    ctx.fillStyle = '#d6cfc4';
    for (const [bx, by] of [
      [wx + 5, wy + 5],
      [wx + MATRIX_CELL_WIDTH - 7, wy + 5],
      [wx + 5, wy + MATRIX_CELL_HEIGHT - 7],
      [wx + MATRIX_CELL_WIDTH - 7, wy + MATRIX_CELL_HEIGHT - 7],
    ]) {
      ctx.fillRect(bx, by, 2, 2);
    }
    ctx.restore();
  }

  drawBuildingIcon(canvas, type) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    const scale = canvas.width / 34;
    ctx.scale(scale, scale);
    this.drawBuilding(ctx, type, 17, 17, -0.45, 0, 12);
    ctx.restore();
  }

  drawAbilityIcon(canvas, type) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);

    if (type === ABILITY_TYPE.SELL) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 18px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 1);
    } else if (type === ABILITY_TYPE.MISSILE) {
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#e5e7eb';
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(4, -3);
      ctx.lineTo(4, 7);
      ctx.lineTo(-4, 7);
      ctx.lineTo(-4, -3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(4, -4);
      ctx.lineTo(-4, -4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-3, 7);
      ctx.lineTo(0, 12);
      ctx.lineTo(3, 7);
      ctx.fill();
    } else if (type === ABILITY_TYPE.WALL) {
      ctx.fillStyle = '#7b7368';
      ctx.fillRect(-10, -10, 20, 20);
      ctx.strokeStyle = '#d6cfc4';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-10, -10, 20, 20);
      ctx.fillStyle = '#403a34';
      ctx.fillRect(-7, -2, 14, 4);
    } else if (type === ABILITY_TYPE.TIMEBOMB) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 1, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 1);
      ctx.lineTo(0, -5);
      ctx.moveTo(0, 1);
      ctx.lineTo(4, 3);
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-3, -11, 6, 2);
    }

    ctx.restore();
  }

  drawBuilding(ctx, type, cx, cy, gunRad, recoilFrames = 0, animTick = 0) {
    ctx.save();
    ctx.translate(cx, cy);

    // Base concrete pad (26x26)
    ctx.fillStyle = '#36312c';
    ctx.fillRect(-13, -13, 26, 26);
    ctx.fillStyle = '#554e46';
    ctx.fillRect(-11, -11, 22, 22);
    ctx.strokeStyle = '#221f1b';
    ctx.lineWidth = 1;
    ctx.strokeRect(-13, -13, 26, 26);

    const recoil = recoilFrames > 0 ? 1.8 : 0;

    switch (type) {
      case BUILDING_TYPE.TOWER_1_1: {
        // Missile Turret
        ctx.rotate(gunRad);
        ctx.fillStyle = '#3f6212';
        ctx.fillRect(-7, -6 + recoil, 14, 12);
        ctx.fillStyle = '#84cc16';
        ctx.fillRect(-6, -9 + recoil, 4, 8);
        ctx.fillRect(2, -9 + recoil, 4, 8);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-5, -10 + recoil, 2, 2);
        ctx.fillRect(3, -10 + recoil, 2, 2);
        break;
      }
      case BUILDING_TYPE.TOWER_1_2: {
        // Howitzer
        ctx.rotate(gunRad);
        ctx.fillStyle = '#57534e';
        ctx.beginPath();
        ctx.arc(0, 1, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#292524';
        ctx.fillRect(-2.5, -14 + recoil * 1.4, 5, 13);
        ctx.fillStyle = '#a8a29e';
        ctx.fillRect(-3, -15 + recoil * 1.4, 6, 3);
        break;
      }
      case BUILDING_TYPE.TOWER_1_3: {
        // Tesla Tower
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
        ctx.stroke();
        const pulse = 3 + Math.sin(animTick * 0.25) * 1.1;
        ctx.fillStyle = '#bae6fd';
        ctx.beginPath();
        ctx.arc(0, 0, pulse, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case BUILDING_TYPE.TOWER_1_4: {
        // Gatling Laser
        ctx.rotate(gunRad);
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.arc(0, 2, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-3.5, -13 + recoil, 2, 12);
        ctx.fillRect(-1, -14 + recoil, 2, 13);
        ctx.fillRect(1.5, -13 + recoil, 2, 12);
        break;
      }
      case BUILDING_TYPE.TOWER_1_5: {
        // Nullificator
        ctx.rotate(gunRad);
        ctx.fillStyle = '#4c1d95';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c4b5fd';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -4, 7, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
        ctx.fillStyle = '#e9d5ff';
        ctx.beginPath();
        ctx.arc(0, -7, 2.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case BUILDING_TYPE.TOWER_2_1: {
        // AA Gun
        ctx.rotate(gunRad);
        ctx.fillStyle = '#334155';
        ctx.fillRect(-6, -5, 12, 11);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-4.5, -13 + recoil, 2, 10);
        ctx.fillRect(-1.5, -14 + recoil, 1.5, 11);
        ctx.fillRect(1, -14 + recoil, 1.5, 11);
        ctx.fillRect(3.2, -13 + recoil, 2, 10);
        break;
      }
      case BUILDING_TYPE.TOWER_2_2: {
        // Goo Cannon
        ctx.rotate(gunRad);
        ctx.fillStyle = '#0f766e';
        ctx.beginPath();
        ctx.arc(0, 1, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2dd4bf';
        ctx.beginPath();
        ctx.arc(0, 1, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#115e59';
        ctx.fillRect(-2.5, -12 + recoil, 5, 10);
        break;
      }
      case BUILDING_TYPE.TOWER_2_3: {
        // Chain Gun
        ctx.rotate(gunRad);
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-2, -13 + recoil, 4, 11);
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case BUILDING_TYPE.TOWER_2_4: {
        // Gauss Cannon
        ctx.rotate(gunRad);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-6, -4, 12, 11);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-3.5, -15 + recoil, 2, 14);
        ctx.fillRect(1.5, -15 + recoil, 2, 14);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-1, -13 + recoil, 2, 10);
        break;
      }
      case BUILDING_TYPE.TOWER_2_5: {
        // Oil Spray
        ctx.rotate(gunRad);
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(0, 2, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#78716c';
        ctx.fillRect(-3, -12 + recoil, 6, 10);
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(0, 2, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case BUILDING_TYPE.BUILDING_1: {
        // Nuclear Silo
        ctx.fillStyle = '#3f3f46';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 8.5, 0, Math.PI * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 8.5, Math.PI, Math.PI * 1.5);
        ctx.stroke();
        break;
      }
      case BUILDING_TYPE.BUILDING_2: {
        // Wall Factory
        ctx.fillStyle = '#78716c';
        ctx.fillRect(-9, -8, 18, 16);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-9, -9, 18, 3);
        ctx.fillStyle = '#44403c';
        ctx.fillRect(-5, -3, 10, 8);
        break;
      }
      case BUILDING_TYPE.BUILDING_3: {
        // Recycler
        ctx.fillStyle = '#15803d';
        ctx.fillRect(-9, -9, 18, 18);
        ctx.strokeStyle = '#bbf7d0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 5.5, (animTick * 0.08) % (Math.PI * 2), ((animTick * 0.08) % (Math.PI * 2)) + Math.PI * 1.4);
        ctx.stroke();
        break;
      }
      case BUILDING_TYPE.BUILDING_4: {
        // Radar Dome
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.rotate(animTick * 0.08);
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 6.5, -0.8, 0.8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(6, 0);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case BUILDING_TYPE.BUILDING_5: {
        // Laboratory
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(-9, -9, 18, 18);
        const glow = 4.5 + Math.sin(animTick * 0.16) * 1.2;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, 0, glow, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      default:
        break;
    }

    ctx.restore();
  }

  _drawEnemy(ctx, enemy, animTick) {
    const isAir = enemy.numAltitude === ALTITUDE_AIR;
    const angle = enemy.vectSpeed.getRadiansFromUp();

    // Air units cast a ground shadow
    if (isAir) {
      ctx.save();
      ctx.translate(enemy.x + 7, enemy.y + 9);
      ctx.rotate(angle);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(angle);

    switch (enemy.numType) {
      case ENEMY_TYPE.BAGGI: {
        // Fast dune buggy
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(-6, -6, 2.5, 4);
        ctx.fillRect(3.5, -6, 2.5, 4);
        ctx.fillRect(-6, 2, 2.5, 4);
        ctx.fillRect(3.5, 2, 2.5, 4);
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(-4, -7, 8, 14);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-2.5, -3, 5, 4);
        break;
      }
      case ENEMY_TYPE.TRICYCLE: {
        // Armored assault trike
        ctx.fillStyle = '#18181b';
        ctx.fillRect(-2, -9, 4, 4);
        ctx.fillRect(-7, 2, 3, 5);
        ctx.fillRect(4, 2, 3, 5);
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(6, 6);
        ctx.lineTo(-6, 6);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case ENEMY_TYPE.CAR: {
        // Armored APC
        ctx.fillStyle = '#27272a';
        ctx.fillRect(-6, -9, 12, 18);
        ctx.fillStyle = '#52525b';
        ctx.fillRect(-5, -7, 10, 14);
        ctx.fillStyle = '#a1a1aa';
        ctx.fillRect(-3, -4, 6, 5);
        break;
      }
      case ENEMY_TYPE.HOWERTANK: {
        // Heavy Hovertank
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3f3f46';
        ctx.fillRect(-9, -12, 18, 24);
        ctx.fillStyle = '#71717a';
        ctx.beginPath();
        ctx.arc(0, 1, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#18181b';
        ctx.fillRect(-2, -14, 4, 12);
        break;
      }
      case ENEMY_TYPE.PLANE: {
        // Swept-wing jet
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(9, 4);
        ctx.lineTo(2, 3);
        ctx.lineTo(4, 8);
        ctx.lineTo(-4, 8);
        ctx.lineTo(-2, 3);
        ctx.lineTo(-9, 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0ea5e9';
        ctx.fillRect(-1.5, -5, 3, 5);
        break;
      }
      case ENEMY_TYPE.INSECT: {
        // Twin-rotor drone
        ctx.fillStyle = '#047857';
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.5, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(209, 250, 229, 0.75)';
        ctx.lineWidth = 1.5;
        const wingAngle = Math.sin(animTick * 0.9) * 0.3;
        ctx.beginPath();
        ctx.moveTo(-11, -3 + wingAngle * 4);
        ctx.lineTo(11, -3 - wingAngle * 4);
        ctx.stroke();
        break;
      }
      case ENEMY_TYPE.SCORPIO: {
        // Heavy Gunship
        ctx.fillStyle = '#7c2d12';
        ctx.beginPath();
        ctx.moveTo(0, -13);
        ctx.lineTo(11, 2);
        ctx.lineTo(7, 10);
        ctx.lineTo(-7, 10);
        ctx.lineTo(-11, 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(-2.5, -6, 5, 7);
        break;
      }
      default:
        break;
    }

    ctx.restore();

    // Active status effect overlays (unrotated)
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    if (enemy.hasFast) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.hitRadius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (enemy.hasSlow) {
      ctx.fillStyle = enemy.hasTimeStop ? 'rgba(56, 189, 248, 0.42)' : 'rgba(45, 212, 191, 0.34)';
      ctx.beginPath();
      ctx.arc(0, 0, enemy.hitRadius + 2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (enemy.hasRepair) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-4, -enemy.hitRadius - 3);
      ctx.lineTo(4, -enemy.hitRadius - 3);
      ctx.moveTo(0, -enemy.hitRadius - 7);
      ctx.lineTo(0, -enemy.hitRadius + 1);
      ctx.stroke();
    }
    if (enemy.hasShield) {
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.9)';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.hitRadius + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    if (enemy.hasConfuse) {
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, -enemy.hitRadius - 4, 4, animTick * 0.4, animTick * 0.4 + Math.PI * 1.4);
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawHealthBar(ctx, enemy) {
    if (!enemy.exists) return;
    const bw = enemy.barWidth;
    const bh = 3.5;
    const x = enemy.x - bw / 2;
    const y = enemy.y - enemy.hitRadius - 9;
    const pct = Math.max(0, Math.min(1, enemy.health / enemy.maxHealth));

    ctx.fillStyle = 'rgba(15, 12, 10, 0.85)';
    ctx.fillRect(x - 0.5, y - 0.5, bw + 1, bh + 1);
    ctx.fillStyle = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444';
    ctx.fillRect(x, y, bw * pct, bh);
  }

  _drawBlast(ctx, blast) {
    ctx.save();
    ctx.translate(blast.x, blast.y);
    ctx.rotate(blast.vectSpeed.getRadiansFromUp());

    switch (blast.numType) {
      case BLAST_TYPE.ROCKET:
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(-1.5, 2, 3, 5);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-1.5, -4, 3, 6);
        break;
      case BLAST_TYPE.BALL:
        ctx.fillStyle = '#292524';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(0, 3, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case BLAST_TYPE.SLOWSHOT:
        ctx.fillStyle = '#2dd4bf';
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case BLAST_TYPE.NULIFYBALL:
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case BLAST_TYPE.MISSILE:
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(-4, 7);
        ctx.lineTo(0, 17);
        ctx.lineTo(4, 7);
        ctx.fill();
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(-3.5, -8, 7, 15);
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(3.5, -8);
        ctx.lineTo(-3.5, -8);
        ctx.closePath();
        ctx.fill();
        break;
      case BLAST_TYPE.CHAINBLAST:
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case BLAST_TYPE.CONFUSEBALL:
        ctx.fillStyle = '#7e22ce';
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      default:
        ctx.fillStyle = '#fde047';
        ctx.fillRect(-1, -3, 2, 6);
        break;
    }

    ctx.restore();
  }

  _drawGfx(ctx, fx) {
    const p = fx.frame / fx.maxFrames;
    ctx.save();

    switch (fx.symbol) {
      case 'explosion_small':
      case 'explosion_medium':
      case 'explosion_big': {
        const maxR = fx.symbol === 'explosion_big' ? 24 : fx.symbol === 'explosion_medium' ? 16 : 11;
        const r = maxR * (0.35 + p * 0.75);
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, r * 0.52, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'missileblast': {
        const r = 100 * (0.2 + p * 0.8);
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = 'rgba(249, 115, 22, 0.55)';
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'splash': {
        const r = 25 * (0.3 + p * 0.7);
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = 'rgba(251, 146, 60, 0.6)';
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'slowsplash': {
        const r = 15 * (0.4 + p * 0.6);
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = 'rgba(45, 212, 191, 0.55)';
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'electricfield': {
        const r = (fx.radius || 60) * (0.35 + p * 0.65);
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = '#7dd3fc';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
        ctx.fill();
        break;
      }
      case 'aablast': {
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, 4 + p * 7, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'laserbeam': {
        ctx.globalAlpha = 1 - p * 0.7;
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(fx.x, fx.y);
        ctx.lineTo(fx.endX, fx.endY);
        ctx.stroke();
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(fx.x, fx.y);
        ctx.lineTo(fx.endX, fx.endY);
        ctx.stroke();
        break;
      }
      case 'gaussrail': {
        ctx.globalAlpha = 1 - p * 0.6;
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(fx.x, fx.y);
        ctx.lineTo(fx.endX, fx.endY);
        ctx.stroke();
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(fx.x, fx.y);
        ctx.lineTo(fx.endX, fx.endY);
        ctx.stroke();
        break;
      }
      case 'chainarc': {
        ctx.globalAlpha = 1 - p * 0.5;
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fx.x, fx.y);
        const mx = (fx.x + fx.endX) / 2 + (Math.random() - 0.5) * 10;
        const my = (fx.y + fx.endY) / 2 + (Math.random() - 0.5) * 10;
        ctx.lineTo(mx, my);
        ctx.lineTo(fx.endX, fx.endY);
        ctx.stroke();
        break;
      }
      case 'timestop_wave': {
        const r = 100 * (0.2 + p * 0.8);
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
        ctx.fill();
        break;
      }
      default:
        break;
    }

    ctx.restore();
  }

  _drawRangeRing(ctx, cx, cy, range, strokeColor) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, range, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor.replace(/[\d.]+\)$/, '0.10)');
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.restore();
  }

  _drawCursor(ctx, game, animTick) {
    const c = game.cursor;
    if (c.mode === 'clear' || c.cell.out) return;

    const map = game.map;
    if (c.mode === 'building') {
      const free = map.checkPlacingSpace(c.cell.i, c.cell.j);
      const cx = c.cell.x + MATRIX_CELL_WIDTH / 2;
      const cy = c.cell.y + MATRIX_CELL_HEIGHT / 2;

      if (c.buildingMeta.isTower) {
        const range = c.buildingMeta.range * (1 + (game.radarBonus || 0));
        this._drawRangeRing(ctx, cx, cy, range, free ? 'rgba(34, 197, 94, 0.85)' : 'rgba(239, 68, 68, 0.85)');
      }

      ctx.save();
      ctx.globalAlpha = 0.78;
      this.drawBuilding(ctx, c.buildingType, cx, cy, 0, 0, animTick);
      ctx.fillStyle = free ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.35)';
      ctx.strokeStyle = free ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.fillRect(c.cell.x + 1, c.cell.y + 1, MATRIX_CELL_WIDTH - 2, MATRIX_CELL_HEIGHT - 2);
      ctx.strokeRect(c.cell.x + 1, c.cell.y + 1, MATRIX_CELL_WIDTH - 2, MATRIX_CELL_HEIGHT - 2);
      ctx.restore();
    } else if (c.mode === 'ability') {
      if (c.abilityType === ABILITY_TYPE.WALL) {
        const free = map.checkWallSpace(c.cell.i, c.cell.j);
        ctx.save();
        ctx.globalAlpha = 0.8;
        this._drawWallTile(ctx, c.cell.x, c.cell.y);
        ctx.fillStyle = free ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.35)';
        ctx.strokeStyle = free ? '#22c55e' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.fillRect(c.cell.x + 1, c.cell.y + 1, MATRIX_CELL_WIDTH - 2, MATRIX_CELL_HEIGHT - 2);
        ctx.strokeRect(c.cell.x + 1, c.cell.y + 1, MATRIX_CELL_WIDTH - 2, MATRIX_CELL_HEIGHT - 2);
        ctx.restore();
      } else if (c.abilityType === ABILITY_TYPE.SELL) {
        const free = map.checkBuildingSpace(c.cell.i, c.cell.j);
        ctx.save();
        ctx.strokeStyle = free ? '#f59e0b' : '#ef4444';
        ctx.fillStyle = free ? 'rgba(245, 158, 11, 0.24)' : 'rgba(239, 68, 68, 0.22)';
        ctx.lineWidth = 2;
        ctx.fillRect(c.cell.x + 1, c.cell.y + 1, MATRIX_CELL_WIDTH - 2, MATRIX_CELL_HEIGHT - 2);
        ctx.strokeRect(c.cell.x + 1, c.cell.y + 1, MATRIX_CELL_WIDTH - 2, MATRIX_CELL_HEIGHT - 2);
        if (free) {
          const b = map.getBuildingAt(c.cell.i, c.cell.j);
          if (b) {
            ctx.fillStyle = '#fef08a';
            ctx.font = 'bold 11px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`+$${Math.round(0.5 * b.price)}`, c.cell.x + 16, c.cell.y - 4);
          }
        }
        ctx.restore();
      } else if (c.abilityType === ABILITY_TYPE.MISSILE || c.abilityType === ABILITY_TYPE.TIMEBOMB) {
        const color = c.abilityType === ABILITY_TYPE.MISSILE ? 'rgba(239, 68, 68, 0.85)' : 'rgba(56, 189, 248, 0.85)';
        this._drawRangeRing(ctx, c.mouseX, c.mouseY, 100, color);
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(c.mouseX - 8, c.mouseY);
        ctx.lineTo(c.mouseX + 8, c.mouseY);
        ctx.moveTo(c.mouseX, c.mouseY - 8);
        ctx.lineTo(c.mouseX, c.mouseY + 8);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}
