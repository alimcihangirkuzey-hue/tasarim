# CHANGELOG — TEZGÂH Creative Engine (Repo C)

Repo-başına bağımsız süreç (direktif v1.2 §5). Tarihçe bu dosyanın başlangıcından
itibaren tutulur; öncesi için git log + TODO.md teslim kayıtları esastır.

## [Unreleased]
### Added
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
