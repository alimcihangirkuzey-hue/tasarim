# TODO — Faz kapsamı dışına düşen notlar (M10)

Bu dosya, geliştirme sırasında "hazırken yapılmayan" işlerin kaydıdır.
Opus 4.8 devraldığında CONSTITUTION.md ile birlikte bu dosyayı okur.

## Pilot dönem (aktif — Faz 4 kapanışıyla)
- [ ] **Pilot iş dönemi başladı — FAZ5 paketi pilot saha notlarıyla şekillenecek; bu dönemde gelen her yeni fikir/talep M10 gereği TODO'ya yazılır, sırasız uygulanmaz.**

### Pilot saha kayıtları (UYGULAMA YOK — kayıt biçimi: `- [YYYY-AA-GG] tek satırlık not / fikir / sürtünme`)
- [2026-07-08] 60+ ürünlük el yazısı menü tek tek girilemezdi — katalog toplu içe aktarma (yapıştır-parse) FAZ5 adayı; pilotta mimar+CC eliyle yüklendi.
- [2026-07-08] Sunucular PC kapanınca duruyor; günlük başlatma sürtünmesi yaşandı — start-tezgah.bat eklendi (mimar onaylı). Kalıcı çözüm (tepsi uygulaması / otomatik başlatma) Faz 5/S adayı.
- [2026-07-08] Atölyenin standart işi netleşti: A4 flyer, 3 sütunlu yoğun menü listesi (referans: ARAS siyah-turuncu tasarım); Premium Yazılı Menü A4'te 1-2 sütunla sınırlı — (a) FAZ5 adayı: liste şablonuna A4'te 3 sütun desteği (küçük font + kısa dots varyantı) (b) kullanıcının referans tasarımı Şablon Fabrikası'ndan geçirilip kalıcı "flyer-3col" şablonu üretilecek; pilot sırasında denenecek.

## Faz S'e kayıt (mimar defteri — uygulama İLERİDE, ayrı mimar paketiyle)
- [ ] **SaaS evrimi:** Postgres'e geçiş, auth + çok kiracılı çalışma alanı (workspace), bulut depolama, render kuyruğu, abonelik. Local-first (M7) v1 ilkesi korunur; SaaS ayrı bir dağıtım hedefi olarak tasarlanacak. Şimdilik YALNIZ kayıt — kapsam kararı mimarındır.
- [ ] **Faz S ön koşulu: güvenlik yükseltme turu (mimar kararı #11):** npm audit'in major yükseltmeleri (vite 8, @fastify/static 9 vb.) SaaS'a çıkmadan ZORUNLU; v1'de yapılmama gerekçesi local-first + yalnız 127.0.0.1 dinleme.

## Faz 5'e kayıt (FAZ4-GOREV §15 — uygulama YOK, yalnızca not)
- [ ] QR dijital menü statik HTML export'u.
- [ ] Çoklu-yüzey sahne (tek fotoda N quad kolajı).
- [ ] Arka plan silme entegrasyonu (lokal rembg veya dış API — ADR-7).
- [ ] FR açıklama önerileri (Claude API, opsiyonel/internetli).
- [ ] AI destekli foto eşleme.
- [ ] Preset yönetim arayüzü (Faz S).

## SaaS Vizyon Defteri (UYGULAMA YOK, yalnız kayıt)
- [ ] **QR dijital menü:** katalogdan üretilen mobil menü sayfası. v1: statik HTML export (Faz 5 adayı). Faz S: barındırılan sürüm, fiyat değişince basılı PDF ile birlikte otomatik güncellenir — temel abonelik gelir kalemi.
- [ ] **Grid şablonuna çok sayfalı akış (flow) modu:** 80-100 kalemlik kataloglar için (Faz 4).
- [ ] **İsimden foto önerisi:** ürün adı → ortak havuzdaki etiketli stok foto önerisi; havuz varlıklarına etiket alanı (Faz 4/5).
- [ ] **Çoklu-yüzey sahne:** tek fotoğrafta birden çok quad (vitrin + duvar + ışıklı pano) → "dükkan böyle görünecek" kolaj mockup'ı (Faz 4/5).
- [ ] **AI konsept görselleştirme (Faz S):** mekan fotoğrafından yenilenmiş konsept görseli; "konsept görselleştirme" olarak konumlanır, iç mimarlık hizmeti DEĞİL. Mimar kararı: SketchUp benzeri 3B modelleme kalıcı kapsam dışı.
- [ ] **Paket şablonları:** "açılış takımı" gibi tek tıkla N kalemli proje presetleri (Faz 4).

## Faz 4'e inceleme notu (kapandı ✓ — F4-14)
- [x] **PDF sayfa ölçümünde +0.2–0.4 mm sapma:** kök neden ÖLÇÜLDÜ ve şüphelenilen pt-yuvarlama DIŞLANDI — Chromium `page.pdf` kâğıt boyutunu birimden bağımsız iç ızgarasına oturtuyor (mm/cm/px özdeş; inç yalnız yüksekliği düzeltiyor). Tutarlı ucuz düzeltme yok → tolerans kararı Değişiklik Günlüğü'nde (bleed 3mm >> sapma; kesim crop marks'tan).

## Faz 4'e kayıt (FAZ3-GOREV §9 — Faz 4'te uygulandı ✓)
- [x] **SVG import + slot işaretleme:** hazır SVG tasarımı içe al, slotları elle işaretle.
- [x] **Tema kütüphanesi ekranı:** temaları görsel galeriden seç/önizle.
- [x] **Toplu fiyat güncelleme:** katalogda yüzde/mutlak artış aracı.
- [x] **CMYK dönüşümü (Ghostscript):** matbaa PDF'i için; mevcut +0.2–0.4 mm pt→mm sapma notuyla birlikte incelenecek (yukarıdaki Faz 4 inceleme notu).
- [x] **Snapshot'tan geri yükleme:** export_records.snapshot_json → belgeyi o ana döndür.
- [x] **Zip yedek:** data/ klasörünü tek tıkla arşivle (M7).
- [x] **Parse sözlüğü yönetim arayüzü:** PRODUCT_DICT / KEY_ALIASES'ı UI'dan genişlet.
- [x] **İki kademeli broderie uyarısı (mimar kararı #8):** kural doğru ("broderie + kısa kenar < 15 cm" güçlü uyarı; bavette'te çıkmaz — kabul 6 örneği mimar hatasıydı, davranış değişmedi). Faz 4'te değerlendirilecek: her broderie belgesinde hafif bilgi notu + <15 cm alanda mevcut güçlü uyarı.
- [x] **TextLines letterSpacing birim düzeltmesi (mimar #10 — F4-2'de uygulandı; üç önce/sonra piksel diff 0.0000%):** motor letterSpacing'i birimsiz kullanıcı birimi (1 birim = 1 mm) yazar; mevcut mm-tabanlı yazar değerleri **3,7795 ile çarpılır** (em-tabanlılar dönüşüm dışı — #10 uygulama notu); katsayı/yön canlı ölçümle teyit, önce/sonra piksel kanıtı zorunlu.

## Faz 3'e kayıt (FAZ2-GOREV §10 — uygulandı ✓)
- [x] **Tişört + önlük şablonları:** `technique: impression|broderie`; broderie'de yalnız vektör + cm ölçü + iplik notu çıktısı; küçük alan + broderie'de ince-detay uyarısı.
- [x] **Mockup motoru:** quad-warp; keşif fotoğrafları sahne oldu (mockup_scenes, müşteri|ortak).
- [x] **Vitrophanie/tabela belge tipleri:** cm bazlı; découpe'ta text→path (fontkit, mimar #7).
- [x] **Tişört mockup renk seti:** mavi dahil (fabric_color seti).
- [ ] Sunum PDF'inde kampanya slotunun katalogdan canlı binding'i (Faz 2'de serbest metin + override; en basit çözüm §0.6).
- [ ] Sipariş kalemi ↔ belge durum senkronu otomasyonu düşünülebilir (Faz 2'de bilinçli olarak elle — FAZ2-GOREV §2.5).

## Faz 2'ye kayıt (FAZ1-GOREV §9 — uygulandı ✓)
- [ ] **carte-fidelite şablonu netleşti:** `stampCount=10` (2×5 dizilim), **numaralı** damga kutuları (1.–10.), üst-sağ alt başlık slotu (*"1 menu acheté = 1 tampon"*), alt tam-genişlik ödül bandı (`--c-accent` zemin, ör. *"11ᵉ KEBAB OU PIZZA OFFERT !"*); arka yüz: logo, "CARTE DE FIDÉLITÉ" başlığı, tel, adres, hizmet satırı (*Sur place · à emporter · Livraison*), saat.
- [ ] **Flyer:** 21×21 cm kare format preseti (katlamalı); teslimat bölgeleri + minimum sipariş serbest-metin slotu; **çift saat bloğu** (açılış ↔ teslimat saatleri ayrı).
- [ ] **QR online sipariş:** mevcut `delivery[]` şemasından beslenir (CONSTITUTION §10 ile birlikte).

## Faz 1 sırasında düşülen notlar
- [x] **QR slotları — MİMAR KARARI (Faz 1 kabulünde):** QR Faz 2'de kalır; Faz 2'de `qrcode`→SVG altyapısıyla birlikte **menü şablonlarına da opsiyonel slot olarak eklenir** (FAZ2-GOREV §5, mimar kararı #2). Çelişki kapandı.
- [ ] Proje yönetimi arayüzü yok; ilk belgede müşteri başına "Genel" projesi otomatik açılıyor (en basit çözüm, §0.6) → Faz 2 Sipariş Defteri bunu üstleniyor
- [x] **Dekor foto alt bandı — MİMAR KARARI (Faz 1 kabulünde):** liste şablonundaki deterministik alt bant yerleşimi **kabul edildi**; yeniden konumlama yok.
- [ ] Belgelerde ad kolonu yok (şablon adı + tarih gösteriliyor); istenirse ileride `documents.name` migration'ı
- [x] **Test müşterileri — KULLANICI KARARI:** "ARAS Grill Lyon" ve "Basel Kebap Haus" demo/test verisi olarak `data/`'da KALIR; silinmeyecek.

## Faz 0 sonrası bilinen sınırlar
- [ ] Ortak fotoğraf havuzu (assets.client_id = NULL) şemada hazır, arayüzü yok → Faz 1/2 (CONSTITUTION §15/S3)
- [ ] Müşteri klonlama endpoint'i ve arayüzü → Faz 2 (M6)
- [ ] Vitest birim testleri, binding motoruyla birlikte gelecek → Faz 1 (§12)
- [ ] Müşteri silme geri alınamaz; şimdilik confirm() ile korunuyor, ileride "arşivle" düşünülebilir
- [x] Asset silme endpoint'i (kullanım korumalı) Faz 4'te geldi (FAZ4 §11)
- [ ] npm audit: 3 zafiyet (2 orta, 1 yüksek) — @fastify/static 8.x (path traversal, GHSA-pr96-94w5-mx2h) ve vite 5/esbuild (dev server, GHSA-67mh-4wv8-2f99). Düzeltme major sürüm ister (@fastify/static 9, vite 8); sunucu yalnız 127.0.0.1 dinlediği için risk lokal-düşük → **mimar kararı #11:** fazlarda yapılmaz, "Faz S ön koşulu: güvenlik yükseltme turu" kaydına bağlandı
