# TODO — Faz kapsamı dışına düşen notlar (M10)

Bu dosya, geliştirme sırasında "hazırken yapılmayan" işlerin kaydıdır.
Opus 4.8 devraldığında CONSTITUTION.md ile birlikte bu dosyayı okur.

> **Ritüel:** origin/main'e KOD push'u yalnız mimar merge onayından SONRA; docs/pilot-kayıt commit'leri istisna. Koşu, mimarın "başla"sı olmadan başlamaz.
>
> **Ritüel eki (F7-A dersi):** Onaylı plan, koşu başında dala/scratchpad'e kalıcılaştırılır (oturum kaybına dayanıklılık — plan sohbette kalırsa bağlam özetlenince/oturum düşünce kaybolur; F7-A'da plan önceki oturum transkriptinden kurtarıldı).

## Pilot dönem (aktif — Faz 4 kapanışıyla)
- [ ] **Pilot iş dönemi başladı — FAZ5 paketi pilot saha notlarıyla şekillenecek; bu dönemde gelen her yeni fikir/talep M10 gereği TODO'ya yazılır, sırasız uygulanmaz.**

### Pilot saha kayıtları (UYGULAMA YOK — kayıt biçimi: `- [YYYY-AA-GG] tek satırlık not / fikir / sürtünme`)
- [2026-07-08] 60+ ürünlük el yazısı menü tek tek girilemezdi — katalog toplu içe aktarma (yapıştır-parse) FAZ5 adayı; pilotta mimar+CC eliyle yüklendi. → **FAZ5 §4'te ele alınıyor.**
- [2026-07-08] Sunucu başlatma sürtünmesi 4. kez yaşandı; kök neden netleşti: tsx watch zinciri (apps/server) bazen 3001'e hiç bağlanmadan askıda kalıyor (EADDRINUSE değil — port boş ama süreç canlı/hayalet), vite tarafı ayakta kalınca proxy sürekli ECONNREFUSED basıyor. start-tezgah.bat artık kendi kendini kontrol ediyor: önce iki portu da yoklar, zaten sağlıklıysa dokunmaz; değilse proje yoluna göre (PowerShell CommandLine filtresi) hayalet node.exe süreçlerini temizleyip yeniden dener, sonucu pencerede "OK"/"BAŞARISIZ + öneri" olarak açıkça yazar (mimar onaylı, script-only). Kalıcı çözüm (tepsi uygulaması / otomatik başlatma / gerçek process-supervisor) Faz 5/S adayı.
- [2026-07-08] 3 sütunlu A4 flyer: kullanıcının referans tasarımının vektör kaynağı YOK (yalnız JPG). Karar: FAZ5'te (a) yolu seçildi — `menu-liste-premium`'a A4 3-sütun yoğun varyant eklenir (mimar #14). → **FAZ5 §3'te ele alınıyor** (yalnız a4-portrait; a4-landscape bu şablonda yok, pilotta ihtiyaç doğarsa yeniden değerlendirilir).
- [2026-07-08] Kullanıcı font yükleme talebi (FAZ5 adayı): arayüzden kendi font dosyasını (woff2/ttf) ekleyip başlık/gövde rollerinde seçebilme; glif kapsamı (TR+FR) otomatik kontrol edilmeli. Not: rol-bazlı font sistemi (başlık/gövde tek yerden) zaten mevcut — kullanıcıya gösterildi. → **FAZ5 §7'de ele alınıyor** (bekçi kümesi mimar #18).
- [2026-07-08] İLK GERÇEK İŞ TAMAMLANDI: Aras Restaurant, 75 ürün / 10 kategori, menu-liste-premium A4 2 sütun, v1 preview+print (crop marks doğru, aksanlar TR+FR temiz, 2 sayfa). Marka kiti düzeltmesi sonrası v2 alınacak. Pilot akışta göze çarpan: şablon/format/sütun keşfi kullanıcıya başta karışık geldi (Resimli Izgara'ya yanlışlıkla geçildi) — FAZ5 notu: belge açarken "bu iş için hangi şablon?" yönlendirmesi düşünülebilir. → **FAZ5 §8 (şablon seçim rehberi)'nde ele alınıyor.**
- [2026-07-09] FAZ 5 main'de: 3 sütunlu yoğun menü, katalog yapıştır-içe aktarma, tıkla-takas, sürükle-bırak, font yükleme, şablon rehberi, QR dijital menü v1 kullanımda. Pilot devam ediyor.
- [2026-07-09] İkinci gerçek müşteri: Arriva (CHF, çok-boyutlu pizza fiyatı tek-fiyat modeline not olarak sıkıştırıldı — FAZ 6 adayı: çoklu fiyat sütunu desteği).
- [2026-07-09] FAZ 6 main'de: fabrika SVG bekçileri (ölçü türet-önce-sor, outline/font/varlık tespiti), künye (manifest-provenance), serbest ölçü + custom bleed/crop, sıfır-slot dekor hattı, InDesign→SVG rehberi (docs/arsiv-ithalati.md). Migrationsız faz. Sıradaki pilot işi: kullanıcının arşivinden ilk gerçek InDesign→SVG dönüşümü.
- [2026-07-10] **FAZ 7 AÇILDI — öncelik Sipariş Modu** (mimar+kullanıcı kararı). Atölye içi + saha (tablet/telefon, mobil-öncelikli) tıkla-seç sipariş alma aracı — restoran POS'u DEĞİL. Vizyon: sektör profilleri (hazır kategori+ürün setleri) + ürün-başına akıllı sorular + içerik çipleri (klavyesiz) + çok-dilli (TR tıkla / FR-DE bas) öğrenen malzeme kütüphanesi + kapanış doneler/şartlar çeklisti. Arriva/Aras müşteri-dönüş hattı PARKTA (dönüş gelirse ayrı paket). Keşif (salt-okuma) bu oturumda yapıldı: PAKET-F7-KEŞİF envanter raporu + veri-modeli iskeleti mimara döndü.

## Küçük bekleyen işler (uygulama YOK — mimar onayı bekler, M10)
- [x] [2026-07-09] **Glif bekçisi #18 kümesine ä/Ä genişletmesi (DE-CH kapsamı).** → UYGULANDI (commit ecc9b6b, N2-B). `GLYPH_COVERAGE` sonuna ä/Ä eklendi (`packages/shared/src/fonts.ts`); 2 birim test + tam paket yeşil (255). Repo fontları (8 dosya, Pacifico dahil) ä/Ä içeriyor → kalıcı #18 repo-font testi kırılmadı. Bekçi davranışı: özel font yüklemede HARD-BLOCK (400 missing_glyphs, eksik glif listesi) + GLOBAL (tüm müşteriler için sıkılaşır). CONSTITUTION'a dokunulmadı; rehber kapsam ibaresi "TR+FR+DE-CH" olarak güncellendi (docs).
- [2026-07-09] **İçe aktarma politikası — fiyatsız ürün.** Şu an fiyatsız satır içe aktarmada ATLANIYOR (Arriva/Schnitzelbrot katalogta hiç yok); motor boş fiyatı güvenli basar (""). İthalatın "boş fiyatla al + içe-aktarma raporunda işaretle" seçeneği mimar kararı bekler ("auf Anfrage / günün fiyatı" senaryosu). Gözlem: içe aktarma yanıtı `skipped[]` listesinde `no-price` olarak DÖNDÜRÜYOR (anlık); kalıcı/UI raporlaması ayrı — paketlenirken doğrulanacak, raporlamıyorsa rapor satırı da kapsama girer.
- [2026-07-09] **Dipnot varsayılanı — `footnote_fr` EUR-gömülü.** Varsayılan "Prix nets en euros" CHF müşteride yanlış; Almanca menüde FR dipnot ayrıca soru. Para birimi + dil duyarlı varsayılan gerekli. ä/Ä bekçi genişletmesiyle birlikte **"DE-CH yerelleştirme"** aday kümesi.
- [2026-07-09] **Marka kiti versiyonlama/geçmişi YOK — sağlamlaştırma adayı (N2 gözlemi).** Kit tek JSON kolonu, **yerinde düzenleme** (geri-al yok); v3 "swii" temizliğinde yalnız manuel dosya yedeğiyle (scratchpad) rollback güvencesi sağlandı. `brandkit_history` / sürümlü kayıt (belge snapshot geri-yükleme desenine benzer, F4-6) gelecek sağlamlaştırma adayı. Bu pakette uygulama YOK.
- [2026-07-09] **Boş QR kaynağı sessiz — uyarı adayı (N2 gözlemi).** `qrSource` bir kit alanına (ör. `instagram`) bağlıyken o alan BOŞ ise QR sessizce hiç render edilmiyor (M8-doğru: artefakt yok) AMA **uyarı da üretmiyor** — kullanıcı "instagram QR" seçtiği belgede QR'ın kaybolduğunu fark etmeyebilir. `empty-required`-benzeri bir analiz uyarısı (boş bağlı kaynak) mimar kararı bekler. Aras doc_0e0ef817'de gözlendi.

### Arriva — teslim öncesi
- [ ] **Schnitzelbrot:** fiyat gelirse KATALOĞA EKLEME işi (ürün mevcut değil — "fiyatsız duruyor" değil, hiç yok).
- [ ] **Dipnot metni:** Arriva klonunda "Prix nets en euros" teslim öncesi düzeltilecek (ZORUNLU); tercih edilen ifade müşteriye sorulabilir.

### Aras — teslim öncesi
> **Tek müşteri mesajı:** slogan + Instagram + telefon + adres, dördü birlikte teyit ettirilir. Değerler gelince ayrı küçük yazım yapılır (kit alanları doldurulur).
- [ ] **Slogan + Instagram müşteriden alınacak.** Kit v3'te "swii" bulaşması `slogan_fr` ve `contact.instagram` alanlarından temizlendi (ikisi de BOŞ bırakıldı — doğrulanmış değer elde yok, tek-kaynak disiplini: uydurulmaz). Gerçek değerler müşteriden alınıp teslim öncesi girilecek. Boş slogan render'da zarifçe düşüyor (trifold/PageChrome slot boş → hiçbir şey basmaz, M8); yine de teslimde doldurulmalı.
- [ ] **Telefon + adres teyidi (placeholder şüphesi).** `contact.phone` = "3444333444" (tekrarlı rakam), `contact.address` = "seyrantepe ispar " (İstanbul semti) bariz geliştirme artığı placeholder — Fransa'daki restorana basılırsa kaza. **Bu pakette DOKUNULMADI**; yukarıdaki tek mesajda slogan+Instagram ile birlikte müşteriye teyit ettirilecek.

## Faz S'e kayıt (mimar defteri — uygulama İLERİDE, ayrı mimar paketiyle)
- [ ] **SaaS evrimi:** Postgres'e geçiş, auth + çok kiracılı çalışma alanı (workspace), bulut depolama, render kuyruğu, abonelik. Local-first (M7) v1 ilkesi korunur; SaaS ayrı bir dağıtım hedefi olarak tasarlanacak. Şimdilik YALNIZ kayıt — kapsam kararı mimarındır.
- [ ] **Faz S ön koşulu: güvenlik yükseltme turu (mimar kararı #11):** npm audit'in major yükseltmeleri (vite 8, @fastify/static 9 vb.) SaaS'a çıkmadan ZORUNLU; v1'de yapılmama gerekçesi local-first + yalnız 127.0.0.1 dinleme.
- [2026-07-09] Kullanıcı doğrudan PSD/EPS/CDR/PDF yükleme sordu. Karar: SVG kapısı KORUNUR (fabrika bekçisi vektör-metin formatı üzerine kurulu; PSD/CDR/EPS'i doğrudan parse etmek ayrı, kırılgan bir iş olurdu). Rehbere zaten "önce SVG'ye çevir" yönlendirmesi var. Stok görseller (Freepik/Adobe Stock, PNG/JPG) zaten SORUNSUZ — SVG'ye gömülü (embed) olarak eklenir, rehber madde 3 bunu kapsıyor. Gelecekte değer görürse: PDF→SVG dönüşümünü TEZGÂH'ın kendi içinde otomatikleştirme (örn. pdf2svg benzeri araçla) düşünülebilir — bugün gerek yok, Illustrator/İnternet dönüştürücüsü yeterli.

## Faz 5'e kayıt (FAZ4-GOREV §15)
- [x] QR dijital menü statik HTML export'u. → FAZ5 §9'da uygulanıyor.
- [ ] Çoklu-yüzey sahne (tek fotoda N quad kolajı). → Faz S'e taşındı.
- [ ] Arka plan silme entegrasyonu (lokal rembg veya dış API — ADR-7). → Faz S'e taşındı.
- [ ] FR açıklama önerileri (Claude API, opsiyonel/internetli). → Faz S (internetli, opsiyonel).
- [ ] AI destekli foto eşleme. → Faz S'e taşındı.
- [ ] Preset yönetim arayüzü (Faz S).

## Faz S'e kayıt (FAZ5-GOREV §11 — uygulama YOK)
- [ ] **Barındırılan dijital menü (abonelik):** Faz 5'te tek dosyalık statik HTML üretildi (§9); Faz S'te barındırılan sürüm — fiyat değişince otomatik güncellenir, temel abonelik gelir kalemi. (SaaS Vizyon Defteri'ndeki QR dijital menü ile aynı kalem.)
- [ ] **Arka plan servisi (bat'sız kalıcı çalışma):** sunucu+web `start-tezgah.bat` olmadan da PC açıkken kalıcı çalışsın — Windows servisi / tepsi (tray) uygulaması. Gerekçe: pilotta ve F5 kabul koşusunda sunucu süreci birkaç kez dışarıdan sonlandı (kırılgan başlatma); servisleştirme bunu kalıcı çözer.
- [ ] Arka plan silme / AI foto eşleme · çoklu-yüzey sahne · preset yönetim arayüzü → yukarıdaki Faz S kalemleriyle aynı (mükerrer değil).

## Faz 7 (AÇIK — öncelik Sipariş Modu; alttaki "Yol A" adayları FAZ6-GOREV §8)
- [ ] **★ ÖNCELİK — Sipariş Modu (atölye + saha, mobil-öncelikli).** Acemi pazarlamacı tıkla-seç akışla sipariş alır; görüşmede stil/tasarım KONUŞULMAZ. Bileşenler: (a) **sektör profilleri** (kebap/döner · pizza/fast-food · semt lokantası · café · pastane/tatlıcı) = hazır kategori+ürün setleri; (b) **ürün-başına akıllı sorular** (yarım/taneli porsiyon, ek kaymak/dondurma ister mi); (c) **İÇERİK ÇİPLERİ** — malzeme tıkla-yaz (klavye yok), çipte olmayan malzeme bir kez yazılınca **öğrenen kütüphaneye** katılır, malzeme adı **çok-dilli** (TR tıkla / FR-DE basılır); (d) **kapanış çeklisti** — logo, foto politikası (müşteri fotosu=ücretsiz işleme / atölye çekimi=ücretli), telefon-adres teyidi, kapora eğilimi notu, tasarım teslim zamanı sözü. **SINIR:** atölye içi araçtır, restoran POS'u DEĞİL. Keşif raporu + veri-modeli iskeleti: PAKET-F7-KEŞİF (2026-07-10, salt-okuma). Uygulama kararı + plan mimarda.
- [ ] Çoklu fiyat sütunu (ör. pizza Ø24/Ø32/Ø40) — şu an tek fiyat + açıklamada not (Arriva pilotunda sıkıştırıldı). Fiyat modeline birden çok etiketli sütun. **[KEŞİF NOTU: veri+render zemini HAZIR — `prices[]` çoklu varyant + `priceLayout:"columns"` menu-liste-premium'de çalışıyor; eksik olan editörde çoklu-fiyat GİRİŞ UI'si.]**
- [ ] Birim/süre alanı (ör. "/kg", "/saat", "330ml") — ürün fiyat varyantına yapısal birim.
- [ ] İletişimde yapısal web alanı (`BrandKit.contact.website`) — şu an notlara yazılıyor (Arriva).
- [ ] Sektörsüz şablon dili + rehber örnekleri (restoran-dışı işler için genel terminoloji).
- [ ] TV / 16:9 ekran menü varyantı (dijital ekran çıktısı).
- [ ] Katalogdan hücreye sürükle-takas (editörde slot'a doğrudan ürün bırakma).

### PAKET-F7-A (main'e merge `a89aa63`) + F7-B1 servis altyapısı
- [x] **F7-A teslim** (main'e merge+push): Item.ingredients[] (IngredientRef, D1 inline denormalize + ≥1 dil refine) · Client.menu_language (fr/de) · sector.ts Zod iskeleti (İÇERİK YOK) · migration v8 (ingredient_library + menu_language kolonu) · projeksiyon (intake→katalog: varyant→prices, çip→ingredients+desc_fr, ek-ikram→desc_fr " · " ayraç, boş fiyat→pending) · K3 fiyatsız=al+işaretle + empty-price analiz uyarısı · desc_fr backfill yardımcısı · POST /api/clients opsiyonel currency+menu_language. Canlı Aras/Arriva SALT-OKUMA geriye-uyumlu; ham catalog_json hash'leri değişmedi (c65fa762/b0d68d00).
- [x] **F7-B1 teslim (dal `paket-f7-b1`, merge onayı bekliyor):** çip kütüphanesi + sektör paketi SERVİS uçları — GET /api/sectors (kayıt defteri, şu an []), GET /api/ingredients (SEED∪DB merge, kaynak işaretli, usage_count↓/tr sıralı), POST (öğrenme + tr dedup foldTr — SEED'e de eşleşir, learned açmaz), PATCH (çeviri tamamlama; seed çipi **kopyala-yaz override** #4, source=seed; tags kod-seed'den korunur). Tüm mantık shared saf-fn'de (merge/dedup/patch-resolve/şema), route ince tutkal. TOHUM İÇERİĞİ YOK, migration YOK. E2E smoke 4 uç (temizlikle, count tabana döndü). 312 yeşil.
- [x] **F7-B2 teslim (dal `paket-f7-b2`, merge onayı bekliyor):** sektör/çip TOHUM İÇERİKLERİ — 60 çip (`INGREDIENT_SEED`, seed-chips.ts) + 5 paket / 39 kategori / 140 item (`SECTOR_PACKS`, sector-seed.ts): kebap_doner · pizza_fastfood · lokanta · cafe · pastane. COMMON_QUESTIONS (12) + 4 paket-özel soru (q_boy_kahve/q_boy_cay/q_adet_top/q_birim_kisi); montaj helper'ı paket sorularını item atıflarından toplar. Item adı fr=terminoloji, tr üretildi (Türkçe/loan→aynı, Fransızca→çeviri), de best-effort. **q_icerik SEED'DEN ÇIKARILDI** (#3). Referans bütünlüğü + parse testleri; canlı smoke (izole 3010): GET sectors→5, GET ingredients→60 source:seed, **SEED-OVERRIDE canlı kanıtı (B1 borcu ödendi)** + temizlik (taban 0). Mantık/route/schema DEĞİŞMEDİ. 323 yeşil.
- [x] **F7-C teslim (dal `paket-f7-c`, merge onayı bekliyor):** Sipariş Modu intake UI — mobil-öncelikli AYRI sayfa (`/siparis`, ≥44px, editör yeniden kullanılmadı) 6 adım: müşteri (yeni/mevcut) → paket ÇOKLU seçim → ürün tıkla-seç → sorular→varyant + çip düzenleme (default ön-seçili/sil/kütüphaneden-ekle/yaz→öğren; "içerik basılmasın" B4) → çeklist (zorunlu) → özet (pending+translationGaps GÖRÜNÜR M8) → COMMIT. **Atomik `POST /api/intake`** (migration v9 intake_records; tek transaction: müşteri yarat + catalog_history + projectIntake **APPEND** [ŞERH 1/M5 — mevcut değişmez] + usage_count bump [B1 #5 ÖDENDİ] + kayıt; hata→tam rollback). **Taslak localStorage** (D — müşteri yalnız commit'te; ŞERH 2 devam/at). E şeması: `SectorPackCategory.note`→`Category.note_fr` (2 tohum notu geri yazıldı — "Servies avec frites et salade" / "Change chaque jour"). planUsageBump skipped[] (ŞERH 4). 335 yeşil; typecheck temiz. **Fonksiyonel E2E** (izole 3010, UI commit boru hattıyla birebir): öğren-çip→intake→3 kat katalog→menu-liste-premium RENDER→usage bump→TAM temizlik (taban 0, gerçek müşteriler dokunulmadı) 14/14 ✓. **GÖRSEL EKRAN GÖRÜNTÜLERİ (A4 önizleme/390px mobil/özet — KABUL #2-4) ÜRETİLEMEDİ: Chrome eklentisi bağlı değil (list_connected_browsers []); mimar kararı bekliyor.**
- [x] **PAKET-HF1 teslim (dal `paket-hf1`, merge onayı bekliyor):** F7-C görsel-QA denemesinde çıkan **kırılgan-server 4. tekrarının kök nedeni giderildi** — `apps/server` `dev` script'i `tsx watch`'tan (bazen `app.listen`'e ulaşmadan askıya giriyordu) **watch'suz `tsx`'e** çevrildi (kanıtlanmış sağlam boot: `npm run dev -w apps/server` doğrudan çalıştırılıp bat'takiyle birebir aynı health-check döngüsü **1. saniyede OK** verdi). Eski davranış `dev:watch` olarak korundu (opsiyonel hot-reload). `start-tezgah.bat` KOD OLARAK değişmedi (zaten gerçek `/api/health` 200 gate'i vardı, yanlış-OK üretmiyordu — zincirin ucu düzelince otomatik iyileşti). **Intake fetch-hata görünürlüğü (M8):** `/siparis` sectors/ingredients sorguları artık sunucu erişilemezken SESSİZ BOŞ kalmıyor — `FetchError` bileşeni (mesaj + tekrar-dene) `PacksStep` + `IntakeProductsStep`'te; network-red zinciri (sunucu kapalıyken `fetch failed`) doğrudan kanıtlandı. 335 yeşil, typecheck temiz. app.db'ye dokunulmadı (WAL kozmetik, elleşilmedi).
- [x] **PAKET-HF2 teslim (dal `paket-hf2`, merge onayı bekliyor):** kullanıcı QA bulguları B1 (ürün butonları boş) + B2 (foto politikası butonları boş → İleri kilitli) **KÖK NEDENİ KANITLANIP DÜZELTİLDİ** — global `button{color:#fff}` (styles.css:40-44) `.intake-choice`'ın `background:#fff` ile çakışıp beyaz-üstü-beyaz üretiyordu (`.intake-choice` hiç `color` tanımlamıyordu); `color: var(--c-ink)` eklendi. Tek CSS satırı 4 kullanım yerini kapsar: ürün seç (B1) · foto politikası (B2) · mevcut müşteri seç · paket seç (son ikisi henüz rapor edilmemiş ama aynı kök nedenden etkileniyordu). Küçük: kategori başlığı "Tacos· ..." bitişikliği — flex container'da ayrık yalnız-boşluk text node'un CSS Flexbox spec'i gereği layout'tan düşmesiydi (`IntakeProductsStep.tsx`), boşluk `<span>` içine taşındı. `ready` mantığı (İleri kilidi) mantık-düzeyinde doğrulandı — sorun CSS'teydi, state mantığı zaten doğruydu. 335 yeşil, typecheck temiz. `.intake-chip` aynı riski taşıyor (düşük kontrast, SAF beyaz değil) — kullanıcı rapor etmedi, kapsam dışı bırakıldı.
- [x] **DUR-SOR ÇÖZÜLDÜ — HF2-B, mimar kararı SEÇENEK 1 (istemci-sınırlı):** `IntakeProduct.name/category_name/category_note` artık ham `LocalizedName {tr,fr,de}` (`intakeStore.ts`) — görüntüleme HER YERDE `pickDisplay()` (HER ZAMAN TR, 8 çağrı: `IntakeProductsStep.tsx:88,102,155,156,182,256` · `IntakeSummaryStep.tsx:60`), commit eşlemesi TEK NOKTADA `pickML(x, menu_language)` (3 çağrı, hepsi `IntakeSummaryStep.tsx:38,39,40`). Sunucu/projeksiyon/IntakeAnswers şekli DEĞİŞMEDİ. Taslak sürüm bekçisi eklendi: `SCHEMA_VERSION=1` + persist `migrate()` — eski (string şemalı) taslak MİGRASYON DENENMEDEN temiz atılır + `consumeDraftDiscardedNotice()` ile operatöre açık mesaj (`SiparisPage.tsx`, sessiz kayıp yok). `.intake-chip` de `color` aldı (aynı ailenin düşük-kontrast kuzeni). 335 yeşil, typecheck EXIT=0.
  - **Kapsam dışı bırakıldı (not):** özet ekranındaki `translationGaps` listesi (item/label) hâlâ ÇIKTI dilinde gösteriliyor, TR'ye çevrilmedi — bu liste zaten "çeviri eksik, X dilinden alındı" diyen dil-duyarlı teknik bir uyarı; TR'ye çevirmek isim-bazlı eşleştirme (kırılgan) gerektirirdi. Gerekirse ayrı küçük iş.
- [ ] **F7-C GÖRSEL KABUL BORCU (kullanıcı manuel QA — main'de, start-tezgah.bat) — DEVAM EDİYOR:** HF2 (B1/B2 + dil-ayrışması) sonrası akışı yeniden sür (müşteri→paket→ürün→sorular/çipler→çeklist→commit) + **A4 önizleme** + **~390px mobil** + **özet pending/gaps**. Artık `menu_language=de` ile test edilse de operatör ekranları TR kalmalı — bunu da doğrula. Bulgu çıkarsa hotfix paketi.
- [ ] **F7 sonraki adaylar:** tam çok-dilli render (desc menu_language'a göre kuruluyor ama şablonlar hâlâ desc_fr'den basıyor); q_menu SEUL/MENÜ + boolean varyant sorularının UI'da ele alınışı (v1'de yalnız choice-opsiyonlu sorulardan varyant türetiliyor); intake-record görüntüleme/düzenleme; mockup (Faz 8 — çeklist ölçü/yüzey notları VERİ olarak duruyor).
- [ ] **Çip override temizliği (F7-B1 #4 bakım notu):** seed override (source=seed) her zaman kod-seed'i ezer (atölye düzeltmesi kazanır); kod-seed sonradan aynı değere güncellenirse override BAYAT kalır. İleride "kod-seed'e eşitlenen override'ı sil" bakım aracı — veri riski yok, yalnız sadeleştirme.
- [ ] **Yapısal ek-ikram alanı (D2 ertelemesi):** projeksiyon ek-ikramı desc_fr'ye görsel ayraçla (" · ") gömüyor; yapısal `item.extras[]` / `note_fr` alanı render/UI (intake) fazında değerlendirilecek — bugün desc_fr yeterli, şema şişmedi.
- [ ] **Server HTTP route birim-test harness'ı YOK:** proje deseni saf-fn + migration replay + E2E kabul; `db` modül singleton. menu_language kalıcılığı migration v8 + ClientCreateSchema testiyle dolaylı kanıtlı; doğrudan POST/PUT route testi için `buildApp(injectable db)` refactor'u gelecek altyapı adayı (Faz S test altyapısı).

### Park notları (PAKET-F7-KEŞİF — 2026-07-10, uygulama YOK)
- [ ] **Glif bekçisi politika kararı — hard-block KALIR.** Özel font ä/Ä dahil kümeyi tam karşılamazsa yükleme reddedilir (mevcut davranış korunur). Tetikleyici: bir font YALNIZCA ä/Ä yüzünden reddedilirse, dil-duyarlı küme (müşteri diline göre gevşetme) tartışması O GÜN açılır — bugün spekülatif genişletme yok. İlgili: [[phase-6-durumu]] bekçi kararları.
- [ ] **Harness/health-check standardı: `127.0.0.1`, `localhost` değil.** Windows'ta `localhost` önce IPv6 `::1`'e çözülüyor; server yalnız IPv4 `127.0.0.1`'e bind olduğundan `localhost` üzerinden fetch/Invoke-WebRequest ECONNREFUSED veriyor (N2 kapanışında yaşandı). Tüm betik/health-check/örnek çağrılarda `127.0.0.1` kullan. (Server saha erişimi için `0.0.0.0` bind'i ayrı iş — Sipariş Modu saha maddesi.)
- [ ] **Müşteri kaydı hijyeni — gerçek/test işaretleme (KULLANICI CEVABI BEKLENİYOR).** Kayıtlı müşterilerden `ARAS Grill Lyon`, `Basel Kebap Haus`, `Antalya Kebab — Lyon` gerçek mi test mi belirsiz; kullanıcıya sorulacak, test olanlar temizlenecek/etiketlenecek. (Gerçek pilot müşteriler: Aras Restaurant, Arriva Restaurant; klon: Arriva Native N1.)

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
