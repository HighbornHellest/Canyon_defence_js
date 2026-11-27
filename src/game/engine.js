// Core Canyon Defense game engine (pure vanilla JS port of CGame.as)

import {
  ABILITY_TYPE,
  ALTITUDE_AIR,
  ALTITUDE_BOTH,
  BLAST_TYPE,
  BUILDING_META,
  BUILDING_TYPE,
  DIFFICULTIES,
  EFFECT_TYPE,
  ENEMY_TYPE,
  INITIAL_FUNDS,
  INITIAL_POPULATION,
  MAPS,
  MONEY_SCORE_MULT,
  POP_SCORE_MULT,
  PROGRAMS,
  QUEST_TYPE,
  SCORE_BONUS,
  SOUND,
  STATE,
  TICK_MS,
  WAVE_ALT_GROUND,
  WAVE_EFFECT_FAST,
  WAVE_EFFECT_REPAIR,
  WAVE_EFFECT_SHIELD,
  WAVE_SIZE_BIG,
  WAVE_SIZE_MEDIUM,
  WAVE_SIZE_SMALL,
  WAVE_SIZE_TINY,
  WAVE_TIME,
} from './constants.js';
import { Ability } from './ability.js';
import { Effect } from './effect.js';
import { Blast, Building, GfxEffect } from './entities.js';
import { GameMap } from './map.js';
import { Quest } from './quest.js';
import { soundService } from './sound.js';
import { Vector2 } from './vector.js';

const SCORE_STORAGE_KEY = 'canyon_defense_scores_v1';

export class CanyonGame {
  constructor(callbacks) {
    this.callbacks = callbacks; // { onStateChange, onHudUpdate, onMessage, onGameOver }
    this.state = STATE.MAINSCREEN;
    this.selectedMapId = 1;
    this.selectedProgram = 0;

    this.map = new GameMap();
    this.paused = false;
    this.pausedBeforeQuit = false;
    this.speedMultiplier = 1;
    this.animTick = 0;

    this.numFunds = INITIAL_FUNDS;
    this.numMoneyEarned = 0;
    this.numPopulation = INITIAL_POPULATION;
    this.numScore = 0;
    this.programPtr = 0;
    this.enemiesPeriod = WAVE_TIME[0];
    this.enemiesTimer = 0;
    this.radarBonus = 0;

    this.abilities = [];
    this.quests = { 1: [], 2: [], 3: [] };
    this.questCurrent = { 1: -1, 2: -1, 3: -1 };

    this.cursor = {
      mode: 'clear', // 'clear' | 'building' | 'ability'
      buildingType: null,
      buildingMeta: null,
      abilityType: null,
      cell: { out: true, i: undefined, j: undefined, x: 0, y: 0, free: false },
      mouseX: 0,
      mouseY: 0,
    };
    this.hoveredBuilding = null;
    this.activeTab = 1;

    this.gameOverResult = null;
    this.messageTimer = 0;
    this.currentMessage = null;

    this._rafId = null;
    this._lastTime = 0;
    this._accumulator = 0;
  }

  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    if (newState !== STATE.MISSION) {
      this.stopLoop();
    }
    soundService.setMusicMissionMode(newState === STATE.MISSION);
    this.callbacks.onStateChange(newState);
  }

  startMission(mapId = this.selectedMapId, programId = this.selectedProgram) {
    this.selectedMapId = mapId;
    this.selectedProgram = programId;
    this.speedMultiplier = 1;
    this.paused = false;
    this.gameOverResult = null;
    this.currentMessage = null;
    this.messageTimer = 0;

    Building.RANGE_BONUS = 0;
    Blast.DAMAGE_BONUS = 0;
    this.radarBonus = 0;

    this.map.loadMap(mapId);
    this.programPtr = 0;
    this.enemiesPeriod = WAVE_TIME[programId];
    this.enemiesTimer = 0;

    this.abilities = [
      new Ability(ABILITY_TYPE.SELL, 1),
      new Ability(ABILITY_TYPE.MISSILE, 0),
      new Ability(ABILITY_TYPE.WALL, 0),
      new Ability(ABILITY_TYPE.TIMEBOMB, 0),
      new Ability(ABILITY_TYPE.MONEYBONUS, 0),
      new Ability(ABILITY_TYPE.TOWERBONUS, 0),
    ];

    this.quests = {
      1: [
        new Quest(QUEST_TYPE.TOWERS1_1),
        new Quest(QUEST_TYPE.TOWERS1_2),
        new Quest(QUEST_TYPE.TOWERS1_3),
        new Quest(QUEST_TYPE.TOWERS1_4),
        new Quest(QUEST_TYPE.TOWERS1_5),
      ],
      2: [
        new Quest(QUEST_TYPE.TOWERS2_1),
        new Quest(QUEST_TYPE.TOWERS2_2),
        new Quest(QUEST_TYPE.TOWERS2_3),
        new Quest(QUEST_TYPE.TOWERS2_4),
        new Quest(QUEST_TYPE.TOWERS2_5),
      ],
      3: [
        new Quest(QUEST_TYPE.STRUCTURES_1),
        new Quest(QUEST_TYPE.STRUCTURES_2),
        new Quest(QUEST_TYPE.STRUCTURES_3),
        new Quest(QUEST_TYPE.STRUCTURES_4),
        new Quest(QUEST_TYPE.STRUCTURES_5),
      ],
    };
    this.questCurrent = { 1: -1, 2: -1, 3: -1 };

    this.numFunds = INITIAL_FUNDS;
    this.numMoneyEarned = 0;
    this.numPopulation = INITIAL_POPULATION;
    this.numScore = 0;
    this.activeTab = 1;
    this.clearCursor();

    this.setState(STATE.MISSION);
    this._advanceQuests(false);
    this.callbacks.onHudUpdate();
    this.startLoop();
  }

  startLoop() {
    this.stopLoop();
    this._lastTime = performance.now();
    this._accumulator = 0;

    const frame = (now) => {
      const dt = Math.min(100, now - this._lastTime);
      this._lastTime = now;

      if (this.state === STATE.MISSION && !this.paused && !this.gameOverResult) {
        this._accumulator += dt * this.speedMultiplier;
        let steps = 0;
        while (this._accumulator >= TICK_MS && steps < 6) {
          this.tick();
          this._accumulator -= TICK_MS;
          steps += 1;
        }
      }

      if (this.state === STATE.MISSION) {
        this.callbacks.onRender(this.animTick);
      }

      this._rafId = requestAnimationFrame(frame);
    };

    this._rafId = requestAnimationFrame(frame);
  }

  stopLoop() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  setPaused(val) {
    if (this.state !== STATE.MISSION || this.gameOverResult) return;
    this.paused = Boolean(val);
    if (this.paused) {
      this.clearCursor();
    }
    this.callbacks.onHudUpdate();
  }

  togglePaused() {
    this.setPaused(!this.paused);
  }

  toggleSpeed() {
    this.speedMultiplier = this.speedMultiplier === 1 ? 2 : 1;
    soundService.play(SOUND.SWITCH);
    this.callbacks.onHudUpdate();
  }

  setTab(tabIdx) {
    if (this.paused || this.gameOverResult) return;
    if (this.activeTab !== tabIdx) {
      this.activeTab = tabIdx;
      this.clearCursor();
      soundService.play(SOUND.SWITCH);
      this.callbacks.onHudUpdate();
    }
  }

  selectBuilding(type) {
    if (this.paused || this.gameOverResult) return;
    if (!this.isBuildingUnlocked(type)) return;

    if (this.cursor.mode === 'building' && this.cursor.buildingType === type) {
      this.clearCursor();
      soundService.play(SOUND.SWITCH);
      this.callbacks.onHudUpdate();
      return;
    }

    this.cursor.mode = 'building';
    this.cursor.buildingType = type;
    this.cursor.buildingMeta = BUILDING_META[type];
    this.cursor.abilityType = null;
    this.cursor.cell.free =
      !this.cursor.cell.out &&
      this.map.checkPlacingSpace(this.cursor.cell.i, this.cursor.cell.j, this.cursor.buildingMeta.pattern);
    this.map.showGrid = !this.cursor.cell.out;
    soundService.play(SOUND.SWITCH);
    this.callbacks.onHudUpdate();
  }

  selectAbility(abilityType) {
    if (this.paused || this.gameOverResult) return;
    const ab = this.getAbility(abilityType);
    if (!ab || !ab.isReady) return;

    if (this.cursor.mode === 'ability' && this.cursor.abilityType === abilityType) {
      this.clearCursor();
      soundService.play(SOUND.SWITCH);
      this.callbacks.onHudUpdate();
      return;
    }

    this.cursor.mode = 'ability';
    this.cursor.abilityType = abilityType;
    this.cursor.buildingType = null;
    this.cursor.buildingMeta = null;
    this.map.showGrid =
      (abilityType === ABILITY_TYPE.WALL || abilityType === ABILITY_TYPE.SELL) && !this.cursor.cell.out;
    soundService.play(SOUND.SWITCH);
    this.callbacks.onHudUpdate();
  }

  clearCursor() {
    this.cursor.mode = 'clear';
    this.cursor.buildingType = null;
    this.cursor.buildingMeta = null;
    this.cursor.abilityType = null;
    this.map.showGrid = false;
  }

  getAbility(type) {
    return this.abilities.find((a) => a.numType === type) || null;
  }

  isBuildingUnlocked(type) {
    const meta = BUILDING_META[type];
    if (!meta) return false;
    const qList = this.quests[meta.tab];
    const q = qList[meta.slot - 1];
    return q ? q.boolComplete || meta.slot - 1 < this.questCurrent[meta.tab] : false;
  }

  getBuildingSlotState(tab, slot) {
    const cur = this.questCurrent[tab];
    const q = this.quests[tab][slot - 1];
    if (q.boolComplete || slot - 1 < cur) {
      return { state: 'unlocked', quest: q };
    }
    if (slot - 1 === cur) {
      return { state: 'quest', quest: q };
    }
    return { state: 'locked', quest: q };
  }

  updatePointer(px, py) {
    this.cursor.mouseX = px;
    this.cursor.mouseY = py;
    const cell = this.map.cellHitTest(px, py);
    this.cursor.cell = cell;

    if (this.cursor.mode === 'building') {
      const pattern = this.cursor.buildingMeta?.pattern;
      cell.free = !cell.out && this.map.checkPlacingSpace(cell.i, cell.j, pattern);
      this.map.showGrid = !cell.out;
    } else if (this.cursor.mode === 'ability') {
      if (this.cursor.abilityType === ABILITY_TYPE.WALL) {
        cell.free = !cell.out && this.map.checkWallSpace(cell.i, cell.j);
        this.map.showGrid = !cell.out;
      } else if (this.cursor.abilityType === ABILITY_TYPE.SELL) {
        cell.free = !cell.out && this.map.checkBuildingSpace(cell.i, cell.j);
        this.map.showGrid = !cell.out;
      } else {
        cell.free = !cell.out;
        this.map.showGrid = false;
      }
    } else {
      this.map.showGrid = false;
    }

    if (!cell.out && this.cursor.mode === 'clear') {
      this.hoveredBuilding = this.map.getBuildingAt(cell.i, cell.j);
    } else {
      this.hoveredBuilding = null;
    }
  }

  handleCanvasClick(px, py) {
    if (this.paused || this.gameOverResult) return;
    this.updatePointer(px, py);
    const cell = this.cursor.cell;
    if (cell.out) return;

    if (this.cursor.mode === 'building') {
      if (!cell.free) {
        this._showMessage('CANNOT BUILD HERE!', true);
        return;
      }
      const price = this.cursor.buildingMeta.price;
      if (this.numFunds < price) {
        this._showMessage('NOT ENOUGH\nMONEY!', true);
        return;
      }

      const bld = new Building(this.cursor.buildingType, cell.i, cell.j);
      this.map.addBuilding(bld);
      this._setFunds(this.numFunds - price);
      soundService.play(SOUND.CONSTRUCTION);
      this._onBuildingAdded(bld);
      this.updatePointer(px, py);
      this.callbacks.onHudUpdate();
      return;
    }

    if (this.cursor.mode === 'ability') {
      let consumed = true;
      const abType = this.cursor.abilityType;

      if (abType === ABILITY_TYPE.SELL) {
        if (!cell.free) {
          soundService.play(SOUND.ERROR);
          return;
        }
        const target = this.map.getBuildingAt(cell.i, cell.j);
        if (!target) return;
        this._setFunds(this.numFunds + Math.round(0.5 * target.price));
        this._onBuildingRemoved(target);
        this.map.deleteBuilding(target);
        soundService.play(SOUND.SELL);
      } else if (abType === ABILITY_TYPE.MISSILE) {
        const missile = new Blast({
          x: 224,
          y: 500,
          direction: new Vector2(0, -1),
          altitude: ALTITUDE_BOTH,
          type: BLAST_TYPE.MISSILE,
          targetsEnemy: false,
          targetX: px,
          targetY: py,
          speed: 6,
        });
        this.map.blasts.push(missile);
        soundService.play(SOUND.NUCLEARLAUNCH);
        this.quests[1][1].numPoints += 1;
      } else if (abType === ABILITY_TYPE.WALL) {
        if (!cell.free) {
          soundService.play(SOUND.ERROR);
          return;
        }
        if (this.map.isHitWithGroundEnemy(cell.i, cell.j)) {
          this._showMessage("YOU CAN'T INSTALL WALL\nOVER THE ENEMY!", true);
          consumed = false;
        } else if (!this.map.markCacheMatrix(cell.i, cell.j)) {
          this._showMessage("YOU CAN'T\nBLOCK PATH!", true);
          consumed = false;
        } else {
          this.map.addWall(cell.i, cell.j);
          this.map.showGrid = false;
          soundService.play(SOUND.CONSTRUCTION);
          this.quests[2][4].numPoints += 1;
        }
      } else if (abType === ABILITY_TYPE.TIMEBOMB) {
        this.map.applySplashEffect(new Effect(EFFECT_TYPE.TIMESTOP, undefined, 120), px, py, 100, ALTITUDE_BOTH);
        this.map.gfx.push(new GfxEffect({ symbol: 'timestop_wave', x: px, y: py, altitude: ALTITUDE_AIR }));
        soundService.play(SOUND.TIMESTOP);
      }

      if (consumed) {
        const ab = this.getAbility(abType);
        if (ab && ab.reset()) {
          this.clearCursor();
        }
      }

      this._advanceQuests(true);
      this.updatePointer(px, py);
      this.callbacks.onHudUpdate();
    }
  }

  _setFunds(val) {
    this.numFunds = Math.max(0, val);
    this.quests[2][2].numPoints = this.numFunds;
  }

  _onBuildingAdded(bld) {
    switch (bld.numType) {
      case BUILDING_TYPE.TOWER_1_1:
        this.quests[3][0].numPoints += 1;
        break;
      case BUILDING_TYPE.TOWER_1_3:
        this.quests[3][2].numPoints += 1;
        break;
      case BUILDING_TYPE.TOWER_2_2:
        this.quests[1][2].numPoints += 1;
        break;
      case BUILDING_TYPE.TOWER_2_1:
        this.quests[3][3].numPoints += 1;
        break;
      case BUILDING_TYPE.TOWER_2_3:
        this.quests[3][2].numPoints += 1;
        break;
      case BUILDING_TYPE.BUILDING_1:
        this.getAbility(ABILITY_TYPE.MISSILE).numSources += 1;
        break;
      case BUILDING_TYPE.BUILDING_2:
        this.getAbility(ABILITY_TYPE.WALL).numSources += 1;
        this.quests[3][4].numPoints += 1;
        break;
      case BUILDING_TYPE.BUILDING_3:
        this.getAbility(ABILITY_TYPE.MONEYBONUS).numSources += 1;
        break;
      case BUILDING_TYPE.BUILDING_4:
        this.getAbility(ABILITY_TYPE.TOWERBONUS).numSources += 1;
        Building.RANGE_BONUS += 0.1;
        Blast.DAMAGE_BONUS += 0.1;
        this.radarBonus = Building.RANGE_BONUS;
        this.quests[2][3].numPoints += 1;
        break;
      case BUILDING_TYPE.BUILDING_5:
        this.getAbility(ABILITY_TYPE.TIMEBOMB).numSources += 1;
        this.quests[1][4].numPoints += 1;
        break;
      default:
        break;
    }
    this.quests[3][1].numPoints += 1;
    this._advanceQuests(true);
  }

  _onBuildingRemoved(bld) {
    switch (bld.numType) {
      case BUILDING_TYPE.TOWER_1_1:
        this.quests[3][0].numPoints -= 1;
        break;
      case BUILDING_TYPE.TOWER_1_3:
        this.quests[3][2].numPoints -= 1;
        break;
      case BUILDING_TYPE.TOWER_2_1:
        this.quests[3][3].numPoints -= 1;
        break;
      case BUILDING_TYPE.TOWER_2_2:
        this.quests[1][2].numPoints -= 1;
        break;
      case BUILDING_TYPE.TOWER_2_3:
        this.quests[3][2].numPoints -= 1;
        break;
      case BUILDING_TYPE.BUILDING_1:
        this.getAbility(ABILITY_TYPE.MISSILE).numSources -= 1;
        break;
      case BUILDING_TYPE.BUILDING_2:
        this.getAbility(ABILITY_TYPE.WALL).numSources -= 1;
        this.quests[3][4].numPoints -= 1;
        break;
      case BUILDING_TYPE.BUILDING_3:
        this.getAbility(ABILITY_TYPE.MONEYBONUS).numSources -= 1;
        break;
      case BUILDING_TYPE.BUILDING_4:
        this.getAbility(ABILITY_TYPE.TOWERBONUS).numSources -= 1;
        Building.RANGE_BONUS = Math.max(0, Building.RANGE_BONUS - 0.1);
        Blast.DAMAGE_BONUS = Math.max(0, Blast.DAMAGE_BONUS - 0.1);
        this.radarBonus = Building.RANGE_BONUS;
        this.quests[2][3].numPoints -= 1;
        break;
      case BUILDING_TYPE.BUILDING_5:
        this.getAbility(ABILITY_TYPE.TIMEBOMB).numSources -= 1;
        this.quests[1][4].numPoints -= 1;
        break;
      default:
        break;
    }
    this.quests[3][1].numPoints -= 1;
  }

  hurryAttack() {
    if (this.state !== STATE.MISSION || this.paused || this.gameOverResult) return;
    if (!this.canSendWaveEarly()) return;

    const skippedTicks = Math.max(0, this.enemiesPeriod - this.enemiesTimer);
    this.enemiesTimer = this.enemiesPeriod + 1;
    for (const ab of this.abilities) {
      ab.numTimer -= skippedTicks;
    }
    soundService.play(SOUND.SWITCH);
    this.callbacks.onHudUpdate();
  }

  canSendWaveEarly() {
    return this.map.noEnemies && this.programPtr < PROGRAMS[this.selectedProgram].length;
  }

  tick() {
    this.animTick += 1;

    if (this.messageTimer > 0) {
      this.messageTimer -= 1;
      if (this.messageTimer === 0) {
        this.currentMessage = null;
        this.callbacks.onHudUpdate();
      }
    }

    const waveList = PROGRAMS[this.selectedProgram];
    if (this.programPtr < waveList.length) {
      if (this.enemiesTimer > this.enemiesPeriod) {
        this.enemiesTimer = 0;
        this._spawnWave(waveList[this.programPtr]);
        this.programPtr += 1;
        this.callbacks.onHudUpdate();
      } else {
        this.enemiesTimer += 1;
      }
    }

    for (const ab of this.abilities) {
      ab.tick();
    }

    this._advanceQuests(true);

    const enemyCallbacks = {
      onEnemyDead: (enemy, gfxInfo) => {
        const moneyBonus = this.getAbility(ABILITY_TYPE.MONEYBONUS).numSources;
        const reward = Math.round(enemy.reward * (1 + 0.5 * moneyBonus));
        this._setFunds(this.numFunds + reward);
        this.numMoneyEarned += reward;
        this.map.gfx.push(new GfxEffect(gfxInfo));

        if (enemy.numAltitude === ALTITUDE_AIR) {
          this.quests[2][1].numPoints += 1;
          this.quests[1][3].numPoints += 1;
        }
        this.map.removeEnemy(enemy);
        this._advanceQuests(true);
        this._checkWaveOrVictory();
      },
      onEnemyPassed: (enemy) => {
        this.numPopulation = Math.max(0, this.numPopulation - 1);
        this.map.removeEnemy(enemy);
        soundService.play(SOUND.POPDEAD, 100);
        if (this.numPopulation === 0) {
          this._finishMission(false);
        } else {
          this._checkWaveOrVictory();
        }
      },
    };

    for (let i = this.map.groundEnemies.length - 1; i >= 0; i--) {
      const e = this.map.groundEnemies[i];
      if (e) e.process(enemyCallbacks);
    }
    for (let i = this.map.airEnemies.length - 1; i >= 0; i--) {
      const e = this.map.airEnemies[i];
      if (e) e.process(enemyCallbacks);
    }

    const buildingCallbacks = {
      onShoot: (shot) => {
        this.map.blasts.push(new Blast(shot));
      },
    };
    for (const bld of this.map.buildings) {
      bld.process(this.map, buildingCallbacks);
    }

    const blastCallbacks = {
      onCreateGfx: (gfxInfo) => {
        this.map.gfx.push(new GfxEffect(gfxInfo));
      },
    };
    for (let i = this.map.blasts.length - 1; i >= 0; i--) {
      const blast = this.map.blasts[i];
      blast.process(this.map, blastCallbacks);
      if (!blast.alive) {
        this.map.blasts.splice(i, 1);
      }
    }

    for (let i = this.map.gfx.length - 1; i >= 0; i--) {
      const fx = this.map.gfx[i];
      fx.tick();
      if (!fx.alive) {
        this.map.gfx.splice(i, 1);
      }
    }

    if (this.animTick % 6 === 0) {
      this.callbacks.onHudUpdate();
    }
  }

  _spawnWave(wave) {
    let enemyType;
    if (wave.alt === WAVE_ALT_GROUND) {
      switch (wave.size) {
        case WAVE_SIZE_TINY:
          enemyType = ENEMY_TYPE.BAGGI;
          break;
        case WAVE_SIZE_SMALL:
          enemyType = ENEMY_TYPE.TRICYCLE;
          break;
        case WAVE_SIZE_MEDIUM:
          enemyType = ENEMY_TYPE.CAR;
          break;
        case WAVE_SIZE_BIG:
          enemyType = ENEMY_TYPE.HOWERTANK;
          break;
        default:
          enemyType = ENEMY_TYPE.BAGGI;
      }
    } else {
      switch (wave.size) {
        case WAVE_SIZE_TINY:
          enemyType = ENEMY_TYPE.PLANE;
          break;
        case WAVE_SIZE_SMALL:
          enemyType = ENEMY_TYPE.INSECT;
          break;
        case WAVE_SIZE_MEDIUM:
        default:
          enemyType = ENEMY_TYPE.SCORPIO;
          break;
      }
    }

    let initialEffect = null;
    if (wave.effect === WAVE_EFFECT_FAST) {
      initialEffect = new Effect(EFFECT_TYPE.FAST, { percent: 0.5 }, -1);
    } else if (wave.effect === WAVE_EFFECT_REPAIR) {
      initialEffect = new Effect(EFFECT_TYPE.REPAIR, { percent: 0.005 }, -1);
    } else if (wave.effect === WAVE_EFFECT_SHIELD) {
      initialEffect = new Effect(EFFECT_TYPE.SHIELD, { pass: 0.1 }, -1);
    }

    for (let i = 0; i < wave.qty; i++) {
      this.map.addEnemy(enemyType, wave.level, initialEffect ? initialEffect.makeCopy() : null, i);
    }
  }

  _advanceQuests(notify = true) {
    for (let tab = 1; tab <= 3; tab++) {
      const list = this.quests[tab];
      if (this.questCurrent[tab] === -1) {
        this.questCurrent[tab] = 0;
        list[0].boolActive = true;
      }

      while (this.questCurrent[tab] < list.length && list[this.questCurrent[tab]].boolComplete) {
        const completed = list[this.questCurrent[tab]];
        completed.boolActive = false;
        if (notify && completed.numPointCap > 0) {
          this._showMessage(`Quest complete!\n${completed.strCompleteMsg}`, false);
        }
        this.questCurrent[tab] += 1;
        if (this.questCurrent[tab] < list.length) {
          list[this.questCurrent[tab]].boolActive = true;
        }
      }
    }
  }

  _checkWaveOrVictory() {
    if (this.map.noEnemies && this.programPtr >= PROGRAMS[this.selectedProgram].length) {
      this._finishMission(true);
    } else {
      this.callbacks.onHudUpdate();
    }
  }

  _finishMission(won) {
    this.paused = true;
    this.clearCursor();
    const moneyScore = this.numMoneyEarned * MONEY_SCORE_MULT;
    const popScore = this.numPopulation * POP_SCORE_MULT;
    const bonusPct = SCORE_BONUS[this.selectedProgram];
    const totalScore = Math.round((moneyScore + popScore) * (1 + bonusPct));
    this.numScore = totalScore;

    this.gameOverResult = {
      won,
      moneyEarned: this.numMoneyEarned,
      moneyMult: MONEY_SCORE_MULT,
      moneyScore,
      population: this.numPopulation,
      popMult: POP_SCORE_MULT,
      popScore,
      bonusPct,
      totalScore,
      wavesCleared: this.programPtr,
      totalWaves: PROGRAMS[this.selectedProgram].length,
      mapName: MAPS[this.selectedMapId].name,
      difficultyName: DIFFICULTIES[this.selectedProgram].name,
    };

    this.callbacks.onGameOver(this.gameOverResult);
    this.callbacks.onHudUpdate();
  }

  _showMessage(text, isError) {
    this.currentMessage = { text, isError };
    this.messageTimer = 48;
    soundService.play(isError ? SOUND.ERROR : SOUND.QUEST);
    this.callbacks.onHudUpdate();
  }

  getNextWaveInfo() {
    const list = PROGRAMS[this.selectedProgram];
    if (this.programPtr >= list.length) return null;
    const w = list[this.programPtr];
    const sizeLabels = {
      [WAVE_SIZE_TINY]: 'TINY',
      [WAVE_SIZE_SMALL]: 'SMALL',
      [WAVE_SIZE_MEDIUM]: 'MEDIUM',
      [WAVE_SIZE_BIG]: 'BIG',
    };
    const effectLabels = {
      [WAVE_EFFECT_FAST]: 'FAST',
      [WAVE_EFFECT_REPAIR]: 'AUTOREPAIR',
      [WAVE_EFFECT_SHIELD]: 'SHIELDED',
    };

    const totalSec = Math.max(0, Math.floor((this.enemiesPeriod - this.enemiesTimer) / 24));
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;

    return {
      waveNumber: this.programPtr + 1,
      totalWaves: list.length,
      qty: w.qty,
      size: sizeLabels[w.size],
      level: w.level,
      alt: w.alt === WAVE_ALT_GROUND ? 'GROUND' : 'AIR',
      effect: w.effect ? effectLabels[w.effect] : null,
      timerText: `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`,
    };
  }

  getHighScores() {
    try {
      const raw = localStorage.getItem(SCORE_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  saveHighScore(playerName) {
    if (!this.gameOverResult) return;
    const cleanName = (playerName || 'Commander').trim().slice(0, 20) || 'Commander';
    const scores = this.getHighScores();
    scores.push({
      name: cleanName,
      score: this.gameOverResult.totalScore,
      mapName: this.gameOverResult.mapName,
      difficulty: this.gameOverResult.difficultyName,
      won: this.gameOverResult.won,
      date: new Date().toLocaleDateString(),
    });
    scores.sort((a, b) => b.score - a.score);
    const top = scores.slice(0, 15);
    try {
      localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(top));
    } catch {
      // ignore storage quota errors
    }
  }
}
