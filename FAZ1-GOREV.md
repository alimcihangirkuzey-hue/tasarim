# TEZGÂH — FAZ 1 GÖREV PAKETİ
### Mimar: Claude Fable 5 · Uygulayıcı: Claude Code (Opus 4.8) · Paket sürümü: 1.1
> **v1.1 değişikliği:** §8 "Eksik Görsel Akışı" eklendi (yer tutucu, eksik listesi, talep metni, hızlı eşleme) + kabul senaryosuna 8. madde. Eski v1.0 kopyasını bununla değiştir.

> **Kullanım:** Bu dosyayı repo köküne `FAZ1-GOREV.md` adıyla koy. Claude Code'a tek satır yaz:
> *"FAZ1-GOREV.md dosyasını ve CONSTITUTION.md'yi tamamen oku, sonra planını sunup onayımı bekle."*

---

## 0. Ön koşul ve çalışma kuralları

1. **Bu paket ancak Faz 0 kabul kriterleri geçtikten ve repo push'landıktan sonra uygulanır.** Faz 0 doğrulanmadıysa dur, kullanıcıya bildir.
2. Önce `CONSTITUTION.md` tamamını oku. **Bölüm 2 (Anayasa) her kararın üstündedir.** Bu paket, CONSTITUTION §13 Faz 1 kapsamını *tasarım detayıyla netleştirir*; kapsamı **genişletmez** (M10).
3. Kapsam dışı her fikir `TODO.md`'ye yazılır, uygulanmaz.
4. Anlamlı her adım ayrı commit; faz sonunda push.
5. Başlamadan önce: uygulama planını 8–12 maddede özetle ve **kullanıcı onayını bekle**.
6. Bu paketle çelişki görürsen CONSTITUTION kazanır; belirsizlikte en basit çözüm + TODO notu.

## 1. Faz 1 kapsamı (CONSTITUTION §13 — hatırlatma)

Marka kiti ekranı · katalog editörü (kategori/ürün/varyantlı fiyat/foto/sıralama) · binding motoru · **iki menü şablonu** (bu pakette tanımlı) · editör (slot seçimi, inline metin, foto değiştirme + odak noktası, tema/şablon/param değiştirme, seçim paneli, uyarılar, undo/redo) · PDF export (print + preview, crop marks) · ExportRecord · Vitest testleri.

## 2. Şema ekleri (packages/shared — Zod)

Mevcut şemayı **genişleten**, kırmayan değişiklikler:

**2.1 Para birimi — müşteri bazında.** `Client` düzeyine `currency: "EUR" | "CHF"` (default `"EUR"`). Gerekçe: atölye İsviçre sınırında da çalışıyor (ör. Huningue/Basel hattı); İsviçre menülerinde fiyat `22.00` biçiminde, sembolsüz yazılır.

**2.2 formatPrice(value, currency).**
- `EUR` → `fr-FR`: `7.5 → "7,50 €"`
- `CHF` → nokta ondalık, iki hane, sembolsüz: `22 → "22.00"`
Tek fonksiyon, tüm şablonlar bunu kullanır (M1: format tek yerde).

**2.3 Kategori notu.** `Category.note_fr?: string` — kategori başlığı altında küçük gri satır. Örnekler: *"Pain au choix : Parisien · Tortillas · Pain au four"*, *"Servies avec frites et salade"*.

**2.4 Hatırlatma (değişiklik değil):** `prices[]` varyant etiketleri serbesttir — `seul/menu`, `étudiant`, `M/L/XL` hepsi aynı mekanizma. Kod bu etiketlere özel durum YAZMAZ.

**2.5 Kayıt:** Şema değişikliklerini uyguladıktan sonra `CONSTITUTION.md` sonuna `## Değişiklik Günlüğü` bölümü aç ve şunu ekle: `Faz 1 / FAZ1-GOREV.md: currency (EUR|CHF), formatPrice(currency), Category.note_fr`.

## 3. Tema sistemi — üç hazır tema

Şablonlar **yalnızca** CSS custom property kullanır (CONSTITUTION §5.3). Rol seti:

```
--c-bg        sayfa zemini            --c-item   ürün adı rengi
--c-heading   kategori başlığı        --c-desc   açıklama rengi
--c-price     fiyat rengi             --c-accent vurgu (ok, bant, çizgi, rozet)
--c-line      leader dots / ayraçlar  --c-panel  kutu/bant zemini
--f-heading   kategori fontu          --f-item   ürün adı fontu
--f-body      açıklama fontu          --f-script kurdele yazısı (ops.)
```

**Tema 1 — `or-noir`** (ARAS panel stili: siyah + altın):
`--c-bg:#1D1B1A · --c-panel:#262321 · --c-heading:#E3A93F · --c-item:#FFFFFF · --c-desc:#B7B0A5 · --c-price:#E3A93F · --c-accent:#E3A93F · --c-line:#6E675E`
Fontlar: heading **Oswald 700** (uppercase, letter-spacing hafif) · item **Oswald 600** · body **Inter**.

**Tema 2 — `aras-orange`** (ARAS masa menüsü: koyu + turuncu + serif):
`--c-bg:#141110 · --c-panel:#1E1A17 · --c-heading:#F0562B · --c-item:#F3EBDD · --c-desc:#A79E92 · --c-price:#F0562B · --c-accent:#F0562B · --c-line:#5B534B`
Fontlar: heading **Archivo Black** (uppercase) · item **Bitter 700** (serif) · body **Inter**.

**Tema 3 — `velours-rouge`** (MADO'S: kadife bordo + kesikli hücreler):
`--c-bg:#5E0F1D` (opsiyonel çok hafif radyal aydınlanma merkezde `#7A1526`) `· --c-panel:#000000cc (kurdele bandı, degrade) · --c-heading:#FFFFFF · --c-item:#FFFFFF · --c-desc:#E8DAD2 · --c-price:#FFFFFF · --c-accent:#E63329 · --c-line:#FFFFFFbf`
Fontlar: heading **Pacifico** (script, kurdele içinde) · item **Archivo Black** ya da **Oswald 700** (uppercase) · body **Inter**.

**Font kuralları (M9):** Hepsi OFL: Oswald, Anton, Archivo Black, Inter, Bitter, Pacifico — woff2 olarak `packages/templates/fonts/`. Eklemeden önce her fontta `ğ ş İ ı é è ç œ` render testi yap; script font Türkçe kapsamıyorsa kurdele metni yalnız FR karakter içerir (kategori adları zaten FR).

Marka kiti renkleri **`brand` temasını** besler (mevcut davranış); yukarıdaki üçü hazır seçenek olarak tema menüsüne eklenir.

## 4. Şablon 1 — `menu-grid-cells` ("resimli ızgara", MADO'S iskeleti)

**Amaç:** Her ürün kendi hücresinde: fotoğraf + ad + açıklama + fiyat. En çok satılan tip; öncelik bunda.

**Formatlar (param `format`):** `a4-portrait` (210×297) · `a4-landscape` (297×210) · `a3-portrait` (297×420). Bleed 3 mm, safe 5 mm (manifest'te).

**Parametreler:**
- `cols`: a4-portrait → 3 (seçenek 2/3) · a4-landscape → 4 (seçenek 4/5) · a3 → 4/5/6
- `showDesc`: bool (default true)
- `priceStyle`: `"arrow"` (▶ üçgen, `--c-accent`) | `"plain"`

**Hücre anatomisi** (kesikli çerçeve `0.5mm dashed --c-line`, köşe radius 2 mm, iç boşluk 4 mm):
1. Üst-sol: **ürün adı** — `--f-item`, uppercase, font 3.2–4.6 mm aralığı, max 2 satır
2. Altında: **açıklama** (showDesc ise) — 2.4–3.0 mm, max 2 satır, `--c-desc`
3. Orta: **fotoğraf** — `fit: contain`, şeffaf zemin varsayımı (dekupe PNG), hücre yüksekliğinin en fazla %55'i; foto yoksa hücre çökmez: edit modunda yer tutucu, baskıda temiz boşluk (bkz. §8)
4. Alt-sağ: **fiyat** — `formatPrice(currency)`; `arrow` stilinde önünde `--c-accent` renkli ▶ üçgen

**Kategori ayracı:** Grid akışında tam genişlik satır. `velours-rouge` temasında *kurdele*: siyah→şeffaf yatay degrade bant (`--c-panel`) + `--f-script` beyaz yazı + küçük kıvrım oku; diğer temalarda düz büyük başlık + `--c-accent` alt çizgi. `category.note_fr` varsa bandın altında küçük satır.

**Fiyat varyantları gridde:** tek varyant → tek fiyat; çok varyant → alt-sağda yan yana küçük etiket+fiyat çiftleri (örn. `seul 7,50 € · menu 10,00 €`), sığmazsa alt alta.

**Overflow:** `shrink-then-warn` — hücre sayısı sabittir; sığmayan ürün sayısı editörde kırmızı sayaçla bildirilir ("N ürün sığmıyor: seçimi azalt, kolonu artır ya da A3'e geç"). Sessiz kırpma yok (M8).

**Sabit slotlar:** logo (üst şerit) · belge başlığı (default "NOTRE CARTE") · telefon şeridi · adres+saat satırı · halal rozeti · `catalog.footnote_fr` dipnotu · opsiyonel QR (kaynak seçilebilir).

## 5. Şablon 2 — `menu-liste-premium` ("ARAS listesi")

**Amaç:** Fotoğrafsız/az fotoğraflı, tipografi ağırlıklı premium liste; leader dots hizalama.

**Formatlar:** `a4-portrait` (param `columns: 1|2`) · `a3-portrait` (`columns: 2|3`).

**Satır düzeni:** `ÜRÜN ADI ......(leader dots, --c-line)...... fiyat`. Açıklama (showDesc) satır altında küçük `--c-desc`. Leader dots **deterministik** üretilir (CSS/SVG dotted fill), elle nokta karakteri yazılmaz.

**Fiyat düzeni (param `priceLayout`):**
- `"inline"`: satır sonunda varyantlar yan yana (`7,50 € / 10,00 €`)
- `"columns"`: kategori üstünde bir kez `SEUL  MENU` (ya da varyant etiketleri neyse o) kolon başlıkları; fiyatlar iki sabit kolonda alt alta hizalı. Kolon başlıkları kategori içindeki ilk ürünün varyant etiketlerinden türetilir; karışık varyantlı kategoride editör uyarı verir.

**Kategori başlığı:** büyük kondanse `--f-heading` + `--c-accent` kısa alt çizgi; `note_fr` altında küçük gri.

**Dekor foto slotları:** Manifest'te sabit konumlu 2–4 `image` slotu (kategori bloklarının yanına), `fit: contain`, dekupe PNG; boş bırakılabilir.

**Overflow:** `shrink-then-flow` — önce izinli aralıkta küçülür, sonra sonraki sütuna/sayfaya akar (M8).

**Sabit slotlar:** grid şablonuyla aynı set.

## 6. Editör gereksinimleri

CONSTITUTION §6 aynen geçerli. Bu faza özgü vurgular:
- Tema menüsü: `brand` + bu paketteki üç tema; değişim anlık, override'lı renk slotları korunur ve işaretli kalır (M5).
- Param paneli: `format`, `cols/columns`, `showDesc`, `priceStyle`/`priceLayout`.
- `currency` müşteri ayarında düzenlenir; editörde salt-okunur rozet olarak görünür.
- Şablonlar arası geçiş (grid ↔ liste) `selection` ve verileri korur; uyumsuz override'lar düşer ve kullanıcıya listelenir.

## 7. PDF export ve KABUL SENARYOSU

Export: CONSTITUTION §9.1 aynen (Puppeteer, `print` = bleed+crop marks, `preview` = net boyut; fontlar gömülü; RGB).

**Kabul — hepsi geçmeden faz kapanmaz:**
1. ARAS benzeri müşteri (EUR): 3 kategori, 14 ürün (seul/menu varyantlı sandviçler + tek fiyatlı pizzalar + `note_fr`'li bir kategori) katalog girişi ≤ 15 dk.
2. `menu-grid-cells` a4-landscape `cols=4` `velours-rouge`: otomatik dolar; bir foto değiştirilir (odak noktası denenir), başlık override edilir, tema `or-noir`'a çevrilir → override işaretli şekilde korunur.
3. Tek tıkla `menu-liste-premium`'a geçilir: veri + seçim korunur; `priceLayout=columns` ile SEUL/MENU kolonları dikeyde kusursuz hizalanır; leader dots her satırda düzgün.
4. İkinci müşteri `currency=CHF`: fiyatlar her yerde `22.00` biçiminde (editör + PDF).
5. Print PDF: sayfa boyutu format+bleed ile birebir (a4-portrait → 216×303 mm), crop marks var, ekran görüntüsüyle birebir; export v1 kaydı oluşur; katalogda fiyat değişir → belge güncel → yeni export v2.
6. Grid'e kapasiteden fazla ürün seçilir → kırmızı "N ürün sığmıyor" uyarısı; içerik sessizce kırpılmaz.
7. Vitest yeşil: binding çözümleyici · overflow motoru (shrink/flow/warn dalları) · `formatPrice` (EUR ve CHF).
8. **Eksik görsel akışı:** fotoğrafsız 3 ürün içeren grid belgesi → edit modunda yer tutucular görünür, preview PDF'te alanlar temiz boş; "Eksik fotoğraflar (3)" paneli ürünleri listeler; talep metni tek tıkla panoya kopyalanır; bir foto yüklenip ürünlerden birine bağlanınca açık belgede anında yerine oturur.

## 8. Eksik Görsel Akışı — BU FAZ KAPSAMINDA

Atölyenin gerçek iş akışı: müşteri ürün listesini verir, fotoğrafların bir kısmı yoktur. Tasarım fotoğraf beklemeden kurulur; eksikler sistemli toplanır; foto gelince her yere kendiliğinden oturur.

**8.1 Yer tutucu.** `item.photo = null` ise:
- `mode:"edit"`: foto alanında kesikli çerçeve + kamera ikonu + "Fotoğraf bekleniyor" yazısı (`--c-desc` tonunda, silik). Tıklanınca doğrudan dosya seçici açılır.
- `mode:"print"` ve preview: alan **tamamen temiz boş** — hiçbir yer tutucu izi basılmaz; hücre/satır düzeni bozulmaz.

**8.2 Eksik fotoğraflar paneli.** Editörün uyarı alanında "Eksik fotoğraflar (N)": bu belgenin *seçimindeki* photo'suz ürünler kategori sırasıyla listelenir. Satıra tıklayınca canvas ilgili hücreye kaydırılır ve slot seçilir.

**8.3 Talep listesi.** Panelde "Talep metnini kopyala" düğmesi panoya düz metin üretir; kullanıcı WhatsApp'a yapıştırıp restorancıya gönderir:

```
Menü için şu ürünlerin fotoğrafları eksik:
- Döner
- Yufka
- Chicken Curry
Yatay, iyi ışıkta, sade zeminde çekim rica ederim.
```

Giriş/kapanış cümleleri `tr.json`'da tek yerde durur; ürün adları `name_fr`'den gelir.

**8.4 Hızlı eşleme.** Fotoğraf geldiğinde üç yol vardır, üçü de `item.photo`'ya bağlar ve M1 gereği **tüm belgelerde anında** görünür:
1. Eksik listesinde ürüne tıkla → dosya seç → yüklenir ve bağlanır.
2. Canvas'taki boş foto slotuna sürükle-bırak.
3. Katalog editöründe ürün satırındaki foto alanından yükle.

Yüklenen dosya `kind:"photo"` asset olur (Faz 0 hattı: orig/master/thumb); çözünürlük eşikleri (CONSTITUTION §9.2) yerleştirme anında denetlenir.

## 9. Faz 2'ye KAYIT (uygulama YOK — yalnızca TODO.md'ye ekle)

- `carte-fidelite` şablon parametreleri netleşti: `stampCount=10` (2×5 dizilim), **numaralı** damga kutuları (1.–10.), üst-sağ alt başlık slotu (*"1 menu acheté = 1 tampon"*), alt tam-genişlik ödül bandı (`--c-accent` zemin, ör. *"11ᵉ KEBAB OU PIZZA OFFERT !"*); arka yüz: logo, "CARTE DE FIDÉLITÉ" başlığı, tel, adres, hizmet satırı (*Sur place · à emporter · Livraison*), saat.
- Flyer format preseti **21×21 cm kare** (katlamalı); teslimat bölgeleri + minimum sipariş serbest-metin slotu; **çift saat bloğu** (açılış saatleri ↔ teslimat saatleri ayrı).
- QR online sipariş: mevcut `delivery[]` şemasından beslenir.

## 10. Raporlama

Faz sonunda: (a) 7. bölümdeki kabul maddelerini tek tek nasıl doğruladığını yaz; (b) üretilen örnek PDF'lerin dosya yollarını listele; (c) TODO'ları ve riskleri raporla; (d) her şeyi commit'leyip push et. Kullanıcı raporu mimara (Fable) taşıyacak; denetim GitHub üzerinden yapılacak.
