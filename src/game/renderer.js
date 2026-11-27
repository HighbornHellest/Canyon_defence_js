// Pure HTML5 Canvas 2D renderer using extracted original Flash sprites & layered canyon maps

import {
  ABILITY_TYPE,
  ALTITUDE_AIR,
  BLAST_TYPE,
  BUILDING_META,
  BUILDING_TYPE,
  MAPS,
  MATRIX_CELL_HEIGHT,
  MATRIX_CELL_WIDTH,
  MATRIX_HEIGHT,
  MATRIX_WIDTH,
  PLAYFIELD_SIZE,
} from './constants.js';

const TURRET_WITH_BASE = new Set([
  BUILDING_TYPE.TOWER_1_1,
  BUILDING_TYPE.TOWER_1_2,
  BUILDING_TYPE.TOWER_2_1,
  BUILDING_TYPE.TOWER_2_2,
  BUILDING_TYPE.TOWER_2_3,
  BUILDING_TYPE.TOWER_2_4,
  BUILDING_TYPE.TOWER_2_5,
]);

export class GameRenderer {
  constructor(onAssetsUpdate = null) {
    this.images = new Map();
    this.onAssetsUpdate = onAssetsUpdate;
    this._pendingRedraw = false;
    this._preloadAllAssets();
  }

  _loadImage(key, src) {
    if (this.images.has(key)) return this.images.get(key);
    const img = new Image();
    const entry = { img, loaded: false, error: false };
    img.onload = () => {
      entry.loaded = true;
      if (this.onAssetsUpdate && !this._pendingRedraw) {
        this._pendingRedraw = true;
        requestAnimationFrame(() => {
          this._pendingRedraw = false;
          this.onAssetsUpdate();
        });
      }
    };
    img.onerror = () => {
      entry.error = true;
    };
    img.src = src;
    this.images.set(key, entry);
    return entry;
  }

  _getImg(key) {
    const entry = this.images.get(key);
    return entry && entry.loaded ? entry.img : null;
  }

  _preloadAllAssets() {
    for (const id of [1, 2, 3]) {
      this._loadImage(`map_sand_${id}`, `/assets/canyon/maps/map${id}_sand.png`);
      this._loadImage(`map_land_${id}`, `/assets/canyon/maps/map${id}_landscape.png`);
    }

    this._loadImage('wall', '/assets/canyon/buildings/wall.png');
    this._loadImage('wall_shadow', '/assets/canyon/buildings/wall_shadow.png');

    for (let id = 1; id <= 15; id++) {
      this._loadImage(`c_${id}`, `/assets/canyon/buildings/c${id}.png`);
    }
    for (const id of TURRET_WITH_BASE) {
      this._loadImage(`t_base_${id}`, `/assets/canyon/guns/t${id}_a.png`);
      this._loadImage(`t_gun_${id}`, `/assets/canyon/guns/t${id}_gun.png`);
    }

    for (let id = 1; id <= 7; id++) {
      this._loadImage(`e_${id}`, `/assets/canyon/enemies/e${id}.png`);
    }

    for (let tab = 1; tab <= 2; tab++) {
      for (let slot = 1; slot <= 5; slot++) {
        this._loadImage(`btn_t_${tab}_${slot}`, `/assets/canyon/ui/btn_tower_${tab}_${slot}.png`);
      }
    }
    for (let slot = 1; slot <= 5; slot++) {
      this._loadImage(`btn_s_${slot}`, `/assets/canyon/ui/btn_structure_${slot}.png`);
    }
    for (let ab = 1; ab <= 4; ab++) {
      this._loadImage(`btn_ab_${ab}`, `/assets/canyon/ui/btn_ability_${ab}.png`);
    }

    this._loadImage('blast_1', '/assets/canyon/blasts/blast1.png');
    for (let f = 1; f <= 12; f++) {
      this._loadImage(`blast_2_${f}`, `/assets/canyon/blasts/blast2_${f}.png`);
    }
    this._loadImage('blast_3', '/assets/canyon/blasts/blast3.png');
    for (let f = 1; f <= 3; f++) {
      this._loadImage(`blast_5_${f}`, `/assets/canyon/blasts/blast5_${f}.png`);
      this._loadImage(`blast_8_${f}`, `/assets/canyon/blasts/blast8_${f}.png`);
    }
    this._loadImage('blast_9', '/assets/canyon/blasts/blast9.png');
    this._loadImage('blast_11', '/assets/canyon/blasts/blast11.png');

    const gfxFrames = {
      aablast: 4,
      electricfield: 4,
      explosion_big: 15,
      explosion_medium: 9,
      explosion_small: 9,
      missileblast: 6,
      slowsplash: 4,
      splash: 4,
    };
    for (const [name, count] of Object.entries(gfxFrames)) {
      for (let f = 1; f <= count; f++) {
        this._loadImage(`gfx_${name}_${f}`, `/assets/canyon/gfx/${name}/${f}.png`);
      }
    }

    const effectFrames = {
      fast: 3,
      repair: 3,
      shield: 10,
      slow: 11,
    };
    for (const [name, count] of Object.entries(effectFrames)) {
      for (let f = 1; f <= count; f++) {
        this._loadImage(`ef_${name}_${f}`, `/assets/canyon/effects/${name}/${f}.png`);
      }
    }
  }

  renderMapPreview(canvas, mapId) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const sand = this._getImg(`map_sand_${mapId}`);
    const land = this._getImg(`map_land_${mapId}`);
    if (sand && land) {
      ctx.drawImage(sand, 0, 0, w, h);
      ctx.drawImage(land, 0, 0, w, h);
      this._drawEntryExitMarkers(ctx, (MAPS[mapId] || MAPS[1]).grid, w / PLAYFIELD_SIZE);
      return;
    }

    // Immediate crisp fallback while PNGs decode
    const def = MAPS[mapId] || MAPS[1];
    const cw = w / MATRIX_WIDTH;
    const ch = h / MATRIX_HEIGHT;
    ctx.fillStyle = '#d8b474';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#7e4829';
    for (let i = 0; i < MATRIX_HEIGHT; i++) {
      for (let j = 0; j < MATRIX_WIDTH; j++) {
        if (def.grid[i][j] === 1) {
          ctx.fillRect(j * cw, i * ch, cw + 0.5, ch + 0.5);
        }
      }
    }
  }

  _drawEntryExitMarkers(ctx, grid, scale = 1) {
    const cw = MATRIX_CELL_WIDTH * scale;
    const ch = MATRIX_CELL_HEIGHT * scale;
    const size = PLAYFIELD_SIZE * scale;
    ctx.save();
    for (let j = 0; j < MATRIX_WIDTH; j++) {
      if (grid[0][j] === 0) {
        this._drawChevron(ctx, j * cw + cw / 2, 8 * scale, Math.PI / 2, '#16a34a', scale);
      }
      if (grid[MATRIX_HEIGHT - 1][j] === 0) {
        this._drawChevron(ctx, j * cw + cw / 2, size - 8 * scale, Math.PI / 2, '#dc2626', scale);
      }
    }
    for (let i = 0; i < MATRIX_HEIGHT; i++) {
      if (grid[i][0] === 0) {
        this._drawChevron(ctx, 8 * scale, i * ch + ch / 2, 0, '#16a34a', scale);
      }
      if (grid[i][MATRIX_WIDTH - 1] === 0) {
        this._drawChevron(ctx, size - 8 * scale, i * ch + ch / 2, 0, '#dc2626', scale);
      }
    }
    ctx.restore();
  }

  _drawChevron(ctx, x, y, angle, color, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.78;
    ctx.lineWidth = Math.max(1.5, 2.2 * scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-4 * scale, -5 * scale);
    ctx.lineTo(2 * scale, 0);
    ctx.lineTo(-4 * scale, 5 * scale);
    ctx.stroke();
    ctx.restore();
  }

  renderMission(ctx, game, animTick) {
    const map = game.map;
    const mapId = map.mapDef.id;
    ctx.clearRect(0, 0, PLAYFIELD_SIZE, PLAYFIELD_SIZE);

    // Layer 1: Desert sand floor
    const sand = this._getImg(`map_sand_${mapId}`);
    if (sand) {
      ctx.drawImage(sand, 0, 0, PLAYFIELD_SIZE, PLAYFIELD_SIZE);
    } else {
      ctx.fillStyle = '#d5af72';
      ctx.fillRect(0, 0, PLAYFIELD_SIZE, PLAYFIELD_SIZE);
    }

    // Subtle entry & exit indicators on sand border
    this._drawEntryExitMarkers(ctx, map.mapDef.grid, 1);

    // Layer 2a: Wall shadows onto sand
    const wallShadow = this._getImg('wall_shadow');
    for (const w of map.walls) {
      const wx = w.j * MATRIX_CELL_WIDTH;
      const wy = w.i * MATRIX_CELL_HEIGHT;
      if (wallShadow) {
        ctx.drawImage(wallShadow, wx - 1, wy - 1);
      } else {
        ctx.fillStyle = 'rgba(20, 12, 6, 0.36)';
        ctx.fillRect(wx + 4, wy + 5, MATRIX_CELL_WIDTH - 2, MATRIX_CELL_HEIGHT - 2);
      }
    }

    // Layer 2b: Walls (rendered below landscape cliff edges & buildings)
    for (const w of map.walls) {
      this._drawWallTile(ctx, w.j * MATRIX_CELL_WIDTH, w.i * MATRIX_CELL_HEIGHT);
    }

    // Layer 2c: Ground effects & Ground enemies (so cliff overhangs overlap units naturally)
    for (const fx of map.gfx) {
      if (fx.altitude !== ALTITUDE_AIR) {
        this._drawGfx(ctx, fx);
      }
    }
    for (const enemy of map.groundEnemies) {
      this._drawEnemy(ctx, enemy, animTick);
    }

    // Layer 3: Canyon rock plateaus & cliff shadows
    const landscape = this._getImg(`map_land_${mapId}`);
    if (landscape) {
      ctx.drawImage(landscape, 0, 0, PLAYFIELD_SIZE, PLAYFIELD_SIZE);
    }

    // Layer 4: Grid overlay when placing/selling
    if (map.showGrid) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
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

    // Layer 5: Buildings & Towers
    for (const bld of map.buildings) {
      this.drawBuilding(ctx, bld.numType, bld.x, bld.y, bld.direction.getRadiansFromUp(), bld.recoilFrames, animTick);
    }

    // Layer 6: Projectiles & Blasts
    for (const blast of map.blasts) {
      this._drawBlast(ctx, blast, animTick);
    }

    // Layer 7: Air enemies (above buildings & blasts)
    for (const enemy of map.airEnemies) {
      this._drawEnemy(ctx, enemy, animTick);
    }

    // Layer 8: Air / explosion GFX
    for (const fx of map.gfx) {
      if (fx.altitude === ALTITUDE_AIR) {
        this._drawGfx(ctx, fx);
      }
    }

    // Layer 9: Health bars
    for (const enemy of map.groundEnemies) {
      this._drawHealthBar(ctx, enemy);
    }
    for (const enemy of map.airEnemies) {
      this._drawHealthBar(ctx, enemy);
    }

    // Hovered tower range ring
    if (game.hoveredBuilding && game.hoveredBuilding.isTower && game.cursor.mode === 'clear' && !game.paused) {
      this._drawRangeRing(
        ctx,
        game.hoveredBuilding.x,
        game.hoveredBuilding.y,
        game.hoveredBuilding.numRange,
        'rgba(245, 158, 11, 0.9)'
      );
    }

    // Layer 10: Placement / ability cursor
    this._drawCursor(ctx, game, animTick);
  }

  _drawWallTile(ctx, wx, wy) {
    const wallImg = this._getImg('wall');
    if (wallImg) {
      ctx.drawImage(wallImg, wx, wy, MATRIX_CELL_WIDTH, MATRIX_CELL_HEIGHT);
      return;
    }
    ctx.save();
    ctx.fillStyle = '#5c554c';
    ctx.fillRect(wx + 2, wy + 2, MATRIX_CELL_WIDTH - 4, MATRIX_CELL_HEIGHT - 4);
    ctx.restore();
  }

  drawBuildingIcon(canvas, type) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const meta = BUILDING_META[type];
    let img = null;
    if (meta) {
      if (meta.tab === 1) img = this._getImg(`btn_t_1_${meta.slot}`);
      else if (meta.tab === 2) img = this._getImg(`btn_t_2_${meta.slot}`);
      else if (meta.tab === 3) img = this._getImg(`btn_s_${meta.slot}`);
    }

    if (img) {
      // Original Flash button art packs the 50x50 thumbnail on the left side at (1, 1)
      ctx.drawImage(img, 1, 1, 50, 50, 0, 0, w, h);
      return;
    }

    // Fallback while PNGs finish loading
    const cImg = this._getImg(`c_${type}`);
    if (cImg) {
      ctx.drawImage(cImg, 2, 2, w - 4, h - 4);
    }
  }

  drawAbilityIcon(canvas, type) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const img = this._getImg(`btn_ab_${type}`);
    if (img) {
      // Ability icon square sits at center (29, 29, 41, 40) inside 99x99 sprite
      ctx.drawImage(img, 29, 29, 41, 40, 0, 0, w, h);
      return;
    }

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fallback = { [ABILITY_TYPE.SELL]: '$', [ABILITY_TYPE.MISSILE]: 'M', [ABILITY_TYPE.WALL]: 'W', [ABILITY_TYPE.TIMEBOMB]: 'T' };
    ctx.fillText(fallback[type] || '?', w / 2, h / 2);
  }

  drawBuilding(ctx, type, cx, cy, gunRad, recoilFrames = 0, animTick = 0) {
    ctx.save();
    ctx.translate(cx, cy);
    const recoil = recoilFrames > 0 ? 1.8 : 0;

    if (TURRET_WITH_BASE.has(type)) {
      const baseImg = this._getImg(`t_base_${type}`);
      const gunImg = this._getImg(`t_gun_${type}`);
      if (baseImg) {
        ctx.drawImage(baseImg, -baseImg.width / 2, -baseImg.height / 2);
      }
      if (gunImg) {
        ctx.rotate(gunRad);
        ctx.drawImage(gunImg, -gunImg.width / 2, -gunImg.height / 2 + recoil);
        ctx.restore();
        return;
      }
    }

    // Rotating whole-body towers (Gatling Laser, Nullificator)
    if (type === BUILDING_TYPE.TOWER_1_4 || type === BUILDING_TYPE.TOWER_1_5) {
      const img = this._getImg(`c_${type}`);
      if (img) {
        ctx.rotate(gunRad);
        ctx.drawImage(img, -img.width / 2, -img.height / 2 + (type === BUILDING_TYPE.TOWER_1_4 ? recoil : 0));
        ctx.restore();
        return;
      }
    }

    // Static Tesla Tower & 2x2 Structures (11..15)
    const img = this._getImg(`c_${type}`);
    if (img) {
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      if (type === BUILDING_TYPE.TOWER_1_3) {
        const pulse = 0.25 + 0.15 * Math.sin(animTick * 0.28);
        ctx.fillStyle = `rgba(186, 230, 253, ${pulse})`;
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    // Simple fallback rect before sprites load
    const meta = BUILDING_META[type];
    const sz = meta && meta.pattern && meta.pattern.width === 2 ? 52 : 26;
    ctx.fillStyle = '#475569';
    ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
    ctx.restore();
  }

  _drawEnemy(ctx, enemy, animTick) {
    const isAir = enemy.numAltitude === ALTITUDE_AIR;
    const angle = enemy.vectSpeed.getRadiansFromUp();
    const sprite = this._getImg(`e_${enemy.numType}`);

    // Air units cast a ground shadow
    if (isAir) {
      ctx.save();
      ctx.translate(enemy.x + 8, enemy.y + 10);
      ctx.rotate(angle);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.beginPath();
      ctx.ellipse(0, 0, enemy.hitRadius * 0.72, enemy.hitRadius * 1.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(angle);
    if (sprite) {
      ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
    } else {
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(-6, -8, 12, 16);
    }
    ctx.restore();

    // Status effect sprite overlays
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    if (enemy.hasFast) {
      const f = (Math.floor(animTick / 2) % 3) + 1;
      const ef = this._getImg(`ef_fast_${f}`);
      if (ef) {
        ctx.drawImage(ef, -14, -14, 28, 28);
      }
    }
    if (enemy.hasSlow) {
      if (enemy.hasTimeStop) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.36)';
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.hitRadius + 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        const f = (Math.floor(animTick / 2) % 11) + 1;
        const ef = this._getImg(`ef_slow_${f}`);
        if (ef) {
          ctx.drawImage(ef, -13, -13, 26, 26);
        }
      }
    }
    if (enemy.hasRepair) {
      const f = (Math.floor(animTick / 3) % 3) + 1;
      const ef = this._getImg(`ef_repair_${f}`);
      if (ef) {
        ctx.drawImage(ef, -17, -17, 34, 34);
      }
    }
    if (enemy.hasShield) {
      const f = (Math.floor(animTick / 2) % 10) + 1;
      const ef = this._getImg(`ef_shield_${f}`);
      if (ef) {
        ctx.drawImage(ef, -15, -15, 30, 30);
      }
    }
    if (enemy.hasConfuse) {
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, -enemy.hitRadius - 3, 4.5, animTick * 0.45, animTick * 0.45 + Math.PI * 1.4);
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

  _drawBlast(ctx, blast, animTick) {
    ctx.save();
    ctx.translate(blast.x, blast.y);
    ctx.rotate(blast.vectSpeed.getRadiansFromUp());

    let img = null;
    let scale = 1;

    switch (blast.numType) {
      case BLAST_TYPE.ROCKET:
        img = this._getImg('blast_1');
        scale = 0.55;
        break;
      case BLAST_TYPE.BALL: {
        const f = (animTick % 12) + 1;
        img = this._getImg(`blast_2_${f}`);
        scale = 0.85;
        break;
      }
      case BLAST_TYPE.SLOWSHOT:
        img = this._getImg('blast_3');
        scale = 0.65;
        break;
      case BLAST_TYPE.NULIFYBALL: {
        const f = (Math.floor(animTick / 2) % 3) + 1;
        img = this._getImg(`blast_5_${f}`);
        scale = 0.62;
        break;
      }
      case BLAST_TYPE.MISSILE: {
        const f = (Math.floor(animTick / 2) % 3) + 1;
        img = this._getImg(`blast_8_${f}`);
        scale = 0.9;
        break;
      }
      case BLAST_TYPE.CHAINBLAST:
        img = this._getImg('blast_9');
        scale = 0.52;
        break;
      case BLAST_TYPE.CONFUSEBALL:
        img = this._getImg('blast_11');
        scale = 1;
        break;
      default:
        break;
    }

    if (img) {
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
    } else if (
      blast.numType !== BLAST_TYPE.LASERBEAM &&
      blast.numType !== BLAST_TYPE.GAUSSRAIL &&
      blast.numType !== BLAST_TYPE.AASHELL &&
      blast.numType !== BLAST_TYPE.ELECTRICFIELD
    ) {
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _drawGfx(ctx, fx) {
    const p = fx.frame / fx.maxFrames;
    ctx.save();

    switch (fx.symbol) {
      case 'explosion_big': {
        const f = Math.min(15, fx.frame + 1);
        const img = this._getImg(`gfx_explosion_big_${f}`);
        if (img) {
          ctx.drawImage(img, fx.x - img.width / 2, fx.y - img.height / 2);
        }
        break;
      }
      case 'explosion_medium': {
        const f = Math.min(9, fx.frame + 1);
        const img = this._getImg(`gfx_explosion_medium_${f}`);
        if (img) {
          ctx.drawImage(img, fx.x - img.width / 2, fx.y - img.height / 2);
        }
        break;
      }
      case 'explosion_small': {
        const f = Math.min(9, fx.frame + 1);
        const img = this._getImg(`gfx_explosion_small_${f}`);
        if (img) {
          ctx.drawImage(img, fx.x - img.width / 2, fx.y - img.height / 2);
        }
        break;
      }
      case 'missileblast': {
        const f = Math.min(6, Math.floor(fx.frame / 2) + 1);
        const img = this._getImg(`gfx_missileblast_${f}`);
        if (img) {
          ctx.drawImage(img, fx.x - img.width / 2, fx.y - img.height / 2);
        }
        break;
      }
      case 'electricfield': {
        const f = Math.min(4, Math.floor((fx.frame / fx.maxFrames) * 4) + 1);
        const img = this._getImg(`gfx_electricfield_${f}`);
        const d = (fx.radius || 60) * 2;
        if (img) {
          ctx.drawImage(img, fx.x - d / 2, fx.y - d / 2, d, d);
        }
        break;
      }
      case 'aablast': {
        const f = Math.min(4, Math.floor((fx.frame / fx.maxFrames) * 4) + 1);
        const img = this._getImg(`gfx_aablast_${f}`);
        if (img) {
          ctx.drawImage(img, fx.x - img.width / 2, fx.y - img.height / 2);
        }
        break;
      }
      case 'slowsplash': {
        const f = Math.min(4, Math.floor((fx.frame / fx.maxFrames) * 4) + 1);
        const img = this._getImg(`gfx_slowsplash_${f}`);
        if (img) {
          ctx.drawImage(img, fx.x - img.width / 2, fx.y - img.height / 2);
        }
        break;
      }
      case 'splash': {
        const f = Math.min(4, Math.floor((fx.frame / fx.maxFrames) * 4) + 1);
        const img = this._getImg(`gfx_splash_${f}`);
        if (img) {
          ctx.drawImage(img, fx.x - img.width / 2, fx.y - img.height / 2);
        }
        break;
      }
      case 'laserbeam': {
        ctx.globalAlpha = 1 - p * 0.7;
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.48)';
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
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(fx.x, fx.y);
        ctx.lineTo(fx.endX, fx.endY);
        ctx.stroke();
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 1.5;
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
        ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
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
    ctx.fillStyle = strokeColor.replace(/[\d.]+\)$/, '0.12)');
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
      const pattern = c.buildingMeta?.pattern || { width: 1, height: 1, cells: [1] };
      const free = map.checkPlacingSpace(c.cell.i, c.cell.j, pattern);
      const pw = pattern.width * MATRIX_CELL_WIDTH;
      const ph = pattern.height * MATRIX_CELL_HEIGHT;
      const cx = c.cell.x + pw / 2;
      const cy = c.cell.y + ph / 2;

      if (c.buildingMeta.isTower) {
        const range = c.buildingMeta.range * (1 + (game.radarBonus || 0));
        this._drawRangeRing(ctx, cx, cy, range, free ? 'rgba(34, 197, 94, 0.88)' : 'rgba(239, 68, 68, 0.88)');
      }

      ctx.save();
      ctx.globalAlpha = 0.82;
      this.drawBuilding(ctx, c.buildingType, cx, cy, 0, 0, animTick);
      ctx.fillStyle = free ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.35)';
      ctx.strokeStyle = free ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.fillRect(c.cell.x + 1, c.cell.y + 1, pw - 2, ph - 2);
      ctx.strokeRect(c.cell.x + 1, c.cell.y + 1, pw - 2, ph - 2);
      ctx.restore();
    } else if (c.mode === 'ability') {
      if (c.abilityType === ABILITY_TYPE.WALL) {
        const free = map.checkWallSpace(c.cell.i, c.cell.j);
        ctx.save();
        ctx.globalAlpha = 0.85;
        this._drawWallTile(ctx, c.cell.x, c.cell.y);
        ctx.fillStyle = free ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.35)';
        ctx.strokeStyle = free ? '#22c55e' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.fillRect(c.cell.x + 1, c.cell.y + 1, MATRIX_CELL_WIDTH - 2, MATRIX_CELL_HEIGHT - 2);
        ctx.strokeRect(c.cell.x + 1, c.cell.y + 1, MATRIX_CELL_WIDTH - 2, MATRIX_CELL_HEIGHT - 2);
        ctx.restore();
      } else if (c.abilityType === ABILITY_TYPE.SELL) {
        const free = map.checkBuildingSpace(c.cell.i, c.cell.j);
        const b = free ? map.getBuildingAt(c.cell.i, c.cell.j) : null;
        const bx = b ? b.cellJ * MATRIX_CELL_WIDTH : c.cell.x;
        const by = b ? b.cellI * MATRIX_CELL_HEIGHT : c.cell.y;
        const bw = b ? b.pattern.width * MATRIX_CELL_WIDTH : MATRIX_CELL_WIDTH;
        const bh = b ? b.pattern.height * MATRIX_CELL_HEIGHT : MATRIX_CELL_HEIGHT;

        ctx.save();
        ctx.strokeStyle = free ? '#f59e0b' : '#ef4444';
        ctx.fillStyle = free ? 'rgba(245, 158, 11, 0.28)' : 'rgba(239, 68, 68, 0.22)';
        ctx.lineWidth = 2;
        ctx.fillRect(bx + 1, by + 1, bw - 2, bh - 2);
        ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
        if (b) {
          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 11px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`+$${Math.round(0.5 * b.price)}`, bx + bw / 2, Math.max(12, by - 4));
        }
        ctx.restore();
      } else if (c.abilityType === ABILITY_TYPE.MISSILE || c.abilityType === ABILITY_TYPE.TIMEBOMB) {
        const color =
          c.abilityType === ABILITY_TYPE.MISSILE ? 'rgba(239, 68, 68, 0.85)' : 'rgba(56, 189, 248, 0.85)';
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
