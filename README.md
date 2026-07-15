# GestureOS Arena

El hareketiyle bilgisayar kontrolünü öğreten, kamera tabanlı, kademeli zorlukta bir tarayıcı
oyunu. GestureOS masaüstü uygulamasının jest sistemini (sol/sağ tık, sürükleme, kilit)
çocukların güvenli ve eğlenceli bir ortamda deneyebilmesi için geliştirildi.

Oynanan her oturumun performansı (jest doğruluğu, el takibi kalitesi, tepki süresi, rütbe)
otomatik olarak analiz edilir ve hem oyun içi bir "Mission Complete" ekranında hem de ayrı bir
rapor sayfasında (dashboard + radar grafik + PDF) gösterilir.

## Proje Tanıtımı

**Amaç:** GestureOS'un temel komutlarını canlı, oyunlaştırılmış bir arayüzde göstermek;
okullara yapılacak tanıtımlarda öğrencilerin "gerçekten çalışıyor mu?" sorusuna kendi
elleriyle cevap bulmasını sağlamak.

**Nasıl çalışır:** Tarayıcı, kullanıcının web kamerasından aldığı görüntüyü
[MediaPipe Hands](https://developers.google.com/mediapipe) ile işleyerek 21 noktalık bir el
iskeletine dönüştürür. Parmak uçları arasındaki mesafeler (el büyüklüğüne göre normalize
edilmiş) belirli jestleri (pinch, yumruk vb.) tetikler; bu jestler oyun içinde imleç hareketi,
tıklama ve sürükleme eylemlerine çevrilir. Tüm işlem kullanıcının kendi tarayıcısında
gerçekleşir — görüntü hiçbir sunucuya gönderilmez veya kaydedilmez.

**Jest haritası (GestureOS ana uygulamasıyla birebir):**

| Jest                                    | Aksiyon                         |
| ---------------------------------------- | -------------------------------- |
| El açık, hareket                         | İmleç hareketi                   |
| Başparmak + işaret parmağı pinch (kısa)  | Sol tık                          |
| Başparmak + orta parmak pinch            | Sağ tık                          |
| Yumruk (Fist)                            | Sürükle (tut) / El açma = bırak  |
| İşaret + serçe parmak pinch, 700ms+      | İmleç kilidi aç/kapat            |

**Seviye akışı:** Oyun 4 seviyede kademeli olarak zorlaşır — önce sadece imleç kontrolü,
sonra sol tık, sonra sol+sağ tık karışık hedefler, son olarak yumrukla sürükleme. Her
seviyede skor arttıkça hedeflerin çıkış hızı artar.

## Performans Analizi

Oyun sırasında `js/stats.js`, her hedef/görevin ekrana çıkışını, başarıyla tamamlanışını ve
elin ne kadar süre görünür kaldığını kaydeder. Oyun bittiğinde (ya da sekme kapatılıp yarım
bırakıldığında) bu ham veriden gerçek bir **oturum özeti** üretilir:

| Metrik                | Ölçüm Yöntemi                                                            |
| --------------------- | -------------------------------------------------------------------------- |
| **Accuracy**           | Başarıyla tamamlanan hedef/görev oranı (genel ve jest bazında)             |
| **Tracking**           | Aktif oynanış süresinin ne kadarında el kesintisiz görüldüğü               |
| **Reaction**           | Hedefin çıkışı ile tamamlanışı arasındaki ortalama süre (ms)               |
| **Grade (S/A/B/C/D)**  | Accuracy, Tracking, Speed ve Stability'nin ortalamasından türetilen not    |
| **En başarılı / geliştirilecek jest** | Jest türleri arasında en yüksek / en düşük başarı oranına sahip olan |

> "Speed" ve "Stability" radar eksenleri, tepki süresi ve el takibi kopma sayısından
> türetilen sezgisel (heuristic) göstergelerdir; klinik/bilimsel bir ölçüm değildir.

Bu özet `localStorage`'a kaydedilir (en fazla 25 oturum tutulur, sunucuya gönderilmez) ve:

- **Oyun içinde:** Seviye 4 tamamlandığında çıkan "🏆 Mission Complete" ekranında —
  rütbe rozeti, 6'lı istatistik grid'i (Grade/Accuracy/Score/Tracking/Reaction/Time),
  en başarılı hareket / geliştirilecek alan ve **📄 PDF İndir** butonuyla gösterilir.
- **`gestureos-okul-raporu.html` sayfasında:** İstatistik tablosu + radar grafik
  (Accuracy/Tracking/Speed/Stability) + jest bazlı doğruluk tablosu + seviye bazlı sonuçlar +
  geçmiş oturum listesi + PDF indirme olarak gösterilir.

**Bilinen performans faktörleri:**

- **Aydınlatma:** Düşük ışıkta el tespiti gecikebilir veya kararsızlaşabilir; sınıf ortamında
  doğal/tavan ışığı önerilir.
- **Kamera kalitesi:** Sanal kamera yazılımları (DroidCam, OBS vb.) fiziksel kamerayı
  devralabilir — `js/gestures.js` içindeki `pickDefaultCamera()` bu cihazları otomatik
  elemeye çalışır, ancak kesin çözüm için kullanıcıya kamera seçim listesi sunulur.
- **Hassasiyet ayarı:** Sağ üstteki ayar panelinden pinch hassasiyeti ve imleç yumuşatma
  canlı olarak kalibre edilebilir; bu, farklı el büyüklüklerinde/kameralarda tutarlılığı artırır.
- **Tek el sınırı:** `maxNumHands: 1` ile çalışır — performans ve algılama kararlılığı için
  bilinçli bir tercihtir.

## Klasör Yapısı

```
gestureos-arena/
├── index.html                   # Oyun sayfası (markup + "Mission Complete" ekranı)
├── gestureos-okul-raporu.html   # Proje tanıtımı + performans dashboard'u
├── README.md                     # Bu dosya
├── css/
│   ├── style.css                 # Oyun sayfası + bitiş ekranı stilleri
│   └── report.css                # Rapor sayfası stilleri
└── js/
    ├── config.js                  # Sabitler: seviyeler, hassasiyet/yumuşatma, rütbe tabloları
    ├── state.js                    # Paylaşılan çalışma zamanı durumu + ayar mutasyonları
    ├── stats.js                     # Oturum telemetrisi: doğruluk, el takibi, tepki süresi, rütbe
    ├── pdf.js                        # jsPDF ile oturum özetinden PDF üretimi
    ├── dom.js                         # Tüm DOM element referansları (tek kaynak)
    ├── gestures.js                     # MediaPipe entegrasyonu, jest çıkarımı, kamera akışı
    ├── game.js                          # Seviye akışı, hedef/skor sistemi, canvas render, bitiş ekranı
    ├── ui.js                             # Buton/slider olay dinleyicileri, PDF butonu
    ├── main.js                            # Oyunun giriş noktası (initUI() çağrısı)
    └── report.js                          # Rapor sayfasının mantığı (config.js + pdf.js'i kullanır)
```

Siteye buradan da ulaşabilirsiniz: <https://gesture-os-arena.vercel.app>

## Bağımlılıklar

- [`@mediapipe/hands`](https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js) — CDN
  üzerinden yüklenir, internet bağlantısı gerektirir.
- [`jsPDF`](https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js) — PDF rapor
  indirme için CDN üzerinden yüklenir.
- Google Fonts: Space Grotesk, IBM Plex Sans, IBM Plex Mono.

Derleme adımı (build step) yoktur; saf HTML/CSS/JS ile çalışır.
