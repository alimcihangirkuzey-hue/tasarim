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
