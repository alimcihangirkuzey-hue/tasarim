# TODO — Faz kapsamı dışına düşen notlar (M10)

Bu dosya, geliştirme sırasında "hazırken yapılmayan" işlerin kaydıdır.
Opus 4.8 devraldığında CONSTITUTION.md ile birlikte bu dosyayı okur.

## Faz S'e kayıt (mimar defteri — uygulama İLERİDE, ayrı mimar paketiyle)
- [ ] **SaaS evrimi:** Postgres'e geçiş, auth + çok kiracılı çalışma alanı (workspace), bulut depolama, render kuyruğu, abonelik. Local-first (M7) v1 ilkesi korunur; SaaS ayrı bir dağıtım hedefi olarak tasarlanacak. Şimdilik YALNIZ kayıt — kapsam kararı mimarındır.

## Faz 4'e inceleme notu
- [ ] **PDF sayfa ölçümünde +0.2–0.4 mm sapma:** pdfjs okumaları 216.2×303.4 gibi değerler veriyor (hedef 216×303). Kök neden büyük olasılıkla mm→pt→mm çevrim yuvarlaması (Chromium `page.pdf` mm girdiyi pt'ye çevirir, pdfjs geri çevirir); baskı açısından zararsız. Faz 4'te (CMYK/Ghostscript işleri sırasında) kesin kökeni incele.

## Faz 3'e kayıt (FAZ2-GOREV §10 — uygulama YOK, yalnızca not)
- [ ] **Tişört + önlük şablonları:** `technique: impression|broderie`; broderie'de yalnız vektör + cm ölçü + iplik notu çıktısı; **küçük alan + broderie kombinasyonunda ince-detay uyarısı** (ARAS logosu gibi çizimler küçük nakışta kaybolur).
- [ ] **Mockup motoru:** quad-warp; pazarlamacının keşif fotoğrafları sahne olur.
- [ ] **Vitrophanie/tabela belge tipleri:** cm bazlı; découpe'ta text→path.
- [ ] **Tişört mockup renk seti:** mavi dahil.
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
- [ ] Asset silme endpoint'i yok (yalnızca müşteriyle birlikte silinir) → Faz 1
- [ ] npm audit: 3 zafiyet (2 orta, 1 yüksek) — @fastify/static 8.x (path traversal, GHSA-pr96-94w5-mx2h) ve vite 5/esbuild (dev server, GHSA-67mh-4wv8-2f99). Düzeltme major sürüm ister (@fastify/static 9, vite 8); sunucu yalnız 127.0.0.1 dinlediği için risk lokal-düşük → faz arasında sürüm yükseltme işi olarak ele al
