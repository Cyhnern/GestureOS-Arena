/**
 * pdf.js
 * jsPDF (CDN üzerinden yüklenen `window.jspdf` global'i) kullanarak bir
 * oturum özetini indirilebilir bir PDF'e dönüştürür. Hem oyunun bitiş
 * ekranından hem de ayrıntılı rapor sayfasından çağrılabilecek şekilde
 * bağımsız (self-contained) yazılmıştır — yalnızca `summary` nesnesine
 * ihtiyaç duyar (bkz. stats.js -> computeSessionSummary).
 */

function fmtDuration(ms) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60), r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

/** @param {ReturnType<typeof import('./stats.js').computeSessionSummary>} summary */
export function downloadSessionPDF(summary) {
  const jspdfNs = window.jspdf;
  if (!jspdfNs || !jspdfNs.jsPDF) {
    alert('PDF kütüphanesi yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    return;
  }
  const { jsPDF } = jspdfNs;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = 56;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('GestureOS Arena — Performans Raporu', 40, y);
  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(new Date(summary.date).toLocaleString('tr-TR'), 40, y);
  doc.setTextColor(0);
  y += 32;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(`Rütbe: ${summary.grade} — ${summary.rankTitle}`, 40, y);
  y += 28;

  const rows = [
    ['Skor', String(summary.score)],
    ['Doğruluk (Accuracy)', summary.accuracy + '%'],
    ['El Takibi (Tracking)', summary.tracking + '%'],
    ['Ortalama Tepki Süresi', summary.avgReactionMs != null ? summary.avgReactionMs + ' ms' : '—'],
    ['Toplam Süre', fmtDuration(summary.durationMs)],
    ['Durum', summary.completed ? 'Tamamlandı' : 'Yarım kaldı'],
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  rows.forEach(([label, value]) => {
    doc.setTextColor(90);
    doc.text(label, 40, y);
    doc.setTextColor(0);
    doc.text(String(value), 260, y);
    y += 20;
  });

  y += 12;
  if (summary.bestGesture) {
    doc.setTextColor(80, 140, 40);
    doc.text(`✓ En başarılı hareket: ${summary.bestGesture.label} (${summary.bestGesture.rate}%)`, 40, y);
    y += 18;
  }
  if (summary.weakGesture) {
    doc.setTextColor(180, 70, 40);
    doc.text(`• Geliştirilecek alan: ${summary.weakGesture.label} (${summary.weakGesture.rate}%)`, 40, y);
    y += 18;
  }
  doc.setTextColor(0);
  y += 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Seviye Bazlı Sonuçlar', 40, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  (summary.levels || []).forEach(l => {
    doc.text(`Seviye ${l.id} — ${l.title}: ${l.score}/${l.goal}  (${Math.round((l.timeMs || 0) / 1000)} sn)`, 44, y);
    y += 16;
  });

  y += 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Jest Bazlı Doğruluk', 40, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  Object.entries(summary.gestureStats || {}).forEach(([key, g]) => {
    if (g.spawned === 0) return;
    doc.text(`${key}: ${g.popped}/${g.spawned}  (${g.rate ?? '—'}%)`, 44, y);
    y += 16;
  });

  doc.save(`gestureos-arena-rapor-${Date.now()}.pdf`);
}
