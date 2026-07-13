/**
 * gestures.js
 * Kamera akışını başlatma, MediaPipe Hands entegrasyonu ve el iskeletinden
 * jest çıkarımı (pinch/sol tık, sağ tık, yumruk, kilit). `window.Hands` global
 * nesnesi index.html'deki CDN <script> etiketinden gelir.
 */

import { LOCK_HOLD_MS } from './config.js';
import { state, settings } from './state.js';
import { video, skelCanvas, skelCtx, dotHand, dotLeft, dotRight, dotFist, dotLock } from './dom.js';

/** İki normalize landmark noktası arasındaki Öklid mesafesi. */
export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Parmak uçlarının bileğe göre kıvrılma durumuna bakarak yumruk (fist) tespiti. */
export function isFistGesture(lm) {
  const tips = [8, 12, 16, 20];
  const mcps = [5, 9, 13, 17];
  let curled = 0;
  tips.forEach((tipIdx, i) => {
    const dTip = dist(lm[tipIdx], lm[0]);
    const dMcp = dist(lm[mcps[i]], lm[0]);
    if (dTip < dMcp * 1.05) curled++;
  });
  return curled >= 3;
}

/** Kamera önizlemesindeki mini el iskeletini çizer (21 nokta, aynalı). */
export function drawSkeleton(lm) {
  const w = skelCanvas.width, h = skelCanvas.height;
  const CONN = [
    [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12], [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20], [5, 9], [9, 13], [13, 17],
  ];
  skelCtx.strokeStyle = 'rgba(31,182,201,.55)';
  skelCtx.lineWidth = 2;
  CONN.forEach(([a, b]) => {
    skelCtx.beginPath();
    skelCtx.moveTo((1 - lm[a].x) * w, lm[a].y * h);
    skelCtx.lineTo((1 - lm[b].x) * w, lm[b].y * h);
    skelCtx.stroke();
  });
  lm.forEach(p => {
    skelCtx.beginPath();
    skelCtx.arc((1 - p.x) * w, p.y * h, 3, 0, 7);
    skelCtx.fillStyle = '#B4E23C';
    skelCtx.fill();
  });
}

/** Jest durum panosundaki gösterge noktalarını günceller. */
export function updateHudDots() {
  dotHand.classList.toggle('on', state.handVisible);
  dotLeft.classList.toggle('on', state.pinchLeft);
  dotRight.classList.toggle('on', state.pinchRight);
  dotFist.classList.toggle('on', state.isFist);
  dotLock.classList.toggle('on', state.locked);
}

/**
 * MediaPipe Hands sonuç callback'i. Her karede çağrılır, landmark'lardan
 * pinch/yumruk/kilit durumlarını çıkarır ve imleç konumunu günceller.
 */
export function onResults(results) {
  const lm = results.multiHandLandmarks && results.multiHandLandmarks[0];
  skelCtx.clearRect(0, 0, skelCanvas.width, skelCanvas.height);

  if (lm) {
    state.handVisible = true;
    state.lastHandTime = performance.now();

    const handSize = Math.max(dist(lm[0], lm[9]), 0.03);
    const pIndex = dist(lm[4], lm[8]) / handSize;   // başparmak+işaret
    const pMiddle = dist(lm[4], lm[12]) / handSize; // başparmak+orta
    const pPinky = dist(lm[4], lm[20]) / handSize;  // başparmak+serçe (kilit)

    // Hysteresis: açılma eşiği kapanma eşiğinden yüksek tutulur, titremeyi önler.
    state.pinchLeft = state.pinchLeft
      ? (pIndex < settings.pinchReleaseRatio)
      : (pIndex < settings.pinchEngageRatio);
    state.pinchRight = state.pinchRight
      ? (pMiddle < settings.pinchReleaseRatio)
      : (pMiddle < settings.pinchEngageRatio);
    state.isFist = isFistGesture(lm);

    // Kilit jesti: işaret+serçe pinch'i LOCK_HOLD_MS boyunca basılı tutulmalı.
    const pinchLockNow = pPinky < settings.pinchEngageRatio;
    if (pinchLockNow) {
      if (!state.lockPinchActive) {
        state.lockPinchActive = true;
        state.lockPinchStartTime = performance.now();
      } else if (state.lockArmed && performance.now() - state.lockPinchStartTime > LOCK_HOLD_MS) {
        state.locked = !state.locked;
        state.lockArmed = false; // tekrar tetiklenmeden önce jestin bırakılması gerekir
      }
    } else {
      state.lockPinchActive = false;
      state.lockArmed = true;
    }

    // Aynalı x koordinatı (doğal/selfie his için). Kilitliyken imleç dondurulur.
    if (!state.locked) {
      state.targetCursor.x = 1 - lm[8].x;
      state.targetCursor.y = lm[8].y;
    }

    drawSkeleton(lm);
  } else if (performance.now() - state.lastHandTime > 700) {
    state.handVisible = false;
    state.pinchLeft = false;
    state.pinchRight = false;
    state.isFist = false;
  }

  updateHudDots();
}

let hands = null;
let activeStream = null;
let frameLoopRunning = false;

/** MediaPipe Hands modelini bir kez kurar (tekrar çağrılırsa no-op). */
export function initHandsModel() {
  if (hands) return;
  hands = new Hands({
    locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
  });
  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.6,
  });
  hands.onResults(onResults);
}

/** Kısa bir izin isteğiyle mevcut kamera cihazlarını (etiketleriyle) listeler. */
export async function listCameras() {
  const tmp = await navigator.mediaDevices.getUserMedia({ video: true });
  tmp.getTracks().forEach(t => t.stop());
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter(d => d.kind === 'videoinput');
}

/** Sanal kamera yazılımlarını (DroidCam, OBS vb.) eleyerek en olası gerçek kamerayı seçer. */
export function pickDefaultCamera(cams) {
  const virtualCameraPattern = /droidcam|obs|virtual|iriun|epoccam/i;
  const real = cams.find(c => !virtualCameraPattern.test(c.label));
  return real || cams[0];
}

/** Seçilen kamerayla akışı başlatır ve MediaPipe'a kare göndermeye başlar. */
export async function startStream(deviceId) {
  if (activeStream) activeStream.getTracks().forEach(t => t.stop());

  activeStream = await navigator.mediaDevices.getUserMedia({
    video: deviceId ? { deviceId: { exact: deviceId } } : true,
  });
  video.srcObject = activeStream;
  await video.play();

  initHandsModel();

  if (!frameLoopRunning) {
    frameLoopRunning = true;
    const pump = async () => {
      if (video.readyState >= 2) await hands.send({ image: video });
      requestAnimationFrame(pump);
    };
    pump();
  }
}
