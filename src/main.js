// Pure vanilla JavaScript + HTML5 entry point for Canyon Defense

import {
  ABILITY_TYPE,
  BUILDING_META,
  DIFFICULTIES,
  MAPS,
  PLAYFIELD_SIZE,
  SOUND,
  STATE,
} from './game/constants.js';
import { CanyonGame } from './game/engine.js';
import { GameRenderer } from './game/renderer.js';
import { soundService } from './game/sound.js';
import './index.css';

const root = document.getElementById('app');
const renderer = new GameRenderer();

let quitDialogOpen = false;
let missionDom = null;

const game = new CanyonGame({
  onStateChange: (newState) => {
    quitDialogOpen = false;
    renderCurrentState(newState);
  },
  onHudUpdate: () => {
    if (game.state === STATE.MISSION) {
      updateMissionHud();
    }
  },
  onRender: (animTick) => {
    if (!missionDom || !missionDom.ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const ctx = missionDom.ctx;
    ctx.save();
    ctx.setTransform(dpr * (missionDom.canvasCssSize / PLAYFIELD_SIZE), 0, 0, dpr * (missionDom.canvasCssSize / PLAYFIELD_SIZE), 0, 0);
    renderer.renderMission(ctx, game, animTick);
    ctx.restore();
  },
  onGameOver: () => {
    renderGameOverModal();
  },
});

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderCurrentState(state) {
  missionDom = null;
  if (state === STATE.MAINSCREEN) {
    renderMainScreen();
  } else if (state === STATE.OPTIONSSCREEN) {
    renderOptionsScreen();
  } else if (state === STATE.RULESSCREEN) {
    renderRulesScreen();
  } else if (state === STATE.VIEWSCORE || state === STATE.SAVESCORE) {
    renderScoresScreen();
  } else if (state === STATE.MISSION) {
    renderMissionScreen();
  }
}

function renderMainScreen() {
  const mapCards = Object.values(MAPS)
    .map((m) => {
      const active = game.selectedMapId === m.id;
      return `
        <button
          type="button"
          data-map-id="${m.id}"
          class="btn-tactical text-left p-3 rounded-lg border transition-colors cursor-pointer ${
            active
              ? 'bg-[#352b20] border-amber-500 text-[#fff6e8]'
              : 'bg-[#231d17] border-[#3d3226] text-[#d5c6b3] hover:border-[#6e5942]'
          }"
        >
          <div class="aspect-square w-full mb-2.5 rounded overflow-hidden border border-black/30 bg-[#17130f]">
            <canvas data-preview-map="${m.id}" width="180" height="180" class="w-full h-full block"></canvas>
          </div>
          <div class="font-display text-lg font-bold tracking-wide leading-tight">${escapeHtml(m.name)}</div>
          <div class="text-xs text-[#a99882] mt-0.5 leading-snug">${escapeHtml(m.subtitle)}</div>
        </button>
      `;
    })
    .join('');

  const diffCards = DIFFICULTIES.map((d) => {
    const active = game.selectedProgram === d.id;
    return `
      <button
        type="button"
        data-diff-id="${d.id}"
        class="btn-tactical flex items-center justify-between px-4 py-3 rounded-lg border text-left cursor-pointer ${
          active
            ? 'bg-[#352b20] border-amber-500 text-[#fff6e8]'
            : 'bg-[#231d17] border-[#3d3226] text-[#d5c6b3] hover:border-[#6e5942]'
        }"
      >
        <div>
          <div class="font-display text-lg font-bold leading-tight">${escapeHtml(d.name)}</div>
          <div class="text-xs text-[#a99882] mt-0.5 tabular-nums">${d.waves} waves · ${d.waveSeconds}s interval</div>
        </div>
        <div class="font-mono-num text-xs font-bold ${active ? 'text-amber-400' : 'text-[#8c7b67]'}">${escapeHtml(d.bonusLabel)}</div>
      </button>
    `;
  }).join('');

  root.innerHTML = `
    <div class="min-h-screen flex flex-col bg-[#17130f] text-[#f3eadc]">
      <header class="w-full border-b border-[#2e261d] bg-[#1d1813]">
        <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <div class="font-display text-2xl font-bold tracking-wide text-amber-400 whitespace-nowrap shrink-0">
            Canyon Defense
          </div>
          <nav class="flex items-center gap-6 text-sm font-medium text-[#cbbba6]">
            <button type="button" id="nav-rules" class="hover:text-amber-400 transition-colors cursor-pointer whitespace-nowrap shrink-0">Field Guide</button>
            <button type="button" id="nav-scores" class="hover:text-amber-400 transition-colors cursor-pointer whitespace-nowrap shrink-0">High Scores</button>
            <button type="button" id="nav-options" class="hover:text-amber-400 transition-colors cursor-pointer whitespace-nowrap shrink-0">Options</button>
          </nav>
          <button type="button" id="header-start" class="btn-tactical px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-[#17130f] text-sm font-semibold cursor-pointer whitespace-nowrap shrink-0">
            Start Game
          </button>
        </div>
      </header>

      <main class="flex-1 max-w-5xl w-full mx-auto px-6 py-8 flex flex-col justify-center gap-8">
        <section class="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#2e261d] pb-6">
          <div class="max-w-xl">
            <h1 class="font-display text-4xl md:text-5xl font-bold tracking-tight text-[#fff7eb] leading-none" style="text-wrap: balance;">
              Hold the Desert Pass
            </h1>
            <p class="text-sm md:text-base text-[#b9a993] mt-3 leading-relaxed">
              Build missile turrets, artillery, Tesla coils, and support facilities along canyon plateaus. Reroute enemy convoys with walls, unlock advanced weaponry through combat milestones, and protect your 10-population outpost.
            </p>
          </div>
          <button
            type="button"
            id="btn-launch-mission"
            class="btn-tactical px-7 py-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#17130f] font-display text-xl font-bold tracking-wide cursor-pointer shrink-0"
          >
            Start Mission
          </button>
        </section>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <section class="lg:col-span-8">
            <h2 class="text-sm font-semibold text-[#d5c6b3] mb-3">1. Select Canyon Sector</h2>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              ${mapCards}
            </div>
          </section>

          <section class="lg:col-span-4">
            <h2 class="text-sm font-semibold text-[#d5c6b3] mb-3">2. Select Difficulty</h2>
            <div class="flex flex-col gap-3">
              ${diffCards}
            </div>
          </section>
        </div>
      </main>
    </div>
  `;

  root.querySelectorAll('canvas[data-preview-map]').forEach((canvas) => {
    const id = Number(canvas.getAttribute('data-preview-map'));
    renderer.renderMapPreview(canvas, id);
  });

  root.querySelectorAll('[data-map-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      soundService.play(SOUND.SWITCH);
      game.selectedMapId = Number(btn.getAttribute('data-map-id'));
      renderMainScreen();
    });
  });

  root.querySelectorAll('[data-diff-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      soundService.play(SOUND.SWITCH);
      game.selectedProgram = Number(btn.getAttribute('data-diff-id'));
      renderMainScreen();
    });
  });

  document.getElementById('btn-launch-mission').addEventListener('click', () => {
    soundService.play(SOUND.SWITCH);
    game.startMission(game.selectedMapId, game.selectedProgram);
  });
  document.getElementById('header-start').addEventListener('click', () => {
    soundService.play(SOUND.SWITCH);
    game.startMission(game.selectedMapId, game.selectedProgram);
  });
  document.getElementById('nav-rules').addEventListener('click', () => {
    soundService.play(SOUND.SWITCH);
    game.setState(STATE.RULESSCREEN);
  });
  document.getElementById('nav-scores').addEventListener('click', () => {
    soundService.play(SOUND.SWITCH);
    game.setState(STATE.VIEWSCORE);
  });
  document.getElementById('nav-options').addEventListener('click', () => {
    soundService.play(SOUND.SWITCH);
    game.setState(STATE.OPTIONSSCREEN);
  });
}

function renderOptionsScreen() {
  const muted = soundService.isMuted();
  const volPct = Math.round(soundService.sfxVolume * 100);

  root.innerHTML = `
    <div class="min-h-screen flex flex-col bg-[#17130f] text-[#f3eadc]">
      <header class="w-full border-b border-[#2e261d] bg-[#1d1813]">
        <div class="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div class="font-display text-2xl font-bold text-amber-400">Options</div>
          <button type="button" id="btn-back-main" class="btn-tactical px-4 py-2 rounded-md border border-[#3d3226] bg-[#231d17] hover:border-amber-500 text-sm font-medium cursor-pointer">
            Back to Menu
          </button>
        </div>
      </header>

      <main class="max-w-3xl w-full mx-auto px-6 py-10 flex flex-col gap-6">
        <div class="p-6 rounded-lg border border-[#3d3226] bg-[#231d17] flex flex-col gap-6">
          <div class="flex items-center justify-between gap-4">
            <div>
              <div class="text-base font-semibold">Synthesized Sound Effects</div>
              <div class="text-xs text-[#a99882] mt-0.5">Toggle all combat, construction, and alert audio</div>
            </div>
            <button type="button" id="btn-toggle-mute" class="btn-tactical px-4 py-2 rounded-md font-semibold text-sm cursor-pointer ${
              muted ? 'bg-red-900/50 border border-red-600 text-red-200' : 'bg-amber-500 text-[#17130f]'
            }">
              ${muted ? 'Sound Off' : 'Sound On'}
            </button>
          </div>

          <div class="border-t border-[#342a20] pt-5 flex items-center justify-between gap-6">
            <div>
              <div class="text-base font-semibold">Effects Volume</div>
              <div class="text-xs text-[#a99882] mt-0.5">Adjust Web Audio synthesizer output</div>
            </div>
            <div class="flex items-center gap-3 w-56">
              <input id="range-volume" type="range" min="0" max="100" value="${volPct}" class="w-full accent-amber-500 cursor-pointer" />
              <span id="lbl-volume" class="font-mono-num text-xs w-10 text-right">${volPct}%</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  document.getElementById('btn-back-main').addEventListener('click', () => {
    soundService.play(SOUND.SWITCH);
    game.setState(STATE.MAINSCREEN);
  });

  document.getElementById('btn-toggle-mute').addEventListener('click', () => {
    soundService.toggleMute();
    soundService.play(SOUND.SWITCH);
    renderOptionsScreen();
  });

  const slider = document.getElementById('range-volume');
  const lbl = document.getElementById('lbl-volume');
  slider.addEventListener('input', () => {
    const v = Number(slider.value);
    soundService.setVolume(v / 100);
    lbl.textContent = `${v}%`;
  });
  slider.addEventListener('change', () => {
    soundService.play(SOUND.SWITCH);
  });
}

function renderRulesScreen() {
  const towerRows = Object.values(BUILDING_META)
    .map(
      (b) => `
      <div class="p-3 rounded-lg border border-[#342a20] bg-[#1f1a15] flex items-start gap-3">
        <canvas data-guide-icon="${b.id}" width="38" height="38" class="shrink-0 rounded bg-[#2a231c] border border-[#3d3226]"></canvas>
        <div class="min-w-0">
          <div class="flex items-center justify-between gap-2">
            <span class="font-semibold text-sm text-[#fff6e8]">${escapeHtml(b.name)}</span>
            <span class="font-mono-num text-xs font-bold text-amber-400">$${b.price}</span>
          </div>
          <div class="text-xs text-[#a99882] mt-0.5">${escapeHtml(b.targetLabel)}${b.range ? ` · Range ${b.range}` : ''} · Unlock: ${escapeHtml(b.questDesc)}</div>
          <div class="text-xs text-[#d5c6b3] mt-1">${escapeHtml(b.summary)}</div>
        </div>
      </div>
    `
    )
    .join('');

  root.innerHTML = `
    <div class="min-h-screen flex flex-col bg-[#17130f] text-[#f3eadc]">
      <header class="w-full border-b border-[#2e261d] bg-[#1d1813]">
        <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div class="font-display text-2xl font-bold text-amber-400">Field Guide & Controls</div>
          <button type="button" id="btn-back-main" class="btn-tactical px-4 py-2 rounded-md border border-[#3d3226] bg-[#231d17] hover:border-amber-500 text-sm font-medium cursor-pointer">
            Back to Menu
          </button>
        </div>
      </header>

      <main class="max-w-5xl w-full mx-auto px-6 py-8 flex flex-col gap-8">
        <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 rounded-lg border border-[#342a20] bg-[#231d17]">
            <div class="font-display text-lg font-bold text-amber-400">Placement & Walls</div>
            <p class="text-xs text-[#cbbba6] mt-1.5 leading-relaxed">
              Towers and structures can only be built on elevated canyon rock plateaus—or on top of constructed Walls. Walls block and reroute ground convoys, as long as a path to an exit remains open.
            </p>
          </div>
          <div class="p-4 rounded-lg border border-[#342a20] bg-[#231d17]">
            <div class="font-display text-lg font-bold text-amber-400">Tech Quests & Abilities</div>
            <p class="text-xs text-[#cbbba6] mt-1.5 leading-relaxed">
              Each build tab unlocks sequentially as you complete combat milestones. Support structures grant special abilities (Nuclear Missile, Wall, Stop Time) and passive bonuses. Extra structures recharge abilities faster.
            </p>
          </div>
          <div class="p-4 rounded-lg border border-[#342a20] bg-[#231d17]">
            <div class="font-display text-lg font-bold text-amber-400">Keyboard Shortcuts</div>
            <p class="text-xs text-[#cbbba6] mt-1.5 leading-relaxed font-mono-num">
              Space: Send wave early (speeds ability cooldowns)<br/>
              1 / 2 / 3: Switch build tabs · S: Sell mode<br/>
              P: Pause · M: Mute · Esc / Right-Click: Cancel
            </p>
          </div>
        </section>

        <section>
          <h2 class="font-display text-xl font-bold text-[#fff6e8] mb-3">Arsenal & Structures</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            ${towerRows}
          </div>
        </section>
      </main>
    </div>
  `;

  root.querySelectorAll('canvas[data-guide-icon]').forEach((canvas) => {
    renderer.drawBuildingIcon(canvas, Number(canvas.getAttribute('data-guide-icon')));
  });

  document.getElementById('btn-back-main').addEventListener('click', () => {
    soundService.play(SOUND.SWITCH);
    game.setState(STATE.MAINSCREEN);
  });
}

function renderScoresScreen() {
  const scores = game.getHighScores();
  const rows = scores.length
    ? scores
        .map(
          (s, idx) => `
        <tr class="border-b border-[#2e261d] text-sm">
          <td class="py-2.5 px-3 font-mono-num text-[#a99882]">${idx + 1}</td>
          <td class="py-2.5 px-3 font-semibold text-[#fff6e8]">${escapeHtml(s.name)}</td>
          <td class="py-2.5 px-3 text-[#cbbba6]">${escapeHtml(s.mapName)} · ${escapeHtml(s.difficulty)}</td>
          <td class="py-2.5 px-3 text-xs ${s.won ? 'text-emerald-400' : 'text-[#a99882]'}">${s.won ? 'Victory' : 'Defeat'}</td>
          <td class="py-2.5 px-3 font-mono-num font-bold text-right text-amber-400">${Number(s.score).toLocaleString()}</td>
        </tr>
      `
        )
        .join('')
    : `<tr><td colspan="5" class="py-8 text-center text-sm text-[#a99882]">No missions recorded yet. Complete a defense mission to post your score.</td></tr>`;

  root.innerHTML = `
    <div class="min-h-screen flex flex-col bg-[#17130f] text-[#f3eadc]">
      <header class="w-full border-b border-[#2e261d] bg-[#1d1813]">
        <div class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div class="font-display text-2xl font-bold text-amber-400">Local High Scores</div>
          <button type="button" id="btn-back-main" class="btn-tactical px-4 py-2 rounded-md border border-[#3d3226] bg-[#231d17] hover:border-amber-500 text-sm font-medium cursor-pointer">
            Back to Menu
          </button>
        </div>
      </header>

      <main class="max-w-4xl w-full mx-auto px-6 py-8">
        <div class="rounded-lg border border-[#342a20] bg-[#231d17] overflow-hidden">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-[#3d3226] bg-[#1d1813] text-xs font-semibold text-[#a99882]">
                <th class="py-2.5 px-3">#</th>
                <th class="py-2.5 px-3">Commander</th>
                <th class="py-2.5 px-3">Sector · Difficulty</th>
                <th class="py-2.5 px-3">Result</th>
                <th class="py-2.5 px-3 text-right">Score</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </main>
    </div>
  `;

  document.getElementById('btn-back-main').addEventListener('click', () => {
    soundService.play(SOUND.SWITCH);
    game.setState(STATE.MAINSCREEN);
  });
}

function renderMissionScreen() {
  const cssSize = Math.min(672, Math.max(448, Math.floor(window.innerHeight - 130)));

  root.innerHTML = `
    <div class="min-h-screen flex flex-col bg-[#17130f] text-[#f3eadc] select-none">
      <header class="w-full border-b border-[#2e261d] bg-[#1d1813]">
        <div class="max-w-[1160px] mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div class="flex items-center gap-6">
            <span class="font-display text-xl font-bold tracking-wide text-amber-400 whitespace-nowrap">Canyon Defense</span>
            <div class="flex items-center gap-5 text-sm">
              <div class="flex items-center gap-1.5">
                <span class="text-[#a99882]">Funds</span>
                <span id="hud-funds" class="font-mono-num font-bold text-amber-400">$350</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-[#a99882]">Lives</span>
                <span id="hud-pop" class="font-mono-num font-bold text-emerald-400">10</span>
              </div>
              <div class="hidden sm:flex items-center gap-1.5">
                <span class="text-[#a99882]">Wave</span>
                <span id="hud-wave-count" class="font-mono-num font-bold text-[#fff6e8]">0/30</span>
              </div>
              <div id="hud-bonuses" class="hidden md:flex items-center gap-3 text-xs text-[#a99882] font-mono-num"></div>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button type="button" id="btn-speed" class="btn-tactical px-3 py-1.5 rounded border border-[#3d3226] bg-[#26201a] hover:border-amber-500 font-mono-num text-xs font-bold cursor-pointer whitespace-nowrap">
              1x Speed
            </button>
            <button type="button" id="btn-sound" class="btn-tactical px-3 py-1.5 rounded border border-[#3d3226] bg-[#26201a] hover:border-amber-500 text-xs font-medium cursor-pointer whitespace-nowrap">
              Mute (M)
            </button>
            <button type="button" id="btn-pause" class="btn-tactical px-3 py-1.5 rounded border border-[#3d3226] bg-[#26201a] hover:border-amber-500 text-xs font-medium cursor-pointer whitespace-nowrap">
              Pause (P)
            </button>
            <button type="button" id="btn-quit" class="btn-tactical px-3 py-1.5 rounded border border-red-900/60 bg-[#2b1a18] hover:border-red-500 text-red-200 text-xs font-medium cursor-pointer whitespace-nowrap">
              Quit (Q)
            </button>
          </div>
        </div>
      </header>

      <main class="flex-1 max-w-[1160px] w-full mx-auto px-4 py-4 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-5">
        <div class="flex flex-col items-center gap-2 shrink-0">
          <div class="relative rounded-lg overflow-hidden border-2 border-[#3d3226] shadow-xl bg-[#120e0b]">
            <canvas id="game-canvas" class="game-canvas block cursor-crosshair"></canvas>

            <div id="overlay-pause" class="hidden absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-4 p-6">
              <div class="font-display text-4xl font-bold tracking-wide text-amber-400">Mission Paused</div>
              <button type="button" id="btn-resume" class="btn-tactical px-6 py-2.5 rounded-md bg-amber-500 hover:bg-amber-400 text-[#17130f] font-semibold text-sm cursor-pointer">
                Resume (P)
              </button>
            </div>

            <div id="overlay-quit" class="hidden absolute inset-0 bg-black/75 flex items-center justify-center p-6">
              <div class="w-full max-w-xs p-5 rounded-lg border border-[#4a3d2e] bg-[#231d17] text-center">
                <div class="font-display text-2xl font-bold text-[#fff6e8]">Abort Mission?</div>
                <p class="text-xs text-[#b9a993] mt-1.5">Current progress on this sector will be lost.</p>
                <div class="mt-4 flex items-center justify-center gap-3">
                  <button type="button" id="btn-quit-yes" class="btn-tactical px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer">Quit Mission</button>
                  <button type="button" id="btn-quit-no" class="btn-tactical px-4 py-2 rounded border border-[#4a3d2e] bg-[#2d251d] hover:border-amber-500 text-xs font-semibold cursor-pointer">Cancel</button>
                </div>
              </div>
            </div>

            <div id="overlay-gameover" class="hidden absolute inset-0 bg-black/80 flex items-center justify-center p-4"></div>
          </div>

          <div id="inspector-bar" class="w-full flex items-center justify-between text-xs text-[#b9a993] px-1 min-h-5">
            <span id="inspector-text">Select a tower from the command panel to build on rock plateaus or walls.</span>
            <span id="inspector-hint" class="font-mono-num text-[#8c7b67] hidden sm:inline">Right-click or Esc to cancel</span>
          </div>
        </div>

        <aside class="w-full max-w-[440px] lg:w-[376px] flex flex-col gap-3 shrink-0">
          <!-- Wave Intel & Timer -->
          <section class="p-3.5 rounded-lg border border-[#3d3226] bg-[#231d17]">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div id="wave-info-title" class="text-xs font-semibold text-amber-400">Next Attack</div>
                <div id="wave-info-detail" class="text-sm font-medium text-[#fff6e8] mt-0.5 leading-snug">Preparing...</div>
              </div>
              <div class="text-right shrink-0">
                <div id="wave-timer" class="font-mono-num text-2xl font-bold text-[#fff6e8] leading-none">02:00</div>
                <button type="button" id="btn-send-wave" class="btn-tactical mt-2 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-[#17130f] text-xs font-bold cursor-pointer whitespace-nowrap">
                  Send Wave (Space)
                </button>
              </div>
            </div>
            <div id="alert-banner" class="hidden mt-2.5 px-3 py-2 rounded text-xs font-semibold"></div>
          </section>

          <!-- Build Tabs -->
          <section class="rounded-lg border border-[#3d3226] bg-[#231d17] overflow-hidden">
            <div class="grid grid-cols-3 border-b border-[#342a20] bg-[#1d1813]">
              <button type="button" data-tab="1" class="btn-tactical py-2.5 text-xs font-semibold cursor-pointer border-b-2">Towers 1</button>
              <button type="button" data-tab="2" class="btn-tactical py-2.5 text-xs font-semibold cursor-pointer border-b-2">Towers 2</button>
              <button type="button" data-tab="3" class="btn-tactical py-2.5 text-xs font-semibold cursor-pointer border-b-2">Structures</button>
            </div>
            <div id="build-slots" class="p-2.5 flex flex-col gap-2"></div>
          </section>

          <!-- Abilities Bar -->
          <section class="p-3 rounded-lg border border-[#3d3226] bg-[#231d17]">
            <div class="text-xs font-semibold text-[#a99882] mb-2">Command Abilities</div>
            <div id="ability-slots" class="grid grid-cols-4 gap-2"></div>
          </section>
        </aside>
      </main>
    </div>
  `;

  const canvas = document.getElementById('game-canvas');
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${cssSize}px`;
  canvas.style.height = `${cssSize}px`;
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);

  missionDom = {
    canvas,
    ctx: canvas.getContext('2d'),
    canvasCssSize: cssSize,
    hudFunds: document.getElementById('hud-funds'),
    hudPop: document.getElementById('hud-pop'),
    hudWaveCount: document.getElementById('hud-wave-count'),
    hudBonuses: document.getElementById('hud-bonuses'),
    btnSpeed: document.getElementById('btn-speed'),
    btnSound: document.getElementById('btn-sound'),
    btnPause: document.getElementById('btn-pause'),
    waveTitle: document.getElementById('wave-info-title'),
    waveDetail: document.getElementById('wave-info-detail'),
    waveTimer: document.getElementById('wave-timer'),
    btnSendWave: document.getElementById('btn-send-wave'),
    alertBanner: document.getElementById('alert-banner'),
    buildSlots: document.getElementById('build-slots'),
    abilitySlots: document.getElementById('ability-slots'),
    inspectorText: document.getElementById('inspector-text'),
    overlayPause: document.getElementById('overlay-pause'),
    overlayQuit: document.getElementById('overlay-quit'),
    overlayGameOver: document.getElementById('overlay-gameover'),
  };

  const toLogicalCoords = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * PLAYFIELD_SIZE;
    const y = ((clientY - rect.top) / rect.height) * PLAYFIELD_SIZE;
    return { x, y };
  };

  canvas.addEventListener('mousemove', (e) => {
    const { x, y } = toLogicalCoords(e.clientX, e.clientY);
    game.updatePointer(x, y);
    updateInspector();
  });

  canvas.addEventListener('mouseleave', () => {
    game.updatePointer(-100, -100);
    updateInspector();
  });

  canvas.addEventListener('click', (e) => {
    const { x, y } = toLogicalCoords(e.clientX, e.clientY);
    game.handleCanvasClick(x, y);
    updateInspector();
  });

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (game.cursor.mode !== 'clear') {
      game.clearCursor();
      soundService.play(SOUND.SWITCH);
      updateMissionHud();
      updateInspector();
    }
  });

  document.getElementById('btn-speed').addEventListener('click', () => game.toggleSpeed());
  document.getElementById('btn-sound').addEventListener('click', () => {
    soundService.toggleMute();
    soundService.play(SOUND.SWITCH);
    updateMissionHud();
  });
  document.getElementById('btn-pause').addEventListener('click', () => {
    if (quitDialogOpen) return;
    soundService.play(SOUND.SWITCH);
    game.togglePaused();
  });
  document.getElementById('btn-resume').addEventListener('click', () => {
    soundService.play(SOUND.SWITCH);
    game.setPaused(false);
  });
  document.getElementById('btn-quit').addEventListener('click', () => openQuitDialog());
  document.getElementById('btn-quit-yes').addEventListener('click', () => {
    soundService.play(SOUND.SWITCH);
    quitDialogOpen = false;
    game.setState(STATE.MAINSCREEN);
  });
  document.getElementById('btn-quit-no').addEventListener('click', () => {
    soundService.play(SOUND.SWITCH);
    quitDialogOpen = false;
    game.setPaused(game.pausedBeforeQuit);
    updateMissionHud();
  });
  document.getElementById('btn-send-wave').addEventListener('click', () => game.hurryAttack());

  root.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      game.setTab(Number(btn.getAttribute('data-tab')));
    });
  });

  updateMissionHud();
}

function openQuitDialog() {
  if (game.state !== STATE.MISSION || game.gameOverResult || quitDialogOpen) return;
  soundService.play(SOUND.SWITCH);
  game.pausedBeforeQuit = game.paused;
  game.setPaused(true);
  quitDialogOpen = true;
  updateMissionHud();
}

function updateInspector() {
  if (!missionDom) return;
  const el = missionDom.inspectorText;
  if (game.cursor.mode === 'building' && game.cursor.buildingMeta) {
    const m = game.cursor.buildingMeta;
    el.textContent = `${m.name} ($${m.price}) · ${m.targetLabel}${m.range ? ` · Range ${Math.round(m.range * (1 + game.radarBonus))}` : ''} — ${m.summary}`;
    return;
  }
  if (game.cursor.mode === 'ability') {
    const names = {
      [ABILITY_TYPE.SELL]: 'Sell Mode: Click any installed tower or structure to refund 50% of its cost.',
      [ABILITY_TYPE.MISSILE]: 'Nuclear Strike: Click anywhere on the canyon to launch a warhead (Radius 100, Ground & Air).',
      [ABILITY_TYPE.WALL]: 'Construct Wall: Click open sand to place a wall that reroutes ground units and holds towers.',
      [ABILITY_TYPE.TIMEBOMB]: 'Time Bomb: Click anywhere to freeze all ground & air enemies within radius 100 for 5 seconds.',
    };
    el.textContent = names[game.cursor.abilityType] || '';
    return;
  }
  if (game.hoveredBuilding) {
    const b = game.hoveredBuilding;
    const refund = Math.round(0.5 * b.price);
    el.textContent = `${b.meta.name} · ${b.meta.targetLabel}${b.isTower ? ` · Range ${Math.round(b.numRange)}` : ''} · Sell value $${refund}`;
    return;
  }
  el.textContent = 'Select a tower or structure from the right panel to build on rock plateaus or walls.';
}

function updateMissionHud() {
  if (!missionDom) return;
  const d = missionDom;

  d.hudFunds.textContent = `$${game.numFunds}`;
  d.hudPop.textContent = `${game.numPopulation}`;
  d.hudPop.className = `font-mono-num font-bold ${game.numPopulation <= 3 ? 'text-red-400' : 'text-emerald-400'}`;

  const totalWaves = DIFFICULTIES[game.selectedProgram].waves;
  d.hudWaveCount.textContent = `${game.programPtr}/${totalWaves}`;

  const moneyPct = game.getAbility(ABILITY_TYPE.MONEYBONUS).numSources * 50;
  const radarPct = Math.round(game.radarBonus * 100);
  const bonusParts = [];
  if (radarPct > 0) bonusParts.push(`Towers +${radarPct}%`);
  if (moneyPct > 0) bonusParts.push(`Bounty +${moneyPct}%`);
  d.hudBonuses.textContent = bonusParts.join(' · ');

  d.btnSpeed.textContent = `${game.speedMultiplier}x Speed`;
  d.btnSound.textContent = soundService.isMuted() ? 'Unmute (M)' : 'Mute (M)';
  d.btnPause.textContent = game.paused ? 'Resume (P)' : 'Pause (P)';

  d.overlayPause.classList.toggle('hidden', !game.paused || quitDialogOpen || Boolean(game.gameOverResult));
  d.overlayQuit.classList.toggle('hidden', !quitDialogOpen);

  // Wave screen
  const wave = game.getNextWaveInfo();
  if (wave) {
    d.waveTitle.textContent = `Next Attack: #${wave.waveNumber} of ${wave.totalWaves}`;
    const unitWord = wave.qty === 1 ? 'unit' : 'units';
    const fxPart = wave.effect ? ` · ${wave.effect}` : '';
    d.waveDetail.textContent = `${wave.qty} ${wave.size} ${unitWord} Lv[${wave.level}] · ${wave.alt}${fxPart}`;
    d.waveTimer.textContent = wave.timerText;
    d.waveTimer.classList.remove('hidden');
  } else {
    d.waveTitle.textContent = 'Final Wave Deployed';
    d.waveDetail.textContent = 'Clear remaining hostile units in the canyon.';
    d.waveTimer.classList.add('hidden');
  }

  d.btnSendWave.classList.toggle('hidden', !game.canSendWaveEarly() || game.paused);

  if (game.currentMessage) {
    d.alertBanner.textContent = game.currentMessage.text.replace('\n', ' — ');
    d.alertBanner.className = `mt-2.5 px-3 py-2 rounded text-xs font-semibold ${
      game.currentMessage.isError
        ? 'bg-red-950/80 border border-red-700 text-red-200'
        : 'bg-emerald-950/80 border border-emerald-700 text-emerald-200'
    }`;
  } else {
    d.alertBanner.className = 'hidden';
  }

  // Tabs active styling
  root.querySelectorAll('[data-tab]').forEach((btn) => {
    const t = Number(btn.getAttribute('data-tab'));
    const active = t === game.activeTab;
    btn.className = `btn-tactical py-2.5 text-xs font-semibold cursor-pointer border-b-2 ${
      active
        ? 'border-amber-500 text-amber-400 bg-[#231d17]'
        : 'border-transparent text-[#a99882] hover:text-[#fff6e8]'
    }`;
  });

  // Build Slots (5 per tab)
  const tabBuildings = Object.values(BUILDING_META).filter((b) => b.tab === game.activeTab);
  d.buildSlots.innerHTML = tabBuildings
    .map((b) => {
      const slotInfo = game.getBuildingSlotState(game.activeTab, b.slot);
      const selected = game.cursor.mode === 'building' && game.cursor.buildingType === b.id;
      const affordable = game.numFunds >= b.price;

      if (slotInfo.state === 'unlocked') {
        return `
          <button
            type="button"
            data-build-id="${b.id}"
            class="btn-tactical w-full p-2 rounded-md border text-left flex items-center gap-2.5 cursor-pointer ${
              selected
                ? 'bg-[#382d20] border-amber-500'
                : 'bg-[#1c1712] border-[#342a20] hover:border-[#6e5942]'
            }"
          >
            <canvas data-slot-icon="${b.id}" width="34" height="34" class="shrink-0 rounded bg-[#27211a] border border-[#3d3226]"></canvas>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-bold text-[#fff6e8] truncate">${escapeHtml(b.name)}</span>
                <span class="font-mono-num text-xs font-bold ${affordable ? 'text-amber-400' : 'text-red-400'}">$${b.price}</span>
              </div>
              <div class="text-[11px] text-[#a99882] truncate mt-0.5">${escapeHtml(b.targetLabel)}${b.range ? ` · Rng ${Math.round(b.range * (1 + game.radarBonus))}` : ''}</div>
            </div>
          </button>
        `;
      }

      if (slotInfo.state === 'quest') {
        const q = slotInfo.quest;
        const pct = q.numPointCap > 0 ? Math.min(100, Math.round((q.numPoints / q.numPointCap) * 100)) : 0;
        return `
          <div class="w-full p-2 rounded-md border border-[#342a20] bg-[#1a1510] flex items-center gap-2.5 opacity-90">
            <div class="w-[34px] h-[34px] shrink-0 rounded bg-[#241e18] border border-[#342a20] flex items-center justify-center font-mono-num text-xs font-bold text-amber-500">
              ?
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-semibold text-[#cbbba6] truncate">${escapeHtml(q.requirementText)}</span>
                <span class="font-mono-num text-[11px] font-bold text-amber-400">${q.numPoints} / ${q.numPointCap}</span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-[#2a221b] mt-1.5 overflow-hidden">
                <div class="h-full bg-amber-500" style="width: ${pct}%"></div>
              </div>
            </div>
          </div>
        `;
      }

      return `
        <div class="w-full p-2 rounded-md border border-[#2a221a] bg-[#16120e] flex items-center gap-2.5 opacity-55">
          <div class="w-[34px] h-[34px] shrink-0 rounded bg-[#1f1914] border border-[#2d241c] flex items-center justify-center font-mono-num text-xs text-[#6e5e4e]">
            —
          </div>
          <div class="text-xs text-[#7c6c5a]">Locked · Complete previous quest</div>
        </div>
      `;
    })
    .join('');

  d.buildSlots.querySelectorAll('canvas[data-slot-icon]').forEach((c) => {
    renderer.drawBuildingIcon(c, Number(c.getAttribute('data-slot-icon')));
  });
  d.buildSlots.querySelectorAll('[data-build-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      game.selectBuilding(Number(btn.getAttribute('data-build-id')));
      updateInspector();
    });
  });

  // Abilities Bar (4 clickable abilities)
  const abilityList = [
    { type: ABILITY_TYPE.SELL, label: 'Sell (S)' },
    { type: ABILITY_TYPE.MISSILE, label: 'Missile' },
    { type: ABILITY_TYPE.WALL, label: 'Wall' },
    { type: ABILITY_TYPE.TIMEBOMB, label: 'Freeze' },
  ];

  d.abilitySlots.innerHTML = abilityList
    .map((item) => {
      const ab = game.getAbility(item.type);
      const selected = game.cursor.mode === 'ability' && game.cursor.abilityType === item.type;
      const available = ab && ab.boolAvailable;
      const ready = ab && ab.isReady;
      const subText = !available
        ? 'Locked'
        : ready
          ? item.type === ABILITY_TYPE.SELL
            ? '50% Back'
            : 'Ready'
          : `${ab.secondsRemaining}s`;

      return `
        <button
          type="button"
          data-ability-id="${item.type}"
          ${!ready ? 'disabled' : ''}
          class="btn-tactical relative p-2 rounded-md border flex flex-col items-center gap-1 overflow-hidden ${
            !available
              ? 'bg-[#16120e] border-[#2a221a] opacity-45 cursor-not-allowed'
              : selected
                ? 'bg-[#382d20] border-amber-500 cursor-pointer'
                : ready
                  ? 'bg-[#1c1712] border-[#3d3226] hover:border-amber-500 cursor-pointer'
                  : 'bg-[#1a1510] border-[#342a20] opacity-75 cursor-not-allowed'
          }"
        >
          ${
            available && !ready
              ? `<div class="absolute bottom-0 left-0 right-0 bg-amber-500/20 pointer-events-none" style="height: ${Math.round(ab.progressRatio * 100)}%"></div>`
              : ''
          }
          <canvas data-ability-icon="${item.type}" width="28" height="28" class="relative z-10"></canvas>
          <span class="relative z-10 text-[11px] font-semibold leading-none text-[#fff6e8] whitespace-nowrap">${item.label}</span>
          <span class="relative z-10 font-mono-num text-[10px] leading-none ${ready ? 'text-emerald-400' : 'text-[#a99882]'}">${subText}</span>
        </button>
      `;
    })
    .join('');

  d.abilitySlots.querySelectorAll('canvas[data-ability-icon]').forEach((c) => {
    renderer.drawAbilityIcon(c, Number(c.getAttribute('data-ability-icon')));
  });
  d.abilitySlots.querySelectorAll('[data-ability-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      game.selectAbility(Number(btn.getAttribute('data-ability-id')));
      updateInspector();
    });
  });
}

function renderGameOverModal() {
  if (!missionDom || !game.gameOverResult) return;
  const r = game.gameOverResult;
  const el = missionDom.overlayGameOver;
  el.classList.remove('hidden');

  el.innerHTML = `
    <div class="w-full max-w-sm p-5 rounded-lg border border-[#4a3d2e] bg-[#231d17] text-[#f3eadc] shadow-2xl">
      <div class="font-display text-3xl font-bold ${r.won ? 'text-emerald-400' : 'text-red-400'}">
        ${r.won ? 'Mission Complete!' : 'Outpost Overrun'}
      </div>
      <div class="text-xs text-[#a99882] mt-0.5">${escapeHtml(r.mapName)} · ${escapeHtml(r.difficultyName)} · ${r.wavesCleared}/${r.totalWaves} waves</div>

      <div class="mt-4 border-t border-b border-[#342a20] py-3 flex flex-col gap-2 text-xs">
        <div class="flex justify-between">
          <span class="text-[#cbbba6]">Money Earned ($${r.moneyEarned} × ${r.moneyMult})</span>
          <span class="font-mono-num font-semibold">${r.moneyScore.toLocaleString()}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#cbbba6]">Population Left (${r.population} × ${r.popMult.toLocaleString()})</span>
          <span class="font-mono-num font-semibold">${r.popScore.toLocaleString()}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#cbbba6]">Difficulty Bonus</span>
          <span class="font-mono-num font-semibold">+${Math.round(r.bonusPct * 100)}%</span>
        </div>
        <div class="flex justify-between pt-1.5 border-t border-[#342a20] text-sm font-bold text-amber-400">
          <span>Total Score</span>
          <span class="font-mono-num">${r.totalScore.toLocaleString()}</span>
        </div>
      </div>

      <form id="form-save-score" class="mt-4 flex flex-col gap-2.5">
        <label class="text-xs text-[#cbbba6]" for="input-callsign">Save to Local High Scores</label>
        <div class="flex gap-2">
          <input
            id="input-callsign"
            type="text"
            maxlength="20"
            placeholder="Commander"
            class="flex-1 px-3 py-1.5 rounded border border-[#4a3d2e] bg-[#17130f] text-sm text-[#fff6e8] focus:outline-none focus:border-amber-500"
          />
          <button type="submit" class="btn-tactical px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-[#17130f] text-xs font-bold cursor-pointer whitespace-nowrap">
            Save Score
          </button>
        </div>
      </form>

      <div class="mt-4 grid grid-cols-2 gap-2.5">
        <button type="button" id="btn-play-again" class="btn-tactical py-2 rounded bg-[#352b20] border border-[#5a4936] hover:border-amber-500 text-xs font-semibold cursor-pointer">
          Play Again
        </button>
        <button type="button" id="btn-go-menu" class="btn-tactical py-2 rounded border border-[#3d3226] bg-[#1c1712] hover:border-[#6e5942] text-xs font-semibold cursor-pointer">
          Main Menu
        </button>
      </div>
    </div>
  `;

  document.getElementById('form-save-score').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('input-callsign');
    game.saveHighScore(input.value);
    soundService.play(SOUND.SWITCH);
    game.setState(STATE.VIEWSCORE);
  });

  document.getElementById('btn-play-again').addEventListener('click', () => {
    soundService.play(SOUND.SWITCH);
    game.startMission(game.selectedMapId, game.selectedProgram);
  });

  document.getElementById('btn-go-menu').addEventListener('click', () => {
    soundService.play(SOUND.SWITCH);
    game.setState(STATE.MAINSCREEN);
  });
}

// Keyboard shortcuts ported from CMissionUIPanel.onKeyDown + extras
window.addEventListener('keydown', (e) => {
  if (game.state !== STATE.MISSION) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

  if (e.code === 'Space') {
    e.preventDefault();
    game.hurryAttack();
  } else if (e.key === 'p' || e.key === 'P') {
    if (!quitDialogOpen && !game.gameOverResult) {
      soundService.play(SOUND.SWITCH);
      game.togglePaused();
    }
  } else if (e.key === 'm' || e.key === 'M') {
    soundService.toggleMute();
    soundService.play(SOUND.SWITCH);
    updateMissionHud();
  } else if (e.key === 'q' || e.key === 'Q') {
    openQuitDialog();
  } else if (e.key === 'Escape') {
    if (quitDialogOpen) {
      quitDialogOpen = false;
      game.setPaused(game.pausedBeforeQuit);
      updateMissionHud();
    } else if (game.cursor.mode !== 'clear') {
      game.clearCursor();
      soundService.play(SOUND.SWITCH);
      updateMissionHud();
      updateInspector();
    }
  } else if (e.key === '1') {
    game.setTab(1);
  } else if (e.key === '2') {
    game.setTab(2);
  } else if (e.key === '3') {
    game.setTab(3);
  } else if (e.key === 's' || e.key === 'S') {
    game.selectAbility(ABILITY_TYPE.SELL);
    updateInspector();
  }
});

// Boot directly into Main Screen
renderCurrentState(STATE.MAINSCREEN);
