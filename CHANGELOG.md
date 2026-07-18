# CHANGELOG — TEZGÂH Creative Engine (Repo C)

Repo-başına bağımsız süreç (direktif v1.2 §5). Tarihçe bu dosyanın başlangıcından
itibaren tutulur; öncesi için git log + TODO.md teslim kayıtları esastır.

## [Unreleased]
### Added
- **P3 CAP-LAYER-01 — katman sistemi + undo/redo + kalıcılık:** CD v1'in İLK
  additive alanı `canvas?` (cd_version 1 KALDI; yokluk=eski davranış) · katmanlı
  canvasReduce (kilit/görünürlük korkulukları; son-katman-silinemez) · /atolye
  katman paneli (klavyesiz tam kullanım; kilitli/gizli GÖRÜNÜR uyarı) ·
  katman-silme FIX-1 deseniyle 5sn Geri-al (D-46) · görünür ↺/↻ + Ctrl+Z/Y
  (derinlik 50) · Kaydet → MEVCUT PUT; `/atolye?doc=<id>` bağlı mod.
  ⚠ Kalıcılık ASKIDA: sunucuda canvas depolaması yok (kolon-temelli tablo;
  migration bu pakette yasak) — karar yönetişimde, smoke bilerek 22/24.

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
