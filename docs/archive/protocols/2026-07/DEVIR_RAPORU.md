# DEVİR RAPORU — Eski protokollerden V3.1'e

**Tarih:** 2026-07-19 · **Otorite:** `TEZGAH_CANONICAL_PROTOCOL.md` (V3.1.0, repo kökü)
**Bu dosya otorite DEĞİLDİR.** V3.1 §1.2'nin şart koştuğu analiz kaydıdır: bu klasördeki
belgeler arşivlenmeden ÖNCE içerikleri çıkarıldı, sınıflandırıldı ve karşılığı olmayan
kararlar aşağıda listelendi.

**Arşivlenenler:** `CONSTITUTION.md` (anayasa v1.0) · `FAZ1-GOREV.md` … `FAZ6-GOREV.md`
**Yerinde kalanlar (V3.1 ile çelişmiyor, aktif kayıt):** `TODO.md` · `CHANGELOG.md` ·
`README.md` · `RELEASE_NOTES.md` · `docs/adr/*` · `docs/creative-document-v1.md` ·
`docs/export-kinds.md` · `docs/arsiv-ithalati.md` · yönetişim belgeleri

---

## 1. Anayasa maddeleri (CONSTITUTION §2, M1-M10)

| Madde | Sınıf | Gerekçe |
|---|---|---|
| M1 içerik ≠ tasarım, binding | **KORUNDU** | V3.1 §13 |
| M2 editör kısıtlı, serbest eleman yok | **ÇELİŞKİLİ** | V3.1 §5.6/§14.3 serbest kompozisyonu açıyor |
| M3 tek render kaynağı | **KORUNDU** | §15.2 adapter ile aynı amaç |
| M4 her belge baskıya hazır | **REVİZE** | §17.3 INFO/WARNING/BLOCKER seviyeli preflight'a taşındı |
| M5 bir müşteri = bir marka kiti | **BİRLEŞTİRİLDİ** | §12.1 proje **veya** müşteri seviyesi |
| M6 klonlama birinci sınıf | **KAYIP** | V3.1'de karşılığı yok → U13 |
| M7 local-first, SQLite, bulut yasak | **GEÇERSİZ** | §16 PostgreSQL/S3/queue |
| M8 deterministik yerleşim, sessiz kırpma yasak | **KORUNDU** | §6.1 + §5.4 |
| M9 çıktı FR / arayüz TR | **REVİZE** | §34.3 çoklu dil, RTL, Latin-dışı |
| M10 faz disiplini | **BİRLEŞTİRİLDİ** | §21 + §25 |

## 2. Teknoloji ADR'leri (CONSTITUTION §11)

ADR-1 lokal web app → **GEÇERSİZ** (§0 SaaS) · ADR-2 SQLite → **GEÇERSİZ** (§16) ·
ADR-3 Puppeteer → **REVİZE** (§15.2 ServerRenderer) · ADR-4 v1 RGB PDF → **ÇELİŞKİLİ**
(§17.1 CMYK + §25 "browser export ile PDF/X iddia etme") · ADR-5 Zod → **KORUNDU** ·
ADR-6 Zustand+TanStack → **KORUNDU** · ADR-7 arka plan silme sistemin işi değil →
**GEÇERSİZ** (§8.3 zorunlu yetenek) · ADR-8 OFL + Latin Extended → **REVİZE** (§34.3)

> **Ad çakışması:** `docs/adr/ADR-001..006` (program ADR'leri) ile buradaki ADR-1..8
> (teknoloji) aynı numaraları kullanıyor. Çözüm kararı bekliyor (öneri: teknoloji
> ADR'leri `ADR-T-*` olarak yeniden adlandırılsın).

---

## 3. ★ TAŞINMASI GEREKEN KARARLAR (V3.1'de karşılığı YOK)

Aşağıdaki hükümler repoda **yaşıyor ve çalışıyor**; V3.1 metninde geçmiyor. Silinmeleri
bilinçli bir karar olmalı — aksi halde sessizce kaybolurlar.

| # | Karar | Nerede yaşıyor |
|---|---|---|
| U1 | **Mockup damgası** ("baskı provası değildir", 3 dil, piksel-gömülü, yalnız MockupPage) + `MOCKUP_MAX_W=1600`, hires 3200 re-onay literal'i | ADR-005, kod |
| U2 | **Export kind sözlüğü — 12 kanal** + versiyon sayacı kuralları | `docs/export-kinds.md` |
| U3 | **Dosya adlandırma sözleşmesi** `{slug}/{tarih}_{tip}_{format}_v{n}_{kind}.pdf` | kod + arşiv |
| U4 | **Glif bekçisi** (TR+FR+DE-CH kümesi, hard-block) — §34.3 ile çelişir, karar gerekli | fonts rotası |
| U5 | **Şablon künyesi/provenance** (sha256, kaynak yol, fontlar) | factory.ts |
| U6 | **Gerçek-veri sabitliği protokolü** (klonda test, sha256 önce/sonra) | FAZ5/FAZ6 |
| U7 | **Append-only audit sözleşmesi** (repo-taramalı testle korunuyor) | migrations.test.ts |
| U8 | **BAT sunum PDF'i** (imza bloğu + FR hukuki cümle) | present hattı |
| U9 | **Üretim fiziği**: trifold 97/100/100 · kart bleed 2mm · >5000mm 1:10 damgası | manifestler |
| U10 | **Découpe/broderie hattı**: SVG'de `<text>` kalmaz, broderie fişi | vector.ts |
| U11 | **Serbest ölçü hattı** (30-3000mm) + sıfır-slot dekor şablon | fabrika |
| U12 | **EUR/CHF + FR fiyat biçimi + allerjen dipnotu** (Fransa/İsviçre pazarı) | schemas |
| U13 | **Klonlama = birinci sınıf** ("5 dakikada ilk PDF" ölçütü) | clone.ts |
| U14 | **Şablon fabrikası KOD üretir** (DB'de opak şablon yok) | factory hattı |
| U15 | **Yönetişim hukuku**: merge kapısı, main'e doğrudan push yasağı, EK-GIT raporu, KK-1..8, PA yetkileri | docs/00_READ_FIRST, kokpit |
| U16 | **Render Contract v1** (HMAC, env'siz 503 kapalı-kapı) | render.ts |
| U17 | **CD v1 additive-only** şema evrim kuralı | creative-document-v1.md |
| U18 | **Migration disiplini**: additive-only, replay testi, idempotency, rollback'te tablo kalır | migrations.ts + testler |
| U19 | **Bilinçli kapsam-dışı listesi** (3B modelleme, çok kullanıcılı yetki, self-servis portal…) — V3.1 çoğunu geri açıyor | CONSTITUTION §1 |
| U20 | **Ölçülmüş kararlar**: Chromium PDF %0,11 sapma toleransı, letterSpacing ×3,7795 | mimar #9/#10 |
| U21 | **Harness standartları**: `127.0.0.1`, watch'suz server boot, `TEZGAH_DB_PATH` test seam'i | README, paths.ts |

---

## 4. Yapısal çelişkiler (V3.1 varsayımı ↔ repo gerçeği)

| Konu | V3.1 | Repo | Şiddet |
|---|---|---|---|
| Veri katmanı | PostgreSQL + Prisma | SQLite + better-sqlite3, 13 migration | **KRİTİK** |
| Tenant | her kayıt tenant kapsamında | tenant kolonu YOK, auth YOK | **KRİTİK** |
| Baskı | CMYK/ICC/PDF-X, browser export yasak | Chromium PDF (RGB) + opsiyonel gs | **KRİTİK** |
| Dinamik layout motoru | ürünün kalbi | yalnız `menu-liste-premium`'da olgun akış; simetri/kategori dengeleme/designSeed YOK | **KRİTİK** |
| Durum modeli | 8 durum (§20) | 3 ayrı sözlük yaşıyor (belge/sipariş/F1 brief) | **YÜKSEK** |
| Tek editör çekirdeği | §14.2 | 3 paralel yüzey (Editor · Atölye/Konva · Brief) | **YÜKSEK** |
| Depolama | S3 + signed URL | yerel disk + doğrulamasız statik servis | **YÜKSEK** |
| Onay immutability | onaylanan değişmez | `approved` belge PUT ile serbestçe değişir | **YÜKSEK** |
| Arka plan silme | zorunlu (§8.3) | ADR-7: sistemin işi değil | **ORTA** |
| 3B/mimari sunum | §31 hedef | TODO: "kalıcı kapsam dışı" | **YÜKSEK** |
| Stok kütüphanesi + lisans | §9.3 | lisans/kaynak alanı YOK | **ORTA** |

---

## 5. Ürün sahibi kararı bekleyen açık sorular

1. **SaaS geçişi ne zaman?** Postgres + tenant + S3 zaten "Faz S" olarak kayıtlıydı; V3.1 bugüne çekiyor. Canlı pilot (2 gerçek müşteri) local-first çalışıyor.
2. **Dinamik layout motoru** mevcut manifest+overflow motorunun *yerine* mi, *üstüne* mi gelecek?
3. **Durum sözlüğü birleştirmesi** — dört sözlükten biri kanonik seçilmeli (migration gerektirir).
4. **Glif bekçisi hard-block** korunacak mı? (Latin-dışı alfabe hedefiyle çelişiyor.)
5. **Yönetişim hukuku (U15)** V3.1'e taşınacak mı, feshedilecek mi?
6. **Geri açılan kararlar** (3B modelleme, arka plan silme, çok kullanıcılı yetki) kayda geçsin mi?
7. **ADR numaralandırma çakışması** nasıl çözülecek?
