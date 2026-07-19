# TEZGÂH — FAZ 4 GÖREV PAKETİ
### Mimar: Claude Fable 5 · Uygulayıcı: Claude Code · Paket sürümü: 1.0

---

## 0. Ön koşul ve çalışma kuralları

1. Faz 3 `main`'e merge edilmiş olmalı (edildi: `157994e`). İş `phase-4`'te yürür; merge kullanıcı kabulüyle.
2. `CONSTITUTION.md` üstündür; "mimar kararı" işaretli maddeler geçerli olup Değişiklik Günlüğü'ne yazılır; işaretsiz çelişkide dur, sor.
3. Uygulama sırası = bu paketteki madde sırası (§2 motor bakımı, §12 fabrikadan ÖNCE gelir — üretici doğru birimle doğsun). Koşu bölünürse §12 öncesi teslim edilenler tek başına değer taşır.
4. Kapsam dışı fikirler `TODO.md`'ye; anlamlı her adım ayrı commit; başlamadan plan + onay.

## 1. Kapsam ve mimar kararları

CONSTITUTION §13 Faz 4 çekirdeği: SVG import + slot işaretleme · tema kütüphanesi · toplu fiyat güncelleme · CMYK opsiyonu · snapshot geri yükleme · zip yedek. Bu paketin ekleri (biriken borçlar + vizyon defterinin Faz 4 kalemleri): letterSpacing motor düzeltmesi · iki kademeli broderie notu · grid çok-sayfa akışı · foto önerisi + varlık etiketleri · parse sözlüğü arayüzü · asset silme · paket presetleri.

**Mimar kararı #10 (Günlük'e — #9'un yön düzeltmesi):** #9'daki "3,78'e bölünür" ifadesi yön olarak hatalıydı; kanıt (8 mm stil → 30,24 birim) tersini gösteriyor. Doğrusu: motor letterSpacing'i **birimsiz kullanıcı birimi** (1 birim = 1 mm) olarak yazar; onaylı görünümü korumak için mevcut yazar değerleri **3,7795 ile çarpılır**. Uygulamada katsayı ve yön canlı ölçümle teyit edilir; önce/sonra piksel kanıtı zorunlu.
**Mimar kararı #11 (Günlük'e):** npm audit'in major yükseltmeleri (vite 8, @fastify/static 9) bu fazda YAPILMAZ; gerekçe: local-first mimari + sunucunun yalnız 127.0.0.1 dinlemesi saldırı yüzeyini minimuma indiriyor. TODO'ya "Faz S ön koşulu: güvenlik yükseltme turu" olarak yazılır — SaaS'a çıkmadan zorunlu.
**Mimar kararı #12 (Günlük'e):** SVG import aracı bir **kod üreticisidir**: çıktı `packages/templates` altına okunabilir `Template.tsx + manifest.ts` olarak yazılır ve elle rafine edilebilir; DB'de opak şablon saklanmaz. Üretilen şablonlar `src/generated/` altında yaşar ve otomatik barrel ile kayıt defterine katılır.

## 2. Motor bakımı — letterSpacing (#10 reçetesi)

`fs()` kıskacından bağımsız `ls()` yardımcıcı: girdi mm, çıktı birimsiz kullanıcı birimi; min-font kıskacı letterSpacing'e uygulanmaz. Tüm şablonlardaki yazar değerleri #10'a göre dönüştürülür. **Kanıt:** Faz 1–3'ten üç onaylı görüntü (grid menü, vitro-bandeau, trifold) önce/sonra piksel karşılaştırması — görünüm birebir. Testler güncellenir.

## 3. Broderie iki kademe (#8 devamı)

Her `technique:broderie` belgesinde silik bilgi notu: "Nakış üretimi iplik kalınlığına tabidir; ince detayları nakışçıyla teyit edin." <15 cm güçlü uyarı aynen kalır.

## 4. Toplu fiyat güncelleme + katalog geçmişi

Migration v5 parçası: `catalog_history(id, client_id, catalog_json, reason, created_at)`. Katalog ekranında "Toplu güncelle": kapsam (tümü/kategori) · işlem (+% / +sabit / değer ata) · yuvarlama (yok / 0,10 / 0,50 / **X,90**) · **önizleme tablosu (eski→yeni)** · uygula. Uygulamadan önce mevcut katalog otomatik geçmişe yazılır; geçmiş listesinden "geri yükle".

## 5. Belge snapshot geri yükleme

Geçmiş sekmesine "Bu versiyona dön": ExportRecord.snapshot_json'dan belge durumu geri yüklenir; dönmeden önce mevcut durum otomatik güvenlik kaydı olarak yazılır; onay diyaloğu şart.

## 6. Zip yedek

Üst menüde "Yedek al": `data/` (app.db + assets + exports) sunucuda ziplenir, tarayıcıdan `tezgah-yedek-YYYYMMDD-HHmm.zip` iner. Büyük dosyada akış (stream) kullanılır.

## 7. Tema kütüphanesi ekranı

Migration v5: `themes(id, name, tokens_json, created_at)`. Ayarlar/Temalar sayfası: rol renkleri + font seçimleri (repo fontlarından) düzenleyici, örnek şablon üzerinde canlı önizleme, kopyala-türet. Yerleşik 3 tema + `brand` aynen kalır (silinemez); özel temalar tüm müşterilerce kullanılabilir.

## 8. Grid çok-sayfa akışı (flow)

`menu-grid-cells` param `flow: single|multipage`. multipage: 1. sayfa tam başlık; devam sayfaları ince bant (logo + başlık + sayfa no); öğeler sayfalara akar, taşma uyarısı yerine sayfa eklenir (M8 deterministik). Editörde sayfa sekmeleri; PDF sayfa sayısı = editör.

## 9. Foto önerisi + varlık etiketleri

Migration v5: `assets.tags TEXT DEFAULT ''` (virgüllü, normalize edilerek aranır). Varlık panellerinde satır içi etiket düzenleme. Öneri motoru (saf, testli): fotoğrafsız ürünlerde normalize ad ↔ etiket eşleşmesi (ortak havuz + müşteri); eksik-fotoğraf panelinde ve ürün satırında "Öneri" çipi → tek tık bağla. Otomatik bağlama YOK — hep tek tık onay.

## 10. Parse sözlüğü yönetimi

Migration v5: `parse_synonyms(word TEXT PK, product_type TEXT)`; parser = kod içi çekirdek sözlük ∪ DB kayıtları. Ayarlar sayfasında listele/ekle/sil; ekleme aynı oturumda parse'a yansır.

## 11. Küçük bakım

**Asset silme:** `DELETE /api/assets/:id` + arayüz — kullanım korumalı: katalog/marka kiti/sahne/override referansı varsa engelle ve nerede kullanıldığını söyle; serbestse DB kaydı + üç dosya silinir. **Paket presetleri:** kod içi tanımlı "Açılış Takımı" (menu a3 + flyer 21x21 + fidelite + vitrophanie[ölçü bekliyor]) → müşteri sayfasında tek tıkla proje + kalemler; preset tanımları `packages/shared`'da sabit, ileride arayüz Faz S.

## 12. ŞABLON FABRİKASI — SVG import + slot işaretleme (#12)

Akış: **(a) Yükle & temizle** — SVG içe alınır; script/harici referans ayıklanır; koordinatlar mm kabulüyle normalize edilir (viewBox ölçek diyaloğu: "bu tasarımın gerçek boyutu?"). **(b) İşaretle** — render edilen SVG üzerinde elemana tıkla → slot ata: kind (text/image/color/price/qr/badge) + bind (bilinen yollar açılır listesi: brand.*, catalog.*, item.* — serbest metin de olur) + kısıtlar (text için font_mm min/max, maxLines). **(c) Prototip hücre (repeater)** — bir grup "öğe prototipi" olarak işaretlenir; içindeki alt elemanlar item-slot olarak eşlenir (name/desc/photo/price); yan panelde akış paramları (cols, gap, yön). Motor prototipi selection.items başına çoğaltır. Karmaşık akışlar (leader dots vb.) kapsam dışı — üretilen kod elle rafine edilir, bu bir başlangıç üreticisidir. **(d) Üret** — `src/generated/<id>/` altına Template.tsx + manifest.ts yazılır; generated barrel güncellenir; şablon anında kayıt defterinde, editörde seçilebilir, analiz/testten geçer. Üretilen kod okunabilir ve yorumludur ("elle düzenlenebilir" ilkesi).

## 13. CMYK opsiyonu + mm incelemesi

**CMYK:** Ghostscript tespiti (`gswin64c`/`gs --version`); varsa export menüsünde "Print (CMYK)": RGB print PDF → `pdfwrite + ColorConversionStrategy=CMYK` → `_print-cmyk.pdf`; yoksa seçenek pasif + kurulum yönlendirmesi. **mm sapması:** +0,2–0,4 mm'nin kökeni ölçülür (şüphe: Puppeteer'ın sayfa boyutunu pt'ye yuvarlaması); ucuz düzeltme varsa uygulanır, yoksa kök neden + tolerans kararı Günlük'e rapor edilir.

## 14. KABUL SENARYOSU

1. letterSpacing: üç önce/sonra karşılaştırması birebir; testler yeşil.
2. Broderie bilgi notu her broderie belgesinde; <15 cm güçlü uyarı değişmedi.
3. Toplu zam: ARAS kataloğuna "%5 + ,90'a yuvarla" önizlemeli tek işlem; geçmişten geri yükleme birebir döndürür.
4. Snapshot: belge v1'e döner; dönüş öncesi güvenlik kaydı oluşur.
5. Zip: inen yedekte app.db mevcut ve assets dosya sayıları diskle eşit.
6. Tema: yeni özel tema oluştur → belgeye uygula → PDF'te doğru; kalıcı; yerleşikler silinemiyor.
7. Flow: 80 ürünlük test kataloğu → multipage grid N sayfa uyarısız; PDF sayfa sayısı = editör; devam sayfası ince bantlı.
8. Foto önerisi: "adana" etiketli ortak foto + "Assiette Adana" ürünü → çip → tek tık bağlandı; otomatik bağlama olmadığı testli.
9. Parse sözlüğü: arayüzden "cephe→tabela" eklenir, aynı oturumda parse tanır.
10. Asset silme: kullanılan foto engellenir (nerede kullanıldığı söylenir); kullanılmayan silinir, üç dosya temizlenir.
11. Preset: "Açılış Takımı" tek tıkla proje + 4 kalem (vitrophanie ölçü-bekliyor kırmızı).
12. Fabrika: repo test SVG'si → 6 sabit slot + 3 item-slotlu prototip hücre işaretlenir → üretilen şablon ARAS verisiyle dolar, PDF alınır; insan akışı ölçülür **≤10 dk** (CONSTITUTION kabulü).
13. CMYK: gs varsa `_print-cmyk.pdf` üretilir ve renk uzayı doğrulanır; mm incelemesi Günlük'te kök neden + kararla.
14. Testler ≥180 (migration replay v5 dahil), typecheck temiz, Faz 1–3 testleri kırılmadan.

## 15. Faz 5'e KAYIT (uygulama YOK — TODO.md'ye)

QR dijital menü statik HTML export'u · çoklu-yüzey sahne (tek fotoda N quad kolajı) · arka plan silme entegrasyonu · FR açıklama önerileri · AI destekli foto eşleme · preset yönetim arayüzü (Faz S).

## 16. Raporlama

Standart: kabul maddeleri kanıtlarıyla · örnek dosya yolları · riskler/TODO · `phase-4` push; merge kullanıcı kabulüyle.
