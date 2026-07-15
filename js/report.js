/**
 * report.js
 * Rapor sayfasının (gestureos-okul-raporu.html) mantığı. `js/config.js` ve
 * `js/pdf.js` — oyunun kendi kullandığı AYNI modüller — buradan da import
 * edilir; böylece rütbe/etiket/PDF mantığı tek bir yerde tanımlı kalır ve
 * burada tekrarlanmaz. localStorage'dan oturum geçmişini
 * okuyup son oturumu bir dashboard olarak (tablo + radar grafik) çizer.
 */

import { REPORT_KEY, GESTURE_LABELS } from './config.js';
import { downloadSessionPDF } from './pdf.js';

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(REPORT_KEY) || '[]');
  } catch (e) {
    console.warn('Oturum verisi okunamadı:', e);
    return [];
  }
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(ms) {
  const s = Math.round(ms / 1000), m = Math.floor(s / 60), r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function badgeFor(rate) {
  if (rate == null) return '<span class="badge mid">—</span>';
  if (rate >= 75) return `<span class="badge ok">${rate}%</span>`;
  if (rate >= 45) return `<span class="badge mid">${rate}%</span>`;
  return `<span class="badge low">${rate}%</span>`;
}

function renderEmptyState() {
  document.getElementById('performanceContent').innerHTML = `
    <div class="empty-state">
      <div class="emoji">🎮</div>
      <h3>Henüz bir oyun oturumu kaydı yok</h3>
      <p>Performans analizinin oluşması için önce GestureOS Arena'yı en az bir kez oynaman gerekiyor. Oynadıkça buradaki rapor otomatik olarak güncellenir.</p>
      <a class="btn" href="index.html">Oyunu Oyna →</a>
    </div>`;
}

/* ------------------------------- Radar grafiği ------------------------------- */

function drawRadarChart(canvas, values, labels) {
  const dpr = window.devicePixelRatio || 1;
  const size = Math.min(canvas.clientWidth || 320, 320) || 320;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.height = size + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2, cy = size / 2, radius = size / 2 - 44;
  const n = values.length;
  const angleStep = (Math.PI * 2) / n;
  const startAngle = -Math.PI / 2;

  // Arka plan halkaları (25/50/75/100%)
  ctx.strokeStyle = 'rgba(201,210,204,.55)';
  ctx.lineWidth = 1;
  [0.25, 0.5, 0.75, 1].forEach(f => {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = startAngle + i * angleStep;
      const r = radius * f;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  });

  // Eksenler ve etiketler
  ctx.fillStyle = '#4B5C57';
  ctx.font = '600 12px "IBM Plex Mono", monospace';
  for (let i = 0; i < n; i++) {
    const a = startAngle + i * angleStep;
    const x = cx + Math.cos(a) * radius, y = cy + Math.sin(a) * radius;
    ctx.strokeStyle = 'rgba(201,210,204,.55)';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();

    const lx = cx + Math.cos(a) * (radius + 24), ly = cy + Math.sin(a) * (radius + 24);
    ctx.textAlign = Math.abs(Math.cos(a)) < 0.25 ? 'center' : (Math.cos(a) > 0 ? 'left' : 'right');
    ctx.fillText(labels[i], lx, ly + 4);
  }

  // Veri poligonu
  ctx.beginPath();
  values.forEach((v, i) => {
    const a = startAngle + i * angleStep;
    const r = radius * (Math.max(0, Math.min(100, v)) / 100);
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(31,182,201,.28)';
  ctx.strokeStyle = '#1FB6C9';
  ctx.lineWidth = 2.5;
  ctx.fill();
  ctx.stroke();

  // Veri noktaları
  values.forEach((v, i) => {
    const a = startAngle + i * angleStep;
    const r = radius * (Math.max(0, Math.min(100, v)) / 100);
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 7);
    ctx.fillStyle = '#12848F';
    ctx.fill();
  });
  ctx.textAlign = 'start';
}

/* ------------------------------- Dashboard render ------------------------------- */

function renderDashboard(summary) {
  const el = document.getElementById('performanceContent');
  const statusBadge = summary.completed
    ? '<span class="badge ok">Tamamlandı</span>'
    : '<span class="badge mid">Yarım kaldı</span>';

  el.innerHTML = `
    <p class="session-meta">
      Son oturum: ${fmtDate(summary.date)} — ${statusBadge} — Rütbe: <b>${summary.grade} · ${summary.rankTitle}</b>
    </p>

    <div class="dash-grid">
      <table class="r-table stat-table">
        <tbody>
          <tr><th>Skor</th><td class="num">${summary.score}</td></tr>
          <tr><th>Doğruluk (Accuracy)</th><td class="num">${badgeFor(summary.accuracy)}</td></tr>
          <tr><th>El Takibi (Tracking)</th><td class="num">${badgeFor(summary.tracking)}</td></tr>
          <tr><th>Ort. Tepki Süresi</th><td class="num">${summary.avgReactionMs != null ? summary.avgReactionMs + ' ms' : '—'}</td></tr>
          <tr><th>Rütbe (Grade)</th><td class="num">${summary.grade}</td></tr>
          <tr><th>Toplam Süre</th><td class="num">${fmtDuration(summary.durationMs)}</td></tr>
        </tbody>
      </table>
      <div class="chart-wrap radar-wrap"><canvas id="radarChart"></canvas></div>
    </div>

    <div class="insight-row">
      <div class="insight-card good">
        <div class="insight-label">En Başarılı Hareket</div>
        <div class="insight-value">${summary.bestGesture ? `✓ ${summary.bestGesture.label} (${summary.bestGesture.rate}%)` : 'Yeterli veri yok'}</div>
      </div>
      <div class="insight-card bad">
        <div class="insight-label">Geliştirilecek Alan</div>
        <div class="insight-value">${summary.weakGesture ? `• ${summary.weakGesture.label} (${summary.weakGesture.rate}%)` : 'Yeterli veri yok'}</div>
      </div>
    </div>

    <table class="r-table" style="margin-top:20px;">
      <thead><tr><th>Jest</th><th class="num">Denenen</th><th class="num">Başarılı</th><th class="num">Oran</th></tr></thead>
      <tbody>
        ${Object.entries(summary.gestureStats || {})
          .filter(([, g]) => g.spawned > 0)
          .map(([key, g]) => `
            <tr>
              <td>${GESTURE_LABELS[key] || key}</td>
              <td class="num">${g.spawned}</td>
              <td class="num">${g.popped}</td>
              <td class="num">${badgeFor(g.rate)}</td>
            </tr>`).join('')}
      </tbody>
    </table>

    <table class="r-table" style="margin-top:20px;">
      <thead><tr><th>Seviye</th><th class="num">Skor</th><th class="num">Süre</th></tr></thead>
      <tbody>
        ${(summary.levels || []).map(l => `
          <tr>
            <td>Seviye ${l.id} — ${l.title}</td>
            <td class="num">${l.score} / ${l.goal}</td>
            <td class="num">${fmtDuration(l.timeMs || 0)}</td>
          </tr>`).join('')}
      </tbody>
    </table>

    <div style="margin-top:20px;">
      <button class="btn" id="reportPdfBtn">📄 PDF İndir</button>
    </div>
  `;

  drawRadarChart(
    document.getElementById('radarChart'),
    [summary.radar.accuracy, summary.radar.tracking, summary.radar.speed, summary.radar.stability],
    ['Accuracy', 'Tracking', 'Speed', 'Stability']
  );

  document.getElementById('reportPdfBtn').addEventListener('click', () => downloadSessionPDF(summary));
}

function renderHistory(sessions) {
  const wrap = document.getElementById('historyContent');
  if (sessions.length <= 1) {
    wrap.innerHTML = `<p style="color:var(--ink-soft); font-size:13.5px;">Geçmiş karşılaştırması için en az iki oturum gerekli. Oynamaya devam ettikçe burada ilerleme geçmişini göreceksin.</p>`;
    return;
  }
  const rows = sessions.slice().reverse().slice(0, 10).map(s => {
    const status = s.completed ? '<span class="badge ok">Tamamlandı</span>' : '<span class="badge mid">Yarım</span>';
    return `<div class="session-row">
      <span class="s-date">${fmtDate(s.date)}</span>
      <span class="s-score">${s.score} puan</span>
      <span>${s.grade}</span>
      <span class="s-status">${status}</span>
    </div>`;
  }).join('');
  wrap.innerHTML = `<div class="session-list">${rows}</div>`;
}

// Sayfadaki inline onclick bu global fonksiyonu çağırır (type=module scope dışı erişim için).
window.clearReportData = function clearReportData() {
  if (confirm('Tüm kayıtlı oturum verilerini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
    localStorage.removeItem(REPORT_KEY);
    init();
  }
};

function init() {
  const sessions = loadSessions();
  if (sessions.length === 0) {
    renderEmptyState();
    document.getElementById('historyContent').innerHTML = '';
    document.getElementById('resetBtnWrap').style.display = 'none';
    return;
  }
  document.getElementById('resetBtnWrap').style.display = 'block';
  renderDashboard(sessions[sessions.length - 1]);
  renderHistory(sessions);
}

document.addEventListener('DOMContentLoaded', init);
