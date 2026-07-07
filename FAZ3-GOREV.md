# TEZGÂH — FAZ 3 GÖREV PAKETİ
### Mimar: Claude Fable 5 · Uygulayıcı: Claude Code · Paket sürümü: 1.0

---

## 0. Ön koşul ve çalışma kuralları

1. Faz 2 `main`'e merge edilmiş olmalı (edildi: `4aea7f1`). İş `phase-3` branch'inde yürür; merge kullanıcı kabulüyle.
2. `CONSTITUTION.md` üstündür; bu paket §13 Faz 3 kapsamını detaylandırır. Paketteki "mimar kararı" işaretli maddeler geçerlidir ve Değişiklik Günlüğü'ne yazılır; işaretsiz çelişkide CONSTITUTION kazanır — dur, sor.
3. Kapsam dışı fikirler `TODO.md`'ye. Anlamlı her adım ayrı commit; başlamadan planını 10–14 maddede sun, **onay bekle**.

## 1. Kapsam ve mimar kararları

CONSTITUTION §13 Faz 3: quad-warp mockup motoru · sahne kaydı (foto + 4 köşe) · vitrophanie belge tipi · tabela tipi · tişört tipi. Bu paketin ekleri: **önlük** (tişörtün kardeşi) · **broderie (nakış) tekniği ve fişi** · **Sipariş Defteri entegrasyonu** (kalem ölçüleri belgeye akar) · **sunum destesine mockup sayfası**.

**Mimar kararı #4:** Konva/Polotno gibi harici tuval kütüphanesi ALINMAZ. Quad (4 köşe) editörü saf SVG + pointer events ile yazılır — bağımlılık yüzeyi küçük kalır.
**Mimar kararı #5:** Mockup render tek kaynaklıdır (M3 ruhu): 4 noktadan homografi matrisi hesaplanır → tasarım, sahne fotoğrafı üstüne CSS `matrix3d` ile bindirilir; canlı önizleme ve JPG üretimi AYNI sayfayı kullanır, JPG Puppeteer ekran görüntüsüyle alınır (~1600 px, q85).
**Mimar kararı #6:** Repo hazır sahne fotoğrafı bundle'lamaz (telif + gerçeklik). Sahneler kullanıcının kendi fotoğraflarından kurulur; sahnesiz belgede "Mockup" düğmesi "önce sahne kur" yönlendirmesi yapar.

## 2. Şema / migration v4

- `mockup_scenes` tablosu Faz 0'dan beri var; ekle: `kind TEXT DEFAULT 'generic'` (`vitrine|facade|garment|generic`), `settings_json TEXT DEFAULT '{}'` (`{blend:"normal"|"multiply", opacity:0..1, fabric_color?}`).
- `documents.params_json` yeni tipleri taşır (aşağıda); şema Zod'da: vitrophanie/tabela için `w_cm/h_cm`, garment için `garment_kind`, `fabric_color`, `technique`, `areas[]`.
- Mevcut Faz 1–2 akışlarının kırılmadığı migration-replay testiyle kanıtlanır.

## 3. Mockup motoru

**3.1 Homografi:** birim kare → hedef quad için 8 bilinmeyenli DLT çözümü (saf fonksiyon, `packages/shared`); çıktı CSS `matrix3d` dizisi. **Vitest:** bilinen 4 nokta → beklenen matris; ters/aykırı quad'da (kendini kesen) hata.
**3.2 Sahne editörü:** asset seç (müşteri/ortak — pazarlamacı keşif fotoğrafları dahil) → foto üzerinde 4 köşe tutamacı sürükle (saf SVG) → blend (`normal|multiply`) + opacity kaydırıcı → canlı önizlemede örnek tasarım → sahneyi adla kaydet (müşteriye ya da ortak havuza). Köşe sırası sabittir: sol-üst, sağ-üst, sağ-alt, sol-alt.
**3.3 Belgeden mockup:** belge editöründe "Mockup" → uygun sahneler listesi (garment belgeleri `kind:garment` + kumaş rengi eşleşmesine göre önce filtrelenir) → JPG üret → `ExportRecord kind:"mockup"` + `data/exports/...` (§9.3 adlandırma, `_mockup.jpg`).
**3.4 Sunum entegrasyonu:** sunum destesi oluştururken, belgeye ait son mockup varsa sunum kartından sonra tam sayfa mockup eklenir (deste diyaloğunda aç/kapa, default açık).

## 4. Vitrophanie belge tipi

- **Boyut:** serbest `w_cm × h_cm` (belge oluştururken girilir; Sipariş Defteri kaleminden geliyorsa otomatik dolar). Büyük format şablonları slot konumlarını **oransal (0–1)** tanımlar, render mm'ye çevirir.
- **Mod:** `impression` (tüm slot tipleri) | `decoupe` (yalnız `logo_mono` + metin slotları, TEK renk — önizlemede kesim rengi seçilir, çıktı tek dolgu).
- **Miroir:** toggle; kalemde `side:"interieur"` ise otomatik önerilir. Uygulama: export kökünde yatay ayna; editörde köşede "MIROIR" rozeti.
- **Şablonlar (3):** `vitro-bandeau` (tam genişlik saat/slogan bandı) · `vitro-centre` (logo + slogan merkez kompozisyon) · `vitro-colonne` (dar dikey menü-highlight kolonu — katalog binding'li mini repeater, 4–6 ürün).
- **Export:** impression → print PDF, `bleed_mm` param `0|3|5` (default 0 — büyük formatta payı matbaa yönetir); decoupe → **SVG**, metinler **opentype.js ile path'e çevrilir**, çıktıda hiçbir `<text>` elementi kalmaz. Sayfa uzun kenarı > 5000 mm ise otomatik **1:10 ölçek** + çıktı köşesine "ÉCHELLE 1:10" damgası.
- Çözünürlük eşikleri CONSTITUTION §9.2 (100 dpi @1:1; sarı <100, kırmızı <72).

## 5. Tabela (enseigne) belge tipi

- `w_cm × h_cm`; şablon `enseigne-panneau`: zemin (rol rengi/degrade), logo, işletme adı (büyük), alt bilgi şeridi (tel / "kebab · tacos · burger").
- **Kontrast bekçisi:** zemin–metin luminans oranı < 3:1 ise editör uyarısı (M4).
- Export: print PDF (1:10 kuralı geçerli) + mockup (cephe sahnesi).

## 6. Giyim belge tipi (`garment`)

- `garment_kind: tshirt | apron_bavette | apron_taille` · `fabric_color: white|black|red|blue|hex` · `technique: impression | broderie`.
- **Alan presetleri** (belge birden çok alan taşır, her alan bağımsız mini-tasarım):
  tshirt → `chest_left 10×10` · `chest_center 25×30` · `back_full 30×40` · `sleeve 8×8`;
  apron_bavette → `chest 24×20`; apron_taille → `front 30×20` (cm).
- **Alan slotları:** logo (primary/mono seçilebilir) + 0–2 metin satırı — metinler **marka kitinden bağlanır** (`brand.contact.address / phone / instagram`), override serbest (M1/M5: ARAS taşınırsa tişört tasarımı kendini günceller).
- **Koyu/renkli kumaş kuralı:** `fabric_color` beyaz değilse sistem `logo_mono` önerir (uyarı + tek tık geçiş).
- **Export — impression:** alan başına **300 dpi şeffaf PNG** (piksel = cm×300/2.54, alfa kanallı) + vektör PDF.
- **Export — broderie:** PNG üretilmez. Çıktı: (a) **SVG** (text→path, temiz vektör), (b) **Broderie Fişi** — A4 PDF: tasarım önizleme, alan adı + cm ölçüleri, kumaş rengi, kullanılan dolgu renkleri (hex + yaklaşık ad) listesi, iplik eşleştirme not satırları, müşteri/tarih. DST/PES üretimi bizim işimiz DEĞİL; fiş nakışçının hammaddesidir.
- **İnce detay uyarısı:** `technique:broderie` VE alanın uzun kenarı < 15 cm ise: "İnce çizgiler nakışta iplik kalınlığında kaybolabilir — nakışçıyla teyitleşin" (ARAS tipi detaylı logolar için).
- Mockup: `kind:garment` sahneleri, `multiply` blend default; kumaş rengi eşleşen sahneler önce listelenir.

## 7. Sipariş Defteri entegrasyonu

`vitrophanie | tabela | tisort | onluk` kalemlerinde "Tasarıma başla" artık gerçek akıştır: tip → belge tipi eşlemesi (`tisort/onluk → garment`, kind otomatik), kalemdeki `width_cm/height_cm` → belge boyutu, `side:interieur` → miroir önerisi, `mode` → vitrophanie modu, `technique` → garment tekniği. Kalem `tasarimda`'ya geçer, `document_id` bağlanır (Faz 2 mekanizması).

## 8. KABUL SENARYOSU

1. **Vitrin sahnesi ≤ 2 dk:** kullanıcı fotoğrafı yüklenir → 4 köşe işaretlenir → sahne kaydedilir → ARAS grid menüsünün mockup JPG'si üretilir; süre ölçülür ve raporlanır (CONSTITUTION kabulü).
2. **Découpe:** 200×80 cm decoupe vitrophanie export'unda `<text>` YOK (otomatik tarama), tek dolgu rengi; miroir açık/kapalı iki çıktı ayna kanıtlı.
3. **Kalemden belgeye:** Faz 2'nin 180×120 exterieur/impression vitrophanie kalemi → "Tasarıma başla" → belge 180×120 hazır; print PDF pdfjs ile ~1800×1200 mm (±1 mm/ölçekleme kuralına göre).
4. **Tabela:** 300×60 cm + bilerek düşük kontrast → uyarı görünür; PDF üretilir; cephe sahnesiyle mockup alınır.
5. **Tişört (impression):** mavi kumaş → mono öneri uyarısı; göğüs-sol + sırt alanları; sırtta adres/tel marka kitinden geldi; export: `back_full` PNG'si 3543×4724 px (±2 px) ve alfa kanallı.
6. **Önlük (broderie):** bavette + broderie → ince-detay uyarısı; Broderie Fişi PDF'i tam içerikle; SVG'de `<text>` yok.
7. **Sunum entegrasyonu:** mockup'lı belgenin sunum destesinde mockup sayfası var; mockup'sız belgede yok.
8. **Vitest:** homografi (≥4 senaryo) · oransal layout · text→path taraması · garment px hesapları · 1:10 ölçek kuralı · migration replay · mevcut 119 test kırılmadan (hedef ≥150 toplam).

## 9. Faz 4'e KAYIT (uygulama YOK — TODO.md'ye)

SVG import + slot işaretleme aracı · tema kütüphanesi ekranı · toplu fiyat güncelleme (% + yuvarlama) · CMYK export opsiyonu (Ghostscript) · snapshot'tan geri yükleme · zip yedek düğmesi · mm sapma incelemesi (mevcut not) · parse eş-anlamlı sözlüğü yönetim arayüzü.

## 10. Raporlama

Standart: kabul maddeleri kanıtlarıyla · üretilen örnek dosya yolları (PDF/SVG/PNG/JPG) · riskler/TODO · `phase-3` push; merge kullanıcı kabulüyle.
