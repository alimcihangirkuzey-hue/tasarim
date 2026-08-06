# ÜRÜN SAHİBİ KARARLARI — TEZGÂH (Repo C)

Bu defter, `00_READ_FIRST.md` §KİMLİK'in **yalnız kullanıcıya ait 7 kararını**
kayda geçirir: marka/ürün isimleri · ticari strateji · fiyatlandırma ·
hukuk/lisans · ücretli dış sözleşme · production'a gerçek geçiş · geri
döndürülemez veri.

**Neden ayrı defter:** bu kararlar ADR değildir (teknik değil, ticari) ve
yönetişimin verebileceği paket de değildir — uygulayıcı bunları ÜRETEMEZ,
yalnız kaydeder ve sonuçlarını sıralamaya yansıtır. Kayıt, kararın sohbette
kaybolmasını önler (F7-A dersi: plan sohbette kalırsa oturumla birlikte gider).

**Kayıt biçimi:** her karar tarihli, kullanıcının kendi ifadesiyle alıntılı,
ve "bu ne DEĞİŞTİRİR" bölümüyle. Uygulayıcı yorumu karardan AYRI işaretlenir.

---

## K-1 — Ürünün birincil işi ve satış biçimi (2026-08-06)

**Karar sınıfı:** ticari strateji (7 karardan biri).

**Kullanıcının ifadesi (birebir):**
> "bu proje öncelikle benim coklu projelerimi hızlı yapmalı tıklayarak fleyer
> bitirmeli menü tabela vs hepsi aynı mantıkla ve brn bu sistemi bir modul
> olarak ozalitlere kiralık veya satılık olarak vermeliyim ozalit baskıcı
> matbaa tabelacı menücüler benim bu sistemime ihtiyacı olan kesimler"

**Kararın iki yarısı:**

1. **BİRİNCİL — sahibin kendi üretim hızı.** Sistem önce ürün sahibinin çoklu
   işlerini hızlandırmalı: **tıklayarak** flyer bitmeli; menü, tabela ve
   diğerleri **aynı mantıkla** çıkmalı. Ölçüt "şablon dolduruluyor mu" değil,
   "iş kaç tıkla bitiyor".
2. **İKİNCİL — sektöre modül olarak verilmesi.** Aynı sistem bir **modül**
   olarak ozalitçilere **kiralık veya satılık** verilecek. Hedef kesim ürün
   sahibi tarafından adlandırıldı: **ozalitçi · baskıcı · matbaa · tabelacı ·
   menücü.**

**KARARA DAHİL OLMAYAN — hâlâ ürün sahibinde, sorulmadan varsayılmaz:**
- Kiralama mı satış mı (ikisi "veya" ile söylendi, seçim YAPILMADI) → fiyatlandırma kararı.
- Fiyat, paketleme, lisans metni, sözleşme → fiyatlandırma + hukuk/lisans kararları.
- Marka/ürün adı (modülün ticari adı) → isim kararı.
- Gerçek müşteriye production açılışı → production geçiş kararı.

Uygulayıcı bunların hiçbirini üretmez; kod bu kararlar OLMADAN da ilerleyebilecek
şekilde yazılır (kimlik-bilgisi-kapılı desen: mekanizma hazır, değer boş).

### Bu ne DEĞİŞTİRİR (uygulayıcı yorumu — karardan ayrı)

Yürürlükteki sıralama K-1'den ÖNCE kurulmuştu ve iki noktada onunla çelişiyor.
Çelişki gizlenmez, buraya yazılır; sıralamayı yönetişim keser.

| Konu | K-1 öncesi | K-1 sonrası |
|---|---|---|
| **Paket şablonları** ("açılış takımı" — tek tıkla N kalemli proje preseti) | TODO'da "Faz 4" adayı, SaaS Vizyon Defteri'nde pasif kayıt | K-1'in "tıklayarak bitir" yarısının **doğrudan karşılığı** — birincil işin ana kaldıracı |
| **Faz S** (Postgres · auth · çok kiracı · abonelik) | "ileride, ayrı mimar paketi" | Kiralama/satışın **teknik ön koşulu** — modül başkasına verilecekse çok kiracılık ve lisans kapısı gerekir |
| **Sektörsüz şablon dili** (TODO Faz 7) | "restoran-dışı işler için genel terminoloji" — sıradan bir kalem | Hedef kesim **ozalitçi/tabelacı/matbaa**; bugünkü dil restorana gömülü (`Entrées`, `menu_language`, `carte`). Ticari engel sınıfına yükselir |
| **Güvenlik yükseltme turu** | "Faz S ön koşulu" | Dışarıya verilen modülde zafiyet **hukuki mesele** — 12 açık zafiyet (3 orta, 9 yüksek) |

**Ölçülmüş mevcut durum (2026-08-06, bu tarihte komutla):** 11 kayıtlı şablon
(10 el yazımı + 1 fabrika), 58 API ucu, 20 ekran, 1848 test yeşil. Flyer · menü ·
sadakat kartı · vitrin · tabela · tekstil **bugün baskıya hazır çıktı üretiyor**
(kesim işaretli, CMYK, PDF/SVG). Yani K-1'in eksiği "tasarlayabilmek" değil,
**tek tıkla çoklu iş** ve **başkasına verilebilirlik**.

### K-1'in açtığı iş başlıkları (paket DEĞİL — yönetişim kesecek)

- **A. Tek tık / paket şablonları:** bir müşteri + bir preset → N belge (menü +
  flyer + kart + tabela) tek işlemde, aynı marka kitinden. Bugün her belge tek
  tek açılıyor.
- **B. Çoklu proje hızı:** proje düzeyinde toplu üretim, toplu dışa aktarım,
  toplu baskı kuyruğu. `POST /api/projects/:id/present` var, toplu üretim yok.
- **C. Modül sınırı:** sistemin "verilebilir" parçasının nerede bittiği —
  çok kiracılık, kiracı-başına marka/şablon, lisans kapısı.
- **D. Sektörsüz dil:** ozalitçi/tabelacı terminolojisi; restoran varsayımının
  şablon ve şemadan sökülmesi.

### K-1'in AÇTIĞI KARAR: "ozalitçi" iş kolu ilanda YOK (2026-08-06, ölçüldü)

**Bulgu (komutla ölçüldü, `packages/templates/src/types.ts:399`):** sistemin iş
kolu ilanı bugün beş elemanlı —
`menu-uretici · matbaa · tabelaci · tekstil-baski · cam-giydirme`.
K-1'in hedef kesim listesiyle karşılaştırıldığında dördü karşılanıyor
(menücü→`menu-uretici`, matbaa→`matbaa`, tabelacı→`tabelaci`, baskıcı→`matbaa`
veya `tekstil-baski`), **ozalitçi karşılıksız.**

**Neden uygulayıcı bunu kendi ekleyemedi:** `HEDEF_SEKTOR` bir
`Record<MaterialType, Sektor>`'dür — her materyal türü tam bir iş koluna
atanır. Hiçbir materyalin işaret etmediği bir sektör eklemek **ölü ilan**
üretir ve bu repoda yasaktır. İlanın kendi yorumu da kararı adıyla sahibine
bırakıyor: *"iş kolu ataması ÜRÜN KARARIDIR"* (`types.ts:408-409`).

**Ürün sahibine sorulan (uydurulmadı, bekliyor):** ozalit işi hangi materyal
türüne karşılık gelir? Bugünkü `MaterialType` kümesi
`menu · flyer · kart · tabela · tekstil · cam`. İki yol var ve ikisi de sahibin:
1. Ozalit mevcut bir türe (büyük olasılıkla `tabela`) **bağlanır** → o türün
   hedef sektörü değişir, `tabelaci` ile çakışma çözülmelidir.
2. Ozalit **yeni bir materyal türü** olarak açılır (geniş format / plotter) →
   yeni tür yeni şablon ailesi ve substrat ilanı ister; bu bir faz işidir.

Karar gelene kadar otomasyon bu alana dokunmaz.

---

## K-2 — Biten modül KAPANIR; kanıt ekran görüntüsüdür (2026-08-06)

**Karar sınıfı:** çalışma biçimi / iş sırası kararı — ürün sahibinin
sıralama yetkisi (`00_READ_FIRST.md` §KİMLİK).

**Kullanıcının ifadesi (birebir):**
> "her finislenen anamodulleri ekran görüntüleri ispatla mesela qr artık hazır
> ve su halde gibi kanıtla o modulu bitir üst modulu tasarla bu sekilde biten
> module dönme ben geliştirme izni verince güncelleme için dön"

**Kararın üç hükmü:**

1. **KANIT EKRAN GÖRÜNTÜSÜDÜR.** Bir ana modül "bitti" sayılmak için yeşil
   kapı yetmez; sistem gerçekten ayağa kaldırılıp o modülün çıktısı
   **görüntülenmiş** olmalıdır ("qr artık hazır ve şu halde").
2. **BİTEN MODÜL KAPANIR.** Kanıtlanan modül kapatılır ve sıradaki **üst**
   modül tasarlanır.
3. **KAPALI MODÜLE DÖNÜLMEZ.** Ürün sahibi açıkça geliştirme izni verene
   kadar uygulayıcı kapalı bir modülü güncellemek için geri dönmez.

### Bu ne DEĞİŞTİRİR (uygulayıcı yorumu — karardan ayrı)

- **Kapı sayısı beşten altıya çıkmaz, ama "bitti" tanımı değişir.** Beş kapı
  (`typecheck·lint·test·build·journal:verify`) *regresyon* kapılarıdır: kodun
  bozulmadığını ölçerler, işin göründüğünü ölçmezler. K-2, ana modül
  kapanışına ayrı ve **gözle** bir delil şartı koyar.
- **Kapanış defteri:** hangi ana modülün kapalı olduğu ve neyle kanıtlandığı
  aşağıdaki tabloda tutulur. Tablo tek doğruluk kaynağıdır; kapalı satıra
  dokunan bir paket açılmaz.
- **K-2, K-1'in dört başlığını iptal etmez.** A/B/C/D başlıkları hâlâ açıktır;
  K-2 yalnız hangi sırayla ve hangi delille kapandıklarını belirler.
- **Çelişki notu:** kapalı bir modülde *yara* ölçülürse (ör. aşağıdaki
  `footnote_fr` sızıntısı) uygulayıcı onu **onarmaz**, buraya yazar ve izin
  bekler. Sessizce düzeltmek K-2'nin 3. hükmünü çiğnerdi.

### Kapanış defteri (2026-08-06 · gerçek sistem, gerçek müşteri kaydıyla)

Kanıt ortamı: sunucu `:3001` + arayüz `:5173`, tohumlanmış müşteri
**"Kuzey Ozalit & Reklam"** (tabela/baskı katalogu, TL **büyüklüğünde** fiyatlar,
`menu_language=tr`).

> **DÜZELTME (2026-08-06, para birimi paketi):** yukarıdaki satır ilk yazıldığında
> "TL fiyatlar" diyordu ve bu YANLIŞTI. Ölçüldü: `CurrencySchema` o gün yalnız
> `EUR` ve `CHF` taşıyordu — yani müşteri kaydı TL'yi **ifade edemiyordu**.
> Tohumlanan fiyatlar (2400 · 850 · 1250) TL büyüklüğündeydi ama baskı yüzeyine
> **"2 400,00 €"** olarak düştü. Kanıt görüntüleri o hâliyle geçerlidir; yanlış
> olan benim etiketimdi. Eksik `2026-08-06-para-birimi` paketinde kapatıldı.
12 ekran görüntüsü Playwright ile alındı.

| # | Ana modül | Kanıt (ölçülen) | Durum |
|---|---|---|---|
| A1 | **QR** | A4 baskı yüzeyinin sağ altında **vektör** QR; `menu_url`'den kodlanmış | Kapalı |
| A2 | Editör + şablon motoru | Premium yazılı menü, marka kitinden tema, slot/uyarı panelleri | Kapalı |
| A3 | Tabela / geniş format | Tek panel tabela şablonu, ölçü parametreleri ilandan | Kapalı |
| A4 | Dijital menü | Tek dosya çıktı, `lang="tr"`, başlık "Kuzey Ozalit & Reklam — Menü" | Kapalı |
| B1 | Sipariş defteri | 4 kalemli proje, termin, eksik alan rozeti, toplu başlatma | Kapalı |
| B2 | Sipariş alma (saha) | Beş adımlı mobil öncelikli akış | Kapalı |
| B3 | Müşteri + belge yönetimi | Müşteri listesi, yaklaşan terminler şeridi | Kapalı |
| C1 | Marka kiti | 5 renk rolü, 2 font rolü, iletişim + QR kaynak alanları | Kapalı |
| C2 | Katalog | Kategori/ürün/fiyat varyantı, m² ve adet birimleri | Kapalı |
| D1 | Kiracı iş kolu daraltması | `TEZGAH_IS_KOLLARI=tabelaci` → şablon 11→2, ürün türü 9→2 | Kapalı |
| D2 | Yapılandırma kapısı | Yanlış iş kolu adında sunucu açılışta durur; boş değerde bugünkü davranış | Kapalı¹ |

¹ **D2'nin görsel delili kısmidir ve bu saklanmıyor:** 12 numaralı görüntü
daraltmanın *sipariş* tarafını gösterir; "yanlış iş kolu adıyla sunucu
açılmaz" hükmünün delili ekran görüntüsü değil, `kurulum-dogrulama` testleri
ve önceki turda ölçülmüş fail-loud davranışıdır. Diğer on satırın deliline
gözle bakılabilir; bunun bir yarısına bakılamaz.

### K-1/C'den doğan AÇIK KARAR: boş veri dizininde kurulum ne yapmalı? (2026-08-06)

**Bulgu (komutla ölçüldü, `index.ts`'in gerçek sırasıyla — `migrate()` → `buildApp`):**
kiralanan modülde kiracının bütün verisinin yerini `TEZGAH_DATA_DIR` belirler.
Değer **bir harf yanlış** yazıldığında:

| ölçüm | sonuç |
|---|---|
| boot | **başarılı** |
| `/api/health` | **200** |
| `/api/clients` | **200 `[]`** |

`ensureDirs()` yanlış yazılmış yolu sessizce oluşturur, `migrate()` oraya boş
bir şema kurar, kurulum kusursuz sağlıklı görünür — ve operatörün gördüğü tek
şey **bütün müşterilerinin yok olmuş olması**. Veri, doğru yazılmış dizinde
sapasağlamdır; bunu söyleyen hiçbir şey yoktur.

**Uygulayıcının kapattığı yarı (karar gerektirmedi):** biçim kuralları —
ilan edilmiş ama boş · göreli yol · satır sonu → sunucu **ayağa kalkmaz**
(`veri-dizini.ts`, journal `2026-08-06-veri-dizini-ilani`).

**Ürün sahibine kalan yarı (uydurulmadı):** biçimi kusursuz ama yanlış yazılmış
bir yol, "ilk açılış"tan yalnız bir ürün kararıyla ayrılabilir:

1. **Boş veri dizininde kurulum DURUR;** açılış, kurulumcunun açık onayını
   ister (ör. `TEZGAH_ILK_KURULUM=1`). Yanlış yazımı yakalar, ilk kuruluma bir
   adım ekler.
2. **Kurulum açılır ama UYARIR** — arayüz "bu kurulum boş bir veri dizini
   kullanıyor: `<yol>`" der. Adım eklemez, yanlış yazımı garanti yakalamaz.
3. **Bugünkü davranış korunur** — sessiz kalır.

Karar gelene kadar otomasyon bu alana dokunmaz; sınır hem `veri-dizini.ts`
başlığında hem "KAPATILAMAYAN YARI" adlı ayrı bir testte yazılıdır, yani kod
değişirse sessizce kaybolamaz.

### K-1/D'den doğan AÇIK KARAR: `archivo-black-400` fontu ₺ basmıyor (2026-08-06)

**Bulgu (fontkit ile tek tek ölçüldü):** para birimi kümesine `TRY` eklendi;
artık TL fiyat basan bir kurulumda sayfaya **₺ (U+20BA)** düşüyor. Yerleşik
sekiz fonttan **yedisinde ₺ var, `archivo-black-400`'de yok** (€ hepsinde var).
Yani bir Türk kurulumunda fiyat/başlık yüzü Archivo Black'e bağlanırsa **₺ tofu
basar** — sessizce, hiçbir kapı kırmızıya dönmeden.

**Uygulayıcının yapmadığı ve neden:** ₺ glif bekçi kümesine (`GLYPH_COVERAGE`)
**eklenmedi**. Eklemek `archivo-black-400`'ü kapsam dışına atardı ve o bir
**marka kiti display yüzüdür** — hangi fontun repoda kalacağı, değişeceği ya da
yerine ne geleceği içerik/marka kararıdır. Bekçiye eklemek, o kararı bir test
dosyasında sessizce vermek olurdu.

**Ürün sahibine kalan seçim:**
1. **Fontu değiştir** — ₺ taşıyan bir display yüzüyle (marka kararı).
2. **Fontu bırak, kısıtı ilan et** — Archivo Black TL kurulumlarında fiyat
   slotuna atanamaz (yeni bir manifest kuralı; mekanizma işi).
3. **Bugünkü hâli koru** — sınır kayıtlı, risk kabul edilmiş.

Sınır `packages/templates/src/fonts.test.ts`'te dört testle çivili: gerçek bir
gün değişirse (font güncellenir/yenisi gelir) orası kırmızıya döner ve karar
yeniden önümüze gelir.

### Kapalı modülde ÖLÇÜLEN ama ONARILMAYAN yara (izin bekliyor)

**`catalog.footnote_fr` — Türkçe tabelacı müşterisinde Fransızca dipnot.**
Kanıt görüntüsü 07'de (A4 baskı yüzeyi) görülüyor: sayfa altında
*"Prix nets en euros — Liste des allergènes disponible sur demande."*
Müşteri Türk, para birimi TL, `menu_language=tr`, iş kolu tabela — dipnotun
üç varsayımı da (Fransızca · euro · alerjen listesi/restoran) yanlış.

**Kod tarafı ölçüldü (görüntüyle yetinilmedi):** metin bir şema
**varsayılanıdır** — `schemas.ts:85-87`, `CatalogSchema.footnote_fr` alanı
`.default("Prix nets en euros — …")` taşır. Yani dipnotu kimse yazmaz;
katalog alanı boş bırakılan **her** müşteriye kendiliğinden gelir. Slot
bağlaması da aile-genelidir (`parts/chrome-slots.ts`, flyer · trifold ·
grid · fabrika manifestleri hepsi `bind:"catalog.footnote_fr"`). Alan adının
kendisi (`_fr`) ikinci bir K-1/D örneğidir.

Bu, K-1/D "sektörsüz dil" başlığının ölçülmüş bir örneğidir ve **A2/A4 kapalı
modüllerinin içindedir** — K-2'nin 3. hükmü gereği dokunulmadı.
Onarım izni verilirse tek paketlik iştir (varsayılanı boşaltmak mı, dile
duyarlı hâle getirmek mi — o da içerik kararıdır).

---
