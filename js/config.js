/**
 * config.js
 * Oyunun sabit ayarları: seviye tanımları, hassasiyet ve yumuşatma tabloları.
 * Başka hiçbir modüle bağımlı değildir.
 */

export const LEVELS = [
  {
    id: 1, key: 'cursor', eyebrow: 'SEVİYE 1', title: 'İmleç Kontrolü', icon: '✋',
    desc: 'Sağ elini aç, kameraya göster ve imleci hedeflerin üzerine götürerek topla. Henüz tıklama yok, hedefler kendiliğinden kaybolmaz — acele etme.',
    legend: [{ c: 'var(--cyan)', t: 'El açık, değince toplanır' }],
    goal: 10, spawnBase: 1050, spawnMin: 600, types: ['hover'],
  },
  {
    id: 2, key: 'left', eyebrow: 'SEVİYE 2', title: 'Sol Tık', icon: '🤏',
    desc: 'Başparmak + işaret parmağını kısa süreliğine birleştirerek (pinch) hedeflere sol tıkla.',
    legend: [{ c: 'var(--cyan)', t: 'Sol tık: başparmak+işaret' }],
    goal: 12, spawnBase: 1000, spawnMin: 520, types: ['left'],
  },
  {
    id: 3, key: 'mixed', eyebrow: 'SEVİYE 3', title: 'Sol Tık + Sağ Tık', icon: '🖐️',
    desc: 'Turkuaz hedeflere başparmak+işaret ile sol tık, yeşil hedeflere başparmak+orta parmak ile sağ tık yap.',
    legend: [{ c: 'var(--cyan)', t: 'Sol tık' }, { c: 'var(--lime)', t: 'Sağ tık: başparmak+orta' }],
    goal: 15, spawnBase: 900, spawnMin: 480, types: ['left', 'right'],
  },
  {
    id: 4, key: 'drag', eyebrow: 'SEVİYE 4', title: 'Sürükleme Ustası', icon: '✊',
    desc: 'Sağ yumruğunu yaparak (Fist) turuncu topu kavra, yeşil daireye sürükle, elini açarak bırak.',
    legend: [{ c: 'var(--gold)', t: 'Yumruk=tut, el aç=bırak' }, { c: 'var(--cyan)', t: 'Bonus: sol/sağ tık' }],
    goal: 5, spawnBase: 1500, spawnMin: 1000, types: ['drag'],
  },
];

/** Pinch (tıklama) hassasiyet seçenekleri — index 0=kolay, 2=zor. */
export const SENS_LABELS = ['Yüksek', 'Orta', 'Düşük'];
export const SENS_THRESH = [0.75, 0.62, 0.5];

/** İmleç yumuşatma (lerp) seçenekleri — index 0=hızlı/az yumuşak, 2=çok yumuşak. */
export const SMOOTH_LABELS = ['Hızlı', 'Orta', 'Yumuşak'];
export const SMOOTH_VALS = [0.5, 0.32, 0.18];

/** Kilit jesti için gereken basılı tutma süresi (ms). */
export const LOCK_HOLD_MS = 700;

/** Varsayılan ayar paneli index'i (0=ilk seçenek, 1=orta, 2=son). */
export const DEFAULT_SETTING_INDEX = 1;
