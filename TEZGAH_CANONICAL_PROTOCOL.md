# TEZGÂH — DİNAMİK TASARIM VE EŞGÜDÜMLÜ ÜRETİM SaaS KANONİK PROTOKOLÜ

**Belge türü:** Ürün anayasası + mimari karar kaydı + geliştirme protokolü  
**Durum:** Tek kanonik teknik ve ürün otoritesi  
**Sürüm:** 3.1.0  
**Tarih:** 19 Temmuz 2026  
**Kanonik dosya adı:** `TEZGAH_CANONICAL_PROTOCOL.md`  
**Yer:** Repo kök dizini  
**Önceki protokoller:** Aktif otorite değildir; arşivlenir, analiz edilir, geçerli kararları bu dosyaya taşınır.

---

# 0. KANONİK KARAR

TEZGÂH; baskı, grafik, kişiselleştirme, reklam üretimi, tabela, ambalaj, tekstil, menü ve mimari görselleştirme gibi uzmanlık gerektiren karmaşık işleri kolaylaştırmak için geliştirilen, Türkiye’den başlayarak evrensel pazara açılabilen, çok kiracılı ve modüler bir **Creative Production SaaS** platformudur.

Platform tek bir sektöre, tek bir kullanıcı tipine veya tek bir editör ekranına indirgenemez. Menü üreticisi, iş elbisesi firması, reklam ajansı, matbaa, ambalajcı, tabelacı, promosyoncu, çevrim içi kişiselleştirilmiş kıyafet satıcısı veya yalnızca cam giydirme yapan işletme aynı çekirdeği kullanabilir; ancak yalnızca kendi iş koluna ait çalışma alanlarını ve araçları görür.

TEZGÂH’ın başarısı, kullanıcıya sınırsız tasarım kontrolü vermesiyle değil; farklı sektörlerin uzman bilgisini yazılıma dönüştürmesi, zor üretim süreçlerini sadeleştirmesi ve profesyonel sonucu mümkün olan en az kullanıcı kararıyla üretmesiyle ölçülür.

---

# 1. BU BELGENİN OTORİTESİ

## 1.1 Tek protokol ilkesi

- Repo kökünde yalnızca `TEZGAH_CANONICAL_PROTOCOL.md` ürün ve mimari anayasasıdır.
- `FINAL`, `MASTER`, `LATEST`, `VISION`, `NEW_PROTOCOL`, `CONSTITUTION` veya benzeri paralel anayasa dosyaları açılamaz.
- Yeni kararlar yeni protokol dosyası açılarak değil, bu dosyanın sürümü yükseltilerek işlenir.
- Modül notları, ADR’ler ve uygulama raporları bu belgeyle çelişemez.
- Çelişki halinde sıralama:
  1. Kullanıcının güncel ve açık talimatı,
  2. Bu kanonik protokol,
  3. Kabul edilmiş ADR,
  4. Aktif modül spesifikasyonu,
  5. Görev talimatı.

## 1.2 Eski protokollerin ele alınması

Eski protokoller silinmeden önce analiz edilir.

Zorunlu süreç:

1. Repodaki tüm `.md` dosyaları listelenir.
2. Ürün vizyonu, mimari, güvenlik, veri, baskı, test ve iş akışı kararları çıkarılır.
3. Her karar şu sınıflardan biriyle işaretlenir:
   - `KORUNDU`
   - `REVİZE EDİLDİ`
   - `BİRLEŞTİRİLDİ`
   - `ÇELİŞKİLİ`
   - `GEÇERSİZ`
   - `BELİRSİZ`
4. Unutulmuş veya bu belgede bulunmayan önemli kararlar kullanıcıya raporlanır.
5. Kullanıcı kararı sonrası geçerli hükümler bu dosyaya işlenir.
6. Eski belgeler `docs/archive/protocols/YYYY-MM/` altına taşınır.
7. Arşiv dosyaları aktif geliştirme otoritesi olarak kullanılamaz.

Eski protokoller erişilemiyorsa ajan bunu gizleyemez; açıkça:

> “Mevcut repo içinde şu eski protokoller bulunamadı veya içerikleri doğrulanamadı.”

diye rapor verir.

---

# 2. ÜRÜNÜN GERÇEK AMACI

## 2.1 TEZGÂH bir grafik editöründen fazlasıdır

TEZGÂH’ın amacı yalnızca kullanıcının nesneleri sürükleyip bırakması değildir.

Ana amaçlar:

- pazarlamacının sipariş almasını kolaylaştırmak,
- müşteriye sorulacak soru sayısını azaltmak,
- müşteri verilerini standartlaştırmak,
- grafik tasarım kararlarını kurallara dönüştürmek,
- tasarım bilgisini yazılıma gömmek,
- aynı projeden çok sayıda materyal üretmek,
- tasarımlar arasında marka ve içerik tutarlılığı sağlamak,
- grafikeri olmayan firmaların profesyonel çıktı almasını sağlamak,
- grafiker varsa onun işini hızlandırmak ve son onay rolüne taşımak.

## 2.2 Hedef kullanıcılar

Birincil kullanıcılar:

- saha pazarlamacısı,
- müşteri temsilcisi,
- reklam firması sahibi,
- matbaa çalışanı,
- promosyon firması,
- restoran çözüm sağlayıcısı,
- grafiker olmayan küçük işletme,
- grafik tasarımcı,
- baskı operatörü,
- üretim sorumlusu,
- menü üreticisi ve menü kaplama firması,
- iş elbisesi ve tekstil baskı firması,
- ambalaj üreticisi,
- tabelacı,
- cam ve folyo uygulama firması,
- kişiselleştirilmiş ürün satıcısı,
- çevrim içi baskılı kıyafet mağazası.

## 2.3 Kullanıcıya az karar verdirme ilkesi

Her yeni özellik şu soruyla değerlendirilir:

> Bu özellik pazarlamacının müşteriye soracağı soruları azaltıyor mu, tasarım kararını otomatikleştiriyor mu veya üretim hatasını azaltıyor mu?

Cevap hayırsa özellik yeniden değerlendirilir.

---

# 3. PROJE MERKEZLİ MİMARİ

TEZGÂH’ın merkezinde belge değil, **müşteri projesi** bulunur.

```text
Tenant
└── Customer
    └── Project
        ├── Order Intake
        ├── Brand Kit
        ├── Product Catalog
        ├── Asset Library
        ├── Measurements
        ├── Requested Deliverables
        ├── Design System
        ├── Creative Documents
        ├── Approvals
        ├── Exports
        └── Production Jobs
```

## 3.1 Proje açılışı

Pazarlamacı müşteriden yalnızca gerekli ticari bilgileri toplar:

- işletme türü,
- işletme adı,
- logo,
- iletişim bilgileri,
- adres,
- sosyal medya,
- QR gereksinimi,
- seçilen materyaller,
- materyal ölçüleri,
- ürün kataloğu,
- ürün fiyatları,
- ürün görselleri,
- kampanyalar,
- teslim tarihi,
- baskı veya montaj bilgileri.

Sistem gereksiz tasarım soruları sormaz.

## 3.2 Seçilebilir teslimatlar

Müşteri proje başında veya daha sonra şunları seçebilir:

- A4 flyer,
- A3 flyer,
- tek yüz menü,
- çift yüz menü,
- çok sayfalı menü,
- masa menüsü,
- duvar menüsü,
- QR menü,
- tabela,
- cam uygulaması,
- iç mekân grafik,
- araç giydirme,
- tişört,
- polo,
- önlük,
- şapka,
- sticker,
- ambalaj,
- kartvizit,
- roll-up,
- sosyal medya,
- dijital ekran,
- diğer baskı ürünleri.

## 3.3 Paralel üretim

Flyer ilk tasarım referansı olabilir; ancak sistem diğer seçili materyalleri bekletmek zorunda değildir.

Doğru akış:

```text
Project Data
├── Flyer Composition
├── Menu Composition
├── QR Menu Mapping
├── Signage Composition
├── Glass Composition
├── Textile Composition
└── Social Composition
```

Tüm materyaller aynı BrandKit, ürün kataloğu ve varlık kütüphanesini kullanır.

---

# 4. FLYER’IN ROLÜ

## 4.1 Flyer kırmızı çizgidir

Flyer, TEZGÂH’ın tasarım zekâsını test eden en zor ve en öncelikli üretim profilidir.

Çünkü flyer aynı anda şunları sınar:

- yoğun ürün verisi,
- kategori hiyerarşisi,
- değişken metin uzunluğu,
- fiyat düzeni,
- çok sayıda görsel,
- sınırlı alan,
- tipografi,
- simetri,
- baskı hazırlığı,
- marka aktarımı,
- QR,
- kampanya,
- farklı yoğunluk seviyeleri.

## 4.2 Flyer tek ürün değildir

Flyer:

- projenin ilk görsel dili,
- marka kompozisyon referansı,
- ürün kartı dili,
- renk dağılımı,
- tipografik hiyerarşi,
- görsel işleme standardı,
- diğer materyallerin başlangıç tasarım sistemi

olarak kullanılır.

Ancak menü, tabela veya cam tasarımı flyer’ın piksel kopyası değildir. Her ürün kendi fiziksel ve iletişim kurallarına göre yeniden kompoze edilir.

---

# 5. DİNAMİK TASARIM MOTORU

## 5.1 Temel ilke

TEZGÂH’ın merkezinde yalnızca Konva veya canvas bulunmaz.

Merkez bileşen:

> **Dynamic Layout and Composition Engine**

Bu motor, içerik miktarı değiştiğinde tasarımın sırıtmadan yeniden dengelenmesini sağlar.

## 5.2 Girdi değişkenleri

Motor en az şunları değerlendirir:

- sayfa ölçüsü,
- bleed,
- güvenli alan,
- ürün sayısı,
- kategori sayısı,
- kategori başına ürün sayısı,
- ürün adı uzunluğu,
- açıklama uzunluğu,
- fiyat karakter uzunluğu,
- para birimi,
- ürün görseli sayısı,
- görsel oranları,
- logo oranı,
- QR alanı,
- iletişim alanı,
- kampanya alanı,
- seçilen stil,
- baskı tekniği,
- hedef okunma mesafesi,
- minimum font,
- minimum görsel alanı.

## 5.3 Dinamik tipografi

Font boyutu sabit değildir.

Örnek davranış:

- 20 ürün: daha büyük tipografi ve geniş görseller,
- 50 ürün: dengeli ürün kartları,
- 100 ürün: daha yoğun ama okunabilir düzen,
- 200 ürün: minimum baskı okunabilirliği sınırına yaklaşan yoğun düzen,
- sınır aşılırsa A3 veya çok sayfa önerisi.

Sistem yalnızca ürün sayısına göre doğrusal küçültme yapmaz.

Hesaplamaya dahil edilir:

- metin uzunluğu,
- kategori dağılımı,
- satır sayısı,
- ürün önem derecesi,
- fiyat uzunluğu,
- görsel kullanımı,
- boşluk dengesi.

## 5.4 Tipografi kısıtları

Her üretim profilinde:

- önerilen font aralığı,
- mutlak minimum font,
- kategori başlığı minimumu,
- fiyat minimumu,
- açıklama minimumu,
- satır aralığı,
- harf aralığı,
- kontrast oranı

tanımlanır.

Örneğin 200 ürün nedeniyle 6 punto gerekiyorsa sistem bunu gösterebilir; fakat daha küçük değere otomatik inemez. Alternatif sunar:

- A3,
- ikinci sayfa,
- kategori azaltma,
- görsel azaltma,
- yoğun kart profili,
- açıklama gizleme.

## 5.5 Dinamik grid

Grid sabit şablon değildir.

Motor:

- kolon sayısı,
- satır sayısı,
- kategori blokları,
- kart boyutu,
- görsel oranı,
- boşluklar,
- başlık alanları,
- footer,
- QR,
- iletişim alanı

için uygun çözümü hesaplar.

## 5.6 Grid dışı kompozisyon

Serbest tasarım desteklenir; ancak serbestlik simetri ve baskı kurallarını bozamaz.

Sistem:

- manyetik hizalama,
- optik merkez,
- eşit aralık,
- kenar dengesi,
- yoğunluk dengesi,
- görsel ağırlık,
- çakışma kontrolü,
- taşma kontrolü

uygular.

## 5.7 Simetri sürekli kuraldır

Simetri TEZGÂH’ın kalıcı tasarım ilkelerinden biridir.

Simetri yalnızca geometrik eşitlik değildir:

- eşit kenar boşluğu,
- ritmik aralık,
- hizalı fiyatlar,
- dengeli kategori blokları,
- tutarlı görsel oranları,
- optik denge,
- eşit kart yükseklikleri,
- satır sonu dengeleme,
- boş kalan son satırın bilinçli yerleşimi

olarak değerlendirilir.

## 5.8 İçerik değişiminde yeniden akış

Ürün eklendiğinde veya çıkarıldığında:

- kartlar yeniden akar,
- fontlar gerekirse yeniden ölçeklenir,
- kategori blokları yeniden dengelenir,
- boşluklar yeniden hesaplanır,
- son satır yeniden hizalanır,
- görseller yeniden boyutlanır,
- taşma kontrol edilir,
- tasarımın karakteri korunur.

Azalan veya çoğalan ürünler tasarımda “eksik bırakılmış” veya “sıkıştırılmış” görünmemelidir.

---

# 6. TASARIM ZEKÂSI KATMANLARI

## 6.1 Deterministik motor önce gelir

Ana yerleşim motoru kural tabanlı ve deterministik olmalıdır.

Neden:

- aynı girdide öngörülebilir sonuç,
- test edilebilirlik,
- baskı güvenliği,
- tekrar üretilebilirlik,
- düşük maliyet,
- AI servisinden bağımsızlık.

## 6.2 Yapay zekâ yardımcıdır

AI şu alanlarda kullanılabilir:

- şablon önerisi,
- ürün önceliklendirme,
- görsel sınıflandırma,
- metin kısaltma,
- başlık önerisi,
- arka plan üretme,
- tasarım varyasyonu,
- renk önerisi,
- içerik etiketleme.

AI hiçbir zaman:

- baskı ölçüsünü,
- bleed’i,
- güvenli alanı,
- minimum fontu,
- müşteri izolasyonunu,
- lisans kuralını,
- kanonik veriyi

tek başına belirleyemez.

## 6.3 Tasarım puanlama

Her tasarım için ölçülebilir kalite puanı üretilebilir:

- okunabilirlik,
- simetri,
- taşma,
- yoğunluk,
- kontrast,
- görsel kalite,
- marka tutarlılığı,
- baskı uygunluğu,
- kategori dengesi,
- boşluk dengesi.

---

# 7. BENZERSİZ TASARIM ÜRETİMİ

## 7.1 Şablon kopyası yasaktır

Aynı şablon altyapısı kullanılabilir; ancak her müşteri tasarımı birebir kopya olmamalıdır.

Varyasyon alanları:

- grid düzeni,
- kategori sırası,
- görsel oranı,
- dekoratif şekiller,
- renk dağılımı,
- arka plan,
- başlık kompozisyonu,
- ürün kartı varyasyonu,
- vurgu ürünleri,
- ikon kullanımı,
- boşluk ritmi.

## 7.2 Kontrollü benzersizlik

Benzersizlik rastgelelik değildir.

Her varyasyon:

- marka kimliğine uygun,
- baskı güvenli,
- okunabilir,
- simetrik,
- tekrar üretilebilir,
- kullanıcı tarafından kilitlenebilir

olmalıdır.

## 7.3 Tasarım tohumu

Her proje veya belge için bir `designSeed` tutulabilir.

Bu sayede:

- tasarım yeniden üretilebilir,
- varyasyonlar kontrollü olur,
- aynı tasarım istemeden değişmez,
- müşteri için benzersiz kombinasyon korunur.

---

# 8. GÖRSEL ALANLARI VE GÖRSEL İŞLEME

## 8.1 Image Slot sistemi

Şablonlarda sabit resim değil, tanımlı `ImageSlot` bulunur.

Her slot:

- oran,
- maske,
- focus point,
- fit/fill davranışı,
- minimum DPI,
- arka plan politikası,
- gölge,
- border,
- radius,
- crop,
- güvenli alan

tanımlar.

## 8.2 Kullanıcı görseli yerleşimi

Kullanıcı hangi uygun görseli verirse:

- slot içine yerleşir,
- oranına göre kırpılır,
- ana nesne korunur,
- gerekirse arka plan kaldırılır,
- ortak stile uyarlanır,
- düşük çözünürlük uyarılır.

## 8.3 Arka plan silme

Arka plan silme desteklenir.

Katmanlar:

1. yerel veya açık kaynak model,
2. ücretli servis yalnızca onayla,
3. manuel düzeltme,
4. kenar yumuşatma,
5. şeffaf PNG/WebP üretimi,
6. orijinal dosyanın korunması.

## 8.4 Görsel standardizasyon

Aynı projedeki ürün görselleri:

- benzer ışık,
- benzer doygunluk,
- ortak arka plan,
- ortak gölge,
- ortak perspektif hissi,
- ortak kırpma standardı

ile düzenlenebilir.

---

# 9. VARLIK GİZLİLİĞİ VE LİSANS

## 9.1 Müşteri görselleri

Müşterinin yüklediği görseller varsayılan olarak:

- yalnızca kendi tenant’ında,
- kendi müşteri kaydında,
- kendi projesinde,
- yetkili kullanıcılarca

görülebilir.

Başka müşteriye:

- önerilemez,
- aramada gösterilemez,
- örnek tasarımda kullanılamaz,
- AI eğitim verisi olarak aktarılamaz,
- ortak kütüphaneye taşınamaz.

## 9.2 Proje sonrası kısıtlama

Proje tamamlandığında müşteri görseli:

- proje içinde kalır,
- arşiv politikasına göre saklanır,
- başka projede kullanılmaz,
- yalnızca açık yetkiyle aynı müşterinin yeni projesine taşınır.

## 9.3 Ortak stok kütüphanesi

Ayrı bir `Shared Stock Library` bulunur.

Bu varlıklar:

- lisans durumu doğrulanmış,
- telifsiz,
- satın alınmış,
- yeniden kullanım hakkı olan,
- kaynak ve lisans metadata’sı tutulan

görsellerdir.

Kullanım inisiyatifi tenant yöneticisindedir.

## 9.4 Stok görseli müşteriye özgü hissettirme

Stok görsel:

- crop,
- renk eşleme,
- arka plan temizleme,
- kompozisyon,
- gölge,
- mask,
- ışık düzenleme,
- marka rengi,
- yerleşim

ile projeye özgü hale getirilebilir.

Bu işlem lisans haklarını değiştirmez. Sistem görselin kaynak ve lisans kaydını korur.

---

# 10. ÜRÜN KATALOĞU VE QR RESTORAN ENTEGRASYONU

## 10.1 Mevcut olgun restoran sistemi korunur

SWISS_RESTORAN içindeki mevcut ürün, kategori, seçenek ve içerik yetenekleri yeniden yazılmaz.

Örnek:

- zeytin ekleme/çıkarma,
- peynir seçeneği,
- ürün varyasyonu,
- ek malzeme,
- kategori,
- fiyat,
- açıklama,
- görünürlük,
- alerjen,
- QR menü davranışı.

TEZGÂH’ın görevi bunları daha kolay kullanmak ve görsel çıktılara bağlamaktır.

## 10.2 Kanonik sahiplik

- QR/POS sipariş ürünlerinin kanonik sahibi: `SWISS_RESTORAN`
- Tasarım belge ve render’larının kanonik sahibi: `TEZGÂH`
- Tenant, abonelik ve e-ticaret sahipliği: ilgili ürün sözleşmelerine göre `STYVA`
- Repolar bağımsızdır.
- Kod, veritabanı veya migration paylaşılmaz.
- İletişim yalnızca sürümlü sözleşmelerle yapılır.

## 10.3 Entegrasyon aşamaları

### Aşama 1 — CSV/XLSX

- dışa aktar,
- içe aktar,
- kolon eşleme,
- önizleme,
- hata raporu,
- dry-run,
- idempotent import,
- SKU veya harici ID eşleme.

### Aşama 2 — JSON sözleşmesi

Sürümlü katalog sözleşmesi:

```ts
interface RestaurantCatalogContractV1 {
  contractVersion: "1.0";
  tenantExternalId: string;
  restaurantExternalId: string;
  categories: RestaurantCategory[];
  products: RestaurantProduct[];
  modifiers: ModifierGroup[];
  assets: AssetReference[];
  exportedAt: string;
}
```

### Aşama 3 — API

- pull catalog,
- push approved changes,
- sync status,
- conflict report,
- audit log.

### Aşama 4 — Event tabanlı senkron

Örnek olaylar:

- `restaurant.product.created.v1`
- `restaurant.product.updated.v1`
- `restaurant.product.price_changed.v1`
- `restaurant.product.visibility_changed.v1`
- `restaurant.category.updated.v1`
- `restaurant.asset.updated.v1`

## 10.4 Tasarıma yansıma

Ürün değiştiğinde TEZGÂH:

- etkilenen belgeleri bulur,
- farkı gösterir,
- otomatik yeniden akış önizlemesi üretir,
- kullanıcı veya grafiker onayı ister,
- yeni belge sürümü oluşturur.

Basılı dosya sessizce değiştirilmez.

---

# 11. SİPARİŞ ALMA SİHİRBAZI

## 11.1 Pazarlamacı modu

Pazarlamacı grafik ayarları görmez.

Ana ekranlar:

1. müşteri,
2. proje,
3. istenen ürünler,
4. ölçüler,
5. logo ve marka,
6. ürün kataloğu,
7. görseller,
8. iletişim ve QR,
9. teslim tarihi,
10. otomatik tasarım üretimi.

## 11.2 Dinamik sorular

Sorular seçilen ürüne göre açılır.

Örnek:

- tabela seçilmediyse tabela ölçüsü sorulmaz,
- araç seçilmediyse araç modeli sorulmaz,
- QR seçilmediyse QR URL sorulmaz,
- tekstil seçilmediyse beden/konum sorulmaz,
- cam seçilmediyse cam ölçüsü sorulmaz.

## 11.3 Soru azaltma motoru

Sistem mevcut veriden çıkarım yapar:

- BrandKit varsa renk tekrar sorulmaz,
- logo varsa yeniden istenmez,
- restoran kataloğu bağlıysa ürünler tekrar girilmez,
- adres proje veya müşteri kaydından gelir,
- QR restoran entegrasyonu varsa QR otomatik bağlanır,
- aynı müşteri geçmiş ölçüleri tekrar kullanabilir.

## 11.4 Grafiker rolü

Grafiker:

- otomatik tasarımı inceler,
- gerekirse kilitli kuralları aşmadan düzenler,
- alternatif varyasyon üretir,
- müşteri sunumunu onaylar,
- baskı dosyasını serbest bırakır.

Grafikeri olmayan firmada sistem, otomatik tasarım ve preflight ile bu rolün büyük kısmını üstlenir.

---

# 12. MARKA VE TASARIM SİSTEMİ

## 12.1 BrandKit

Proje veya müşteri seviyesinde:

- logo varyantları,
- renkler,
- fontlar,
- slogan,
- iletişim bilgileri,
- sosyal hesaplar,
- ikonlar,
- desenler,
- görsel stil,
- kullanım kuralları

saklanır.

## 12.2 Design Tokens

Ortak tokenlar:

- `brand.primary`
- `brand.secondary`
- `brand.accent`
- `text.heading`
- `text.body`
- `price.primary`
- `spacing.xs...xl`
- `radius`
- `stroke`
- `shadow`
- `imageTreatment`
- `categoryStyle`

## 12.3 Materyal adaptasyonu

Aynı tokenlar farklı üretim profillerinde farklı uygulanabilir.

Örnek:

- flyer: yüksek bilgi yoğunluğu,
- tabela: uzaktan okunabilirlik,
- cam: görüş mesafesi ve kesim,
- tekstil: baskı alanı ve renk sayısı,
- araç: panel ve eğrilik,
- sosyal medya: ekran oranı,
- menü: sayfa akışı.

---

# 13. KANONİK VERİ MODELİ

Canvas görüntüsü veya Konva state’i kanonik veri değildir.

```ts
interface Project {
  id: string;
  tenantId: string;
  customerId: string;
  title: string;
  businessType: string;
  brandKitId?: string;
  catalogId?: string;
  requestedDeliverables: DeliverableRequest[];
  measurements: MeasurementSet[];
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}
```

```ts
interface CreativeDocument {
  schemaVersion: string;
  id: string;
  tenantId: string;
  projectId: string;
  deliverableType: string;
  productionProfileId: string;
  designSeed: string;
  brandKitId?: string;
  catalogSnapshotId?: string;
  pages: CreativePage[];
  bindings: DataBinding[];
  layoutRules: LayoutRuleSet;
  overrides: DocumentOverride[];
  revision: number;
}
```

```ts
interface ProductRecord {
  id: string;
  externalId?: string;
  sku?: string;
  name: string;
  description?: string;
  price?: number;
  oldPrice?: number;
  currency?: string;
  categoryId?: string;
  imageAssetId?: string;
  allergens?: string[];
  modifierGroups?: string[];
  badge?: string;
  priority?: number;
  isVisible: boolean;
}
```

## 13.1 Snapshot ilkesi

Tasarım:

- canlı kataloğa bağlanabilir,
- ancak onaylanan her sürüm katalog snapshot’ı taşır,
- geçmiş baskı dosyası yeniden üretilebilir,
- sonradan değişen fiyat eski onayı değiştirmez.

---

# 14. EDİTÖR MİMARİSİ

## 14.1 Tek editör çekirdeği

```text
Editor Core
├── Document Model
├── Command System
├── Selection Model
├── Constraint Engine
├── Dynamic Layout Engine
├── Typography Engine
├── Data Binding Engine
├── Renderer Adapter
├── Export Adapter
├── Input Adapter
├── History Engine
└── Collaboration Adapter
```

## 14.2 Üretim profilleri

- Flyer Profile
- Menu Profile
- Signage Profile
- Glass Profile
- Textile Profile
- Vehicle Profile
- Social Profile
- Packaging Profile

Ayrı ürünler için ayrı editör yazılmaz.

## 14.3 Serbest düzenleme ile otomasyon dengesi

Kullanıcı:

- otomatik düzeni kullanabilir,
- belirli alanları kilitleyebilir,
- kontrollü override yapabilir,
- otomatik yeniden akıştan alan hariç tutabilir,
- tasarımı tamamen bozacak müdahalelerde uyarılır.

---

# 15. RENDER MOTORU BAĞIMSIZLIĞI

## 15.1 Konva geçici uygulamadır

Konva mevcut ihtiyaçları karşıladığı sürece kullanılır.

Konva:

- ürün anayasası değildir,
- belge formatı değildir,
- iş kuralı değildir,
- vazgeçilmez bağımlılık değildir.

## 15.2 Adapter zorunluluğu

Konva’ya doğrudan bağımlılık yalnızca renderer adapter içinde tutulur.

```text
Domain Model
↓
Layout Result
↓
Renderer Interface
├── KonvaRenderer
├── FutureCanvasRenderer
├── SVGRenderer
└── ServerRenderer
```

## 15.3 Açık kaynak teknik radar

Düzenli değerlendirilecek alanlar:

- canvas editör motorları,
- SVG düzenleyiciler,
- layout motorları,
- font shaping,
- PDF,
- renk yönetimi,
- image processing,
- WebGL/WebGPU,
- CRDT,
- background removal,
- vectorization,
- 3D mockup.

## 15.4 Motor değiştirme kapısı

Geçiş için zorunlu:

- capability matrisi,
- lisans incelemesi,
- benchmark,
- proof of concept,
- belge uyumluluğu,
- görsel karşılaştırma,
- performans testi,
- migration,
- rollback,
- security review.

Yeni teknoloji daha yeni olduğu için otomatik seçilmez.

---

# 16. AÇIK KAYNAK TEKNOLOJİ POLİTİKASI

Muhtemel katmanlar:

| Alan | Birincil aday |
|---|---|
| Canvas | Konva / React Konva |
| State | Zustand |
| Server State | TanStack Query |
| Validation | Zod |
| Fonts | opentype.js / fontkit / shaping çözümü |
| Images | Sharp |
| Background Removal | rembg veya eşdeğer açık kaynak model |
| PDF Preview | PDF.js |
| PDF Manipulation | pdf-lib |
| Collaboration | Yjs |
| QR | açık kaynak QR kütüphanesi |
| Barcode | JsBarcode veya eşdeğeri |
| Vectorization | Potrace |
| 3D | Three.js / React Three Fiber |
| Data | PostgreSQL + Prisma |
| Queue | Redis + BullMQ |
| Storage | S3 uyumlu object storage |

Bu tablo bağlayıcı teknoloji seçimi değil, adapter arkasında değerlendirilecek başlangıç setidir.

---

# 17. BASKI VE ÜRETİM

## 17.1 A4 flyer varsayılan profili

- kesim: 210 × 297 mm,
- bleed: her kenarda 3 mm,
- çalışma alanı: 216 × 303 mm,
- güvenli alan: kesimden en az 4 mm içeride,
- hedef: 300 DPI,
- baskı amacı: CMYK,
- proof ve production export ayrı.

## 17.2 Renk yönetimi

Tarayıcı önizlemesi baskı garantisi değildir.

Sunucu tarafında:

- ICC,
- rendering intent,
- RGB → CMYK,
- output intent,
- PDF/X,
- transparency flattening politikası,
- font embed/outline,
- overprint kontrolü

uygulanır.

## 17.3 Preflight

Kontroller:

- düşük efektif DPI,
- eksik font,
- bleed,
- safe area,
- metin taşması,
- çok küçük font,
- ince çizgi,
- bozuk SVG,
- şeffaflık,
- RGB/CMYK,
- QR okunabilirliği,
- barkod,
- kırpılmış fiyat,
- eksik görsel,
- görünmeyen ürün,
- çakışan kart,
- kesilmiş logo,
- yanlış para birimi,
- lisansı belirsiz varlık.

Seviyeler:

- INFO
- WARNING
- BLOCKER

BLOCKER çözülmeden üretim dosyası serbest bırakılamaz.

---

# 18. PERFORMANS

Zorunlu veri setleri:

- 20 ürün,
- 50 ürün,
- 100 ürün,
- 200 ürün.

Hedefler:

- 20 ürünlü belge açılışı p95 < 2 saniye,
- 50 ürünlü belge p95 < 3 saniye,
- 200 ürün paneli sanal liste ile akıcı,
- sürükleme/ölçekleme tepki süresi < 100 ms,
- autosave başarı oranı ≥ %99,9,
- preview render p95 < 15 saniye,
- ağır işlemler worker veya queue’da,
- orijinal görseller export sırasında,
- editörde proxy/thumbnail kullanımı,
- sayfa dışı render azaltımı,
- bellek sızıntısı testi.

---

# 19. GÜVENLİK VE TENANT İZOLASYONU

- Her kayıt tenant kapsamındadır.
- Tüm sorgular tenant filtresiyle yürür.
- UI gizleme yetkilendirme değildir.
- S3 yolları tenant/proje bazlıdır.
- Signed URL kısa ömürlüdür.
- Cross-tenant IDOR testleri zorunludur.
- SVG sanitize edilir.
- MIME ve file signature kontrol edilir.
- Render worker izole çalışır.
- AI’ye veri gönderimi loglanır.
- Müşteri görselleri ortak veri setine girmez.
- Audit log tutulur.
- Onaylanan tasarım immutable revision olur.
- Değişiklik yeni revision açar.

---

# 20. ONAY VE REVİZYON AKIŞI

Durumlar:

```text
DRAFT
AUTO_GENERATED
DESIGN_REVIEW
CLIENT_REVIEW
CHANGES_REQUESTED
APPROVED
PRODUCTION_READY
ARCHIVED
```

## 20.1 İki seçenekli şirket modeli

Sistem gerektiğinde müşteriye:

- Seçenek A
- Seçenek B

sunabilir.

Bu seçenekler aynı proje verisinden, farklı kontrollü kompozisyonlarla üretilir.

## 20.2 Onay

Müşteri onayı:

- belge revision’ına bağlıdır,
- proof dosyasına bağlıdır,
- tarih ve kullanıcı kaydı taşır,
- sonradan sessizce değiştirilemez.

---

# 21. GELİŞTİRME FAZLARI

## Faz 0 — Kanonikleştirme ve eski protokol analizi

- tüm MD envanteri,
- eski karar matrisi,
- çelişki raporu,
- bu dosyanın tek otorite yapılması,
- eski protokollerin arşivlenmesi,
- mevcut yetenek audit’i.

## Faz 1 — Proje ve sipariş alma omurgası

- Customer,
- Project,
- Deliverable selection,
- Measurements,
- Order Intake,
- BrandKit,
- Asset Library,
- role-based wizard.

## Faz 2 — Flyer dinamik tasarım çekirdeği

- A4,
- bleed,
- safe area,
- text,
- image,
- ProductCard,
- categories,
- dynamic grid,
- typography rules,
- symmetry,
- auto reflow,
- undo/redo,
- autosave.

## Faz 3 — Katalog ve restoran entegrasyonu

- CSV/XLSX,
- contract JSON,
- SWISS_RESTORAN mapping,
- modifiers,
- assets,
- catalog snapshot,
- change impact preview.

## Faz 4 — 20–200 ürün zekâsı

- adaptive typography,
- category balancing,
- image density,
- last-row composition,
- overflow strategy,
- A3/page recommendation,
- performance.

## Faz 5 — Görsel işleme

- ImageSlot,
- crop,
- focus point,
- background removal,
- standardization,
- asset privacy,
- stock library.

## Faz 6 — Baskı

- server render,
- CMYK,
- ICC,
- preflight,
- PDF/X,
- proof,
- production export,
- golden render.

## Faz 7 — Eşgüdümlü materyal seti

- menu,
- QR menu,
- signage,
- glass,
- textile,
- social,
- vehicle,
- packaging.

Bu faz flyer tamamlandıktan sonra başlamaz; altyapısı paralel hazırlanabilir. Ancak her materyal flyer çekirdeğinin ortak veri, marka ve layout motorunu kullanmak zorundadır.

## Faz 8 — AI ve kontrollü benzersizlik

- template ranking,
- design variations,
- text assistance,
- image classification,
- background generation,
- quality scoring.

---

# 22. KALİTE KAPILARI

## GT-0 — Protokol ve audit

- tüm eski protokoller analiz edildi,
- çelişkiler raporlandı,
- unutulan kararlar kullanıcıya sunuldu,
- tek kanonik MD aktif,
- ikinci anayasa yok.

## GT-1 — Sipariş alımı

- pazarlamacı tasarım bilgisi olmadan proje açabiliyor,
- yalnızca seçilen ürünlere uygun sorular geliyor,
- tekrar eden bilgi yeniden sorulmuyor,
- teslimatlar seçilebiliyor.

## GT-2 — Dinamik flyer

- 20, 50, 100, 200 ürün testleri,
- ürün ekleme/çıkarma sonrası sırıtmayan reflow,
- simetri,
- adaptive typography,
- minimum font koruması,
- grid ve serbest düzen.

## GT-3 — Görsel motor

- farklı oranlı görseller,
- image slots,
- background removal,
- ortak stil,
- düşük DPI uyarısı,
- müşteri görsel izolasyonu.

## GT-4 — Restoran entegrasyonu

- CSV/XLSX import/export,
- dry-run,
- idempotency,
- zeytin/peynir gibi modifier yapılarını koruma,
- katalog snapshot,
- QR menü eşlemesi,
- conflict report.

## GT-5 — Eşgüdümlü proje

- flyer verisi menüye,
- QR’ye,
- tabela/cam/tekstile

uygun profil üzerinden taşınabiliyor,
- marka tutarlılığı korunuyor,
- piksel kopyalama yapılmıyor.

## GT-6 — Baskı

- CMYK,
- bleed,
- safe area,
- font,
- preflight,
- PDF/X,
- golden render,
- production approval.

## GT-7 — Güvenlik

- cross-tenant testler,
- asset privacy,
- signed URLs,
- SVG security,
- audit log,
- immutable approvals.

READY kararı için ilgili tüm GT kapıları geçmelidir.

---

# 23. GELİŞTİRME ÇALIŞMA FORMATLARI

Her görev başında:

```text
MODÜL:
PROJE AKIŞINA ETKİ:
PAZARLAMACIYA ETKİ:
DİNAMİK TASARIMA ETKİ:
MEVCUT DURUM:
HEDEF:
DELTA:
KAPSAM DIŞI:
VERİ RİSKİ:
GÜVENLİK:
PERFORMANS:
DOSYALAR:
TEST:
ROLLBACK:
ÜCRETLİ BAĞIMLILIK:
```

Her görev sonunda:

```text
1. Yapılan değişiklik
2. Sipariş alma sürecine katkısı
3. Dinamik tasarıma katkısı
4. Eşgüdümlü materyallere katkısı
5. Değişen dosyalar
6. Migration/veri
7. Test sonuçları
8. GT sonucu
9. Güvenlik
10. Performans
11. Bilinen risk
12. Commit
13. PR
14. Rollback
15. Merge kararı: READY veya BLOCKED
```

---

# 24. ÜCRETLİ BAĞIMLILIK

Kullanıcı onayı gerekir:

- ücretli SDK,
- ücretli API,
- kapalı kaynak editör,
- GPU aboneliği,
- lisans maliyeti,
- kullanıcı başı fiyat,
- vendor lock-in,
- müşteriye ek maliyet.

Açık kaynak ve geri döndürülebilir çözümler önceliklidir.

---

# 25. AJAN UYGULAMA DİREKTİFİ

```text
TEZGÂH KANONİK UYGULAMA DİREKTİFİ

Sen TEZGÂH reposunda çalışan kıdemli SaaS ürün ve sistem mühendisisin.

Ana amaç:
Müşteriden minimum soruyla sipariş alan, ürün ve marka verisini tek projede toplayan, farklı içerik yoğunluklarında profesyonel ve simetrik tasarımları dinamik olarak üreten, seçilen tüm reklam materyallerini eşgüdümlü hazırlayan Creative Production SaaS geliştirmek.

Değişmez kurallar:
- Proje merkezlidir; belge merkezli değildir.
- Flyer kırmızı çizgi ve layout zekâsının ilk kalite referansıdır.
- Menü, QR, tabela, cam, tekstil ve diğer çıktılar aynı proje verisinden paralel üretilir.
- Kullanıcıya gereksiz tasarım kararı verdirme.
- Pazarlamacıya yalnızca gerekli soruları sor.
- Ürün ekleme/çıkarma tasarımı bozmasın.
- Tipografi içerik yoğunluğuna göre dinamik değişsin.
- Minimum okunabilirlik sınırı ihlal edilmesin.
- Simetri sürekli kuraldır.
- Tasarımlar kontrollü biçimde benzersiz olsun.
- Müşteri görsellerini başka müşteriye gösterme veya önerme.
- Stok varlıkların lisansını takip et.
- SWISS_RESTORAN’ın olgun ürün/modifier sistemini yeniden yazma.
- Repolar bağımsız kalsın.
- Entegrasyon sürümlü CSV/JSON/API/event sözleşmeleriyle yapılsın.
- Canvas veya Konva state’ini kanonik veri sayma.
- Konva’yı adapter arkasında tut.
- Daha iyi açık kaynak motoru benchmark ve ADR olmadan değiştirme.
- CMYK/PDF/X iddiasını browser export ile yapma.
- Mock, sahte buton veya yarım akış bırakma.
- Destructive migration yapma; additive migration ve rollback kullan.
- Eski protokolleri analiz etmeden arşivleme.
- Tüm GT kapıları geçmeden READY deme.
```

---

# 26. İLK UYGULAMA GÖREVİ

```text
TEZGÂH V3 KANONİKLEŞTİRME VE DİNAMİK TASARIM AUDIT

1. Repodaki tüm MD dosyalarını listele.
2. Önceki tüm protokol ve mimari kararlarını çıkar.
3. Kararları KORUNDU / REVİZE / ÇELİŞKİLİ / GEÇERSİZ / BELİRSİZ olarak sınıflandır.
4. Bu V3 protokolünde bulunmayan önemli kararları ayrı raporla.
5. Kullanıcı kararı gerektiren maddeleri net soru listesi yap.
6. Bu dosyayı repo kökünde tek kanonik protokol olarak hazırla.
7. Eski protokolleri arşivle; silme.
8. Mevcut proje/customer/order-intake yapısını audit et.
9. Mevcut flyer/menu/editor yetenek matrisi çıkar.
10. Dinamik layout, typography, symmetry ve reflow yeteneklerini VAR / KISMİ / MOCK / BOZUK / YOK olarak işaretle.
11. 20/50/100/200 ürün test veri setlerini belirle.
12. SWISS_RESTORAN katalog ve modifier sözleşmesini incele.
13. CSV/JSON/API entegrasyon sınırını çıkar.
14. Tenant asset izolasyonu ve stok kütüphanesi durumunu incele.
15. Konva’ya doğrudan gömülü domain kurallarını belirle.
16. Renderer adapter planı çıkar.
17. Baskı/CMYK/preflight yolunu doğrula.
18. P0/P1/P2 risk matrisi oluştur.
19. İlk gerçek dikey dilimi öner:
    Sipariş Alma → Katalog Bağlama → Dinamik A4 Flyer → Otomatik Menü Taslağı → QR Eşleme → Proof.
20. Kod yazmadan önce audit raporu üret.
21. Sonuç:
    READY_FOR_DYNAMIC_DESIGN_CORE
    veya
    BLOCKED_WITH_REASONS.
```

---

# 27. ESKİ PROTOKOLDEN KORUNAN KARARLAR

Bu V3 sürümünde önceki protokollerden korunan ana hükümler:

- A4 flyer kırmızı çizgidir.
- 20–200 ürün yönetimi zorunludur.
- Gridli ve gridsiz tasarım birlikte desteklenir.
- CMYK, bleed ve safe area zorunludur.
- Tek editör çekirdeği kullanılır.
- Canvas state’i kanonik veri değildir.
- ProductRecord/ProductCard yaklaşımı korunur.
- Konva adapter arkasında tutulur.
- Açık kaynak teknik radar uygulanır.
- PDF/X ve server render hedeflenir.
- Preflight zorunludur.
- Tenant izolasyonu zorunludur.
- Müşteri onayı revision’a bağlıdır.
- Ücretli bağımlılık onaysız eklenmez.
- GT kapıları geçmeden READY denmez.
- Eski protokoller aktif otorite değildir.
- Kök dizinde tek kanonik MD bulunur.

---

# 28. REVİZE EDİLEN ESKİ KARARLAR

## Eski karar
“Flyer tamamlanmadan diğer ürünler ana geliştirme odağı olamaz.”

## Yeni karar
Flyer, layout zekâsının ilk kalite referansı ve kırmızı çizgisidir; fakat müşteri proje modeli gereği menü, QR, tabela, cam ve tekstil altyapıları aynı veri ve tasarım sistemi üzerinden paralel geliştirilebilir. Hiçbiri ayrı editör veya ayrı veri adası oluşturamaz.

---

## Eski karar
“TEZGÂH’ın ilk ürünü flyer’dır.”

## Yeni karar
TEZGÂH’ın ana ürünü **eşgüdümlü müşteri projesidir**. Flyer ilk ve en zor üretim profilidir.

---

## Eski karar
“Kullanıcı flyer tasarlar.”

## Yeni karar
Sistem, grafiker kararlarını dinamik kurallarla uygular; kullanıcı gerekli iş verilerini girer, otomatik sonucu seçer veya sınırlı düzenleme yapar.

---

## Eski karar
“Şablonlar ürün sayısına göre varyant üretir.”

## Yeni karar
Şablon yalnızca başlangıç kural setidir. Dinamik layout, tipografi, kategori dengeleme, görsel alanı ve reflow motoru gerçek sonucu hesaplar.

---

# 29. DEĞİŞMEZ ÜRÜN İLKELERİ

1. TEZGÂH proje merkezlidir.
2. Müşteriden minimum soruyla sipariş alınır.
3. Grafik tasarım kararları yazılıma dönüştürülür.
4. Flyer layout zekâsının kırmızı çizgisidir.
5. Tüm seçili materyaller eşgüdümlü üretilir.
6. Ürün sayısı değiştiğinde tasarım yeniden dengelenir.
7. Simetri kalıcı kuraldır.
8. Tipografi dinamik ve sınırlandırılmıştır.
9. Tasarımlar kontrollü biçimde benzersizdir.
10. Müşteri varlıkları başka müşteriye açık değildir.
11. Stok varlıkların lisansı takip edilir.
12. SWISS_RESTORAN ürün/modifier yetenekleri korunur.
13. Repolar bağımsızdır.
14. Entegrasyon yalnızca sürümlü sözleşmelerle yapılır.
15. Tek editör çekirdeği vardır.
16. Konva değiştirilebilir renderer’dır.
17. Kanonik veri sürümlü domain belgesidir.
18. Onaylanan sürüm değiştirilemez.
19. Baskı çıktısı preflight’sız üretilemez.
20. Tek aktif protokol bu dosyadır.

---

# 30. SON ÜRÜN TANIMI

TEZGÂH, klasik bir Canva kopyası değildir.

TEZGÂH:

- sipariş alma sistemi,
- müşteri proje sistemi,
- marka ve katalog merkezi,
- dinamik tasarım motoru,
- grafiker karar motoru,
- çok materyalli üretim sistemi,
- baskı öncesi kontrol sistemi,
- müşteri onay sistemi,
- restoran QR entegrasyon katmanı,
- reklam firmaları için operasyonel SaaS

olarak geliştirilir.

Nihai hedef:

> Pazarlamacı müşterinin ne istediğini ve temel verileri girer; TEZGÂH ürün sayısına, kategori yapısına, görsellere, ölçülere ve seçilen materyallere göre profesyonel, simetrik, benzersiz ve baskıya hazır bir tasarım seti üretir. Grafiker varsa onaylar ve iyileştirir; grafiker yoksa sistem güvenli üretim sınırları içinde işi tamamlar.


---

# 31. MİMARİ GÖRSELLEŞTİRME VE İÇ MİMARİ VİZYONU

## 31.1 Nihai hedef

TEZGÂH'ın uzun vadeli hedeflerinden biri, yalnızca baskı materyalleri üretmek değil; restoranın fiziksel mekânını profesyonel seviyede görselleştirebilen bir mimari sunum platformu olmaktır.

Bu modül;

- dış cephe,
- tabela,
- cam giydirme,
- menü board,
- kasa alanı,
- oturma düzeni,
- duvar grafikleri,
- aydınlatma önerileri,
- dekor öğeleri,
- Amerikan servis,
- paketleme ürünleri

gibi tüm görsel unsurları tek proje içinde değerlendirebilir.

## 31.2 Ham fotoğraf kabul ilkesi

Sahadan gelen fotoğraflar varsayılan olarak profesyonel kabul edilmez.

Sistem şu durumları bekler:

- eğri çekim,
- perspektif bozukluğu,
- düşük ışık,
- düşük çözünürlük,
- gürültü,
- yansıma,
- istenmeyen nesneler,
- renk hataları.

Bu nedenle tüm fotoğraflar önce iyileştirme hattından geçirilir.

## 31.3 Architectural Vision Engine

Bu motor aşağıdaki aşamalardan oluşur:

1. Fotoğraf kurtarma
   - perspektif düzeltme
   - lens düzeltme
   - beyaz dengesi
   - pozlama
   - gürültü azaltma
   - keskinleştirme
   - süper çözünürlük

2. Mekân analizi
   - duvar
   - zemin
   - tavan
   - cam
   - kolon
   - banko
   - tabela alanı
   - menü board alanı

3. Otomatik yerleştirme
   - tabela
   - cam giydirme
   - logo
   - menü board
   - duvar grafikleri

4. İç mimari konsept
   - masa ve sandalye yerleşimi
   - renk önerileri
   - aydınlatma
   - dekor
   - malzeme önerileri

5. Fotogerçekçi sunum
   Amaç, müşteriye profesyonel bir iç mimar tarafından hazırlanmış hissi veren yüksek kaliteli konsept görseller sunmaktır.

## 31.4 Konsept ve teknik proje ayrımı

Sistem iki farklı çıktı üretir:

- Konsept Mockup: Sunum ve karar verme amacıyla oluşturulan görseller.
- Teknik Proje: Gerçek ölçüler, üretim ve montaj için doğrulanmış uygulama çıktıları.

Bu iki çıktı birbirinin yerine kullanılmamalıdır.

## 31.5 Değişmez ilke

Her yeni mimari özellik şu hedefe hizmet etmelidir:

> Kullanıcının yüklediği sıradan bir telefon fotoğrafını, mümkün olan en yüksek doğrulukla profesyonel bir mimari sunuma dönüştürmek ve müşterinin kendi işletmesini gelecekteki hâliyle görebilmesini sağlamak.

---

# 32. MODÜLER SEKTÖR ÇALIŞMA ALANLARI

## 32.1 Temel karar

TEZGÂH tek bir sektör için hazırlanmış kapalı bir uygulama değildir.

TEZGÂH ortak bir çekirdek üzerinde çalışan, gerektiğinde yeni sektörlerin eklenebildiği **modüler dikey çalışma alanları platformudur**.

Her sektör:

- kendi sipariş akışına,
- kendi ölçü ve malzeme bilgilerine,
- kendi tasarım kurallarına,
- kendi fiyatlandırma modeline,
- kendi üretim çıktılarına,
- kendi AI uzmanına,
- kendi kullanıcı arayüzüne

sahip olabilir.

Sektör modülleri ortak çekirdeği paylaşır; ancak birbirine zorunlu olarak bağımlı değildir.

## 32.2 Kullanıcı yalnızca yaptığı işi görür

Bir işletme yalnızca ihtiyaç duyduğu modülleri kullanır.

Örnekler:

### Menü üreticisi

Şunları görebilir:

- restoran menüsü,
- deri veya kaplamalı menü,
- masa menüsü,
- QR menü,
- dijital menü,
- menü board,
- ürün ve fiyat kataloğu.

Tabela, tekstil veya ambalaj modülleri varsayılan olarak görünmez.

### İş elbisesi ve tekstil firması

Şunları görebilir:

- tişört,
- polo yaka,
- sweatshirt,
- mont,
- önlük,
- şapka,
- baskı alanı,
- DTF,
- nakış,
- renk ve beden varyantları,
- ürün mockup'ları.

Menü ve iç mimari modülleri varsayılan olarak görünmez.

### Reklam ajansı

Ajans, yetkisine göre birden fazla modülü birlikte açabilir:

- flyer,
- katalog,
- tabela,
- cam giydirme,
- araç giydirme,
- sosyal medya,
- tekstil,
- ambalaj,
- menü,
- mimari mockup.

Ajans çalışma alanı diğer dikeylerin birleşimi olabilir; fakat ortak çekirdek üzerinde çalışır.

### Matbaa

Şunları görebilir:

- flyer,
- broşür,
- katalog,
- kartvizit,
- etiket,
- sticker,
- afiş,
- roll-up,
- baskıya hazır PDF,
- kesim ve taşma alanları.

Matbaa müşterisi menü bastığında menü tasarım modülü ayrıca yetkilendirilebilir. Bu, matbaanın bütün kullanıcılarının menü modülünü zorunlu olarak görmesi anlamına gelmez.

### Ambalaj üreticisi

Şunları görebilir:

- kutu,
- poşet,
- bardak,
- kılıf,
- etiket,
- sargı,
- die-line,
- baskı yüzeyleri,
- malzeme ve adet bazlı maliyet.

### Çevrim içi kişiselleştirilmiş kıyafet satıcısı

Şunları görebilir:

- müşterinin kendi tasarımını yüklemesi,
- ürün üzerinde canlı kişiselleştirme,
- baskı alanı kontrolü,
- renk ve beden varyantları,
- sipariş önizlemesi,
- baskı tekniği seçimi,
- üretim dosyası,
- e-ticaret entegrasyonu.

### Promosyon firması

Şunları görebilir:

- kalem,
- kupa,
- anahtarlık,
- çanta,
- defter,
- tekstil,
- hediyelik,
- ürün kişiselleştirme,
- katalog oluşturma,
- teklif üretme.

Promosyon firması katalog basıyorsa katalog modülü açılabilir. Tekstil satıyorsa tekstil modülü eklenebilir. Bu genişleme kullanıcıya özel yetkilendirme ile yapılır.

### Cam ve folyo uygulama firması

Şunları görebilir:

- cam ölçüsü,
- folyo,
- one-way vision,
- kumlama,
- kesim,
- yüzey yerleşimi,
- perspektif mockup,
- üretim ve montaj çıktısı.

Tabela yapmıyorsa tabela araçları gösterilmez.

### Endüstriyel mutfak veya restoran kurulum firması

Şunları görebilir:

- iç mekân analizi,
- mutfak yerleşimi,
- operasyon akışı,
- banko,
- servis alanı,
- oturma düzeni,
- mimari konsept,
- fotogerçekçi sunum.

Flyer veya tekstil modülleri ancak ayrıca açılırsa görünür.

## 32.3 Sektör sınırları geçirgendir

Sektörler katı kutular değildir.

Bir kullanıcı ana iş kolunun yanında başka işler de yapabilir.

Örnek:

- promosyon firması katalog hazırlayabilir,
- matbaa menü üretebilir,
- ajans tabela ve tekstil satabilir,
- tekstil firması promosyon ürünleri ekleyebilir,
- ambalaj firması etiket ve katalog hizmeti sunabilir.

Bu nedenle sistem:

- sektör profili,
- aktif modüller,
- ek yetenek paketleri,
- kullanıcı rolü,
- abonelik ve entitlement

üzerinden çalışmalıdır.

Yeni alan açmak, çekirdeği çatallamak veya ayrı ürün yazmak anlamına gelmemelidir.

## 32.4 Modül sözleşmesi

Her yeni sektör modülü en az şu sözleşmeleri tanımlar:

1. Hedef kullanıcı
2. Sipariş alma şeması
3. Zorunlu ve isteğe bağlı alanlar
4. Tasarım kuralları
5. Üretim malzemeleri
6. Fiyatlandırma girdileri
7. Önizleme türleri
8. Baskı veya üretim çıktıları
9. Kalite kapıları
10. Diğer modüllerle entegrasyon sınırları

## 32.5 Değişmez ilke

> TEZGÂH, herkese her aracı gösteren karmaşık bir süper uygulama olmayacaktır. Aynı çekirdek üzerinde, her sektöre yalnızca yaptığı işi gösteren uzman çalışma alanları sağlayacaktır.

---

# 33. TABELA STUDIO VE TABELA SATIŞ MOTORU

## 33.1 Bağımsız ürün alanı

Tabela, genel grafik editörünün küçük bir uzantısı değildir.

Tabela tasarımı:

- malzeme,
- ölçü,
- ışık,
- elektrik,
- üretim yöntemi,
- montaj,
- cephe perspektifi,
- gece ve gündüz görünümü,
- maliyet

ile birlikte değerlendirilir.

Bu nedenle **Tabela Studio** bağımsız bir sektör modülü olarak geliştirilir.

## 33.2 Müşteri karar ekranı

Müşteri veya satış temsilcisi:

- iş yeri fotoğrafını yükler,
- tabela alanını seçer,
- ölçü girer,
- yazı veya logoyu yerleştirir,
- tabela tipini seçer,
- ışık türlerini karşılaştırır,
- gündüz ve gece görünümünü inceler,
- malzeme seçeneklerini karşılaştırır,
- yaklaşık veya kesin fiyat alır.

Müşterinin temel sorusu şu şekilde yanıtlanmalıdır:

> Benim dükkânım bu tabela ile gündüz nasıl, gece nasıl görünecek ve bana maliyeti ne olacak?

## 33.3 Desteklenecek temel tabela sınıfları

- ışıksız tabela,
- ışıklı tabela,
- vinil germe tabela,
- pleksi kutu harf,
- paslanmaz kutu harf,
- alüminyum kutu harf,
- kompozit zemin,
- önden ışıklı harf,
- arkadan halo ışıklı harf,
- kenardan ışıklı harf,
- lightbox,
- neon ve LED neon,
- totem,
- çıkma tabela,
- dijital ekran.

## 33.4 Gündüz ve gece simülasyonu

Her tasarım en az iki ayrı ışık koşulunda üretilebilir:

- gündüz görünümü,
- gece görünümü.

İleri görünüm seçenekleri:

- yakın plan,
- karşı kaldırım,
- araç yaklaşımı,
- farklı hava koşulları,
- farklı ışık sıcaklıkları.

Simülasyon yalnızca dekoratif olmamalı; seçilen gerçek ışık ve malzeme davranışını mümkün olduğunca doğru yansıtmalıdır.

## 33.5 Dinamik maliyet motoru

Tabela fiyatı yalnızca yüzey alanından oluşmaz.

Maliyet girdileri:

- en ve boy,
- harf sayısı,
- harf yüksekliği,
- malzeme tipi,
- malzeme kalınlığı,
- LED türü ve yoğunluğu,
- güç kaynağı,
- CNC veya lazer kesim,
- kaynak ve kasa işçiliği,
- taşıyıcı konstrüksiyon,
- baskı,
- folyo,
- montaj,
- vinç veya erişim ihtiyacı,
- nakliye,
- bölgesel işçilik,
- vergi ve para birimi.

Fiyat motoru ülke, bölge, tedarikçi ve üretici fiyat listelerine göre uyarlanabilir olmalıdır.

## 33.6 Üretim çıktıları

Onay sonrası sistem mümkün olduğunda şunları üretir:

- müşteri sunumu,
- teklif,
- malzeme listesi,
- ölçü planı,
- montaj notu,
- baskı dosyası,
- kesim dosyası,
- üretim iş emri.

---

# 34. EVRENSEL VE GLOBAL-FIRST ÜRÜN MİMARİSİ

## 34.1 Temel karar

> TEZGÂH Türkiye için başlayacak, fakat yalnızca Türkiye için yazılmayacaktır.

Türkiye ilk pazar, ilk saha doğrulaması ve ilk üretim ekosistemidir.

Ürün çekirdeği ise evrensel tasarlanacaktır.

## 34.2 Evrensel çekirdek, yerel paketler

Aşağıdaki alanlar çekirdeğe sabit kodlanamaz:

- dil,
- para birimi,
- vergi,
- ölçü birimi,
- kâğıt standardı,
- baskı standardı,
- elektrik standardı,
- malzeme terminolojisi,
- işçilik fiyatları,
- tabela ve cephe kuralları,
- adres biçimi,
- tarih ve sayı biçimi,
- ülkeye özgü yasal uyarılar.

Bunlar:

- ülke profili,
- bölge profili,
- dil paketi,
- fiyat listesi,
- mevzuat paketi,
- üretim standardı paketi

olarak eklenebilir.

## 34.3 Uluslararasılaştırma gereksinimleri

Sistem baştan itibaren şunları destekleyecek şekilde tasarlanır:

- çoklu dil,
- sağdan sola yazılar,
- Latin dışı alfabeler,
- Unicode,
- yerelleştirilebilir şablon metinleri,
- çoklu para birimi,
- metrik ve imperial ölçüler,
- A-serisi ve Letter/Legal kâğıtlar,
- yerel vergi şemaları,
- bölgesel fiyatlandırma,
- ülke bazlı malzeme isimleri,
- zaman dilimleri,
- yerel veri saklama gereksinimleri.

## 34.4 İhracat ilkesi

Yeni bir ülkenin eklenmesi:

- çekirdeği çatallamamalı,
- ayrı kod tabanı oluşturmamalı,
- mevcut tenant verisini bozmamalı,
- yalnızca gerekli ülke ve dil paketlerini etkinleştirmelidir.

## 34.5 Değişmez ilke

> TEZGÂH evrensel geliştirilir, ülkelere uyarlanır. Türkiye’de doğar; dünyaya ihraç edilir.

---

# 35. VİZYON, SLOGAN VE GELİŞTİRME FİLTRESİ

## 35.1 Ana slogan

> **Karmaşık işleri kolaylaştırır.**

Bu slogan yalnızca pazarlama cümlesi değildir.

TEZGÂH’ın:

- ürün vizyonu,
- geliştirme filtresi,
- kullanıcı deneyimi ilkesi,
- sektör genişleme ölçütü,
- kalite değerlendirme standardıdır.

## 35.2 Ürün vizyonu

> TEZGÂH; baskının, grafiğin, kişiselleştirmenin ve üretimin karmaşık olduğu sektörlerde uzman bilgiyi yazılıma dönüştürür, profesyonel sonucu herkes için erişilebilir hâle getirir.

## 35.3 Geliştirme filtresi

Her yeni özellik şu sorularla değerlendirilir:

1. Karmaşık bir işi gerçekten kolaylaştırıyor mu?
2. Kullanıcının uzmanlık ihtiyacını azaltıyor mu?
3. Sorulması gereken soru sayısını düşürüyor mu?
4. Hata ihtimalini azaltıyor mu?
5. Profesyonel kaliteyi koruyor veya yükseltiyor mu?
6. Yalnızca ilgili sektörün kullanıcısına mı gösteriliyor?
7. Evrensel çekirdeğe ve yerel uyarlama modeline uyuyor mu?
8. Yeni sektörlerin sonradan eklenmesini zorlaştırıyor mu?

Bu filtreyi geçmeyen özellik yeniden tasarlanır veya reddedilir.

## 35.4 Kapsamın büyüme prensibi

TEZGÂH başlangıçta belirli sektörlerde derinleşir.

Yeni sektörler şu koşullarla eklenebilir:

- baskı, grafik, kişiselleştirme veya görsel üretimde gerçek karmaşıklık bulunması,
- sektöre ait tekrar eden uzman kararlarının yazılıma dönüştürülebilmesi,
- ölçülebilir üretim veya satış çıktısının bulunması,
- ortak çekirdekten anlamlı biçimde yararlanması,
- ayrı ve sade bir çalışma alanı olarak sunulabilmesi.

Alan genişleyebilir; ancak kontrolsüz özellik birikimi yapılamaz.

## 35.5 Son kimlik cümlesi

> **TEZGÂH, karmaşık baskı, grafik, kişiselleştirme ve reklam üretimi işlerini kolaylaştıran; sektörlere göre modülerleşen, Türkiye’den başlayıp dünyaya açılan evrensel Creative Production SaaS platformudur.**

