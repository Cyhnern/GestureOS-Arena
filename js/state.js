/**
 * state.js
 * Tek gerçek kaynak (single source of truth): oyunun çalışma zamanı durumu
 * ve kullanıcı ayarları. Diğer modüller bu nesneleri import edip okur/günceller.
 */

import { SENS_THRESH, SMOOTH_VALS, DEFAULT_SETTING_INDEX } from './config.js';

/** Kullanıcının ayarlanabilir hassasiyet/yumuşatma değerleri. */
export const settings = {
  pinchEngageRatio: SENS_THRESH[DEFAULT_SETTING_INDEX],
  pinchReleaseRatio: SENS_THRESH[DEFAULT_SETTING_INDEX] + 0.18,
  smoothFactor: SMOOTH_VALS[DEFAULT_SETTING_INDEX],
};

/** @param {number} index - SENS_THRESH içindeki seçenek index'i */
export function setSensitivity(index) {
  settings.pinchEngageRatio = SENS_THRESH[index];
  settings.pinchReleaseRatio = settings.pinchEngageRatio + 0.18;
}

/** @param {number} index - SMOOTH_VALS içindeki seçenek index'i */
export function setSmoothness(index) {
  settings.smoothFactor = SMOOTH_VALS[index];
}

/** Oyunun anlık durumu: skor, seviye, el/jest algılama sonuçları, hedefler. */
export const state = {
  levelIndex: 0, score: 0, levelScore: 0,
  paused: true,

  cursor: { x: 0.5, y: 0.5 },
  targetCursor: { x: 0.5, y: 0.5 },

  handVisible: false, lastHandTime: 0,
  pinchLeft: false, pinchRight: false, isFist: false,

  locked: false, lockPinchActive: false, lockPinchStartTime: 0, lockArmed: true,

  targets: [], dragTask: null, dragsCompleted: 0,
  lastSpawn: 0, levelStartTime: 0,
};

/** Skoru, seviyeyi ve hedefleri tamamen sıfırlar (yeni oyun / yeniden başlatma). */
export function resetGameState() {
  state.levelIndex = 0;
  state.score = 0;
  state.levelScore = 0;
  state.targets = [];
  state.dragTask = null;
  state.dragsCompleted = 0;
  state.locked = false;
  state.lockPinchActive = false;
  state.lockArmed = true;
}
