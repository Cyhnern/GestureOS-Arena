/**
 * stats.js
 * Oturum telemetrisi. Oyun sırasında `game.js` bu modüle şu olayları bildirir:
 *   - recordSpawn(type): bir hedef/görev ekrana çıktı
 *   - recordPop(type, reactionMs): bir hedef/görev başarıyla tamamlandı
 *   - recordFrame(dtMs, handVisible, paused): her karede el görünürlüğü/süre
 * Bu ham verilerden, oyun bittiğinde okunabilir bir "oturum özeti" (grade,
 * accuracy, tracking, reaction, en başarılı/geliştirilecek jest vb.) üretir
 * ve localStorage'a yazar. Rapor sayfası (js/report.js) bu veriyi okur.
 *
 * Not: "Speed" ve "Stability" skorları, tepki süresi ve el-takibi kopma
 * sayısından türetilen sezgisel (heuristic) 0-100 ölçekli göstergelerdir;
 * klinik/bilimsel bir ölçüm değil, oyuncuya yön veren bir özet niteliğindedir.
 */

import { GESTURE_LABELS, GRADE_THRESHOLDS, RANK_TITLES, REPORT_KEY } from './config.js';

const GESTURE_KEYS = ['hover', 'left', 'right', 'drag'];

function emptyGestureStats() {
  const o = {};
  GESTURE_KEYS.forEach(k => { o[k] = { spawned: 0, popped: 0, reactionTotal: 0, reactionCount: 0 }; });
  return o;
}

let stats = null;

/** Yeni bir oyun oturumu başlarken çağrılır (resetGame içinden). */
export function resetSessionStats() {
  stats = {
    startTime: performance.now(),
    gesture: emptyGestureStats(),
    trackedMs: 0,
    visibleMs: 0,
    handLossCount: 0,
    wasHandVisible: false,
    levelStats: [],
    currentLevelStat: null,
  };
}

function ensureStats() {
  if (!stats) resetSessionStats();
  return stats;
}

/** Yeni bir seviye başladığında çağrılır; bir önceki seviyenin süresini kapatır. */
export function beginLevelStat(lvl) {
  const s = ensureStats();
  finalizeLevelStat();
  s.currentLevelStat = {
    id: lvl.id, title: lvl.title, goal: lvl.goal,
    spawned: 0, popped: 0, startTime: performance.now(), timeMs: 0,
  };
  s.levelStats.push(s.currentLevelStat);
}

function finalizeLevelStat() {
  const s = stats;
  if (s && s.currentLevelStat) {
    s.currentLevelStat.timeMs = Math.round(performance.now() - s.currentLevelStat.startTime);
  }
}

/** Bir hedef/görev ekrana çıktığında çağrılır. */
export function recordSpawn(type) {
  const s = ensureStats();
  if (!s.gesture[type]) return;
  s.gesture[type].spawned++;
  if (s.currentLevelStat) s.currentLevelStat.spawned++;
}

/** Bir hedef/görev başarıyla tamamlandığında çağrılır. reactionMs opsiyoneldir. */
export function recordPop(type, reactionMs) {
  const s = ensureStats();
  const g = s.gesture[type];
  if (!g) return;
  g.popped++;
  if (typeof reactionMs === 'number' && reactionMs >= 0) {
    g.reactionTotal += reactionMs;
    g.reactionCount++;
  }
  if (s.currentLevelStat) s.currentLevelStat.popped++;
}

/** Ana render döngüsünden her karede çağrılır; el takibi süresini biriktirir. */
export function recordFrame(dtMs, handVisible, paused) {
  const s = ensureStats();
  if (paused) { s.wasHandVisible = handVisible; return; }
  s.trackedMs += dtMs;
  if (handVisible) s.visibleMs += dtMs;
  if (s.wasHandVisible && !handVisible) s.handLossCount++;
  s.wasHandVisible = handVisible;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function computeGrade(overall) {
  for (const t of GRADE_THRESHOLDS) if (overall >= t.min) return t.label;
  return GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1].label;
}

/**
 * Oyun bittiğinde (tamamlanmış ya da yarım kalmış) çağrılır; tüm ham
 * telemetriyi okunabilir bir özet nesnesine dönüştürür.
 */
export function computeSessionSummary(finalScore, completed) {
  const s = ensureStats();
  finalizeLevelStat();
  const durationMs = Math.round(performance.now() - s.startTime);

  let totalSpawned = 0, totalPopped = 0, reactionTotal = 0, reactionCount = 0;
  const gestureStats = {};
  GESTURE_KEYS.forEach(k => {
    const g = s.gesture[k];
    totalSpawned += g.spawned; totalPopped += g.popped;
    reactionTotal += g.reactionTotal; reactionCount += g.reactionCount;
    const rate = g.spawned > 0 ? Math.round((g.popped / g.spawned) * 100) : null;
    gestureStats[k] = { spawned: g.spawned, popped: g.popped, rate };
  });

  const accuracy = totalSpawned > 0 ? Math.round((totalPopped / totalSpawned) * 100) : 0;
  const tracking = s.trackedMs > 0 ? Math.round((s.visibleMs / s.trackedMs) * 100) : 0;
  const avgReactionMs = reactionCount > 0 ? Math.round(reactionTotal / reactionCount) : null;

  // Radar için 0-100 ölçekli "hız" ve "stabilite" göstergeleri (bkz. dosya başı not).
  const speedScore = avgReactionMs != null
    ? clamp(Math.round(100 - (avgReactionMs - 300) / 15), 0, 100)
    : 50;
  const stabilityScore = clamp(100 - s.handLossCount * 6, 0, 100);

  const overall = Math.round((accuracy + tracking + speedScore + stabilityScore) / 4);
  const grade = computeGrade(overall);
  const rankTitle = RANK_TITLES[grade] || RANK_TITLES.D;

  // En başarılı / geliştirilecek jest — en az 2 denemesi olan türler arasından.
  const withData = GESTURE_KEYS
    .map(k => ({ key: k, label: GESTURE_LABELS[k], rate: gestureStats[k].rate }))
    .filter(g => g.rate != null && s.gesture[g.key].spawned >= 2);
  const bestGesture = withData.length ? withData.reduce((a, b) => (b.rate > a.rate ? b : a)) : null;
  const weakGesture = withData.length ? withData.reduce((a, b) => (b.rate < a.rate ? b : a)) : null;

  return {
    date: new Date().toISOString(),
    completed: !!completed,
    durationMs,
    score: finalScore,
    accuracy, tracking, avgReactionMs, overall, grade, rankTitle,
    bestGesture, weakGesture,
    radar: { accuracy, tracking, speed: speedScore, stability: stabilityScore },
    gestureStats,
    levels: s.levelStats.map(l => ({
      id: l.id, title: l.title, goal: l.goal,
      score: Math.min(l.popped, l.goal), spawned: l.spawned, timeMs: l.timeMs,
    })),
  };
}

/** Oturum özetini localStorage geçmişine ekler (en fazla 25 kayıt tutulur). */
export function saveSessionToStorage(summary) {
  try {
    const existing = JSON.parse(localStorage.getItem(REPORT_KEY) || '[]');
    existing.push(summary);
    while (existing.length > 25) existing.shift();
    localStorage.setItem(REPORT_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('Oturum raporu kaydedilemedi:', e);
  }
}
