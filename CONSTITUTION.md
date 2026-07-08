# TEZGÂH — Grafik Atölyesi Otomasyon Sistemi
## Spesifikasyon ve Anayasa · v1.0

> **Bu doküman nedir:** Fransa'daki Türk restoranları ve dönerciler için grafik işleri (menü, flyer, sadakat kartı, cam giydirme, tabela, tişört) üreten tek kişilik bir atölyenin tekrarlayan işlerini otomatikleştiren yazılımın tam spesifikasyonudur. Mimari ve kurallar Claude Fable 5 tarafından tasarlandı; kodlama Claude Opus 4.8 tarafından, Bölüm 14'teki talimatlarla yapılacaktır.
>
> "TEZGÂH" bir kod adıdır (dönerci tezgâhı + çalışma tezgâhı); istediğin gibi değiştirebilirsin.

---

## 0. Dokümanın Kullanımı

1. Bu dosyayı reponun köküne `CONSTITUTION.md` adıyla koy.
2. Opus 4.8 ile her faza **ayrı oturumda** başla; oturumun ilk mesajında bu dosyayı ver ve Bölüm 14'teki prompt şablonunu kullan.
3. Herhangi bir tasarım kararı tartışmasında **Bölüm 2 (Anayasa) son sözü söyler.** Anayasa ile çelişen kod kabul edilmez.
4. Bölüm 15'teki açık soruları kodlamaya başlamadan **önce** cevapla ve cevapları bu dokümana işle.

---

## 1. Vizyon ve Kapsam

### 1.1 Problem

Atölyenin işlerinin ~%80'i aynı kalıptan türer: yeni bir dönerci açılır ya da mevcut müşteri güncelleme ister → logo, renkler ve menü içeriği alınır → daha önce yapılmış benzer bir tasarım Illustrator'da açılır → içerik elle değiştirilir → JPEG önizleme WhatsApp'tan gönderilir → 2–5 tur revizyon → baskıya hazır PDF hazırlanır. Her turda elle yapılan iş: metin değiştirme, fiyat güncelleme, fotoğraf yerleştirme, hizalama, yeniden export. Aynı restoranın menüsü, flyer'ı ve cam giydirmesi aynı bilgiyi üç kez elle taşır.

### 1.2 Çözümün özü

İçeriği tasarımdan ayıran, şablon tabanlı, tıkla-düzenle bir üretim sistemi:

- Müşteri başına **marka kiti** (logo, renkler, fontlar, iletişim) ve **katalog** (kategoriler, ürünler, fiyat varyantları, fotoğraflar) **bir kez** girilir.
- **Şablonlar** bu veriyi otomatik giyer; gridli ↔ yazılı menü geçişi tek tıktır, fiyat değişikliği tüm belgelere yansır.
- Editörde yalnızca **tanımlı slotlar** düzenlenir; baskı kuralları (bleed, güvenli alan, çözünürlük) şablona gömülüdür ve bozulamaz.
- Çıktılar: baskıya hazır PDF, mockup görselleri (vitrin, tişört, tabela) ve müşteri onayı için **BAT sayfalı sunum PDF'i**.

### 1.3 Kapsam içi — v1 ürün tipleri

| Ürün | Tipik format | Not |
|---|---|---|
| Menü — gridli | A4/A3, tek/çift yüz | Fotoğraf ağırlıklı; en çok satılan tip, önceliklidir |
| Menü — yazılı | A4, tek/çift yüz | Liste düzeni + noktalı fiyat hizalama (leader dots) |
| Menü — trifold | A4 açık → 3 panel (roll fold) | Katlama çizgileri, sabit panel haritası |
| Flyer | A5/A6, ön-arka | Kampanya odaklı ("2 dürüm + boisson 10€") |
| Carte de fidélité | 85×54 mm | Damga grid'i, ödül metni |
| Vitrophanie (cam giydirme) | cm bazlı serbest boyut | Mockup kritik; impression/découpe modları |
| Tabela (enseigne) | cm bazlı serbest boyut | Bina fotoğrafına mockup |
| Tişört baskısı | Göğüs/sırt baskı alanları | Şeffaf PNG + vektör çıktı, renkli tişört mockup'ı |

### 1.4 Kapsam dışı — bilinçli olarak

- Serbest çizim tuvali (Canva/Illustrator klonu **değildir**)
- Müşterinin kendi kendine tasarım yaptığı self-servis portal
- Online sipariş, stok, muhasebe; basit müşteri kaydı ötesinde CRM
- Çok kullanıcılı ekip/yetki sistemi (tek kullanıcı varsayımı)
- Otomatik matbaa siparişi entegrasyonu (dosya export yeterlidir)

---

## 2. ANAYASA

Bu on madde tartışmaya kapalıdır. Kod, tasarım ve faz kararları bunlara uymak zorundadır. Çelişki görüldüğünde geliştirme durur, kullanıcıya sorulur.

**M1 — İçerik tasarımdan ayrıdır.** Menü içeriği, fiyatlar ve iletişim bilgileri yalnızca katalog ile marka kitinde yaşar. Şablonlar veriyi *bağlar* (binding), kopyalamaz. Aynı verinin iki yerde elle tutulması yasaktır.

**M2 — Editör kısıtlıdır.** Kullanıcı yalnızca şablonun tanımladığı slotları düzenler. Serbest eleman ekleme, taşıma, döndürme yoktur. *Gerekçe:* serbest tuval = aylarca geliştirme + tutarsız çıktı; kısıtlı editör = haftalarca geliştirme + her çıktının baskı kurallarına otomatik uyması.

**M3 — Ekran neyse baskı odur.** Tek render kaynağı vardır: aynı şablon bileşeni hem editörde interaktif olarak hem PDF üretiminde print modunda çizilir. İkinci bir render yolu yazmak yasaktır.

**M4 — Her belge her an baskıya hazırdır.** Bleed, güvenli alan, minimum font boyutu ve çözünürlük eşikleri şablon manifestinde tanımlıdır; arayüzden ihlal edilemez. İhlal riski (düşük çözünürlüklü fotoğraf, taşan metin) görünür uyarı üretir.

**M5 — Bir müşteri = bir marka kiti.** Kit değişirse (renk, logo, telefon) müşterinin tüm belgeleri bir sonraki açılışta yeni kiti yansıtır. Belge bazında bilinçli override mümkündür ama işaretlidir ve tek tıkla geri alınabilir.

**M6 — Klonlama birinci sınıf işlemdir.** Müşteri, proje, belge ve katalog tek tıkla kopyalanabilir. "Yeni dönerci = benzer dönerci kopyası + yeni marka kiti + yeni fiyatlar" akışı 5 dakikada tamamlanabilmelidir.

**M7 — Local-first.** Sistem internetsiz çalışır. Veri SQLite'ta + diskte okunabilir klasörlerdedir (`data/assets/`, `data/exports/`). Bulut servis zorunluluğu yasaktır; yedekleme = `data/` klasörünü kopyalamak.

**M8 — Yerleşim deterministiktir.** Taşma (overflow) davranışı manifestte tanımlı kurallarla çözülür: önce izinli aralıkta font küçültülür, sonra taşan öğeler devam sayfasına akar ya da görünür uyarı verilir. İçeriğin sessizce kırpılması yasaktır.

**M9 — Çıktı Fransızca, arayüz Türkçe.** Tüm fontlar Latin Extended kapsamalıdır (é è ç œ + ş ğ İ ı aynı fontta). Fiyat formatı FR yereli: `7,50 €`. Arayüz metinleri tek `tr.json` dosyasında toplanır.

**M10 — Faz disiplini.** Her fazın sonunda çalışan, kabul kriterlerini geçen bir ürün vardır. Sonraki fazın özelliği öne çekilmez; "hazır olmuşken şunu da ekleyeyim" yasaktır.

---

## 3. Alan Sözlüğü (Domain)

Kodda ve arayüzde tutarlı kullanılacak kavramlar:

- **Seul / Menu:** Dönercide standart fiyat varyantı. *Seul* = ürün tek başına; *Menu* = ürün + frites + boisson. Fiyat, varyant listesi olarak modellenir (bkz. 4.3); başka varyantlar da mümkündür (S/M/L, simple/double viande).
- **BAT (Bon À Tirer):** Fransız matbaa geleneğinde müşterinin "basılabilir" onayı. Sunum PDF'inin son sayfası BAT bloğu içerir: tasarım küçük görselleri, tarih, "Bon pour accord" ibaresi, imza alanı. Revizyon sonrası anlaşmazlıkları önler.
- **Vitrophanie:** Cam/vitrin kaplaması. İki mod: *impression* (baskılı folyo, tam renk) ve *découpe* (kesim folyo — tek renk, saf vektör). Découpe modunda yalnızca mono logo + metin kullanılabilir. İçeriden uygulanan folyo için **miroir** (ayna çevirme) seçeneği.
- **Enseigne:** Tabela. v1'de tek panel dikdörtgen tasarım + bina fotoğrafına perspektif mockup.
- **Halal rozeti:** Marka kitinde açılıp kapanan standart rozet; menü/flyer şablonlarında yeri önceden tanımlıdır.
- **Allerjen dipnotu:** Menü şablonlarındaki standart yasal dipnot slotu. Varsayılan metin: `Prix nets en euros — Liste des allergènes disponible sur demande.`
- **Roll fold trifold:** A4 yatay (297×210 mm) üçe katlama. İçe kapanan panel matbaa standardı gereği **2 mm dardır** (97 mm; diğerleri 100 mm). Panel haritası manifestte sabittir — dış yüz soldan sağa: [iç kapak kanadı 97 | arka kapak 100 | ön kapak 100], iç yüz: [panel 1 100 | panel 2 100 | panel 3 97]. Kullanıcı panel sırası düşünmez, şablon halleder.
- **Leader dots:** Yazılı menülerde ürün adı ile fiyat arasındaki noktalı hizalama çizgisi (`Döner Kebab ............ 7,50 €`). CSS/SVG ile deterministik üretilir, elle nokta yazılmaz.
- **QR slotları:** Telefon, Google yorum linki, Uber Eats/Deliveroo linki için vektör QR kodlar (Bölüm 10).

---

## 4. Veri Modeli

### 4.1 Varlık ilişkileri

```
Client 1—1 BrandKit          (JSON kolon)
Client 1—1 Catalog           (JSON kolon: Category[] → Item[])
Client 1—N Project           (iş grubu, ör. "Açılış paketi 2026")
Project 1—N Document         (tek tasarım örneği)
Document N—1 Template        (kod içinde kayıtlı şablon)
Client 0..1—N Asset          (client_id NULL ⇒ ortak stok havuzu)
Document 1—N ExportRecord    (versiyon geçmişi + snapshot)
MockupScene                  (Faz 3: fotoğraf + perspektif dörtgeni)
```

### 4.2 SQLite tabloları

```sql
clients(id, name, slug, brandkit_json, catalog_json, notes, created_at, updated_at)
projects(id, client_id, name, status, created_at)
documents(id, project_id, template_id, params_json, theme_id,
          selection_json, overrides_json, status, created_at, updated_at)
assets(id, client_id NULLABLE, kind, filename, width_px, height_px, created_at)
export_records(id, document_id, kind, filepath, snapshot_json, version, created_at)
mockup_scenes(id, client_id NULLABLE, name, photo_asset_id, quad_json)  -- Faz 3
```

Tüm JSON kolonları `packages/shared` içindeki Zod şemalarıyla doğrulanır; DB'ye geçersiz JSON yazılamaz.

### 4.3 BrandKit şeması (örnek)

```json
{
  "logo_primary": "asset_001",
  "logo_mono": "asset_002",
  "colors": {
    "primary": "#C8102E",
    "secondary": "#1A1A1A",
    "accent": "#F2B705",
    "background": "#FFF8EF",
    "text": "#1A1A1A"
  },
  "fonts": { "heading": "Anton", "body": "Inter" },
  "contact": {
    "phone": "01 23 45 67 89",
    "address": "12 rue de la République, 69002 Lyon",
    "hours": "7j/7 — 11h à 23h",
    "instagram": "@antalyakebab.lyon",
    "google_review_url": "https://g.page/r/...",
    "delivery": [{ "platform": "ubereats", "url": "https://..." }]
  },
  "badges": { "halal": true },
  "slogan_fr": "Le vrai goût du kebab"
}
```

### 4.4 Catalog şeması (örnek)

```json
{
  "categories": [
    {
      "id": "cat_sandwichs",
      "name_fr": "Sandwichs",
      "order": 1,
      "items": [
        {
          "id": "itm_doner",
          "name_fr": "Döner Kebab",
          "desc_fr": "Veau ou dinde, crudités, sauce au choix",
          "photo": "asset_123",
          "prices": [
            { "label": "seul", "value": 7.5 },
            { "label": "menu", "value": 10.0 }
          ],
          "tags": ["populaire"],
          "visible": true,
          "order": 1
        }
      ]
    }
  ],
  "footnote_fr": "Prix nets en euros — Liste des allergènes disponible sur demande."
}
```

Kurallar: fiyatlar sayı olarak tutulur, gösterim FR formatlayıcıdan geçer (`7.5` → `7,50 €`). `visible:false` ürün katalogda kalır ama hiçbir belgeye akmaz. `tags` şablonlarda rozet üretebilir (`populaire`, `nouveau`, `épicé`, `végé`).

### 4.5 Document

```json
{
  "template_id": "menu-grid-a4",
  "params": { "cols": 3 },
  "theme_id": "classic-red-black",
  "selection": {
    "mode": "include",
    "category_order": ["cat_sandwichs", "cat_assiettes"],
    "excluded_items": ["itm_salade_cesar"]
  },
  "overrides": {
    "slot:title": { "value": "NOS SANDWICHS", "detached": true }
  },
  "status": "draft"
}
```

- **selection:** katalogdan bu belgeye hangi kategori/ürünlerin hangi sırayla akacağı. Aynı katalogdan menüye 40 ürün, flyer'a 6 ürün akabilir.
- **overrides:** slot bazında elle değişiklik. Override'lı slot editörde "bağlantı kopuk" ikonu taşır; tek tıkla veri kaynağına geri bağlanır (M5).
- **status:** `draft → sent → approved → printed`.

---

## 5. Şablon Sistemi (Sistemin Kalbi)

### 5.1 Şablon nedir

**Şablon = React bileşeni + manifest.** Saf SVG dosyası değil, koddur:

```
packages/templates/src/menu-grid-a4/
├── manifest.ts     → slot tanımları, sayfa ölçüleri, kısıtlar, temalar, params
└── Template.tsx    → SVG çıktısı üreten React bileşeni
```

Bileşen imzası: `Template({ data, theme, params, selection, overrides, mode })`.
`mode: "edit" | "print"` — edit modunda slotlar tıklanabilir sarmalayıcıyla, print modunda düz render edilir (M3).

Faz 1–3 şablonları elle kodlanır (Opus, kullanıcının mevcut tasarımlarının tarifinden). Faz 4'te SVG import + slot işaretleme aracı eklenir.

### 5.2 Koordinat sözleşmesi

**SVG kullanıcı birimi = milimetre.** A4 + 3 mm bleed: `viewBox="0 0 216 303"`. Bleed ve güvenli alan çizgileri şablonun kendisi tarafından ayrı bir katmanda çizilir (editörde aç/kapa, print'te crop marks hariç gizli). DPI çevrimi yalnızca raster görsel yerleştirmede yapılır.

### 5.3 Renk ve font enjeksiyonu

Şablon asla sabit renk/font içermez; her şey CSS custom property üzerinden gelir:

```
fill: var(--c-primary)        font-family: var(--f-heading)
```

Roller: `--c-primary, --c-secondary, --c-accent, --c-background, --c-text, --f-heading, --f-body`. **Tema** = bu property'lerin bir eşleme seti. Marka kiti renkleri varsayılan temayı besler; hazır temalar (classic-red-black, green-gold, minimal-cream, night-neon…) tek tıkla property setini değiştirir. Böylece tema değişimi render kodu değişmeden çalışır.

### 5.4 Manifest yapısı (örnek, kısaltılmış)

```ts
export const manifest = {
  id: "menu-grid-a4",
  type: "menu",
  name_tr: "Gridli Menü A4",
  page: { w_mm: 210, h_mm: 297, bleed_mm: 3, safe_mm: 5, pages: 1 },
  params: [
    { id: "cols", type: "choice", options: [2, 3, 4], default: 3, label_tr: "Kolon sayısı" }
  ],
  slots: [
    { id: "logo",     kind: "image", bind: "brand.logo_primary", fit: "contain" },
    { id: "title",    kind: "text",  bind: null, default_fr: "NOTRE CARTE",
      font_mm: { min: 8, max: 14 }, maxLines: 1 },
    { id: "phone",    kind: "text",  bind: "brand.contact.phone" },
    { id: "halal",    kind: "badge", bind: "brand.badges.halal" },
    { id: "footnote", kind: "text",  bind: "catalog.footnote_fr", font_mm: { min: 2.2, max: 3 } },
    { id: "qr_review",kind: "qr",    bind: "brand.contact.google_review_url", optional: true }
  ],
  repeaters: [
    {
      id: "items",
      bind: "selection.items",
      layout: { kind: "grid", colsParam: "cols", rowH_mm: 62, gap_mm: 4 },
      itemSlots: [
        { id: "photo", kind: "image", bind: "item.photo", fit: "cover" },
        { id: "name",  kind: "text",  bind: "item.name_fr", font_mm: { min: 3.2, max: 5 } },
        { id: "desc",  kind: "text",  bind: "item.desc_fr", font_mm: { min: 2.4, max: 3.2 }, maxLines: 2 },
        { id: "price", kind: "price", bind: "item.prices" }
      ],
      overflow: "shrink-then-flow"   // veya "shrink-then-warn"
    }
  ],
  themes: ["classic-red-black", "green-gold", "minimal-cream"]
};
```

### 5.5 Slot tipleri

| kind | İçerik | Editör kontrolü |
|---|---|---|
| `text` | Tek/çok satır metin | Çift tık inline edit; font boyutu izinli aralıkta ± |
| `image` | Fotoğraf/logo | Asset seçici, fit (cover/contain), **odak noktası** kaydırma (cover kırpması için) |
| `color` | Rol tabanlı dolgu | Marka paleti + tema renkleri arasından seçim |
| `price` | Fiyat varyant grubu | Otomatik FR format; varyant etiketleri (`seul/menu`) şablon stilinde |
| `qr` | URL'den vektör QR | Bind kaynağı seçimi (tel / review / delivery) |
| `badge` | Koşullu rozet (halal, nouveau) | Aç/kapa |
| `repeater` | Kategori/ürün akışı | Editörde değil, sol paneldeki seçim listesinden yönetilir |

### 5.6 Overflow (taşma) kuralları — M8

S�ra kesindir ve manifestte belirtilir:

1. **shrink:** repeater içindeki metin slotları `font_mm.min` sınırına kadar küçülür.
2. Sonra manifeste göre:
   - **flow:** taşan öğeler otomatik devam sayfasına/sütununa akar (yazılı menüde doğal davranış),
   - **warn:** grid şablonlarında sabit hücre sayısı aşılırsa editörde kırmızı sayaç çıkar: "3 ürün sığmıyor — seçimi azalt, kolonu artır ya da A3'e geç". Kırpma asla sessiz olmaz.

### 5.7 Şablon kayıt defteri

`packages/templates/src/index.ts` tüm şablonları `id → { manifest, component }` haritasıyla export eder. Editör ve print sayfası yalnızca bu kayıt defterinden okur. Yeni şablon eklemek = klasör ekle + kayda yaz; başka hiçbir dosyaya dokunulmaz.

---

## 6. Editör Spesifikasyonu

### 6.1 Ekran düzeni

```
┌─ Üst bar: müşteri/belge adı · Şablon ▾ · Tema ▾ · Format ▾ · Bleed 👁 · ↶ ↷ · [Export ▾]
├──────────────┬────────────────────────────────┬──────────────────┐
│ SOL PANEL    │            CANVAS              │ SAĞ PANEL        │
│ ▸ Marka kiti │   SVG render (mode:"edit")     │ Seçili slotun    │
│ ▸ Katalog +  │   zoom / pan                   │ tipine göre      │
│   seçim ✓    │   sayfa sekmeleri              │ kontroller +     │
│ ▸ Sayfalar   │   (trifold: dış yüz / iç yüz)  │ uyarılar         │
└──────────────┴────────────────────────────────┴──────────────────┘
```

### 6.2 Etkileşim kuralları

- **Tek tık** → slot seçilir, sağ panel açılır. **Çift tık** → metin slotunda inline düzenleme.
- Sol paneldeki katalog ağacında checkbox = bu belgeye dahil et; sürükle = sıra değiştir. Değişiklik canvas'a **anında** yansır.
- Asset sürükle-bırak: fotoğrafı doğrudan image slotuna bırak.
- **Şablon değiştir** (üst bar): aynı `selection` ve veri korunarak başka şablona geçilir (gridli ↔ yazılı tek tık). Uyumsuz override'lar düşer, kullanıcıya listelenir.
- **Tema değiştir:** property seti anında değişir; override edilmiş renk slotları korunur ve işaretli kalır.
- Override edilen her slotta ⛓️‍💥 ikonu + sağ panelde "veriye geri bağla" düğmesi.
- Undo/redo belge state'i üzerinde çalışır (Zustand geçmişi); Ctrl+Z/Y, Ctrl+S (kaydet), +/- (zoom) dışında kısayol yok.
- Otomatik kayıt: 2 sn debounce ile `documents` tablosuna.

### 6.3 Uyarı sistemi (M4)

Sağ panel + canvas üzerinde rozetlerle: düşük çözünürlüklü görsel (bkz. 9.2 eşikleri), güvenli alana taşan metin, min. fonta rağmen sığmayan içerik, boş zorunlu slot (logo yok vb.). Export sırasında uyarılar özetlenir; kullanıcı "yine de export et" diyebilir (kayda geçer).

---

## 7. Ürün Tipi Gereksinimleri

### 7.1 Menü — gridli (öncelikli şablon)

- Formatlar: A4 dikey (varsayılan), A3 dikey, tek/çift yüz.
- `params.cols`: 2/3/4 kolon. Hücre: foto (cover) + ad + kısa açıklama + fiyat bloğu.
- Fiyat bloğu `seul/menu` çift varyantı yan yana gösterir; tek varyantlıysa sade fiyat.
- Kategori başlıkları grid içinde tam genişlik şerit olarak akar.
- Sabit slotlar: logo, başlık, telefon şeridi, adres/saat, halal rozeti, allerjen dipnotu, opsiyonel QR (review/delivery).

### 7.2 Menü — yazılı

- A4 dikey, 1–2 sütun; kategori başlığı + öğe listesi + **leader dots** fiyat hizalaması.
- Overflow: `shrink-then-flow` — sütun/sayfa devamına akar.
- Varyantlı fiyatlar sütun başlıklı tablo düzenine geçebilir (`seul | menu` kolonları) — manifest param: `priceLayout: "inline" | "columns"`.

### 7.3 Menü — trifold

- Sayfa: 297×210 mm + bleed, 2 sayfa (dış yüz / iç yüz). Panel haritası Bölüm 3'teki gibi sabit; katlama çizgileri edit modunda görünür, print'te crop marks ile birlikte kılavuz katmanında.
- Dış yüz: ön kapak (logo + slogan + görsel), arka kapak (iletişim + saat + QR + harita adresi), iç kapak kanadı (kampanya/öne çıkanlar).
- İç yüz: 3 panel menü akışı (repeater 3 sütunlu flow).

### 7.4 Flyer

- A5/A6, ön-arka. Ön: kampanya slotu (büyük fiyat vurgusu, ör. "MENU DÖNER 10€"), 4–6 ürünlük mini repeater. Arka: iletişim + QR + harita/teslimat bilgisi.
- Kampanya slotu `text` + `price` kombinasyonudur; katalogdan bağlanabilir ya da serbest yazılır.

### 7.5 Carte de fidélité

- 85×54 mm, bleed 2 mm, ön-arka.
- Ön: logo, restoran adı, telefon. Arka: **damga grid'i** — `params.stampCount: 8|10|12`, `params.stampIcon: doner|star|logo_mono`, ödül metni slotu (ör. `Le 10ᵉ menu offert !`).
- Kesim köşeleri yuvarlak seçeneği (r=3 mm) — yalnızca önizleme; PDF düz kesimli + matbaa notu.

### 7.6 Vitrophanie (cam giydirme)

- Boyut girişi: genişlik × yükseklik **cm** (belge başına serbest). Büyük format şablonları slot konumlarını 0–1 arası oransal koordinatla tanımlar; render mm'ye çevirir.
- Modlar: **impression** (tam renk, tüm slotlar) / **découpe** (yalnız `logo_mono` + metin, tek renk; export SVG vektör).
- **Miroir** anahtarı: içeriden uygulama için yatay ayna.
- Tipik kompozisyon şablonları: saat bandı, logo + slogan merkez, menü highlight kolonu, kapı boyu açılış saatleri.
- Mockup zorunlu iş akışı: müşterinin vitrin fotoğrafı üzerine yerleştirme (Bölüm 8) — satış aracı budur.

### 7.7 Tabela (enseigne)

- Boyut cm; tek panel dikdörtgen. Slotlar: zemin rengi/degrade, logo, işletme adı (büyük), alt bilgi şeridi (tel / "kebab · tacos · burger").
- Yüksek kontrast uyarısı: zemin-metin kontrastı düşükse editör uyarır (uzaktan okunabilirlik).
- Export: gerçek boyut PDF + bina fotoğrafı mockup görseli.

### 7.8 Tişört

- Baskı alanı presetleri: `chest_left 10×10 cm`, `chest_center 25×30 cm`, `back_full 30×40 cm`, `sleeve 8×8 cm`. Belge birden çok alan içerebilir (ön logo + sırt tasarımı).
- Tasarım slotları basit tutulur: logo (mono/renkli), 1–2 metin satırı (slogan / telefon / instagram).
- Export: alan başına **300 dpi şeffaf PNG** + vektör PDF/SVG. (DTF beyaz alt-baskıyı matbaa halleder; bizden şeffaf zemin yeter.)
- Mockup: beyaz/siyah/kırmızı tişört fotoğrafları üzerine multiply blend ile kumaş hissi.

---

## 8. Mockup Motoru

Amaç: müşteriye "son halini" göstermek — vitrin, tabela, tişört üzerinde. Pragmatik yaklaşım, 3D değil:

- **Sahne (MockupScene)** = arka plan fotoğrafı + **quad** (tasarımın oturacağı dörtgenin 4 köşesi, piksel koordinatı) + opsiyonel blend modu ve opaklık.
- Render: tasarımın PNG'si canvas üzerinde perspektif transform ile quad'a oturtulur; tişörtte `multiply` blend + hafif opaklık ile kumaş dokusu korunur; camda %85–90 opaklık ile yansıma hissi.
- **Hazır sahneler** (repo ile gelir): jenerik dönerci vitrini, jenerik cephe/tabela, tişört × 3 renk (düz çekim).
- **Kullanıcı sahnesi:** müşterinin vitrin/cephe fotoğrafını yükle → 4 köşeyi tıklayarak işaretle → sahne müşteriye kayıtlı kalır. Akış 2 dakikayı geçmemeli.
- Çıktı: JPG (WhatsApp'a uygun ~1600 px) + sunum PDF'inde sayfa olarak.

---

## 9. Export Hattı

### 9.1 PDF üretimi

- Server, Puppeteer ile `GET /print/:documentId?variant=print|preview` sayfasını açar; sayfa şablonu `mode:"print"` ile render eder; `page.pdf({ width/height: mm + 2×bleed, printBackground: true, preferCSSPageSize: true })`.
- **print** varyantı: bleed + crop marks + (varsa) katlama kılavuzu. **preview** varyantı: net boyut, işaretsiz.
- Fontlar `@font-face` (woff2, repo içinde) ile gömülür. Metinler PDF'te canlı font olarak kalır; découpe export'u hariç (aşağıda).
- Renk: **v1 RGB PDF** (bkz. ADR-4). Şablon yazım kuralı: gövde metinleri saf `#000000` — matbaa dönüşümünde K100'e düşer, tescil kayması riski azalır.
- Découpe (vitrophanie kesim): SVG export + Faz 3'te opentype.js ile **text→path** dönüşümü (kesim makinesi gerçek vektör ister).

### 9.2 Çözünürlük eşikleri (M4 uyarıları)

| Ürün | Hedef etkin DPI | Sarı uyarı | Kırmızı uyarı |
|---|---|---|---|
| Menü, flyer, carte, trifold | 300 | < 250 | < 150 |
| Vitrophanie, tabela (1:1 boyutta) | 100 | < 100 | < 72 |
| Tişört transfer | 300 | — | < 300 |

Etkin DPI = görselin piksel boyutu ÷ slotta kapladığı fiziksel boyut; yerleştirme anında hesaplanır.

### 9.3 Dosya adlandırma ve versiyon

```
data/exports/{client_slug}/{YYYY-MM-DD}_{doc_type}_{format}_v{n}_{print|preview|presentation|mockup}.pdf|png|svg
```

Her export bir `ExportRecord` üretir: dosya yolu + o anki belge state'inin JSON snapshot'ı. v1'de geçmiş görüntülenir; snapshot'tan geri yükleme Faz 4.

### 9.4 Sunum PDF'i (müşteri onayı)

Tek tıkla üretilen paket: kapak (atölye logosu, müşteri adı, tarih) → her belge için mockup sayfası + düz önizleme → son sayfa **BAT bloğu** ("Bon pour accord", tarih, imza alanı, "Toute modification après signature fera l'objet d'une nouvelle facturation" tipi not — metin düzenlenebilir). WhatsApp/e-posta ile gönderilir; onay akışının v1 hali budur, web linki değildir.

---

## 10. QR ve Yardımcılar

- `qrcode` kütüphanesiyle **SVG** QR üretimi (vektör kalır, her boyutta net). Kaynaklar: `tel:`, Google review URL, teslimat platform linkleri, Instagram.
- QR kontrast kuralı: koyu modüller `--c-text` veya siyah; zemin açık; ters (açık modül koyu zemin) yalnız yeterli kontrast testini geçerse.
- FR fiyat formatlayıcı tek yerde: `formatPrice(7.5) → "7,50 €"` (`Intl.NumberFormat('fr-FR')`).
- Slugify, tarih formatları, dosya adı temizleme `packages/shared/utils` içinde tekildir.

---

## 11. Teknoloji ve Mimari Kararlar (ADR)

**ADR-1 · Platform: lokal web uygulaması.** Node.js (Fastify) API + Vite/React ön yüz; `npm run start` tek komutla açılır, tarayıcıda `localhost` üzerinde çalışır. Electron/Tauri paketlemesi v1'de yok (gerekirse sonradan sarmalanır). *Gerekçe: en az sürtünme, Puppeteer server tarafında zaten gerekli.*

**ADR-2 · Depolama: SQLite + dosya sistemi.** `better-sqlite3`, WAL modu. BrandKit/Catalog/overrides JSON kolonlarda (Zod doğrulamalı) — erken aşamada şema göçü acısını sıfırlar. Assets ve exports diskte, DB yalnızca meta tutar (M7).

**ADR-3 · Render: tek kaynak.** Şablon = React SVG bileşeni; editör `mode:"edit"`, PDF `mode:"print"` ile aynı bileşeni kullanır. PDF, Puppeteer headless Chrome print'idir. *Reddedilen alternatif: svg2pdf/jsPDF — font gömme ve satır kırma güvenilmez.*

**ADR-4 · Renk: v1 RGB.** Modern online matbaalar (Exaprint vb.) RGB kabul edip kendi profiline çevirir. CMYK dönüşümü (Ghostscript, `-sColorConversionStrategy=CMYK`) Faz 4'te opsiyonel export olarak eklenir. Kullanıcı Bölüm 15/S1'i cevaplamadan CMYK işine girilmez.

**ADR-5 · Dil ve tipler.** TypeScript strict her yerde; şemalar `packages/shared`'da Zod ile tanımlanır, hem API hem UI aynı tipleri kullanır. Kod/kimlikler İngilizce; UI metinleri `apps/web/src/i18n/tr.json` (M9).

**ADR-6 · State.** Sunucu verisi TanStack Query; editör belge state'i Zustand (undo/redo geçmişiyle). Global state minimum.

**ADR-7 · Görsel işleme.** İçe alımda `sharp`: EXIF döndürme, 4000 px master + 400 px thumbnail, orijinal saklanır. Arka plan silme sistemin işi değil (Faz 5'te opsiyonel dış araç entegrasyonu).

**ADR-8 · Fontlar.** `packages/templates/fonts/` altında OFL lisanslı woff2'ler: başlık için Anton / Bebas Neue / Oswald / Archivo Black; gövde için Inter / Poppins. **Şart:** Latin Extended (TR+FR karakterleri) — eklemeden önce `ğşİœ` test edilir (M9).

**Sistem gereksinimi:** Node 20+. İlk kurulumda Puppeteer Chromium indirir (bir kez internet); sonrası tamamen offline.

---

## 12. Depo Yapısı ve Kod Standartları

```
tezgah/
├── CONSTITUTION.md            ← bu dosya
├── apps/
│   ├── server/                Fastify API, Puppeteer export, /print route'u sunan static host
│   └── web/                   Vite + React editör ve yönetim arayüzü
├── packages/
│   ├── shared/                Zod şemaları, tipler, formatPrice, utils
│   └── templates/             şablon kayıt defteri + şablon klasörleri + fonts/
├── data/                      (gitignore) app.db, assets/, exports/
└── package.json               npm workspaces monorepo
```

Standartlar: ESLint + Prettier; her pakette `README.md`; şablon eklemenin adımları `packages/templates/README.md`'de örnekli anlatılır; binding çözümleyici ve overflow motoru için birim testleri (Vitest) zorunlu — çünkü sistemin en kırılgan iki parçası bunlardır.

---

## 13. Yol Haritası — Fazlar ve Kabul Kriterleri

Her faz bağımsız teslim edilir (M10). Boyutlar görecelidir: S/M/L.

### Faz 0 — İskelet (S)
Monorepo, DB + migration, Client CRUD (liste/oluştur/düzenle), asset yükleme (sharp hattıyla), tr.json altyapısı.
**Kabul:** Müşteri oluştur, logo yükle, listede thumbnail'iyle gör; `data/` klasörünü kopyala-yapıştır = tam yedek.

### Faz 1 — MVP: Menü hattı (L) ⭐ *sistem burada para kazanmaya başlar*
Marka kiti ekranı; katalog editörü (kategori/ürün/varyantlı fiyat/foto/sıralama); binding motoru; **menu-grid-a4** ve **menu-list-a4** şablonları; editör (slot seçimi, inline metin, foto değiştirme + odak noktası, tema/şablon/param değiştirme, seçim paneli, uyarılar, undo); PDF export (print+preview, crop marks) + ExportRecord.
**Kabul senaryosu:** (1) Sıfırdan yeni müşteri + 8 ürünlü katalog girişi ≤ 15 dk. (2) Grid şablon otomatik dolu gelir; başlık, bir foto ve tema değiştirilir. (3) Yazılı şablona tek tıkla geçilir, veri ve seçim korunur. (4) Export edilen PDF 216×303 mm, crop marks'lı, fontlar gömülü ve ekrandaki görüntüyle birebirdir. (5) Katalogda fiyat değiştirilir → belge açıldığında günceldir → yeni export v2 olarak kayda geçer.

### Faz 2 — Ürün genişlemesi + müşteri sunumu (M)
Trifold, flyer A5, carte de fidélité şablonları; QR slotları; **klonlama** (müşteri/belge); **sunum PDF'i** (BAT bloklu, jenerik mockup sayfalı); export geçmişi ekranı.
**Kabul:** Bir müşterinin 4 ürünlük açılış paketi (menü+trifold+flyer+carte) tek projede durur; sunum PDF'i tek tıkla iner; mevcut müşteriden klonlanan yeni müşteri 5 dk'da ilk PDF'ini verir (M6 testi).

### Faz 3 — Mockup motoru + büyük format (M)
Quad-warp mockup render; hazır sahneler; kullanıcı sahnesi kaydı (foto + 4 köşe); vitrophanie belge tipi (cm boyut, impression/découpe, miroir, text→path SVG export); tabela tipi + kontrast uyarısı; tişört tipi (baskı alanları, şeffaf PNG 300 dpi, renkli mockup).
**Kabul:** Müşterinin vitrin fotoğrafı yüklenip 4 köşe işaretlenerek tasarım giydirilmiş JPG ≤ 2 dk'da üretilir; découpe SVG'sinde hiçbir `<text>` elementi kalmaz (tamamı path).

### Faz 4 — Şablon fabrikası + verimlilik (M)
SVG import + slot işaretleme aracı (Illustrator SVG'sini şablona çevirme yardımcısı); tema kütüphanesi yönetim ekranı; toplu fiyat güncelleme (% artış + 0,50'ye yuvarlama); CMYK export opsiyonu (Ghostscript); snapshot'tan geri yükleme; `data/` zip yedeği düğmesi.
**Kabul:** Illustrator'dan gelen bir SVG 10 dk içinde çalışan şablon olur; "%5 zam + ,90'a yuvarla" tüm kataloğa tek işlemde uygulanır.

### Faz 5 — Opsiyonel akıllı yardımcılar (S)
Arka plan silme entegrasyonu (lokal rembg veya dış API), FR ürün açıklaması önerisi (Claude API — internetli, opsiyonel), otomatik kontrast/okunabilirlik denetçisi.

---

## 14. Opus 4.8 İçin Çalıştırma Talimatları

### 14.1 Genel kurallar (her oturumda geçerli)

1. Önce `CONSTITUTION.md`'nin tamamını oku. **Bölüm 2 her kararın üstündedir**; çelişki görürsen kod yazmadan durup kullanıcıya sor.
2. Yalnızca istenen fazın kapsamını uygula (M10). Kapsam dışı iyileştirmeleri `TODO.md`'ye not düş, yapma.
3. Bölüm 4–5'teki alan/slot adlarını **aynen** kullan; şemayı değiştirmen gerekiyorsa önce gerekçesiyle öner.
4. Faz bitiminde: kabul kriterlerini kendin çalıştırarak doğrula, nasıl test ettiğini yaz, `README.md`'yi güncelle.
5. Belirsizlikte: Bölüm 15'e bak; cevap yoksa en basit çözümü uygula ve `TODO.md`'ye işaretle.
6. Binding çözümleyici ve overflow motoru için Vitest birim testleri yaz (Bölüm 12).

### 14.2 Oturum başlatma şablonu (kopyala-yapıştır)

```
Repoda CONSTITUTION.md var; önce tamamını dikkatle oku.

Görev: Faz {N}'i uygula (Bölüm 13.{N}).
Bölüm 14.1'deki genel kurallara uy. Faz kapsamı dışına çıkma.
Bitirdiğinde: kabul kriterlerini nasıl doğruladığını madde madde raporla,
kalan riskleri ve TODO'ları listele.

Başlamadan önce: planını 5-10 maddede özetle ve onayımı bekle.
```

### 14.3 Önerilen çalışma düzeni

Her faz ayrı git branch'i (`phase-1-mvp` gibi); faz sonunda kullanıcı kabul senaryosunu kendisi elden geçirir, sonra merge. Faz 1'e başlamadan önce kullanıcı, en çok sattığı gridli ve yazılı menü tasarımının ekran görüntüsünü/ölçülerini Opus'a verir — ilk iki şablon bu tariften kodlanır.

---

## 15. Açık Sorular (kodlamadan önce cevapla)

1. **Matbaa/renk:** Çalıştığın matbaa(lar) RGB PDF kabul ediyor mu? (Exaprint ve benzerleri eder.) Ediyorsa ADR-4 v1 yeterli; etmiyorsa Faz 1'e Ghostscript CMYK adımı çekilir.
2. **Başlangıç şablonları:** Faz 1'in gridli ve yazılı şablonu hangi mevcut tasarımlarından türeyecek? En çok satan birer örneği seç, ölçü/yapı tarifini hazırla.
3. **Ortak fotoğraf havuzu:** Döner/dürüm/tacos stok fotoğrafların tüm müşterilerde paylaşılsın mı? (Öneri: evet — `assets.client_id = NULL` havuzu zaten modelde var; Faz 1'de sadece arayüz anahtarı gerekir.)
4. **Trifold katlama:** İşlerinin çoğu roll fold mu, zigzag (accordion) mı? (v1 roll varsayıldı; zigzag ağırlıklıysa Faz 2 şablonu ona göre yazılır — panel haritası değişir.)
5. **Makine:** Sistemin çalışacağı bilgisayar ilk kurulumda Chromium indirebilir mi? (Tek seferlik internet; sonrası offline.)

---

*Sürüm: v1.0 · Hazırlayan: Claude Fable 5 · Uygulayıcı: Claude Opus 4.8 · Bu doküman yaşayan anayasadır: her faz sonunda öğrenilenlerle güncellenir, ama Bölüm 2 ancak kullanıcı kararıyla değişir.*

---

## Değişiklik Günlüğü

- Faz 1 / FAZ1-GOREV.md: currency (EUR|CHF), formatPrice(currency), Category.note_fr
- Faz 2 / FAZ2-GOREV.md — mimar kararı #1: §13'teki "jenerik mockup sayfalı sunum PDF'i" bu fazda "sunum kartı" sahnelemesiyle uygulanır (koyu zemin, gölgeli çerçeve); foto-gerçekçi mockup Faz 3'te (quad-warp).
- Faz 2 / FAZ2-GOREV.md — mimar kararı #2: Faz 1'de ertelenen opsiyonel QR slotu `menu-grid-cells` ve `menu-liste-premium` manifestlerine eklendi (alt bilgi bölgesi, default kapalı); trifold arka kapağında QR standarttır.
- Faz 2 / FAZ2-GOREV.md — mimar kararı #3: `export_records` yeniden kuruldu — `document_id` NULL olabilir, `project_id` kolonu eklendi, `CHECK (document_id IS NOT NULL OR project_id IS NOT NULL)`; sunum PDF'leri proje bazlı kayıt açar, versiyon sayacı proje+tür bazında; belge geçmişi davranışı değişmedi (migration testiyle kanıtlı).
- Faz 2 / FAZ2-GOREV.md: `BrandKit.contact.delivery_hours` (opsiyonel; flyer çift saat bloğu, boşsa gizlenir).
- Faz 3 / FAZ3-GOREV.md — mimar kararı #4: quad (4 köşe) editörü harici tuval kütüphanesi OLMADAN saf SVG + pointer events ile yazılır (bağımlılık yüzeyi küçük kalır).
- Faz 3 / FAZ3-GOREV.md — mimar kararı #5: mockup render tek kaynaklıdır — homografi → CSS `matrix3d`; canlı önizleme ve JPG üretimi AYNI sayfayı kullanır (JPG: Puppeteer ekran görüntüsü ~1600 px q85).
- Faz 3 / FAZ3-GOREV.md — mimar kararı #6: repo hazır sahne fotoğrafı bundle'lamaz (§8'deki "hazır sahneler repo ile gelir" ifadesini değiştirir); sahneler kullanıcı fotoğraflarından kurulur, sahnesiz belgede "önce sahne kur" yönlendirmesi yapılır.
- Faz 3 / FAZ3-GOREV.md — mimar kararı #7: text→path dönüşümünde opentype.js yerine **fontkit** kullanılır (woff2'yi doğrudan okur, zaten bağımlılık; TTF kopyası aynı fontun iki sürümünün sessizce ayrışması riskini doğururdu). Gereksinim değişmedi: découpe SVG ve broderie çıktısında hiçbir `<text>` elementi kalmaz.
- Faz 3 kapanışı — mimar kararı #8: ince-detay uyarısında KURAL doğrudur ("broderie + alan kısa kenarı < 15 cm"); FAZ3-GOREV kabul 6'daki bavette örneği mimarın hatasıydı — bavette göğsünde (24×20 cm) uyarı çıkmaz, mevcut davranış kalır. Faz 4'te iki kademeli uyarı değerlendirilecek (TODO).
- Faz 3 kapanışı — mimar kararı #9: `TextLines` letterSpacing birim düzeltmesi (CSS mm ≠ SVG kullanıcı birimi; tarayıcı 3,78× büyütür) Faz 4'e ertelendi. Reçete: birim yorumu düzeltilir VE mevcut şablonlardaki yazar değerleri 3,78'e bölünerek görünüm birebir korunur; önce/sonra ekran karşılaştırma kanıtı zorunlu (TODO). Faz 3'te yalnız vitro-bandeau saat satırının yazar değeri, taşma logo alanından çıkana dek küçültüldü (motora dokunulmadı).
- Faz 4 / FAZ4-GOREV.md — mimar kararı #10 (#9'un yön düzeltmesi): #9'daki "3,78'e bölünür" ifadesi yön olarak hatalıydı; kanıt (8 mm stil → 30,24 birim) tersini gösteriyor. Doğrusu: motor letterSpacing'i **birimsiz kullanıcı birimi** (1 birim = 1 mm) olarak yazar; onaylı görünümü korumak için mevcut yazar değerleri **3,7795 ile çarpılır**. Katsayı ve yön canlı ölçümle teyit edilir; önce/sonra piksel kanıtı zorunlu. *Uygulama notu (kullanıcı onayıyla):* em-tabanlı yazar değerleri dönüşüm DIŞI tutulur — em'in tarayıcı çözümü değişmediği için görünüm zaten birebirdir.
- Faz 4 / FAZ4-GOREV.md — mimar kararı #11: npm audit'in major yükseltmeleri (vite 8, @fastify/static 9) bu fazda YAPILMAZ; local-first mimari + sunucunun yalnız 127.0.0.1 dinlemesi saldırı yüzeyini minimuma indiriyor. TODO'ya "Faz S ön koşulu: güvenlik yükseltme turu" olarak yazıldı — SaaS'a çıkmadan zorunlu.
- Faz 4 / FAZ4-GOREV.md — mimar kararı #12: SVG import aracı bir **kod üreticisidir**: çıktı `packages/templates/src/generated/` altına okunabilir `Template.tsx + manifest.ts` olarak yazılır, otomatik barrel ile kayıt defterine katılır ve elle rafine edilebilir; DB'de opak şablon saklanmaz.
- Faz 4 kapsam onayı — mimar kararı #13: `export_records.kind` union'ına `"snapshot"` (geri yükleme öncesi güvenlik kaydı) ve `"print_cmyk"` eklendi — TEXT kolon, yalnız Zod genişlemesi, migration yok. Snapshot kayıtlarında `filepath` boş dize olabilir; iki yeni tür mevcut versiyon sayacı mantığına katılır.
- Faz 4 / mm incelemesi (FAZ4 §13 kararı): print PDF MediaBox ölçüldü — 216×303 mm hedefte 612.96×859.92 pt = 216.239×303.361 mm (+0.11..0.12%). Köken, şüphelenilen mm→pt yuvarlaması DEĞİL: Chromium `page.pdf` kâğıt boyutunu birimden bağımsız kendi iç ızgarasına oturtuyor (deney: mm/cm/px girdileri özdeş sonuç; inç girdisi yüksekliği düzeltip genişliği düzeltmiyor) — tutarlı "ucuz düzeltme" yok. KARAR: tolerans kabul — sapma bleed'in (3 mm) çok altında, kesim crop marks'tan yapılır; baskı riski yok. İleride Chromium davranışı değişirse ölçüm scripti tekrarlanır.
- Faz 5 / FAZ5-GOREV.md — mimar kararı #14: A4 3-sütunlu yoğun (compact) liste, Şablon Fabrikası/JPG yoluyla değil, `menu-liste-premium`'a compact varyant olarak eklenir; yoğun metrik seti (font kademesi, satır aralığı, dots) şablon içinde sabittir. *Uygulama notu (kullanıcı onayı, revizyon a):* 3 sütun yalnız `a4-portrait`'e eklenir (`a3-portrait` zaten 3 destekli); bu şablonda `a4-landscape` YOKTUR ve eklenmez. Yatay ihtiyacı pilotta doğarsa TODO'ya.
- Faz 5 / FAZ5-GOREV.md — mimar kararı #15: Font yüklemede TR+FR glif kapsam bekçisi zorunludur; kapsamı eksik font RED edilir ve eksik glifler kullanıcıya listelenir (M9). *Kapsam seti #18 ile kesinleştirildi (aşağıda).*
- Faz 5 / FAZ5-GOREV.md — mimar kararı #16: Dijital menü v1 tek dosyalık statik HTML'dir; barındırma yoktur (Faz S). `export_records.kind` union'ına `"digital_menu"` eklenir (TEXT kolon, yalnız Zod). `BrandKit.contact.menu_url?` opsiyonel alanı eklenir; doluysa menü şablonlarının QR kaynak listesine `"menu"` seçeneği gelir.
  - *Uygulama notu (F5-10):* Dijital menü MÜŞTERİ düzeyli export'tur (belge/proje değil), ama `export_records` CHECK'i belge|proje zorunlu kılıyordu. Migration **v7**: `export_records`'e `client_id` kolonu eklendi ve CHECK üç kaynaktan (belge|proje|müşteri) birine izin verir (v3 yeniden-kurma deseni, satırlar korunur, replay test). #16'nın "yalnız Zod" ibaresi yalnız *kind DEĞERİ* içindir; kapsama kolonu ayrı bir yapısal gerekliliktir — çelişki yok. Üretici saf/harici-istek-yok (sistem font yığını; logo/foto gömülmez) → `file://` çevrimdışı açılır. **(mimar onayı: kabul — 2026-07-09.)**
- Faz 5 / FAZ5-GOREV.md — mimar kararı #17: Sürükle-bırak için `@dnd-kit` (MIT) ya da saf pointer-events serbest; CC seçer, gerekçesini commit'e yazar. *Karar: saf pointer-events* (ek bağımlılık yok; mevcut ScenesPanel pointer-capture deseniyle tutarlı; ↑↓ okları erişilebilirlik için kalır). Başka DnD/tuval kütüphanesi alınmaz.
- Faz 5 kapsam onayı — mimar kararı #18 (#15'in revizyonu): Font bekçisi kümesi dar test seti DEĞİL, FR+TR pratik repertuvarıdır ve büyük/küçük her iki formu kapsar: küçük `ç ğ ı i ö ş ü à â é è ê ë î ï ô œ ù û` + büyük `Ç Ğ İ Ö Ş Ü À Â É È Ê Ë Î Ï Ô Œ Ù Û` + `€`. Gerekçe: canlı Aras kataloğunda ö/ê/ô/ï/à fiilen var ve menüler büyük harf basıyor; dar küme bu fontları içeri alır, baskıda kırılırdı. Bekçi YALNIZ kullanıcı yüklemelerine uygulanır — yerleşik repo fontları çalışma zamanında muaftır; ancak altı repo fontu bu kümeden bir kez geçirilir ve bu doğrulama kalıcı birim testi olarak kalır.
  - *Uygulama notu (F5-8):* §7 gereği yüklenen font marka kiti Başlık/Gövde seçicilerine VE tema düzenleyicisine katılır. Bunun için `ThemeFontKeySchema` sabit 6-anahtarlı enum'dan, glif-bekçisinden geçmiş aile adını da kabul eden `FontFamilySchema`'ya (harf/rakam/boşluk/`-_'`; CSS enjeksiyonu engellenir) çevrildi. M9 KORUNUR: dışarıdan font yalnız #18 kapsamını sağlarsa girer; render'da bilinmeyen/silinmiş aile temkinli genel yığına (ratio 0.5, `"aile","Inter",sans-serif`) düşer — sessiz kırılma yok (M8). Print `@font-face` web ile aynı `/fonts/` kaynağını kullanır (M3); Vite proxy'sine `/fonts` eklendi ki 5173'teki print sayfası da fontu 3001'den alabilsin (PDF'e gömülür). **(mimar onayı: kabul — 2026-07-09.)**
