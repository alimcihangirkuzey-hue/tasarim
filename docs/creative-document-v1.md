# Creative Document v1 (CD v1) — P1 CAP-CD-01 (D-34/D-35)

**Çekirdek iddia:** CD v1 = bugünkü belge modeli (`DocumentDTO`) + `cd_version` sürüm
damgası. Yeni zorunlu içerik alanı YOKTUR. Tek gerçek: `packages/shared/src/schemas.ts`
(`CD_VERSION`, `DocumentStateSchema`); bu belge insan-okur sözleşme özetidir — şema
değişirse İKİSİ birlikte güncellenir.

## 1. Alan tablosu

| Alan | Zorunluluk | Kaynak | Not |
|---|---|---|---|
| `cd_version` | zorunlu (parse'ta default 1) | şema | `z.literal(1).default(1)` — yanlış sürüm ZodError → 400 |
| `id` | zorunlu | DB satırı | `doc_*` iç kimlik |
| `client_id` | zorunlu | projects JOIN | belge sahibi müşteri |
| `project_id` | zorunlu | DB satırı | sipariş defteri bağı |
| `template_id` | zorunlu | state | `TEMPLATES` kayıt defteri kimliği (manifest bağı) |
| `params` | zorunlu, default `{}` | state | şablon parametreleri (format dahil) |
| `theme_id` | zorunlu, default `"brand"` | state | tema; "brand" müşteri kitine bağlanır |
| `selection` | zorunlu, default `{}` | state | katalog seçimi/sıralaması (include modeli) |
| `overrides` | zorunlu, default `{}` | state | slot override'ları `{value, detached}` |
| `status` | zorunlu, default `"draft"` | state | draft → sent → approved → printed |
| `created_at` / `updated_at` | zorunlu | DB satırı | ISO damgalar |

Render girdisinin belge-DIŞI yarısı (CD'ye YAZILMAZ, render anında okunur):
`client.brandkit` + `client.catalog` (şablon slot bind'ları `brand.*` / `catalog.*` /
`item.*`) + `TEMPLATES[template_id]` manifest + tema.

## 2. Uyumluluk kuralı (additive-only)

- Alan SİLİNMEZ, YENİDEN ADLANDIRILMAZ; yalnız OPSİYONEL alan EKLENİR.
- `cd_version` yalnız KIRICI değişiklikte artar (v2); o güne dek literal 1 kalır.
- Eski belgeler ve eski `snapshot_json` state'leri (cd_version'suz) parse anında
  default'la dolar — DB kolonu/migration YOKTUR (rowToDocument Zod-default deseni;
  SceneSettings/F8-D emsali).
- Bilinmeyen alan toleransı korunur (Zod strip): yarının alanları bugünü kırmaz.
- Restore yolu `cd_version`'ı EZEMEZ (patch 5 içerik alanından kurulur; partial'da
  yanlış sürüm reddedilir) — test: `creative-document.test.ts`.

## 3. Dışa-açılan yüzey — ÇIKAR / ÇIKMAZ (C1 iskeleti)

C1 (Creative Contract dış-spec, AYRI paket — D-35a) bu tabloyu contract diline çevirir.

| ÇIKAR (dış yüzey) | Gerekçe |
|---|---|
| `cd_version` | tüketici uyumluluk kapısı |
| kimlikler (`id`, `client_id`, `project_id`) | opak referanslar |
| `template_id` (+ seçili format kimliği) | çıktının şablon bağlamı |
| `params` · `theme_id` · `selection` · `overrides` · `status` · `updated_at` | belgenin kendisi |

| ÇIKMAZ | Gerekçe |
|---|---|
| HAM `brandkit` / `catalog` İÇERİĞİ | veri sahibi TEZGÂH; tüketici render SONUCU alır, girdi verisini değil (federasyon D-29/D-31 + müşteri-verisi koruması) |
| DB iç temsilleri (`*_json` ham dizeleri) | iç uygulama ayrıntısı |
| Yerel dosya yolları (provenance `source_note` dahil) | yerel-yol sızıntısı |
| Export tarihçesi (`export_records`) | atölye iç kaydı |

**Aday additive alan:** `refs { brandkit_hash?, catalog_hash? }` (render girdisinin
belge-dışı yarısının sha256 parmak izleri) — **v1'de AÇILMADI (D-35 tadili, YAGNI);
C1 ile değerlendirilir** (doğal tetik: ilk gerçek tüketim tarifi).

**K3 notu:** katman modeli ileride opsiyonel alanla eklenir (additive) — bugün
placeholder açılmaz.

## 4. Render Contract v1 ilişkisi

`POST /render` isteğindeki `doc` OPAK belge kimliği olarak kalır; yanıt `meta`'sına
`cd_version` eklendi (ADDITIVE). İstek şeması ve kanonik imza dizesi değişmedi →
**RENDER_CONTRACT_V=1 KORUNUR** (test: `render-contract.test.ts` CD1-2 bloğu).
