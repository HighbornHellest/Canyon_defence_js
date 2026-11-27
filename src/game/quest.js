// Port of CQuest.as

import { QUEST_TYPE } from './constants.js';

export class Quest {
  constructor(type) {
    this._numPoints = 0;
    this.boolActive = false;
    this.numType = type;
  }

  get numType() {
    return this._numType;
  }

  set numType(val) {
    if (this._numType === val) return;
    this._numType = val;
    switch (val) {
      case QUEST_TYPE.TOWERS1_1:
        this._numPointCap = 0;
        this.strCompleteMsg = 'MISSILE TURRET';
        this.requirementText = 'Ready';
        break;
      case QUEST_TYPE.TOWERS1_2:
        this._numPointCap = 1;
        this.strCompleteMsg = 'HOWITZER';
        this.requirementText = 'Launch 1 Missile';
        break;
      case QUEST_TYPE.TOWERS1_3:
        this._numPointCap = 5;
        this.strCompleteMsg = 'TESLA TOWER';
        this.requirementText = 'Build 5 Goo Cannons';
        break;
      case QUEST_TYPE.TOWERS1_4:
        this._numPointCap = 40;
        this.strCompleteMsg = 'GATLING LASER';
        this.requirementText = 'Kill 40 Air Units';
        break;
      case QUEST_TYPE.TOWERS1_5:
        this._numPointCap = 1;
        this.strCompleteMsg = 'NULLIFICATOR';
        this.requirementText = 'Build 1 Laboratory';
        break;
      case QUEST_TYPE.TOWERS2_1:
        this._numPointCap = 0;
        this.strCompleteMsg = 'AA GUN';
        this.requirementText = 'Ready';
        break;
      case QUEST_TYPE.TOWERS2_2:
        this._numPointCap = 5;
        this.strCompleteMsg = 'GOO CANNON';
        this.requirementText = 'Kill 5 Air Units';
        break;
      case QUEST_TYPE.TOWERS2_3:
        this._numPointCap = 1000;
        this.strCompleteMsg = 'CHAIN GUN';
        this.requirementText = 'Hold $1,000 Funds';
        break;
      case QUEST_TYPE.TOWERS2_4:
        this._numPointCap = 1;
        this.strCompleteMsg = 'GAUSS CANNON';
        this.requirementText = 'Build 1 Radar Dome';
        break;
      case QUEST_TYPE.TOWERS2_5:
        this._numPointCap = 10;
        this.strCompleteMsg = 'OIL SPRAY';
        this.requirementText = 'Build 10 Walls';
        break;
      case QUEST_TYPE.STRUCTURES_1:
        this._numPointCap = 5;
        this.strCompleteMsg = 'NUCLEAR SILO';
        this.requirementText = 'Have 5 Missile Turrets';
        break;
      case QUEST_TYPE.STRUCTURES_2:
        this._numPointCap = 15;
        this.strCompleteMsg = 'WALL FACTORY';
        this.requirementText = 'Have 15 Buildings';
        break;
      case QUEST_TYPE.STRUCTURES_3:
        this._numPointCap = 3;
        this.strCompleteMsg = 'RECYCLER';
        this.requirementText = '3 Tesla or Chain Guns';
        break;
      case QUEST_TYPE.STRUCTURES_4:
        this._numPointCap = 7;
        this.strCompleteMsg = 'RADAR DOME';
        this.requirementText = 'Have 7 AA Guns';
        break;
      case QUEST_TYPE.STRUCTURES_5:
        this._numPointCap = 2;
        this.strCompleteMsg = 'LABORATORY';
        this.requirementText = 'Have 2 Wall Factories';
        break;
      default:
        this._numPointCap = 0;
        this.strCompleteMsg = '';
        this.requirementText = '';
    }
  }

  get numPoints() {
    return this._numPoints;
  }

  set numPoints(val) {
    this._numPoints = Math.max(0, val);
  }

  get numPointCap() {
    return this._numPointCap;
  }

  get boolComplete() {
    return this._numPoints >= this._numPointCap;
  }
}
