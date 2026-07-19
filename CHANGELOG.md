# CHANGELOG — TEZGÂH Creative Engine (Repo C)

Repo-başına bağımsız süreç (direktif v1.2 §5). Tarihçe bu dosyanın başlangıcından
itibaren tutulur; öncesi için git log + TODO.md teslim kayıtları esastır.

## [Unreleased]
### Fixed
- **BULGU-P5-1 (GT-F1/P5, m.P5.5) — hata mesajı okunaksızdı:** dosya reddinde
  ekranda yalnız `policy_reject` yazıyordu; operatör NEDENİ göremiyordu. Kök:
  istemcinin `http()` yardımcısı gövdeden yalnız `error` kodunu okuyup
  `rejects[].detail_tr` / `detail` alanlarını atıyordu — aynı kör-nokta durum
  geçişinde de vardı (`transition_blocked`). Çözüm: saf + testli
  `apiErrorMessage` (shared) — kod değil GEREKÇE gösterilir ("Dosya reddedildi
  — Dosya açılamadı / okunamadı"; "Geçiş engellendi — Tasarım eşiği kapalı…").

### Added
- **Canonical v4.1.0 — Bölüm 11 "Geliştirme Operasyonu" (Package Journal +
  Developer Cockpit):** modül mimarisi kayda geçti; **kod yazılmadı.** Package
  Journal geliştirme sürecinin **ölçüm** verisinde tek doğruluk kaynağı ilan
  edildi (iki kayıt türü: paket + olay; append-only, ölçüm dürüstlüğü şartlı:
  koşulmayan kapı "geçti" yazılamaz). İki sınırlı istisna, ikisi de **işaretli**:
  dış sistemlerin canlı okuması ve yol haritası gibi niyet bilgisinin plan
  sınıfı — hiçbiri ölçüm gibi sunulamaz. Modül dört
  **modül fazına** ayrıldı (Bölüm 10.2'nin program fazlarından ayrı) — 0 Journal ·
  1 salt-okunur yüzey · 2 canlı gözlem + olay akışı · 3 kapı-içi operasyon;
  *merge başlat* ve *dağıtım başlat* bu fazın **kapalı kalemleri** olarak kayıtlı.
  **11.6: Cockpit icra yüzeyidir, yetki kaynağı
  değildir** — panelden yapılabilen hiçbir işlem panel dışındaki kapısından muaf
  değil. Yetkilendirme sözleşmede yer ayırdı, uygulaması ertelendi (K-16..K-20).
  Faz 0 şartının gerekçesi ölçüldü: gate sonuçları bugün **hiçbir makine-okunur
  yerde saklanmıyor** (CI yok · git hook yok · vitest reporter yok · gate tablosu
  yok); tek kalıcı iz TODO.md'ye düzyazı olarak düşen, ayrıştırılamayan ve hiçbir
  mekanizmayla doğrulanmayan cümleler.
- **ADR-007 (AÇIK) — panelden otomatik merge yetkisi:** serideki ilk
  KABUL-olmayan kayıt. Dağıtım yarısı koşulsuz kapalı (canlı ortama geçiş ürün
  sahibine rezerve). Merge yarısı, önce bir **otorite boşluğunun** çözülmesini
  bekliyor: merge yasağının yaşadığı `docs/00_READ_FIRST.md`, Canonical §0.2
  çelişki sıralamasının altı kademesinden hiçbirine karşılık gelmiyor — yasak
  geçersiz değil, *rütbesi tanımsız* (yeni **EK-C/A-07**).
- **EK-C/A-08 — ADR numaralandırma çakışması izlemeye geri alındı:** K-04
  çakışmanın giderildiğini ilan etmişti; ölçüm ilkenin icra edilmediğini
  gösterdi (hiçbir dosya yeniden adlandırılmadı, tek TDR kaydı yok, canlı
  `TODO.md` hâlâ `ADR-7` diye teknoloji ADR'sine atıf yapıyor; canlı kodda da
  atıf var — `apps/server/src/routes/assets.ts:10`). Madde DEVIR_RAPORU'nda
  duruyor (`:101`, açık soru 7) ama EK-C'ye taşınırken düşmüştü.
  **Şerh:** çakışma dizinde değil *kullanımdadır* — `docs/adr/` bugün 001-007
  içerir, **ADR-008 slotu boştur**; çakışan, arşivdeki tek haneli `ADR-1..8`
  teknoloji serisidir. Numara kaydırmak çözmez (iki seri paralel yaşadıkça her
  numara iki anlama gelir); çözüm A-08'in icrasıdır. Adlandırmada iki aday var
  ve seçim de A-08'e dahil: DEVIR_RAPORU'nun `ADR-T-*` önerisi ile Canonical
  0.3'ün `TDR-nnn` kararı.
- **F1 pilot P0 — route-test harness:** `buildApp()` (apps/server/src/app.ts)
  kuruluşu dinlemeden döndürür → route testleri `app.inject()` ile gerçek uç
  üzerinden koşar; `db.ts` bağlantı katmanında enjekte edilebilir
  (`TEZGAH_DB_PATH` + `setDatabase`) — 24 rota dosyasının imzası DEĞİŞMEDİ,
  davranış birebir. TODO'daki kayıtlı test-altyapısı borcu ödendi.
- **F1 pilot P5 (D-63 katılaştırma) — sessiz düzeltme kaldırıldı:** beden×adet
  girdisinde ondalık/negatif/metin/NaN/bilinmeyen beden ve **üst sınır aşımı**
  artık REDDEDİLİR (400 + gerekçe + audit); 0 adet meşru ama **toplam 0 → alan
  eksik**. `F1FieldRule.validate` ile **alan tip/değer denetimi**: çöp veri
  REDDET-sınıfı tasarım kapısını açamaz; ilan edilen **teknik listesi zorlanır**
  (garment'ta `decoupe` reddedilir, DTF kabul + bilgi notu). UI'da beden hücresi
  **kontrollü** — ayrıştırılamayan girdi sessizce silinmez, hücre altında
  gerekçe belirir; red sonrası ekran ile kayıt ayrışmaz. (Bulgular bağımsız
  şüpheci doğrulama turundan: B-1…B-10.)
- **F1 pilot P5 — garment/tekstil intake + beden×adet matrisi:** menü ile AYNI
  yaşam döngüsü/durum makinesi/dosya politikası; fark yalnız alan matrisi.
  **Beden×adet** `spec_values.size_distribution` (v13 kolonu — yeni migration
  YOK); toplam adet **hesaplanır** (`f1TotalQuantity`), 0/negatif adetler
  düşer, boş dağılım eksik sayılır. **spec_values YAZMA BEKÇİSİ:** yalnız
  SpecRef'te tanımlı (kolon/türetme kaynaklı olmayan) anahtarlar yazılabilir →
  tanımsız/yabancı-aile alanı **400**. `/brief` sayfası iki aileyi de taşır
  (ürün tipi · baskı yeri · renk · teknik [DTF → bilgi notu] · beden×adet canlı
  toplam · tasarım dosyası).
- **F1 pilot P4 — menü intake + brief yaşam döngüsü (v13):** additive
  `briefs.spec_values_json` (ürün sahibi onayı `spec-values: 1`; BLOCKER-3'ün
  evi — spec alan değerleri SWISS sözleşme kolonlarına gömülmedi) · brief
  uçları (oluştur/oku/güncelle/**guard'lı durum geçişi**; REVIEW/READY kenarları
  P7'ye kilitli, `501 not_yet_available`) · **F1.7 bağlandı**: dosya invalidate
  → iş kayıtlı gerilemeyle INCOMPLETE'e düşer · fiyat eksiksizliği **katalogdan
  okunur** (14e) · web `lib/specJoin.ts` (SpecRef↔manifest TEK modül) +
  **kapasite uyarısı** (format seçiminde "N ürün sığmıyor" — P4/D ölçümünün
  doğrudan sonucu) · `/brief` menü akışı: kalıcı eksik-bilgi rozeti (F1.2),
  logo yükleme, uyarı onayı, durum düğmeleri. Mevcut `/siparis` akışına ve
  `intakeStore`'a DOKUNULMADI (taslak sürümü bump edilmedi → kullanıcı
  taslakları atılmaz).
- **F1 pilot P3 — dosya politikası + audit bağı:** `file-policy.ts` (saf
  sınıflandırma; REDDET/UYAR+onay/BİLGİLENDİR üçlüsü + warning_code sözlüğü —
  kodlar `brief_audit.warning_code` ile birebir) · **genel `/api/assets`
  sertleştirmesi** (bozuk dosya artık kaba 500 değil yapılandırılmış 400
  policy-red; kabul-tür listesi DEĞİŞMEDİ, webp korunur; türevler önce
  hesaplanır → yarım işlemde artık dosya kalmaz) · **yeni brief sınırı**
  (`POST /api/briefs/:id/files` spec v1 tür listesiyle [webp burada red],
  PDF yalnız-sakla + derin-doğrulama BİLGİ notu, aynı rolde version++ ·
  `POST .../warnings/:code/ack` audit beşlisini doldurur, REDDET koduna
  istisna verilemez [F1.5] · `PATCH .../files/:fileId/invalidate` F1.7
  zemini). brief_audit'e YALNIZ INSERT (append-only korunur).
- **F1 pilot P2 — Spec-referans + completeness engine:** `f1-spec.ts` (DB tablosu
  YOK — `template_id+format` ile mevcut TemplateManifest'e REFERANS; iki aile
  matrisi VERİ olarak: menü/garment · design_pre|production_pre iki katman ·
  koşullu kurallar · `brief_files.role` ile hizalı dosya şartları) +
  `f1-completeness.ts` (saf motor: design_readiness · production_completeness
  [payda yalnız AKTİF koşullularla büyür, opsiyoneller hiç girmez] · kayıtlı
  istisna taşınır · **REDDET-sınıfı istisnayla karşılanamaz — F1.5** · isimli
  eksik listesi). §7 HİZALAMASI: durum zinciri kanonik metne göre düzeltildi
  (kısayol kenarları kaldırıldı; %100 kapısı üretim incelemesine taşındı;
  "açık REDDET yok" + "insan onayı" şartları eklendi). Rota/davranış YOK.
- **F1 pilot P1 — Brief domain (D-61 onaylı, v12):** additive `briefs`
  (13 alanlık SWISS sözleşmesi + `idempotency_key UNIQUE` = F1.6'nın DB
  garantisi + 6 F1 durumu CHECK) · `brief_audit` (istisna-audit alanları,
  APPEND-ONLY — repo taramalı testle korunur) · `brief_files` (dosya
  versiyon/geçerlilik köprüsü, F1.7 zemini; assets'e dokunulmadı) +
  shared `f1-state.ts` durum makinesi (tasarım eşiği ile üretim eşiği AYRI;
  gerileme yalnız meşru-kayıtlı; üretim kapısı yalnız PRODUCTION_READY).
  Rota/davranış YOK — tüketiciler P2+.
- **P3 CAP-LAYER-01 — katman sistemi + undo/redo + kalıcılık:** CD v1'in İLK
  additive alanı `canvas?` (cd_version 1 KALDI; yokluk=eski davranış) · katmanlı
  canvasReduce (kilit/görünürlük korkulukları; son-katman-silinemez) · /atolye
  katman paneli (klavyesiz tam kullanım; kilitli/gizli GÖRÜNÜR uyarı) ·
  katman-silme FIX-1 deseniyle 5sn Geri-al (D-46) · görünür ↺/↻ + Ctrl+Z/Y
  (derinlik 50) · Kaydet → MEVCUT PUT; `/atolye?doc=<id>` bağlı mod.
  Kalıcılık GERÇEK (LY2b, D-48 — programın İLK ONAYLI migration'ı): v11
  `documents.canvas_json TEXT` (additive tek kolon; eski satır NULL=yokluk,
  veri dönüşümü YOK) + rowToDocument/PUT bağı → kaydet→yenile→geri-geldi
  canlı; smoke 24/24. LY2c (K3 GT-1 BULGU-1): katman-sil ✕'i satır TAŞMASIYLA
  viewport dışında kalıyordu (5 kapalı yol — fiziksel kırpılma, ölçülü kök) →
  252px panel + sıkı ikonlar + ad-ellipsis + GÖRÜNÜR çerçeveli 🗑 (hover-gizli
  değil; son-katman/kilitli sönük+açıklamalı) + reducer'a KİLİTLİ-katman
  silme guard'ı; sil/undo/redo TEK-girdilik headless zincir kanıtlı.

### Fixed
- **HF-TRIO-01 (GT m.1/m.4/m.10):** /siparis onaysız Kaldır'a 5sn "Geri al"
  (çip:a — onay koşulu aynen; tek tıkla veri kaybı bitti) · özet gap listesi AD
  fallback'lerini de basar (`intakeNameGaps` + otomatik repro-test) · EditorPage
  mockup modalına "Canlı önizleme ↗" bağlantısı (hires eyleminin kapısı açıldı).
- **CV1-FIX-01 (GT m.13):** /atolye — add-mode'da mevcut şekle tıklama artık
  SEÇİM (çoğalma bitti; `shapeAtPoint` reducer kemeri + stage tek-kaynak seçim) ·
  araç çubuğuna görünür **Sil** düğmesi (Del tuşuna mahkûmiyet bitti). +4 test;
  449 yeşil.

### Added
- **P2 CAP-CANVAS-01 — Konva iskeleti:** programın ilk yeni bağımlılığı
  (`konva 9.3.22` + `react-konva 18.2.16`, MIT; lockfile'da mevcut sürüm
  oynamadı) · izole `/atolye` rotası (React.lazy — konva chunk'ı YALNIZ bu
  rotada iner: 91.83KB gzip ≤160 hedef; ana bundle Δ +0.57KB = yalnız rota
  kaydı) · Stage + tek Layer + pan/zoom + izin-listeli şekiller
  (Kare/Elips/Metin) + seç/taşı + kısıtlı Transformer + Del + çift-tık metin ·
  korkuluk çekirdeği SAF fonksiyonlarla `shared/canvas.ts`'te (clampToBounds ·
  snapToGrid · zoomAt · canvasReduce; +19 test) · kalıcılık/CD bağı BİLİNÇLİ
  yok (D-35(c); K3'te additive) · ADR-002'ye federasyon şerhi dosyada.
  Test tabanı 426→445.
- **P1 CAP-CD-01 — Creative Document v1:** belge modeline sürüm damgası —
  `CD_VERSION=1` + `DocumentStateSchema.cd_version` (`z.literal(1).default(1)`;
  eski belgeler/snapshot'lar parse anında uyumlu, DB kolonu/migration YOK);
  additive-only uyum kuralı + ÇIKAR/ÇIKMAZ dış-yüzey sınırı
  (docs/creative-document-v1.md — C1 iskeleti); Render Contract yanıt meta'sına
  `cd_version` (ADDITIVE — istek şeması/kanonik imza değişmedi,
  RENDER_CONTRACT_V=1 korundu). refs/K3 alanları bilinçli AÇILMADI (D-35, YAGNI).
  Test tabanı 412→426.
- **F8-E:** çok-yüzey kurumsal sunum — `POST /api/projects/:id/present` additive
  `mockup_mode:"per_scene_kind"` (belge×sahne-türü EN SON mockup sayfaları + tür
  etiketi + yüzey etiket/cm + kapak "N tasarım · M yüzey" + BAT Surfaces; default
  `"last"` birebir eski davranış) + **kapılı yüksek-çöz (EKRAN) mockup**:
  `POST /api/documents/:id/mockup-hires` (zorunlu re-onay literal'i "baskı için
  değildir", damga koşulsuz, kind `mockup_hires`, tavan `MOCKUP_HIRES_MAX_W=3200`;
  varsayılan yol 1600 AYNEN — ADR-005 tadili + docs/export-kinds.md sözlüğü).
  `surfaceToSceneKind` eşlemesi (F8-A borcu kapandı). Canlı smoke 31/31; test
  tabanı 391→412.
- **PART-B adım-1:** Render Contract v1 engine şimi — `POST /render {doc, variant,
  watermark, target} → {file, meta}` (MULTI_REPO v1.2 §2); HMAC-SHA256 imza
  (kanonik dize, `x-render-signature`); kapı varsayılan KAPALI
  (`RENDER_CONTRACT_SECRET` yoksa 503); stateless (export_records'a yazmaz,
  çıktı `data/exports/_contract/<slug>/`); watermark v1'de uygulanmaz —
  meta'da görünür bildirilir. 8 uyum testi + gerçek-şablon canlı smoke 8/8.
- **PART-B adım-0:** /docs governance bootstrap — PROGRAM_COCKPIT (v14 pointer-şerhli
  kopya) · GOAL_QUEUE · ROADMAP · adr/ADR-001..006 (001/004 D-9 şerhli) ·
  EXECUTION_DIRECTIVE (işaretçi) · MULTI_REPOSITORY_EVOLUTION_DIRECTIVE v1.2 kopyası;
  kök CHANGELOG/VERSION/RELEASE_NOTES; README boot satırı. (00_READ_FIRST.md metni
  henüz teslim edilmedi — additive eklenecek.)

## [0.1.0] — durum anlık görüntüsü (2026-07-14, main `3e38545`)
Pilot üründe yaşayan başlıca yetenekler (ayrıntı: TODO.md teslim kayıtları + git log):
- Faz 1-6: katalog/marka kiti/editör · sipariş defteri · mockup hattı (homografi +
  sahneler) · tema/fabrika · CMYK · dijital menü · arşiv-ithalat bekçileri.
- Faz 7 Sipariş Modu: sektör paketleri + öğrenen çip kütüphanesi + atomik intake +
  tek-yüzey akış (CILA1-5, HF1-3, T1b tekrar-intake birleşmesi).
- Faz 8: F8-A yüzey köprüsü (client_surfaces, migration v10) · F8-D mockup
  profesyonelleştirme (dil-duyarlı damga · MOCKUP_MAX_W · sahne katman altyapısı).
- Test tabanı: 383 (server 56 · shared 188 · templates 139).
