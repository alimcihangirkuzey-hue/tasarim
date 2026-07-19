# TEZGÂH — FAZ 2 GÖREV PAKETİ
### Mimar: Claude Fable 5 · Uygulayıcı: Claude Code · Paket sürümü: 1.0

> **Kullanım:** Bu dosya repo kökünde `FAZ2-GOREV.md` adıyla durur.

---

## 0. Ön koşul ve çalışma kuralları

1. **Bu paket ancak Faz 1 `main`'e merge edilip push'landıktan sonra uygulanır.**
2. `CONSTITUTION.md` üstündür (§2 Anayasa); bu paket §13 Faz 2 kapsamını detaylandırır ve mimarın ara kararlarıyla **iki noktada günceller** (aşağıda işaretli — Değişiklik Günlüğü'ne yazılır). Paket ile CONSTITUTION çelişirse ve çelişki bu pakette açıkça "mimar kararı" diye işaretlenmemişse, CONSTITUTION kazanır; dur ve sor.
3. Kapsam dışı fikirler `TODO.md`'ye. Anlamlı her adım ayrı commit; `phase-2` branch'i, faz sonunda push; `main`'e merge kullanıcı kabulüyle.
4. Başlamadan: planını 10–14 maddede özetle, **onay bekle**.

## 1. Faz 2 kapsamı

CONSTITUTION §13 Faz 2: trifold · flyer · carte de fidélité · QR slotları · klonlama (M6) · sunum PDF'i (BAT) · export geçmişi ekranı. Bu paketin ekleri: **Sipariş Defteri** (yeni modül, fazın belkemiği) · ortak fotoğraf havuzu arayüzü (§15/S3'ün açık sorusu, cevap: evet) · menü şablonlarına opsiyonel QR slotu (Faz 1'den mimar kararıyla ertelenen) · flyer 21×21 preseti.

**Mimar kararı #1 (Değişiklik Günlüğü'ne):** §13 Faz 2'deki "jenerik mockup sayfalı sunum PDF'i" bu fazda **"sunum kartı"** olarak uygulanır — tasarım, koyu zemin üzerinde gölgeli/çerçeveli şık bir kart gibi sahnelenir; foto-gerçekçi mockup Faz 3'ün işidir (quad-warp motoru orada geliyor). Amaç kapsam disiplinini korumak.

## 2. Sipariş Defteri — yeni modül

Atölyenin giriş kapısı: pazarlamacı Fransa'da ölçü alır ve iş tarifini gönderir; sistem bunu yapılandırılmış projeye çevirir; hiçbir ölçü "sorulmamış" kalmaz.

### 2.1 Veri modeli

`projects` tablosu genişler (migration): `due_date TEXT NULL`, `source_text TEXT NULL` (yapıştırılan ham sipariş metni — kanıt olarak saklanır), `status` mevcut. Yeni tablo:

```sql
order_items(
  id TEXT PK,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL,      -- aşağıdaki enum
  qty INTEGER DEFAULT 1,
  width_cm REAL NULL, height_cm REAL NULL,
  details_json TEXT NOT NULL DEFAULT '{}',  -- tipe özgü alanlar (Zod)
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'olcu_bekliyor',
  document_id TEXT NULL REFERENCES documents(id) ON DELETE SET NULL,
  created_at TEXT, updated_at TEXT
)
```

`product_type` enum: `menu | flyer | trifold | fidelite | vitrophanie | tabela | tisort | onluk | diger`.
`status` enum: `olcu_bekliyor → tasarimda → onayda → uretimde → teslim` (+ `iptal`).

### 2.2 Zorunlu alan matrisi (Zod, tipe göre)

Kalem, zorunlu alanları dolana kadar **"eksik" (kırmızı rozet)** durumundadır ve `olcu_bekliyor`'dan çıkamaz:

| Tip | Zorunlu | details_json alanları |
|---|---|---|
| vitrophanie | width_cm, height_cm, uygulama yönü, mod | `side: "interieur"\|"exterieur"` (intérieur ⇒ miroir uyarısı), `mode: "impression"\|"decoupe"` |
| tabela | width_cm, height_cm | `lumineux?: bool` |
| tisort / onluk | qty, teknik | `technique: "impression"\|"broderie"`, `sizes?: "M:2, L:3" serbest`, `areas?: string` |
| menu / trifold / flyer / fidelite | format | `format: "a4"\|"a3"\|"a5"\|"21x21"\|...`, `print_qty?: int` |
| diger | — | serbest |

Eksik alanlar arayüzde alan bazında kırmızı gösterilir — pazarlamacıya "neyi sorman gerektiğini" form söyler.

### 2.3 Proje ekranı

Müşteri detayına "Projeler" sekmesi: proje = ad + termin + kalem listesi. Kalem satırı: tip ikonu · özet (ölçü/adet) · durum select'i · eksik-alan rozetleri · "Tasarıma başla" düğmesi. Termin ≤ 3 gün ise sarı, geçtiyse kırmızı vurgu. Ana sayfaya (müşteri listesi üstüne) kompakt "Yaklaşan terminler" şeridi.

### 2.4 Yapıştır-Parse ("Sipariş yapıştır")

Proje ekranında metin kutusu; pazarlamacının WhatsApp'tan gönderdiği şablon yapıştırılır, sistem parse eder:

```
=== SIPARIS ===
Isletme: Antalya Kebab
Sehir: Lyon / Tel: 06 12 34 56 78
Termin: 20 Temmuz
--- Kalem ---
Urun: cam giydirme
Olcu: 180 x 120 cm
Detay: distan uygulama, baskili folyo
--- Kalem ---
Urun: menu / Format: A3 / Adet: 2
```

**Parse kuralları (hata toleranslı, veri kaybetmez):**
- Anahtarlar Türkçe karakterli/karaktersiz eş kabul edilir (`Olcu/Ölçü`, `Urun/Ürün`); satır sırası serbest; `/` ile aynı satırda birden çok alan olabilir.
- Ürün tipi eş anlamlı sözlüğü: *cam, cam giydirme, vitrophanie, folyo* → vitrophanie · *tabela, enseigne* → tabela · *menü, menu* → menu · *el ilanı, flyer, broşür* → flyer · *trifold, katlamalı* → trifold · *sadakat, fidelite, kart* → fidelite · *tişört, tshirt* → tisort · *önlük, tablier* → onluk · eşleşmezse → diger.
- Ölçü `180 x 120`, `180x120`, `180*120` biçimlerini tanır (cm varsayılır).
- Detay satırından anahtar kelime çıkarımı: *dıştan/distan* → exterieur, *içten/icten* → interieur, *kesim/decoupe* → decoupe, *baskı/baskili* → impression, *nakış/nakisli* → broderie.
- Tanınmayan her satır kalemin `notes` alanına aynen düşer — hiçbir bilgi çöpe gitmez.
- `Isletme` mevcut müşteri adlarıyla (slug bazında, yaklaşık eşleşme) karşılaştırılır: eşleşirse o müşteriye proje açılır, eşleşmezse "yeni müşteri oluşturulsun mu?" onayı.
- Ham metin `project.source_text`'e kaydedilir. Parse motoru **Vitest ile test edilir** (tam/eksik/bozuk metin senaryoları).

Ayrıca "Pazarlamacı şablonunu kopyala" düğmesi: yukarıdaki boş şablonu panoya kopyalar (metin `tr.json`'da) — pazarlamacının telefonuna bir kez kaydedilir.

### 2.5 Kalemden belgeye

"Tasarıma başla" → tipe göre şablon önerisi (menu → grid/liste seçimi; trifold/flyer/fidelite → ilgili şablon) → belge açılır, `order_item.document_id` bağlanır → kalem `tasarimda`'ya geçer. `tisort/onluk/vitrophanie/tabela` tiplerinde düğme "şablonu Faz 3'te gelecek" uyarısı verir ama kalem takibi tam çalışır. Belge durumu elle yönetilir (otomasyon yok, basitlik).

## 3. Klonlama (M6)

- **Müşteri klonla:** kaynak müşterinin marka kiti + kataloğu kopyalanır (asset referanslarıyla; dosyalar kopyalanmaz, ortak kullanılır), yeni ad/slug alınır; opsiyonel: seçili belgeleri de klonla (template+params+theme+selection kopyası, overrides dahil).
- **Belge klonla:** aynı proje ya da başka müşteri hedefli; başka müşteriye klonlanırsa binding'ler otomatik yeni müşterinin verisine bakar (M1'in meyvesi).
- Kabul ölçüsü: "benzer dönerciden yeni dönerci → ilk PDF" akışı **5 dakikada** tamamlanır.

## 4. Ortak fotoğraf havuzu (CONSTITUTION §15/S3 — cevap: EVET)

- Yüklemede seçim: "Bu müşteriye" / "Ortak havuza" (`assets.client_id = NULL`).
- Asset seçicide iki sekme: **Müşteri** · **Ortak**. Ortak havuz tüm müşterilerin belgelerinde kullanılabilir (stok döner/dürüm/pizza fotoğrafları).
- Müşteri silinince ortak varlıklar etkilenmez.

## 5. QR altyapısı ve slotları

- `qrcode` paketi → **SVG** çıktı (vektör kalır). Slot kind `"qr"`; kaynaklar: `tel` · `google_review_url` · `delivery[i].url` · `instagram`.
- Kontrast kuralı: koyu modüller `--c-text`/siyah, zemin açık; yetersiz kontrastta editör uyarısı (M4).
- **Mimar kararı #2 (Değişiklik Günlüğü'ne):** Faz 1'de ertelenen opsiyonel QR slotu şimdi `menu-grid-cells` ve `menu-liste-premium` manifestlerine eklenir (alt bilgi bölgesinde, default kapalı). Trifold arka kapağında QR standart slottur.

## 6. Yeni şablonlar (tema sistemi ortak)

**6.1 `menu-trifold` (roll fold):** Sayfa 297×210 + bleed, 2 sayfa. Panel haritası CONSTITUTION §3'teki gibi sabit: dış yüz [iç kanat 97 | arka 100 | ön 100], iç yüz [100 | 100 | 97]. Katlama kılavuz çizgileri `print`'te crop marks katmanında, `preview`'da yok. Dış yüz: ön kapak (logo + slogan + dekor foto), arka kapak (iletişim + saat + QR + adres), iç kanat (kampanya/öne çıkanlar mini-repeater 3–4 ürün). İç yüz: 3 sütunlu liste akışı (`menu-liste-premium` satır motorunu yeniden kullan; `shrink-then-flow` sütunlar arasında).

**6.2 `flyer`:** Formatlar `a5-portrait` (148×210) ve **`21x21`** (210×210) ön-arka. Ön: kampanya slotu (büyük fiyat vurgusu; katalogdan bağlanabilir ya da serbest metin) + 4–6 ürünlük mini grid (grid hücre motorunu yeniden kullan). Arka: iletişim + QR + **teslimat bloğu** (serbest metin: bölgeler/minimum sipariş) + **çift saat bloğu** (`hours` = açılış; yeni opsiyonel `delivery_hours` alanı BrandKit.contact'a eklenir — boşsa blok gizlenir).

**6.3 `carte-fidelite`:** 85×54 mm, **bleed 2 mm**, ön-arka. Ön: "CARTE DE FIDÉLITÉ" başlığı + üst-sağ alt başlık slotu (default: *"1 menu acheté = 1 tampon"*) + damga grid'i — `stampCount: 8|10|12` (default **10**, 2×5), kutular **numaralı** (1.–10.) — + alt tam-genişlik **ödül bandı** (`--c-accent` zemin, default: *"11ᵉ KEBAB OU PIZZA OFFERT !"*). Arka: logo, "CARTE DE FIDÉLITÉ", tel, adres, hizmet satırı (*Sur place · à emporter · Livraison*), saat. Yuvarlak köşe önizlemesi (r=3) yalnız ekranda; PDF düz kesim + matbaa notu.

## 7. Sunum PDF'i (BAT)

Proje ekranından "Sunum PDF'i oluştur": kapak (atölye adı/logosu, müşteri, tarih) → seçili her belge için **sunum kartı** sayfası (koyu nötr zemin, gölgeli çerçeveli önizleme, belge adı+format) → son sayfa **BAT bloğu**: küçük önizlemeler, tarih, *"Bon pour accord"*, imza alanı, düzenlenebilir hukuki not (default: *"Toute modification après signature fera l'objet d'une nouvelle facturation."*). Çıktı `§9.3` adlandırmasıyla `_presentation.pdf`.

## 8. Export geçmişi ekranı

Belge içinde "Geçmiş" sekmesi: ExportRecord listesi (tarih · tür · versiyon · dosya adı · aç/klasörde göster). Geri yükleme YOK (Faz 4).

## 9. KABUL SENARYOSU

1. Pazarlamacı metni (yukarıdaki örnek) yapıştırılır → müşteri eşleşmesi sorulur → proje + 2 kalem açılır; vitrophanie kalemi ölçüsü varsa yeşil, `mode` çıkarımı doğru; tanınmayan satırlar nota düşmüş.
2. Ölçüsüz bir tabela kalemi eklenir → kırmızı "eksik: ölçü"; ölçü girilince `olcu_bekliyor`'dan çıkabilir.
3. Kalemden "Tasarıma başla" → belge açılır, kaleme bağlanır; kalem `tasarimda`.
4. Klon: mevcut müşteriden yeni müşteri + ilk PDF ≤ 5 dk (M6), kanıtla.
5. Fidelite PDF: pdfjs ile 89×58 mm (print, 2 mm bleed) / 85×54 (preview); 10 numaralı kutu + ödül bandı görselde.
6. Trifold print PDF: toplam 303×216; katlama kılavuzları print'te var, preview'da yok; panel genişlikleri 97/100/100 (±0,5 mm) doğrulanır.
7. Flyer `21x21` print: 216×216 mm; teslimat bloğu ve çift saat bloğu dolunca görünür, boşken kaybolur.
8. QR: menü şablonunda `google_review` QR'ı açılıp render edilir; trifold arkasında standart; düşük kontrast kombinasyonunda uyarı çıkar.
9. Sunum PDF'i: kapak + 2 sunum kartı + BAT sayfası tek tıkla üretilir.
10. Ortak havuz: ortak bir foto yüklenir, iki farklı müşterinin belgesinde kullanılır; müşteri silme ortak fotoyu silmez.
11. Vitest yeşil: parse motoru (tam/eksik/bozuk/eş-anlamlı/ölçü biçimleri) · fidelite ve trifold manifest analizleri · mevcut testler kırılmamış.

## 10. Faz 3'e KAYIT (uygulama YOK — TODO.md'ye)

Tişört + önlük şablonları (`technique: impression|broderie`; broderie'de yalnız vektör + cm ölçü + iplik notu çıktısı; **küçük alan + broderie kombinasyonunda ince-detay uyarısı** — ARAS logosu gibi çizimler küçük nakışta kaybolur) · mockup motoru (quad-warp; pazarlamacının keşif fotoğrafları sahne olur) · vitrophanie/tabela belge tipleri (cm, découpe'ta text→path) · mavi dahil tişört mockup renk seti.

## 11. Raporlama

Faz sonunda CONSTITUTION §10 formatı: kabul maddeleri tek tek nasıl doğrulandı · üretilen örnek PDF yolları · riskler/TODO'lar · `phase-2` push. Merge, kullanıcı kabulüyle.
