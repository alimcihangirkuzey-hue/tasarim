# Arşivden Şablon: InDesign / Illustrator → SVG → TEZGÂH Fabrikası

Eski işlerini (InDesign, Illustrator, Corel) TEZGÂH'a **şablon** olarak almak için
dosyayı **SVG**'ye çevirip Fabrika'ya yükle. Bu rehber çıkışı doğru almanı sağlar;
5 dakikada çalışan şablon çıkar.

---

## 1. Metin kararı — EN ÖNEMLİ adım

Bir metnin canlı **slot** (fiyatı/adı otomatik değişen alan) olabilmesi için SVG'de
**canlı metin** kalması gerekir. İki yol var:

- **A) Canlı bırak + fontu yükle (önerilen — slot istiyorsan):**
  metni eğriye çevirme. SVG'de `<text>` olarak kalır. Kullandığın font TEZGÂH'ta
  kurulu değilse **Ayarlar → Fontlar**'dan yükle (woff2/ttf; TR+FR+DE-CH glif
  bekçisinden geçmeli). Font yüklü değilse o metne slot **bağlanamaz** (ekran ≠ baskı olmasın diye).
- **B) Eğriye çevir (outline / "Créer les contours"):**
  metin `<path>`'e döner, her yerde birebir görünür ama **slot olamaz** — dekor kalır.
  Fiyat/ad değişmeyecek sabit yazılar (ör. tabela sloganı) için uygundur.

> Kısaca: **değişecek metin → canlı bırak + font yükle. Değişmeyecek metin → eğriye çevir.**

---

## 2. Fiziksel ölçü (mm) — baskı için şart

SVG'yi dışa aktarırken **gerçek ölçüyü** koru. TEZGÂH ölçüyü SVG'nin `width`/`height`
özniteliğinden okur — ama yalnız **fiziksel birim** varsa güvenir: `mm`, `cm`, `in`, `pt`.

- InDesign: **File → Export → SVG**; belge zaten mm/pt ölçüsündeyse ölçü doğru gider.
- Illustrator: **File → Save As → SVG**; "Responsive" kapalı, ölçü birimi belge birimi.
- `px` ya da birimsiz genişlikle çıkarsa TEZGÂH ölçüyü **soramaz sayar** ve içe almada
  sana **en × boy (cm)** sorar — el ile gir. (px ekran birimidir, baskıda güvenilmez.)

Sınır: **30 mm – 3000 mm**. Şablon bu ölçüyle doğar; export bleed 3 mm + kesim
işaretleriyle (crop marks) çıkar — sayfa = (en+6) × (boy+6) mm.

---

## 3. Görseller — gömülü olmalı

Fotoğraf/logo SVG'ye **gömülü** (embedded) olmalı. Harici bağlantılı (linked) görseller
render'a girmez, "eksik varlık" olarak listelenir.

- Illustrator: SVG kaydederken **Images: Embed** seç (Link değil).
- InDesign: SVG export gömülü verir; emin olmak için görselleri belgeye göm.
- Toplam SVG boyutu **25 MB** altında olsun (çok büyükse görselleri optimize et).

---

## 4. Temiz tek sayfa

- **Tek sayfa / tek artboard** dışa aktar (çok sayfalı belge desteklenmez).
- Katman/grup adları kalabilir; işaretlemeyi kolaylaştırır ama şart değil.
- Script, `foreignObject`, harici stil/@import otomatik **temizlenir** (güvenlik).

---

## 5. TEZGÂH'ta

**Ayarlar → Şablon Fabrikası → SVG yükle.** İçe alma özeti sana şunları gösterir:
tespit edilen ölçü, canlı/dekor metin sayısı, fontlar (yüklü/eksik), görseller
(gömülü/eksik), uyarılar. Sonra elemanlara tıklayıp slot ata, istersen bir grubu
prototip hücre yap, **Üret**'e bas — şablon anında kayıt defterine girer, künyesiyle
(kaynak dosya, fontlar, tarih) saklanır. Slot atamadan da üretebilirsin: salt dekor /
cam-folyo şablonu (ölçü + çıktı + künye TEZGÂH'ta, kompozisyon dış araçta).
