# Export kind sözlüğü (`export_records.kind`)

Tek gerçek: `packages/shared/src/schemas.ts` → `ExportRecordDTO["kind"]` birliği.
Bu sözlük insan-okur özet; yeni kind eklenirken İKİSİ birlikte güncellenir (F8-E kuralı).

| kind | Üretici | Çıktı |
|---|---|---|
| `print` | `POST /api/documents/:id/export` | Baskı PDF'i (bleed + crop marks) |
| `preview` | aynı uç (print ile aynı versiyon) | Önizleme PDF'i |
| `presentation` | `POST /api/projects/:id/present` | Sunum PDF'i (kapak + kart + mockup sayfaları + BAT); F8-E: `mockup_mode:"per_scene_kind"` → belge×sahne-türü çok-yüzey |
| `mockup` | `POST /api/documents/:id/mockup` | Sahne JPG'si — damga piksel-gömülü, tavan `MOCKUP_MAX_W=1600` (ADR-005) |
| `mockup_hires` | `POST /api/documents/:id/mockup-hires` (F8-E) | KAPILI yüksek-çöz (EKRAN) JPG — zorunlu re-onay literal'i ("baskı için değildir"), damga koşulsuz, tavan `MOCKUP_HIRES_MAX_W=3200`; baskı-sınıfı DEĞİLDİR |
| `decoupe` | vitro découpe export'u | Kesim SVG/PDF (text→path) |
| `broderie` | garment broderie export'u | Nakış üretim dosyası |
| `broderie_fiche` | garment broderie export'u | Nakış teknik fişi |
| `png` | SVG/PNG export hattı | PNG görsel |
| `snapshot` | belge geri-yükleme güvenlik kaydı | Durum snapshot'ı |
| `print_cmyk` | `POST /api/documents/:id/export-cmyk` (ADR-4) | CMYK matbaa PDF'i |
| `digital_menu` | `POST /api/clients/:id/menu-digital` | Tek dosyalık statik HTML menü |

Versiyon sayacı: belge-bazlı kind'larda belge+kind başına, `presentation`'da proje+kind
başına `MAX(version)+1`. `mockup` ve `mockup_hires` sayaçları AYRIDIR.
