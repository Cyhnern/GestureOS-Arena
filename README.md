# GestureOS Arena

El hareketiyle bilgisayar kontrolünü öğreten, kamera tabanlı, kademeli zorlukta bir tarayıcı oyunu. GestureOS masaüstü uygulamasının jest sistemini (sol/sağ tık, sürükleme, kilit) çocukların güvenli ve eğlenceli bir ortamda deneyebilmesi için geliştirildi.

## Proje Tanıtımı

**Amaç:** GestureOS'un temel komutlarını canlı, oyunlaştırılmış bir arayüzde göstermek; okullara yapılacak tanıtımlarda öğrencilerin "gerçekten çalışıyor mu?" sorusuna kendi elleriyle cevap bulmasını sağlamak.

**Nasıl çalışır:** Tarayıcı, kullanıcının web kamerasından aldığı görüntüyü [MediaPipe Hands](https://developers.google.com/mediapipe) ile işleyerek 21 noktalık bir el iskeletine dönüştürür. Parmak uçları arasındaki mesafeler (el büyüklüğüne göre normalize edilmiş) belirli jestleri (pinch, yumruk vb.) tetikler; bu jestler oyun içinde imleç hareketi, tıklama ve sürükleme eylemlerine çevrilir. Tüm işlem kullanıcının kendi tarayıcısında gerçekleşir — görüntü hiçbir sunucuya gönderilmez veya kaydedilmez.

**Jest haritası (GestureOS ana uygulamasıyla birebir):**

| Jest | Aksiyon |
|---|---|
| El açık, hareket | İmleç hareketi |
| Başparmak + işaret parmağı pinch (kısa) | Sol tık |
| Başparmak + orta parmak pinch | Sağ tık |
| Yumruk (Fist) | Sürükle (tut) / El açma = bırak |
| İşaret + serçe parmak pinch, 700ms+ | İmleç kilidi aç/kapat |

**Seviye akışı:** Oyun 4 seviyede kademeli olarak zorlaşır — önce sadece imleç kontrolü, sonra sol tık, sonra sol+sağ tık karışık hedefler, son olarak yumrukla sürükleme. Her seviyede skor arttıkça hedeflerin çıkış hızı artar.

## Performans Özeti

> ⚠️ Aşağıdaki değerler **örnek/yer tutucu** niteliktedir ve gerçek kullanıcı testleriyle güncellenmelidir. Okullara sunmadan önce kendi ölçümlerinizi ekleyin.

| Metrik | Örnek Değer | Ölçüm Yöntemi |
|---|---|---|
| Jest tanıma doğruluğu | — (doldurulacak) | N deneme üzerinden doğru/toplam |
| Ortalama FPS (render döngüsü) | — (doldurulacak) | `requestAnimationFrame` tabanlı, tarayıcı/donanıma bağlı |
| MediaPipe çıkarım gecikmesi | — (doldurulacak) | Kare gönderiminden `onResults` çağrısına kadar |
| Yanlış pozitif oranı (istenmeyen tetikleme) | — (doldurulacak) | Pinch hassasiyeti ayarına göre değişir |

**Bilinen performans faktörleri:**
- **Aydınlatma:** Düşük ışıkta el tespiti gecikebilir veya kararsızlaşabilir; sınıf ortamında doğal/tavan ışığı önerilir.
- **Kamera kalitesi:** Sanal kamera yazılımları (DroidCam, OBS vb.) fiziksel kamerayı Windows sürücü seviyesinde devralabilir — `js/gestures.js` içindeki `pickDefaultCamera()` bu cihazları otomatik elemeye çalışır, ancak kesin çözüm için kullanıcıya kamera seçim listesi sunulur.
- **Hassasiyet ayarı:** Sağ üstteki ayar panelinden pinch hassasiyeti ve imleç yumuşatma canlı olarak kalibre edilebilir; bu, farklı el büyüklüklerinde/kameralarda tutarlılığı artırır.
- **Tek el sınırı:** `maxNumHands: 1` ile çalışır — performans ve algılama kararlılığı için bilinçli bir tercihtir.

## Klasör Yapısı

```
gestureos-arena/
├── index.html          # Sayfa iskeleti, sadece markup
├── README.md            # Bu dosya
├── css/
│   └── style.css        # Tüm görsel tasarım
└── js/
    ├── config.js         # Sabitler: seviyeler, hassasiyet/yumuşatma tabloları
    ├── state.js           # Paylaşılan çalışma zamanı durumu + ayar mutasyonları
    ├── dom.js              # Tüm DOM element referansları (tek kaynak)
    ├── gestures.js          # MediaPipe entegrasyonu, jest çıkarımı, kamera akışı
    ├── game.js               # Seviye akışı, hedef/skor sistemi, canvas render
    ├── ui.js                  # Buton/slider olay dinleyicileri
    └── main.js                 # Giriş noktası (initUI() çağrısı)
```

Modüller ES `import`/`export` ile birbirine bağlıdır (`<script type="module">`), bu yüzden dosyayı doğrudan `file://` ile açmak bazı tarayıcılarda CORS kısıtlaması nedeniyle çalışmayabilir. En güvenilir yöntem basit bir yerel sunucu üzerinden açmaktır:

## Bağımlılıklar

- [`@mediapipe/hands`](https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js) — CDN üzerinden yüklenir, internet bağlantısı gerektirir.
- Google Fonts: Space Grotesk, IBM Plex Sans, IBM Plex Mono.

Derleme adımı (build step) yoktur; saf HTML/CSS/JS ile çalışır.
