/**
 * game.js
 * Seviye akışı, hedef üretimi/skorlama, sürükleme görevi ve her karede
 * çalışan render döngüsü. `state.js`'teki paylaşılan durumu okuyup günceller.
 */

import { LEVELS } from './config.js';
import { state, settings } from './state.js';
import {
  game, gctx, missHint,
  hudLevel, hudScore, progressFill, progressLabel,
  lvEyebrow, lvIcon, lvTitle, lvDesc, lvLegend,
  endScore, ovStart, ovLevel, ovEnd, ovError,
  skelCanvas,
} from './dom.js';

export const COLORS = { hover: '#1FB6C9', left: '#1FB6C9', right: '#B4E23C', drag: '#F5B942' };

/** Oyun ve önizleme canvas'larını pencere boyutuna göre yeniden ölçekler. */
export function resizeCanvases() {
  game.width = window.innerWidth;
  game.height = window.innerHeight;
  skelCanvas.width = skelCanvas.clientWidth;
  skelCanvas.height = skelCanvas.clientHeight;
}

export function currentLevel() {
  return LEVELS[state.levelIndex];
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

/* ---------------------------- Hedef üretimi ---------------------------- */

function spawnTarget() {
  const lvl = currentLevel();
  if (lvl.types[0] === 'drag') return; // sürükleme seviyesinde ayrı mantık var
  const type = lvl.types[Math.floor(Math.random() * lvl.types.length)];
  const r = 34;
  state.targets.push({
    type,
    x: rand(r + 40, game.width - r - 40),
    y: rand(r + 120, game.height - r - 140),
    r, popping: 0,
  });
}

function spawnDragTask() {
  const r = 30;
  const startX = rand(120, game.width - 120), startY = rand(160, game.height - 260);
  let zoneX, zoneY;
  do {
    zoneX = rand(140, game.width - 140);
    zoneY = rand(180, game.height - 160);
  } while (Math.hypot(zoneX - startX, zoneY - startY) < 220);

  state.dragTask = {
    ox: startX, oy: startY, x: startX, y: startY, r,
    zoneX, zoneY, zoneR: 60, grabbed: false, done: false,
  };
}

/* ------------------------------ Seviye akışı ---------------------------- */

export function resetGame() {
  state.levelIndex = 0; state.score = 0; state.levelScore = 0;
  state.targets = []; state.dragTask = null; state.dragsCompleted = 0;
  state.locked = false; state.lockPinchActive = false; state.lockArmed = true;
  hudScore.textContent = 0;
}

export function startLevel(i) {
  state.levelIndex = i;
  state.levelScore = 0;
  state.targets = [];
  state.dragTask = null;
  state.dragsCompleted = 0;
  state.lastSpawn = 0;
  state.levelStartTime = performance.now();

  const lvl = LEVELS[i];
  hudLevel.textContent = lvl.id;
  lvEyebrow.textContent = lvl.eyebrow;
  lvIcon.textContent = lvl.icon;
  lvTitle.textContent = lvl.title;
  lvDesc.textContent = lvl.desc;
  lvLegend.innerHTML = lvl.legend
    .map(l => `<span class="legend-chip"><span class="legend-swatch" style="background:${l.c}"></span>${l.t}</span>`)
    .join('');

  updateProgress();
  showOverlay(ovLevel);
  state.paused = true;

  if (lvl.types[0] === 'drag') spawnDragTask();
}

export function updateProgress() {
  const lvl = currentLevel();
  const goalCount = lvl.types[0] === 'drag' ? state.dragsCompleted : state.levelScore;
  const pct = Math.min(100, (goalCount / lvl.goal) * 100);
  progressFill.style.width = pct + '%';
  progressLabel.textContent = `${lvl.title} — ${goalCount} / ${lvl.goal}`;
}

export function addScore(n) {
  state.score += n;
  state.levelScore += n;
  hudScore.textContent = state.score;
  updateProgress();
  checkLevelComplete();
}

export function checkLevelComplete() {
  const lvl = currentLevel();
  const goalCount = lvl.types[0] === 'drag' ? state.dragsCompleted : state.levelScore;
  if (goalCount < lvl.goal) return;

  if (state.levelIndex < LEVELS.length - 1) {
    startLevel(state.levelIndex + 1);
  } else {
    endGame();
  }
}

export function endGame() {
  state.paused = true;
  endScore.textContent = state.score;
  showOverlay(ovEnd);
}

/* -------------------------------- Overlay'ler --------------------------- */

export function showOverlay(el) {
  [ovStart, ovLevel, ovEnd, ovError].forEach(o => o.classList.add('hidden'));
  el.classList.remove('hidden');
}

export function hideOverlays() {
  [ovStart, ovLevel, ovEnd, ovError].forEach(o => o.classList.add('hidden'));
}

/* ------------------------------ Oynanış güncelleme ----------------------- */

function popTarget(t, pts) {
  t.popping = 1;
  addScore(pts);
}

function updateClickTargets(cx, cy) {
  const lvl = currentLevel();
  const now = performance.now();

  const progressFactor = Math.min(1, state.levelScore / lvl.goal);
  const interval = lvl.spawnBase - (lvl.spawnBase - lvl.spawnMin) * progressFactor;
  if (now - state.lastSpawn > interval && state.targets.length < 4) {
    spawnTarget();
    state.lastSpawn = now;
  }

  // Hedefler kendiliğinden kaybolmaz — sadece doğru jestle etkileşime girince patlar.
  state.targets.forEach(t => {
    if (t.popping > 0) { t.popping += 1; return; }
    const touching = Math.hypot(cx - t.x, cy - t.y) < t.r + 16;
    if (!touching) return;
    if (t.type === 'hover') popTarget(t, 1);
    else if (t.type === 'left' && state.pinchLeft) popTarget(t, 1);
    else if (t.type === 'right' && state.pinchRight) popTarget(t, 1);
  });
  state.targets = state.targets.filter(t => t.popping < 12);
}

function updateDrag(cx, cy) {
  const task = state.dragTask;
  if (!task || task.done) return;

  if (!task.grabbed) {
    const d = Math.hypot(cx - task.x, cy - task.y);
    if (d < task.r + 18 && state.isFist) task.grabbed = true;
  } else {
    task.x = cx; task.y = cy;
    if (!state.isFist) { // yumruk açıldı = bırak
      const dz = Math.hypot(task.x - task.zoneX, task.y - task.zoneY);
      if (dz < task.zoneR) {
        task.done = true;
        state.dragsCompleted += 1;
        updateProgress();
        checkLevelComplete();
        if (currentLevel() && currentLevel().key === 'drag') {
          setTimeout(() => { if (currentLevel().types[0] === 'drag') spawnDragTask(); }, 400);
        }
      } else {
        task.grabbed = false; task.x = task.ox; task.y = task.oy;
      }
    }
  }

  // Sürükleme seviyesinde bonus sol/sağ tık hedefleri seyrek gelir.
  const levelElapsed = performance.now() - state.levelStartTime;
  if (levelElapsed - state.lastSpawn > 2200 && state.targets.length < 2) {
    state.targets.push({
      type: Math.random() < 0.5 ? 'left' : 'right',
      x: rand(80, game.width - 80), y: rand(140, game.height - 260),
      r: 26, popping: 0,
    });
    state.lastSpawn = levelElapsed;
  }

  state.targets.forEach(t => {
    if (t.popping > 0) { t.popping += 1; return; }
    const touching = Math.hypot(cx - t.x, cy - t.y) < t.r + 14;
    if (!touching) return;
    if (t.type === 'left' && state.pinchLeft) popTarget(t, 1);
    if (t.type === 'right' && state.pinchRight) popTarget(t, 1);
  });
  state.targets = state.targets.filter(t => t.popping < 12);
}

function updateGameplay(cx, cy) {
  const lvl = currentLevel();
  if (lvl.types[0] === 'drag') updateDrag(cx, cy);
  else updateClickTargets(cx, cy);
}

/* --------------------------------- Çizim -------------------------------- */

function drawTargets() {
  const lvl = currentLevel();

  state.targets.forEach(t => {
    const scale = t.popping > 0 ? Math.max(0, 1 - t.popping / 10) : 1;
    gctx.globalAlpha = scale;
    gctx.beginPath();
    gctx.arc(t.x, t.y, t.r * (t.popping > 0 ? 1 + t.popping * 0.06 : 1), 0, 7);
    gctx.fillStyle = COLORS[t.type] || '#1FB6C9';
    gctx.fill();
    gctx.lineWidth = 3;
    gctx.strokeStyle = 'rgba(244,246,242,.5)';
    gctx.stroke();
    gctx.globalAlpha = 1;
  });

  if (lvl && lvl.types[0] === 'drag' && state.dragTask && !state.dragTask.done) {
    const task = state.dragTask;
    gctx.beginPath();
    gctx.arc(task.zoneX, task.zoneY, task.zoneR, 0, 7);
    gctx.strokeStyle = 'rgba(180,226,60,.8)';
    gctx.lineWidth = 3;
    gctx.setLineDash([6, 6]);
    gctx.stroke();
    gctx.setLineDash([]);

    gctx.beginPath();
    gctx.arc(task.x, task.y, task.r, 0, 7);
    gctx.fillStyle = task.grabbed ? '#FFCE73' : COLORS.drag;
    gctx.fill();
    gctx.lineWidth = 3;
    gctx.strokeStyle = 'rgba(244,246,242,.6)';
    gctx.stroke();
  }
}

function drawCursor(cx, cy) {
  gctx.beginPath();
  gctx.arc(cx, cy, 10, 0, 7);
  gctx.fillStyle = state.handVisible ? '#F4F6F2' : 'rgba(244,246,242,.25)';
  gctx.fill();

  gctx.beginPath();
  gctx.arc(cx, cy, state.pinchLeft ? 16 : 22, 0, 7);
  gctx.strokeStyle = state.pinchLeft ? '#B4E23C' : '#1FB6C9';
  gctx.lineWidth = 3;
  gctx.stroke();

  if (state.pinchRight) {
    gctx.beginPath();
    gctx.arc(cx, cy, 30, 0, 7);
    gctx.strokeStyle = '#1FB6C9';
    gctx.lineWidth = 2;
    gctx.stroke();
  }
  if (state.isFist) {
    gctx.beginPath();
    gctx.arc(cx, cy, 26, 0, 7);
    gctx.strokeStyle = '#F5B942';
    gctx.lineWidth = 3;
    gctx.stroke();
  }
}

function drawLockOverlay() {
  gctx.fillStyle = 'rgba(16,32,29,.55)';
  gctx.fillRect(0, 0, game.width, game.height);
  gctx.fillStyle = '#F5B942';
  gctx.font = '600 20px "IBM Plex Mono", monospace';
  gctx.textAlign = 'center';
  gctx.fillText('🔒 Kilitli — açmak için işaret+serçe parmağı 700ms birleştir', game.width / 2, 90);
  gctx.textAlign = 'start';
}

/* ------------------------------- Ana döngü ------------------------------ */

export function loop() {
  requestAnimationFrame(loop);

  // İmleç yumuşatma (lerp).
  state.cursor.x += (state.targetCursor.x - state.cursor.x) * settings.smoothFactor;
  state.cursor.y += (state.targetCursor.y - state.cursor.y) * settings.smoothFactor;
  const cx = state.cursor.x * game.width;
  const cy = state.cursor.y * game.height;

  gctx.clearRect(0, 0, game.width, game.height);

  const handMissing = !state.paused && (performance.now() - state.lastHandTime > 700 || !state.handVisible);
  missHint.style.display = (!state.paused && handMissing) ? 'block' : 'none';

  if (!state.paused && !handMissing && !state.locked) {
    updateGameplay(cx, cy);
  }
  drawTargets();
  drawCursor(cx, cy);

  if (!state.paused && state.locked) {
    drawLockOverlay();
  }
}
