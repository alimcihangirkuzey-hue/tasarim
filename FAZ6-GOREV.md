# TEZGÂH — FAZ 6 GÖREV PAKETİ — "Arşiv Önce"
### Mimar: Claude Fable 5 · Uygulayıcı: Claude Code · Paket sürümü: 1.0

---

## 0. Ön koşul ve çalışma kuralları

1. Faz 5 `main`'de (merge `b4f8b01`), üstünde hotfix `7d0a7aa` ve pilot
   kayıt commit'leri var — hepsi korunur. İş `phase-6`'da, main'in SON
   ucundan açılır; merge kullanıcı kabulüyle.
2. `CONSTITUTION.md` üstündür; mimar kararları #19-#21 Değişiklik
   Günlüğü'ne işlenir; işaretsiz çelişkide dur, sor.
3. **GERÇEK VERİ KORUMASI:** "Aras Restaurant" ve "Arriva Restaurant"
   gerçek kayıtlardır. Müşteri verisine YAZAN her kabul adımı klonda
   yapılır; kapanışta iki kataloğun da hash'inin değişmediği kanıtlanır
   (F5-12 yöntemi: sha256(JSON.stringify(catalog))). Fabrika şablon
   kayıtları globaldir ve YENİ eklemelerdir — eklenmeleri serbest;
   mevcut yerleşik şablonlara dokunulmaz.
4. Kapsam dışı fikirler `TODO.md`'ye (M10); anlamlı her adım ayrı
   commit; başlamadan plan + onay. Sunucular gerekirse start-tezgah.bat
   davranışıyla.

## 1. Kapsam ve mimar kararları

Kapsam (pilot kayıtlarından, "arşiv önce" yolu): ① fabrika SVG içe
almasının gerçek-dünya (InDesign/Illustrator çıktısı) sağlamlaştırması ·
② şablon künyesi (provenance) · ③ serbest ölçülü format (yalnız fabrika
hattında) + custom ölçüde baskı çıktısı · ④ InDesign→SVG dışa aktarım
rehberi.

**Mimar kararı #19 (Günlük'e) — Fabrika SVG bekçisi:**
(a) Fiziksel ölçü: SVG'den mm türetilemiyorsa (width/height birimsiz,
    yalnız viewBox) içe almada kullanıcıdan gerçek en×boy (mm) istenir;
    şablonun doğal ölçüsü buna kilitlenir.
(b) Eğriye çevrilmiş (outline) metin KABUL edilir ama slot bağlanamaz —
    fabrika bunu tespit eder ve açıkça uyarır: "bu alanlar dekor olarak
    kalır; canlı slot için metni canlı bırakıp fontu sisteme yükleyin".
(c) Canlı metinlerin font-family'si sistemde yoksa (yerleşik 6 +
    custom_fonts) uyarı + F5 font yükleme akışına yönlendirme; font
    yüklenmeden o metne slot bağlanması ENGELLENİR (M3: print aynı
    @font-face'i bulamaz, ekran/PDF ayrışırdı).
(d) Harici bağlantılı raster (file:///, http) çalışmaz → "eksik varlık"
    olarak listelenir, render'a girmez; gömülü (data:) raster kabul.
    Toplam SVG boyutu üst sınırı 25MB (aşarsa net mesajla RED).
(e) script/foreignObject/dış referanslı style temizlenir (mevcut
    sanitize varsa teyit et, yoksa ekle).

**Mimar kararı #20 (Günlük'e) — Künye (provenance), migration v8:**
Fabrika şablon kaydına kolonlar (TEXT/JSON + Zod): kaynak dosya adı,
kullanıcının girdiği kaynak yol/not (ör. Dropbox/arşiv yolu), tespit
edilen font aileleri, gömülü varlık listesi, eksik varlık listesi,
svg_sha256, içe alma tarihi. Amaç: yıllar sonra dönen işte sıfır
arkeoloji. UI: şablon detayında künye kartı.

**Mimar kararı #21 (Günlük'e) — Serbest ölçü YALNIZ fabrika hattında:**
Fabrika şablonu SVG'nin gerçek ölçüsüyle doğar (standart formata
eşlenmek zorunda değil); bu şablondan açılan belge o ölçüde çalışır ve
export bleed 3mm + crop marks ile custom sayfa üretir (sayfa =
(w+6)×(h+6)mm). Yerleşik kurallı şablonlar custom format ALMAZ (M8
düzen garantileri standart formatlara göredir). Sınırlar: 30×30mm –
3000×3000mm. Sıfır-slotlu (salt dekor) fabrika şablonu GEÇERLİDİR —
cam/folyo gibi işlerde TEZGÂH ölçü+çıktı+künye üstlenir, kompozisyon
dış araçta kalır (M2 teyidi).

## 2. Şema — migration v8

- Fabrika şablon tablosuna #20 künye kolonları. Belge tarafında custom
  ölçü Zod-only (params/width_mm, height_mm) — migration istemez.
- Migration-replay testine v8 eklenir; Faz 1-5 akışları kırılmadan.

## 3. SVG içe alma sağlamlaştırma (#19)

- Önce mevcut fabrika akışını (Faz 3) OKU; #19 (a)-(e) bekçilerini
  ekle/teyit et. Gerçek durum paketten farklıysa plana işaret koy.
- İçe alma ÖNİZLEMESİ tek ekranda: tespit edilen ölçü, canlı/eğri metin
  sayıları, fontlar (yüklü/eksik), varlıklar (gömülü/eksik), uyarılar.
- Vitest: InDesign-benzeri fixture SVG'ler — yalnız-outline, canlı
  metin+eksik font, gömülü raster, harici raster, ölçüsüz viewBox,
  script'li (temizlenmeli).

## 4. Künye (#20)

- İçe almada otomatik doldurulur + kullanıcı kaynak yol/not girer
  (opsiyonel alanlar).
- Şablon detayında künye görünümü; API'de alanlar döner.
- Vitest: kayıt/okuma, sha256 tutarlılığı.

## 5. Serbest ölçü (#21)

- Fabrika şablonu custom ölçüyle doğar; editör bu ölçüde çalışır
  (kılavuzlar/zoom doğru).
- Export: custom sayfa + crop marks; ExportRecord normal akış (kind
  mevcut print/preview).
- Vitest + PDF kanıtı: 750×1900mm senaryosu (sayfa 756×1906mm).

## 6. InDesign→SVG dışa aktarım rehberi

- `docs/arsiv-ithalati.md`: InDesign (ve Illustrator/Corel) → SVG
  adımları: metin kararı (canlı bırak + fontu yükle VEYA eğriye çevir —
  ikisinin sonuçları), mm ölçü, görselleri gömme, tek sayfa/katman
  notları, #19 sınırları. Türkçe, kullanıcı diliyle, kısa.
- Fabrika içe alma ekranından rehbere link.

## 7. KABUL SENARYOSU (müşteri verisine yazanlar klonda)

1. Karışık fixture (outline metin + canlı metin + gömülü raster + eksik
   harici raster + clip mask) → önizleme doğru (ölçü, eğri-metin
   uyarısı, eksik font, eksik varlık) → şablon doğar, künye dolu
   (ekran + API kanıtı).
2. Eksik fontlu canlı metin: slot bağlama ENGELLİ; font F5 akışıyla
   yüklendikten sonra aynı SVG yeniden içe alınınca bağlanabiliyor.
3. Serbest ölçü: 750×1900mm dekor SVG → şablon → belge → print PDF
   sayfası 756×1906mm + crop marks (pdfjs/inceleme kanıtı); preview
   750×1900mm.
4. Sıfır-slot şablon: içe al → belge → export çalışıyor (salt çıktı
   hattı, M2/M8 uyarısız).
5. Künye UI: kaynak ad/yol, fontlar, varlıklar, sha256 görünür.
6. Rehber dosyası mevcut + fabrika ekranındaki link çalışıyor.
7. Regresyon + kapanış: mevcut fabrika akışı (Faz 3 örnek şablonu)
   kırılmadı; toplam test ≥245 yeşil (migration replay v8 dahil);
   typecheck temiz; gerçek Aras VE Arriva katalog hash'leri değişmedi
   (önce/sonra kanıt); kabulde açılan klon(lar) silindi, export
   kanıtları kaldı.

## 8. Kayıtlar (uygulama YOK — TODO.md'ye)

FAZ 7 ("Yol A") adayları: çoklu fiyat sütunu (Ø24/32/40), birim/süre
alanı, iletişimde yapısal web alanı, sektörsüz şablon dili + rehber
örnekleri, TV/16:9 ekran varyantı, katalogdan hücreye sürükle-takas.
Faz S kayıtları mevcut, tekrarlanmaz.

## 9. Raporlama

Standart: kabul maddeleri kanıt tablosuyla · örnek dosya yolları ·
riskler/TODO · `phase-6` push; merge kullanıcı kabulüyle. Koşu
bölünürse §3→§6 sırası tek başına değer taşır — kalınan maddeden devam.
