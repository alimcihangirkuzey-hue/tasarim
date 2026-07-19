# MULTI_REPOSITORY_EVOLUTION_DIRECTIVE v1.2 — 2026-07-14
**Kanonik belge (00_READ_FIRST STEP 1/3'ün kalıcı karşılığı). ADR-001 ve ADR-004'ü tadil
eder (D-9). v1.2: yerleşim ürün sahibi kararıyla /docs ağacında SABİTLENDİ (D-13);
00_READ_FIRST STEP 1 yolları /docs köküne göreli okunur.**

## 1. Üç yaşayan ürün
- **Repository A — SWISS Restaurant** (`swiss_restoran`): Restaurant Operations ürünü.
  Kendi müşteri hattı (QR Starter → Lite → Pro), kendi governance'ı, kendi sürümü.
- **Repository B — STYVA Commerce** (`styva-eticaret`): SaaS platform + Commerce +
  Creative Studio yüzeyi. Tenant/auth/kredi/entitlement evi; program-governance evi.
- **Repository C — TEZGÂH Creative Engine** (`tasarim`): atölye ürünü + baskı-sınıfı
  render motoru (print/mockup/cmyk/garment). Atölye UI'ı gelir üretmeye devam eder.

**Yasaklar (kalıcı):** hiçbir repo pasifleştirilemez · salt-referans deposuna
dönüştürülemez · diğerinin içine eritilemez. "Şema kaynağı olarak absorbe" dili
KALDIRILDI; kaynak-alma yalnız sözleşme ve türetilmiş read-model ile olur.

## 2. Entegrasyon = Shared Contracts (sürümlü)
- **Render Contract v1** (B↔C): `POST /render` {doc, variant, watermark, target} →
  {file, meta}; HMAC imza. Doğduğu yer: GOAL-FLYER-01 paketi §8. Her iki tarafta
  contract test zorunlu.
- **Menu/QR Contract** (B↔A): restoran menü/QR verisinin okunması-bağlanması;
  GOAL-MENU/GOAL-QR'da doğar. Kanonik menü verisi A'da yaşar.
- **Tenant/Identity Contract** (B↔A): kimlik/tenant eşlemesi; GOAL-QR ile birlikte.
Kural: sözleşme = tek sürümlü dosya; kırıcı değişiklik = MAJOR + iki tarafta eşzamanlı
goal; kontrolsüz veri kopyası yasak (canonical owner + read-model/snapshot/event).

## 3. Kanonik sahiplik (özet; Faz 0 §11'in tadilli hâli)
Restoran operasyon verisi (menü, adisyon, mutfak, kurye, rezervasyon) → **A'da yaşar**.
Tenant/auth/kredi/abonelik/creative tasarım-şablon-snapshot → **B'de yaşar**.
Baskı-sınıfı render ve üretim çıktı motorları → **C'de yaşar**.
B'deki mükerrer Restaurant* modelleri B'nin kendi arşiv deseniyle deprecated edilir
(model arşivi ≠ repo pasifleştirme). C'deki catalog, C'nin atölye ürünü için yaşamaya
devam eder; platform katalog bağları sözleşmeyle kurulur.

## 4. Goal Impact Review (her Goal Execution Package'te zorunlu tablo)
Her goal için A / B / C / Contracts satırlarına karar: **NO CHANGE** (dokunulmaz) ·
**PATCH** (davranış-korumalı düzeltme/ek uç) · **MINOR** (geriye-uyumlu yeni yetenek) ·
**MAJOR** (kırıcı değişiklik; iki-taraflı plan şart). Yalnız gerçekten gereken repo
değişir. Kayıtlı ilk uygulama — GOAL-FLYER-01: A NO CHANGE · B MINOR · C NO CHANGE
(M1-M6) / PART B PATCH · Contracts: Render v1 doğar.

## 5. Repo-başına bağımsız süreç
Her repo: ayrı branch · ayrı commit · ayrı push · ayrı CHANGELOG.md · ayrı VERSION ·
ayrı RELEASE_NOTES.md · ayrı rollback. Program-seviye durum styva'daki
PROGRAM_COCKPIT'te; repo-yerel durum her reponun kendi STATE/MODULE_AUDIT kültüründe.

## 6. Yönetişim yerleşimi ve mevcut artefakt eşlemesi (v1.2 — /docs ağacı, D-13)
Materyalizasyon = ilgili repodaki İLK goal commit'i (styva'da GOAL-FLYER M2-adım-0).
| Yol | Kaynak artefakt |
|---|---|
| /docs/00_READ_FIRST.md | BOOT DOSYASI (üç repoda birebir kopya) |
| /docs/PROJECT_CONSTITUTION.md | Yönetişim direktifleri konsolidasyonu (AUTHORITY + FINAL + EK) |
| /docs/PROGRAM_COCKPIT.md | STYVA-PROGRAM-COCKPIT güncel sürüm (styva=master; A/C'de pointer) |
| /docs/GOAL_QUEUE.md · /docs/ROADMAP.md | Cockpit §2'den türetilir |
| /docs/EXECUTION_DIRECTIVE.md | EXECUTION DIRECTIVE metni (CODE EXECUTION BOOTSTRAP'ı 00_READ_FIRST devraldı) |
| /docs/MULTI_REPOSITORY_EVOLUTION_DIRECTIVE.md | BU BELGE (üç repoda kopya) |
| /docs/adr/ADR-001..006.md | Faz 0 §14-19 (001/004 D-9 tadil şerhli) |
| /docs/adr/ADR-007.md | Canonical v4.1.0 Bölüm 11 kökenli (Faz 0 karşılığı yok); durumu AÇIK |
| /docs/** | Diğer teknik/yönetişim belgeleri |
| CHANGELOG.md · VERSION.md · RELEASE_NOTES.md (repo kökü) | Yeni, repo-başına (endüstri standardı konum) |
| README (repo kökü) | Tek satır işaret eklenir: "Başlamadan önce: /docs/00_READ_FIRST.md" |
Çelişki kuralı: repo gerçeği ≠ doküman ise repo gerçeği esastır ve raporlanır.
