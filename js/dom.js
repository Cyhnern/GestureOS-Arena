/**
 * dom.js
 * Tüm document.getElementById çağrıları burada toplanır — böylece bir HTML id'si
 * değiştiğinde tek bir dosya güncellenir. Diğer modüller elementlere buradan erişir.
 */

// Video / canvas
export const video = document.getElementById('video');
export const skelCanvas = document.getElementById('skel');
export const skelCtx = skelCanvas.getContext('2d');
export const game = document.getElementById('game');
export const gctx = game.getContext('2d');

// HUD
export const hudLevel = document.getElementById('hud-level');
export const hudScore = document.getElementById('hud-score');
export const progressFill = document.getElementById('progressFill');
export const progressLabel = document.getElementById('progressLabel');
export const missHint = document.getElementById('missHint');

// Jest durum panosu
export const dotHand = document.getElementById('dotHand');
export const dotLeft = document.getElementById('dotLeft');
export const dotRight = document.getElementById('dotRight');
export const dotFist = document.getElementById('dotFist');
export const dotLock = document.getElementById('dotLock');

// Ayar paneli
export const gearBtn = document.getElementById('gearBtn');
export const settingsPanel = document.getElementById('settingsPanel');
export const sensSlider = document.getElementById('sensSlider');
export const sensVal = document.getElementById('sensVal');
export const smoothSlider = document.getElementById('smoothSlider');
export const smoothVal = document.getElementById('smoothVal');

// Overlay'ler
export const ovStart = document.getElementById('ov-start');
export const ovLevel = document.getElementById('ov-level');
export const ovEnd = document.getElementById('ov-end');
export const ovError = document.getElementById('ov-error');

// Başlangıç ekranı
export const permBtn = document.getElementById('permBtn');
export const camPicker = document.getElementById('camPicker');
export const camSelect = document.getElementById('camSelect');
export const startBtn = document.getElementById('startBtn');

// Seviye giriş ekranı
export const lvEyebrow = document.getElementById('lv-eyebrow');
export const lvIcon = document.getElementById('lv-icon');
export const lvTitle = document.getElementById('lv-title');
export const lvDesc = document.getElementById('lv-desc');
export const lvLegend = document.getElementById('lv-legend');
export const lvContinueBtn = document.getElementById('lv-continue');

// Bitiş ekranı
export const endScore = document.getElementById('end-score');
export const restartBtn = document.getElementById('restartBtn');

// Hata ekranı
export const errMsg = document.getElementById('err-msg');
