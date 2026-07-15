/**
 * ui.js
 * Kullanıcı etkileşimlerini (butonlar, slider'lar, kamera seçimi, PDF indirme)
 * diğer modüllerdeki fonksiyonlara bağlar. DOM olaylarının tek toplandığı yer.
 */

import { SENS_LABELS, SMOOTH_LABELS } from './config.js';
import { setSensitivity, setSmoothness } from './state.js';
import {
  gearBtn, settingsPanel, sensSlider, sensVal, smoothSlider, smoothVal,
  permBtn, camPicker, camSelect, startBtn, errMsg,
  lvContinueBtn, restartBtn, pdfBtn, ovError,
} from './dom.js';
import { listCameras, pickDefaultCamera, startStream } from './gestures.js';
import {
  resetGame, startLevel, loop, showOverlay, hideOverlays, resizeCanvases, getLastSummary,
} from './game.js';
import { downloadSessionPDF } from './pdf.js';
import { computeSessionSummary, saveSessionToStorage } from './stats.js';
import { state } from './state.js';

function wireSettingsPanel() {
  gearBtn.addEventListener('click', () => settingsPanel.classList.toggle('open'));

  sensSlider.addEventListener('input', (e) => {
    const i = Number(e.target.value) - 1;
    setSensitivity(i);
    sensVal.textContent = SENS_LABELS[i];
  });

  smoothSlider.addEventListener('input', (e) => {
    const i = Number(e.target.value) - 1;
    setSmoothness(i);
    smoothVal.textContent = SMOOTH_LABELS[i];
  });
}

function wireStartFlow() {
  permBtn.addEventListener('click', async () => {
    try {
      const cams = await listCameras();
      camSelect.innerHTML = cams
        .map((c, i) => `<option value="${c.deviceId}">${c.label || 'Kamera ' + (i + 1)}</option>`)
        .join('');

      const def = pickDefaultCamera(cams);
      if (def) camSelect.value = def.deviceId;

      camPicker.style.display = 'block';
      permBtn.style.display = 'none';
    } catch (err) {
      errMsg.textContent = 'Kamera izni alınamadı: ' + (err?.message || 'bilinmeyen hata');
      showOverlay(ovError);
    }
  });

  startBtn.addEventListener('click', async () => {
    try {
      await startStream(camSelect.value);
      hideOverlays();
      resetGame();
      startLevel(0);
      requestAnimationFrame(loop);
    } catch (err) {
      errMsg.textContent = 'Kamera başlatılamadı: ' + (err?.message || 'bilinmeyen hata');
      showOverlay(ovError);
    }
  });
}

function wireLevelAndRestart() {
  lvContinueBtn.addEventListener('click', () => {
    hideOverlays();
    state.paused = false;
    state.lastHandTime = performance.now();
  });

  restartBtn.addEventListener('click', () => {
    resetGame();
    startLevel(0);
  });
}

function wirePdfButton() {
  pdfBtn.addEventListener('click', () => {
    const summary = getLastSummary();
    if (summary) downloadSessionPDF(summary);
  });
}

/**
 * Oyuncu sekmeyi kapatır/yeniler ve oyunu tamamlamadan ayrılırsa, o ana kadarki
 * oturumu da "yarım kaldı" olarak rapora kaydeder — böylece analiz sayfası hiç
 * boş kalmaz.
 */
function wirePartialSessionSave() {
  window.addEventListener('beforeunload', () => {
    if (!state.paused) {
      const summary = computeSessionSummary(state.score, false);
      saveSessionToStorage(summary);
    }
  });
}

/** Uygulamanın tüm olay dinleyicilerini kurar. `main.js` tarafından çağrılır. */
export function initUI() {
  window.addEventListener('resize', resizeCanvases);
  resizeCanvases();

  wireSettingsPanel();
  wireStartFlow();
  wireLevelAndRestart();
  wirePdfButton();
  wirePartialSessionSave();
}
