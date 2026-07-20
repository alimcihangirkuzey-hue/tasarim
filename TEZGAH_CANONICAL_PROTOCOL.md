# TEZGÂH — KANONİK MİMARİ PROTOKOLÜ

**Belge türü:** Ürün anayasası + mimari referans (Software Architecture Document)
**Durum:** Tek kanonik ürün ve mimari otoritesi
**Sürüm:** 4.1.0
**Tarih:** 19 Temmuz 2026
**Kanonik dosya adı:** `TEZGAH_CANONICAL_PROTOCOL.md`
**Yer:** Repo kök dizini
**Önceki sürümler:** 3.1.0 ve öncesi bu belgede birleştirildi; arşiv `docs/archive/protocols/`

---

# BÖLÜM 0 — BELGENİN OTORİTESİ

## 0.1 Tek protokol ilkesi

- Repo kökünde yalnızca bu dosya ürün ve mimari anayasasıdır.
- `FINAL`, `MASTER`, `LATEST`, `VISION`, `NEW_PROTOCOL`, `CONSTITUTION` benzeri paralel anayasa dosyaları açılamaz.
- Yeni kararlar yeni dosya açılarak değil, **bu dosyanın sürümü yükseltilerek** işlenir.
- Modül notları, karar kayıtları ve uygulama raporları bu belgeyle çelişemez.

## 0.2 Çelişki sıralaması

1. Ürün sahibinin güncel ve açık talimatı
2. Bu kanonik protokol
3. Kabul edilmiş **ADR** (mimari karar kaydı)
4. Kabul edilmiş **TDR** (teknoloji karar kaydı)
5. Aktif modül/profil spesifikasyonu
6. Görev talimatı

## 0.3 Karar kaydı disiplini

İki ayrı kayıt türü vardır ve numaraları çakışamaz:

| Tür | Konu | Numara | Değişme sıklığı |
|---|---|---|---|
| **ADR** | Mimari karar (sınır, sözleşme, model, ilke) | `ADR-nnn` | Nadir; anayasa etkisi olabilir |
| **TDR** | Teknoloji seçimi (kütüphane, servis, motor) | `TDR-nnn` | Sık; anayasayı etkilemez |

Bir teknolojinin değişmesi **TDR** ile olur ve bu belgenin gövdesini değiştirmez. Bir mimari sınırın değişmesi **ADR** ile olur ve bu belgeye işlenir.

> **Numaralandırma eşleme şerhi (EK-C/A-08 icrası, 2026-07-20).** Üç ayrı numara serisi vardır ve **hiçbiri yeniden numaralandırılmaz — arşiv tarihsel kayıt olarak korunur:**
> - **Canlı program ADR** = `docs/adr/ADR-00n` (bu programın mimari kararları; ADR-001…007).
> - **Arşiv teknoloji ADR** = `docs/archive/protocols/2026-07/CONSTITUTION.md` içindeki `ADR-1…8` (eski teknoloji kararları; ör. ADR-6 State/Zustand, ADR-7 görsel işleme/sharp). Bunlar **geçerli tarihsel teknoloji kararlarıdır** ve bir TDR onları açıkça geçersizleştirmedikçe yürürlüktedir.
> - **İleri teknoloji TDR** = `TDR-nnn` (2.3; bugün yalnız `TDR-001` — Journal saklama). Arşiv teknoloji ADR'lerinin **henüz TDR karşılığı yoktur**; süperseded değildirler, yalnız arşivde yaşarlar.
>
> **Çakışma çözümü icra edildi:** yeniden adlandırma **yapılmadı**; çakışma, canlı atıfların **açık nitelenmesiyle** giderildi. Arşiv teknoloji kararına atıf yapan canlı kod/belge, çıplak `ADR-n` yerine **`arşiv CONSTITUTION teknoloji ADR-n`** biçimini kullanır. Böylece `ADR-6`/`ADR-7` artık iki anlama gelmez.

## 0.4 Eski protokollerin ele alınması

Eski protokoller silinmeden önce analiz edilir: kararlar çıkarılır ve
`KORUNDU / REVİZE EDİLDİ / BİRLEŞTİRİLDİ / ÇELİŞKİLİ / GEÇERSİZ / BELİRSİZ`
olarak sınıflandırılır; karşılığı olmayan hükümler ürün sahibine raporlanır; ardından belgeler
`docs/archive/protocols/YYYY-MM/` altına taşınır ve **aktif otorite olarak kullanılmaz**.

> Bu süreç 2026-07 döneminde icra edilmiştir. Devir kaydı:
> `docs/archive/protocols/2026-07/DEVIR_RAPORU.md` — sınıflandırma, taşınması gereken
> hükümler ve açık sorular oradadır. Açık maddeler **EK-C**'de izlenir.

---

# BÖLÜM 1 — ÜRÜN ANAYASASI

## 1.1 Kanonik tanım

> **TEZGÂH, karmaşık baskı, grafik, kişiselleştirme ve reklam üretimi işlerini kolaylaştıran; sektörlere göre modülerleşen, Türkiye'den başlayıp dünyaya açılan evrensel Creative Production SaaS platformudur.**

**Slogan:** *Karmaşık işleri kolaylaştırır.* Bu, pazarlama cümlesi değil geliştirme filtresidir.

Platform tek bir sektöre, tek kullanıcı tipine veya tek editör ekranına indirgenemez. Menü üreticisi, iş elbisesi firması, reklam ajansı, matbaa, ambalajcı, tabelacı, promosyoncu veya cam giydirme firması **aynı çekirdeği** kullanır; yalnızca kendi iş koluna ait çalışma alanını görür.

TEZGÂH bir Canva kopyası değildir. TEZGÂH aynı anda: sipariş alma sistemi · müşteri proje sistemi · marka ve katalog merkezi · dinamik tasarım motoru · grafiker karar motoru · çok materyalli üretim sistemi · baskı öncesi kontrol sistemi · müşteri onay sistemi · sektör stüdyoları platformudur.

## 1.2 Ürünün amacı ve değer ölçütü

Başarı ölçütü, kullanıcıya sınırsız tasarım kontrolü vermek **değildir**; uzman bilgisini yazılıma dönüştürmek, zor üretim süreçlerini sadeleştirmek ve profesyonel sonucu **en az kullanıcı kararıyla** üretmektir.

Ana amaçlar: pazarlamacının sipariş almasını kolaylaştırmak · müşteriye sorulacak soruyu azaltmak · müşteri verisini standartlaştırmak · tasarım kararlarını kurallara dönüştürmek · aynı projeden çok sayıda materyal üretmek · marka ve içerik tutarlılığı sağlamak · grafikeri olmayan firmaya profesyonel çıktı vermek · grafikeri varsa onu son onay rolüne taşımak.

**Geliştirme filtresi** — her yeni özellik şu sorulardan geçer:

1. Karmaşık bir işi gerçekten kolaylaştırıyor mu?
2. Kullanıcının uzmanlık ihtiyacını azaltıyor mu?
3. Sorulması gereken soru sayısını düşürüyor mu?
4. Hata ihtimalini azaltıyor mu?
5. Profesyonel kaliteyi koruyor veya yükseltiyor mu?
6. Yalnızca ilgili sektörün kullanıcısına mı gösteriliyor?
7. Evrensel çekirdek + yerel uyarlama modeline uyuyor mu?
8. Yeni sektörlerin sonradan eklenmesini zorlaştırıyor mu?

Bu filtreyi geçmeyen özellik yeniden tasarlanır veya reddedilir.

## 1.3 Hedef kullanıcılar

Saha pazarlamacısı · müşteri temsilcisi · reklam firması sahibi · matbaa çalışanı · promosyon firması · restoran çözüm sağlayıcısı · grafikeri olmayan küçük işletme · grafik tasarımcı · baskı operatörü · üretim sorumlusu · menü üreticisi ve menü kaplama firması · iş elbisesi ve tekstil baskı firması · ambalaj üreticisi · tabelacı · cam ve folyo uygulama firması · kişiselleştirilmiş ürün satıcısı · çevrim içi baskılı kıyafet mağazası.

## 1.4 Değişmez ürün ilkeleri

Bu liste ilkelerin **tek evidir**; belgenin başka yerinde tekrarlanmaz.

1. TEZGÂH proje merkezlidir; belge merkezli değildir.
2. Müşteriden minimum soruyla sipariş alınır.
3. Grafik tasarım kararları yazılıma dönüştürülür.
4. Flyer, layout zekâsının kalite referansı ve kırmızı çizgisidir.
5. Seçili tüm materyaller aynı proje verisinden eşgüdümlü üretilir.
6. Ürün sayısı değiştiğinde tasarım yeniden dengelenir; "sıkışmış" veya "eksik bırakılmış" görünmez.
7. Simetri ve optik denge kalıcı kuraldır.
8. Tipografi dinamiktir ama alt sınırları ihlal edilemez.
9. Tasarımlar kontrollü biçimde benzersizdir; rastgele değildir.
10. Müşteri varlıkları başka müşteriye açılamaz, önerilemez, eğitim verisi yapılamaz.
11. Her varlığın kaynağı ve lisansı izlenir.
12. SWISS_RESTORAN'ın olgun ürün/modifier yetenekleri yeniden yazılmaz.
13. Repolar bağımsızdır; ortak veritabanı yoktur.
14. Entegrasyon yalnızca sürümlü sözleşmelerle yapılır.
15. Tek editör çekirdeği vardır; ürün başına ayrı editör yazılmaz.
16. Render motoru değiştirilebilir; kanonik veri render'a bağlı değildir.
17. Kanonik veri sürümlü domain belgesidir; tuval durumu kanonik veri değildir.
18. Onaylanan sürüm değiştirilemez; değişiklik yeni sürüm açar.
19. Baskı çıktısı kalite kapısından geçmeden üretilemez.
20. Hiçbir teknoloji çekirdeğin değiştirilemez parçası değildir.
21. Tek aktif protokol bu dosyadır.

## 1.5 Kanonik sahiplik ve ürün sınırları

| Alan | Kanonik sahip |
|---|---|
| Tasarım belgeleri, render, üretim çıktıları, sektör stüdyoları, AI üretimi | **TEZGÂH** |
| QR/POS sipariş ürünleri, restoran menü operasyonu, modifier yetenekleri | **SWISS_RESTORAN** |
| Abonelik, lisans, paket, ödeme, entitlement, kota, merkezî yönetim | **STYVA** |

Repolar bağımsızdır. Kod, veritabanı ve migration **paylaşılmaz**. İletişim yalnızca sürümlü sözleşmelerle yapılır (Bölüm 9.3).

---

# BÖLÜM 2 — MİMARİ KARAR İLKELERİ

## 2.1 Open Source First

Platform, mümkün olan her katmanda **açık kaynak** teknolojiler üzerine kurulur.

- Varsayılan tercih: izin verici lisanslı, aktif sürdürülen açık kaynak bileşen.
- Kapalı kaynak, ücretli veya barındırılan servis **istisnadır** ve ürün sahibi onayı ister.
- Her ücretli/kapalı bağımlılık için **çıkış planı** ve açık kaynak alternatifi kayda geçer.
- Kopyalanamayan değer kütüphanelerde değil; sektör uzmanlığında, kurallarda, motorlarda, veri modelinde ve entegrasyonlardadır.

**Ürün sahibi onayı gereken durumlar:** ücretli SDK/API · kapalı kaynak editör · GPU aboneliği · kullanıcı başı lisans · vendor lock-in yaratan bağımlılık · müşteriye ek maliyet çıkaran her kalem.

## 2.2 Technology Independence Principle

Çekirdek mimari **teknoloji isimlerine bağlı değildir**.

- Çekirdek; domain modeli, sözleşmeler, kurallar ve motorların davranışıyla tanımlanır.
- Her dış teknoloji bir **port/adapter** arkasında durur; domain katmanı kütüphane tipi taşımaz.
- Bir teknolojinin kaldırılması kanonik veriyi, iş kurallarını veya sözleşmeleri değiştirmemelidir.
- Teknoloji isimleri yalnızca **EK-A**'da yaşar; bu belgenin gövdesinde bağlayıcı teknoloji adı geçmez.
- "Daha yeni olmak" seçim gerekçesi değildir; değişim TDR ile kanıtlanır.

## 2.3 Technology Decision Record (TDR)

Teknoloji benimseme/değiştirme kaydı. Zorunlu alanlar:

```
TDR-nnn  Başlık
Bağlam            : hangi yetenek, hangi port
Değerlendirilenler: en az 2 alternatif
Karar             : seçilen + gerekçe
Lisans            : tür + uyumluluk + yükümlülük
Olgunluk          : bakım, topluluk, güvenlik geçmişi
Ölçüm             : benchmark / PoC sonucu
Çıkış maliyeti    : değiştirmek ne kadar sürer, neyi kırar
Geri alma         : rollback yolu
Onay              : ücretliyse ürün sahibi onayı
```

**Motor değiştirme kapısı** (renderer, layout, AI, depolama gibi ağır bileşenler): capability matrisi · lisans incelemesi · benchmark · proof of concept · belge uyumluluğu · görsel karşılaştırma · performans testi · migration · rollback · güvenlik incelemesi.

---

# BÖLÜM 3 — ALAN MODELİ

## 3.1 Proje merkezli mimari

Merkezde belge değil **müşteri projesi** vardır.

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

**Proje açılışında yalnız ticari bilgi toplanır:** işletme türü ve adı · logo · iletişim · adres · sosyal medya · QR gereksinimi · seçilen materyaller · ölçüler · ürün kataloğu · fiyatlar · ürün görselleri · kampanyalar · teslim tarihi · baskı veya montaj bilgileri. Sistem gereksiz tasarım sorusu sormaz.

**Seçilebilir teslimatlar** (örnek küme, genişletilebilir): A4/A3 flyer · tek ve çift yüz menü · çok sayfalı menü · masa ve duvar menüsü · QR menü · tabela · cam uygulaması · iç mekân grafiği · araç giydirme · tişört · polo · önlük · şapka · sticker · ambalaj · kartvizit · roll-up · sosyal medya · dijital ekran.

**Paralel üretim:** materyaller birbirini beklemez; hepsi aynı BrandKit, katalog ve varlık kütüphanesini kullanır. Hiçbir materyal başkasının piksel kopyası değildir; her biri kendi fiziksel ve iletişim kurallarına göre yeniden kompoze edilir.

## 3.2 Kanonik veri modeli

Tuval görüntüsü veya editör durumu kanonik veri **değildir**.

```ts
interface Project {
  id: string; tenantId: string; customerId: string;
  title: string; businessType: string;
  brandKitId?: string; catalogId?: string;
  requestedDeliverables: DeliverableRequest[];
  measurements: MeasurementSet[];
  status: ProjectStatus;
  createdAt: string; updatedAt: string;
}

interface CreativeDocument {
  schemaVersion: string;
  id: string; tenantId: string; projectId: string;
  deliverableType: string;
  productionProfileId: string;
  designSeed: string;
  brandKitId?: string; catalogSnapshotId?: string;
  pages: CreativePage[];
  bindings: DataBinding[];
  layoutRules: LayoutRuleSet;
  overrides: DocumentOverride[];
  revision: number;
}

interface ProductRecord {
  id: string; externalId?: string; sku?: string;
  name: string; description?: string;
  price?: number; oldPrice?: number; currency?: string;
  categoryId?: string; imageAssetId?: string;
  allergens?: string[]; modifierGroups?: string[];
  badge?: string; priority?: number; isVisible: boolean;
}
```

**Şema evrimi (additive-only):** alan silinmez ve yeniden adlandırılmaz; yalnız opsiyonel alan eklenir; `schemaVersion` yalnız kırıcı değişimde artar; bilinmeyen alanlar tolere edilir.

**Migration disiplini:** additive migration · geri alınabilirlik · replay testi · idempotent tekrar-koşum. Destructive migration yasaktır.

## 3.3 Snapshot ilkesi

Tasarım canlı kataloğa bağlanabilir; ancak **onaylanan her sürüm katalog snapshot'ı taşır**. Geçmiş baskı dosyası yeniden üretilebilir olmalıdır; sonradan değişen fiyat eski onayı değiştirmez.

Ürün değiştiğinde sistem: etkilenen belgeleri bulur → farkı gösterir → yeniden akış önizlemesi üretir → onay ister → yeni belge sürümü açar. **Basılı dosya sessizce değişmez.**

## 3.4 Yaşam döngüsü ve onay akışı

Kanonik yaşam döngüsü:

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

Kurallar:

- **Durum yalnız geçiş kapısından yazılır**; doğrudan alan güncellemesiyle durum değiştirilemez.
- Her geçişin koşulu tanımlıdır; koşul sağlanmazsa geçiş **isimli gerekçe listesiyle** reddedilir.
- Eksik bilgiyle tasarım **başlayabilir**; üretim kapısı (Bölüm 4.7) eksiksiz olmadan açılmaz.
- Geriye dönüş yalnız **sebep + kaydeden** ile ve denetim izine yazılarak yapılır.
- `APPROVED` ve sonrası **değiştirilemez**; değişiklik yeni revision açar. Onay; belge revision'ına, proof dosyasına, tarihe ve kullanıcıya bağlıdır.
- Sistem gerektiğinde aynı proje verisinden **Seçenek A / Seçenek B** üretebilir.

> **Uyum notu:** Uygulamada farklı yaşam döngüsü sözlükleri kullanılıyorsa bunlar bu tabloya eşlenir ve tek sözlüğe yakınsar. Eşleme ve göç planı EK-C'de izlenir.

---

# BÖLÜM 4 — ÜRETİM ZEKÂSI MOTORLARI

## 4.1 Dynamic Composition Engine

Platformun merkezinde tuval değil, **dinamik yerleşim ve kompozisyon motoru** vardır. Motor, içerik miktarı değiştiğinde tasarımın sırıtmadan yeniden dengelenmesini sağlar.

**Motor deterministiktir.** Aynı girdi aynı sonucu üretir; test edilebilir, tekrar üretilebilir, baskı güvenlidir ve AI servisinden bağımsız çalışır.

**Girdi değişkenleri:** sayfa ölçüsü · bleed · güvenli alan · ürün ve kategori sayısı · kategori başına ürün · ad, açıklama ve fiyat uzunlukları · para birimi · görsel sayısı ve oranları · logo oranı · QR, iletişim ve kampanya alanları · seçilen stil · baskı tekniği · hedef okunma mesafesi · minimum font · minimum görsel alanı.

**Dinamik grid:** kolon ve satır sayısı, kategori blokları, kart boyutu, görsel oranı, boşluklar, başlık/footer/QR alanları **hesaplanır**; sabit şablon dayatılmaz. Şablon yalnızca başlangıç kural setidir.

**Yeniden akış (reflow):** ürün eklenip çıkarıldığında kartlar yeniden akar, fontlar gerekirse ölçeklenir, kategori blokları dengelenir, boşluklar ve son satır yeniden hesaplanır, taşma kontrol edilir, tasarımın karakteri korunur.

**Taşma sözleşmesi:** her üretim profili taşma stratejisini **açıkça ilan eder** ve motor bu ilanı uygular. İlan ile davranış ayrışamaz. Sessiz kırpma yasaktır: taşan içerik ya akar, ya görünür uyarı üretir, ya da alternatif önerilir (daha büyük format, ikinci sayfa, yoğun kart profili, açıklama gizleme, kategori veya görsel azaltma).

## 4.2 Tipografi ve okunabilirlik kısıtları

Font boyutu sabit değildir; ürün sayısı, metin uzunluğu, kategori dağılımı, satır sayısı, fiyat uzunluğu, görsel kullanımı ve boşluk dengesi birlikte değerlendirilir. Doğrusal küçültme yeterli değildir.

Her üretim profilinde tanımlıdır: önerilen font aralığı · **mutlak minimum font** · kategori başlığı, fiyat ve açıklama minimumları · satır ve harf aralığı · kontrast oranı.

Minimum sınır **aşılamaz**. Sistem sınırın altına inmek yerine alternatif sunar.

## 4.3 Simetri ve kompozisyon dengesi

Simetri kalıcı kuraldır ve yalnız geometrik eşitlik değildir: eşit kenar boşluğu · ritmik aralık · hizalı fiyatlar · dengeli kategori blokları · tutarlı görsel oranları · optik denge · eşit kart yükseklikleri · satır sonu dengeleme · boş kalan son satırın bilinçli yerleşimi.

Serbest (grid dışı) kompozisyon desteklenir; ancak serbestlik baskı ve denge kurallarını bozamaz: manyetik hizalama · optik merkez · eşit aralık · kenar dengesi · yoğunluk dengesi · görsel ağırlık · çakışma ve taşma kontrolü.

## 4.4 Kontrollü benzersizlik ve `designSeed`

Aynı altyapı kullanılır; ancak her müşteri tasarımı birebir kopya olmaz. Varyasyon alanları: grid düzeni · kategori sırası · görsel oranı · dekoratif şekiller · renk dağılımı · arka plan · başlık kompozisyonu · ürün kartı varyasyonu · vurgu ürünleri · ikon kullanımı · boşluk ritmi.

Benzersizlik rastgelelik değildir: her varyasyon marka kimliğine uygun, baskı güvenli, okunabilir, simetrik, **tekrar üretilebilir** ve kullanıcı tarafından kilitlenebilir olmalıdır. Her proje veya belge bir `designSeed` taşır; böylece tasarım yeniden üretilebilir ve istemeden değişmez.

## 4.5 Rule Engine

Tasarım ve üretim kuralları koda gömülmez; **bildirimsel kural setleri** olarak yaşar.

- Kural kümeleri katmanlanır: çekirdek → profil → ülke → tenant.
- Kurallar sürümlüdür ve değerlendirmesi deterministiktir.
- Kural türleri: geometri (bleed, güvenli alan, panel, katlama) · tipografi minimumları · teknik uygunluk (hangi teknik hangi malzemede) · içerik zorunlulukları · fiyat ve adet girdileri · yasal ve yerel zorunluluklar.
- Her kural test edilebilir olmalı; kural değişimi kayda geçmelidir.

## 4.6 Workflow Automation Engine

Sipariş → tasarım → inceleme → onay → üretim zinciri **yönetilen iş akışı** olarak çalışır.

- Adımlar, tetikleyiciler ve eylemler bildirimsel tanımlanır; koda dağıtılmaz.
- İnsan görevleri (inceleme, onay, saha bilgisi) akışın birinci sınıf adımlarıdır.
- Uzun süren işler kuyruğa alınır; yeniden deneme, zaman aşımı ve **idempotency** zorunludur.
- Teslim tarihi ve SLA izlenir; gecikme riski görünür olur.
- Her adım denetim izine yazılır.

## 4.7 Quality Gate Engine

Kalite kontrolü tek bir modelle yürür ve **tüm sınırlarda aynı sözlüğü** kullanır: dosya kabulü · tasarım · baskı öncesi kontrol · üretim serbest bırakma.

| Seviye | Anlam | Davranış |
|---|---|---|
| **INFO** | Bilgilendirme | Görünür not; sessiz yokluk yasaktır |
| **WARNING** | Riskli ama kabul edilebilir | **Kayıtlı onay** ile geçilebilir (kim, ne zaman, neden, hangi dosya sürümü) |
| **BLOCKER** | Kabul edilemez | İstisna verilemez; çözülmeden üretim serbest bırakılamaz |

**Tipik kontroller:** düşük efektif DPI · eksik veya gömülmemiş font · bleed ve güvenli alan · metin taşması · çok küçük font · ince çizgi · bozuk veya açılamayan dosya · desteklenmeyen tür · ölçü ve yön belirlenememesi · şeffaflık ve overprint · RGB/CMYK · renk profili doğrulanamaması · QR ve barkod okunabilirliği · kırpılmış fiyat · eksik görsel · görünmeyen ürün · çakışan kart · kesilmiş logo · yanlış para birimi · lisansı belirsiz varlık.

**Tasarım kalite puanı:** okunabilirlik · simetri · taşma · yoğunluk · kontrast · görsel kalite · marka tutarlılığı · baskı uygunluğu · kategori dengesi · boşluk dengesi.

**Denetim izi değişmezdir (append-only):** kalite kararları ve kayıtlı onaylar sonradan düzenlenemez veya silinemez.

## 4.8 Flyer'ın rolü

Flyer, layout zekâsının **kırmızı çizgisi** ve ilk kalite referansıdır; çünkü aynı anda yoğun ürün verisi, kategori hiyerarşisi, değişken metin uzunluğu, fiyat düzeni, çok sayıda görsel, sınırlı alan, tipografi, simetri, baskı hazırlığı, marka aktarımı, QR ve kampanyayı sınar.

Flyer aynı zamanda projenin ilk görsel dili, ürün kartı dili, renk dağılımı, tipografik hiyerarşi ve diğer materyallerin başlangıç tasarım sistemidir. Ancak diğer materyaller flyer'ın piksel kopyası değildir.

Motorun olgunluğu **20 / 50 / 100 / 200 ürün** ölçeklerinde ölçülür.

---

# BÖLÜM 5 — YAPAY ZEKÂ MİMARİSİ

## 5.1 AI yardımcıdır, otorite değildir

AI şu alanlarda kullanılabilir: şablon önerisi · ürün önceliklendirme · görsel sınıflandırma · metin kısaltma · başlık önerisi · arka plan üretme · tasarım varyasyonu · renk önerisi · içerik etiketleme.

AI **tek başına** şunları belirleyemez: baskı ölçüsü · bleed · güvenli alan · minimum font · müşteri izolasyonu · lisans kuralı · kanonik veri · üretim serbest bırakma kararı.

Deterministik motor her zaman önce gelir; AI onun üstünde çalışır.

## 5.2 AI Orchestrator

AI çağrıları koda serpiştirilmez; tek bir **orkestratör** üzerinden yürür.

Sorumlulukları: görev sınıflandırma · uygun ajan ve model seçimi · yerel–uzak yürütme kararı · kota ve maliyet kontrolü · paralel yürütme · sonuç birleştirme · kalite puanlama · geri düşüş (fallback) · insan onay kapıları · tüm çağrıların denetimi.

## 5.3 Multi-Agent Expert Architecture

TEZGÂH **tek bir yapay zekâ ajanı üzerine kurulmaz.** Platform, gerektiğinde onlarca uzman ajanın birlikte çalışabileceği çok-ajanlı uzman mimarisi üzerine tasarlanır.

**Temel bileşenler:** AI Orchestrator · Domain Expert Agents · Dynamic Agent Selection · Parallel Execution · Result Aggregation · Quality Scoring · Human Approval Gates · Cost Optimization · Agent Registry · Versioned Agents · Plugin-based Agents · Tenant-specific Agents.

**Örnek uzmanlık alanları** (bağlayıcı değil, genişletilebilir): Layout · Typography · Print · Menu · Flyer · Packaging · Textile · Signage · Marketing · SEO · Production · Quality Assurance · Localization · Accessibility · Desktop Automation.

Hiçbir uzman ajan çekirdeğin değiştirilemez parçası değildir.

> Çalıştırılacak ajanlar; **görevin niteliği, tenant özellikleri, lisans paketi, performans hedefleri, kalite gereksinimleri ve maliyet politikalarına** göre AI Orchestrator tarafından dinamik olarak seçilir, koordine edilir ve sonuçları birleştirilir.

Bu mimari, gelecekte yeni uzman ajanlar eklenerek genişlemeyi sağlar; **mevcut çekirdeğin yeniden yazılmasını gerektirmez.**

## 5.4 Agent Registry ve sürümleme

Her ajan kayıtlıdır: kimlik · sürüm · yetenek beyanı · girdi/çıktı sözleşmesi · maliyet sınıfı · gizlilik sınıfı · gerekli entitlement · kalite geçmişi.

Ajanlar sürümlüdür ve eski sürümler tekrar üretilebilirlik için korunur. Ajanlar eklenti olarak gelebilir (Bölüm 7.3) ve tenant'a özel ajanlar tanımlanabilir.

## 5.5 Maliyet, kota ve insan onayı

Maliyet politikası orkestratörde uygulanır: ucuz ve deterministik yol önce denenir; pahalı model yalnız gerektiğinde ve kota dahilinde çalışır. Kota ve paket sınırları STYVA entitlement'ından okunur (Bölüm 9.5).

Üretim etkisi olan hiçbir AI çıktısı insan onayı olmadan baskıya inmez.

## 5.6 Veri gizliliği sınırı

Müşteri varlıkları ve içerikleri **eğitim verisi olarak kullanılamaz** ve başka tenant'a sızdırılamaz. Dış servise gönderilen her veri kayıt altına alınır; hangi verinin nereye gittiği izlenebilir olmalıdır. Yerel model, uygun olduğunda önceliklidir.

---

# BÖLÜM 6 — İÇERİK, VARLIK VE KATALOG

## 6.1 Asset Registry

Her varlık (görsel, font, şablon, sahne, dekor, üretim dosyası) merkezî kayıtta yaşar.

Kayıt alanları: kimlik · tenant ve proje kapsamı · tür · **kaynak (origin)** · **lisans ve hak sahibi** · kullanım hakkı ve süresi · sağlama toplamı · **türev zinciri** (hangi varlıktan üretildi) · içe alma tarihi ve yolu · tespit edilen fontlar ve gömülü varlıklar · saklama politikası.

Bu kayıt sayesinde: yıllar sonra dönen işte kaynak dosya bulunur, lisans sorusu yanıtlanır, üretilmiş çıktı yeniden üretilebilir, arşiv bütünlüğü doğrulanabilir.

## 6.2 Görsel alanları (ImageSlot) ve görsel işleme

Şablonlarda sabit resim değil, tanımlı **ImageSlot** bulunur: oran · maske · focus point · fit/fill davranışı · minimum DPI · arka plan politikası · gölge · kenarlık · köşe yarıçapı · kırpma · güvenli alan.

Kullanıcı görseli slota yerleşir, oranına göre kırpılır, ana nesne korunur, gerekirse arka planı kaldırılır, ortak stile uyarlanır; düşük çözünürlük uyarı üretir.

**Arka plan silme** desteklenir ve katmanlıdır: yerel/açık kaynak model → (yalnız onayla) ücretli servis → manuel düzeltme → kenar yumuşatma → şeffaf çıktı → **orijinalin korunması**.

**Görsel standardizasyonu:** aynı projedeki ürün görselleri benzer ışık, doygunluk, arka plan, gölge, perspektif hissi ve kırpma standardına getirilebilir.

## 6.3 Varlık gizliliği ve izolasyon

Müşteri görselleri varsayılan olarak yalnız kendi tenant'ında, kendi müşteri kaydında, kendi projesinde ve yetkili kullanıcılarca görülebilir. Başka müşteriye önerilemez, aramada gösterilemez, örnek tasarımda kullanılamaz, ortak kütüphaneye taşınamaz.

Proje bittiğinde varlık proje içinde kalır; yalnız açık yetkiyle aynı müşterinin yeni projesine taşınır.

**Üretim girdisi olan dosyalar galeri varlığı değildir** ve paylaşılan havuzlara sızmaz.

## 6.4 Asset Marketplace

Lisansı doğrulanmış varlıkların (şablon, dekor, desen, font, sahne, ikon seti, profil paketi) paylaşıldığı veya satıldığı katmandır.

- Her kalem **Asset Registry** kaydıyla gelir; lisans ve kaynak zorunludur.
- Kapsam kontrolü: platform geneli · sektör · tenant · özel.
- Ticari işlemler (satın alma, gelir paylaşımı, faturalama) **STYVA** üzerinden yürür.
- Moderasyon, sürümleme ve geri çekme mekanizması bulunur.
- Müşteri varlıkları buraya asla otomatik akmaz.

## 6.5 Ürün kataloğu ve SWISS entegrasyonu

SWISS_RESTORAN'ın ürün, kategori, seçenek/modifier, alerjen, görünürlük ve QR menü yetenekleri **yeniden yazılmaz**. TEZGÂH'ın görevi bunları kolay kullanmak ve görsel çıktılara bağlamaktır.

**Entegrasyon aşamaları:**

1. **Dosya:** CSV/XLSX dışa ve içe aktarma · kolon eşleme · önizleme · hata raporu · dry-run · **idempotent import** · SKU veya harici ID eşleme.
2. **Sözleşme:** sürümlü JSON katalog sözleşmesi (kategoriler, ürünler, modifier grupları, varlık referansları, dışa aktarma damgası).
3. **API:** katalog çekme · onaylı değişiklikleri gönderme · senkron durumu · çakışma raporu · denetim kaydı.
4. **Olay:** ürün, kategori, fiyat, görünürlük ve varlık değişim olayları.

Katalog değişiminin tasarıma yansıması Bölüm 3.3'teki snapshot kuralına tabidir.

## 6.6 Marka ve tasarım sistemi

**BrandKit** (proje veya müşteri seviyesinde): logo varyantları · renkler · fontlar · slogan · iletişim bilgileri · sosyal hesaplar · ikonlar · desenler · görsel stil · kullanım kuralları.

**Design Tokens:** `brand.primary` · `brand.secondary` · `brand.accent` · `text.heading` · `text.body` · `price.primary` · `spacing.*` · `radius` · `stroke` · `shadow` · `imageTreatment` · `categoryStyle`.

Aynı token farklı üretim profilinde farklı uygulanır: flyer'da bilgi yoğunluğu, tabelada uzaktan okunabilirlik, camda görüş mesafesi ve kesim, tekstilde baskı alanı ve renk sayısı, araçta panel ve eğrilik, sosyalde ekran oranı, menüde sayfa akışı.

---

# BÖLÜM 7 — GENİŞLEME MİMARİSİ

## 7.1 Modüler sektör çalışma alanları

TEZGÂH kapalı bir uygulama değil, ortak çekirdek üzerinde çalışan **modüler dikey çalışma alanları platformudur**. Her sektör kendi sipariş akışına, ölçü ve malzeme bilgisine, tasarım kurallarına, fiyatlandırma modeline, üretim çıktılarına, uzman ajanlarına ve arayüzüne sahip olabilir.

**Kullanıcı yalnızca yaptığı işi görür.** Menü üreticisi tabela araçlarını, tekstilci menü modülünü görmez. Sektör sınırları geçirgendir: bir kullanıcı ek modülleri yetkilendirmeyle açabilir (matbaa menü basabilir, ajans tekstil satabilir, promosyoncu katalog hazırlayabilir).

Sistem şu eksenlerde çalışır: sektör profili · aktif modüller · ek yetenek paketleri · kullanıcı rolü · abonelik ve entitlement.

> **Değişmez ilke:** TEZGÂH herkese her aracı gösteren süper uygulama olmayacak; aynı çekirdek üzerinde her sektöre yalnızca yaptığı işi gösteren uzman çalışma alanları sunacaktır.

## 7.2 Production Profiles

Yeni sektör veya yeni ürün, **çekirdeğe kod eklenerek değil, profil tanımlanarak** gelir.

Bir üretim profili en az şunları bildirir:

```
Profil kimliği ve sürümü
Hedef kullanıcı ve sektör
Sipariş alma şeması (zorunlu / koşullu / opsiyonel alanlar)
Geometri: ölçü kümesi, bleed, güvenli alan, panel ve katlama, baskı alanı
Tasarım kuralları (Rule Engine kural seti referansı)
Tipografi sınırları
Taşma stratejisi
İzinli üretim teknikleri ve malzemeler
Dosya gereksinimleri ve rolleri
Kalite kapıları (INFO/WARNING/BLOCKER kümesi)
Üretim çıktıları ve teslim biçimleri
Fiyatlandırma girdileri
Önizleme türleri
Diğer modüllerle entegrasyon sınırları
```

**Kural:** yeni sektör = yeni profil. Çekirdek değişmez. Profil eklemek çekirdek testlerini kırmamalıdır.

## 7.3 Plugin Architecture

Platform, çekirdeği değiştirmeden genişletilebilir. Uzatma noktaları: üretim profilleri · kural setleri · uzman ajanlar · kalite kontrolleri · içe ve dışa aktarıcılar · bağlayıcılar · varlık sağlayıcıları · render adapter'ları.

Her eklenti bir **manifest** ile gelir: kimlik · sürüm · uyumlu çekirdek aralığı · yetenek beyanı · gerekli izinler · gerekli entitlement · kaynak ve lisans.

İlkeler: eklenti **sandbox** içinde çalışır · yalnız beyan ettiği yetenekleri kullanır · sözleşmeler sürümlüdür · eklenti hatası çekirdeği düşürmez · yükleme, güncelleme ve kaldırma denetlenir.

## 7.4 Integration Connector Layer

Dış sistemlerle tüm entegrasyon **tek bir bağlayıcı modeliyle** yürür: restoran ve POS sistemleri · e-ticaret · muhasebe ve ERP · matbaa ve tedarikçi sistemleri · üretim cihazları (Desktop Agent üzerinden) · bulut depolama · pazarlama kanalları.

Her bağlayıcı bildirir: yetenek listesi · kimlik doğrulama yöntemi · sözleşme sürümü · veri eşleme · hız sınırı · yeniden deneme ve idempotency politikası · hata ve çakışma raporlama · denetim kaydı.

Bağlayıcılar eklenti olarak dağıtılabilir; çekirdek hiçbir dış sisteme doğrudan bağımlı değildir.

## 7.5 Country Package Architecture

Aşağıdakiler çekirdeğe **sabit kodlanamaz**: dil · para birimi · vergi · ölçü birimi · kâğıt standardı · baskı standardı · elektrik standardı · malzeme terminolojisi · işçilik fiyatları · tabela ve cephe mevzuatı · adres, tarih ve sayı biçimi · ülkeye özgü yasal uyarılar.

Bunlar **ülke paketi, bölge paketi, dil paketi, fiyat listesi, mevzuat paketi ve üretim standardı paketi** olarak eklenir ve tenant düzeyinde etkinleştirilir.

Sistem baştan şunları destekler: çoklu dil · sağdan sola yazım · Latin dışı alfabeler · Unicode · yerelleştirilebilir şablon metinleri · çoklu para birimi · metrik ve imperial ölçü · A-serisi ve Letter/Legal · yerel vergi şemaları · bölgesel fiyatlandırma · zaman dilimleri · yerel veri saklama gereksinimleri.

Yeni ülke eklemek çekirdeği çatallamaz, ayrı kod tabanı doğurmaz, mevcut tenant verisini bozmaz.

> **İlke:** TEZGÂH evrensel geliştirilir, ülkelere uyarlanır. Türkiye'de doğar; dünyaya ihraç edilir.

## 7.6 Sektör stüdyoları

Sektör stüdyosu, bir üretim profilinin üzerine kurulmuş **uçtan uca karar ekranıdır**. İki referans stüdyo:

### Tabela Studio

Tabela; malzeme, ölçü, ışık, elektrik, üretim yöntemi, montaj, cephe perspektifi, gece ve gündüz görünümü ve maliyetle **birlikte** değerlendirilir. Müşterinin sorusu şudur: *"Dükkânım bu tabelayla gündüz nasıl, gece nasıl görünecek ve bana maliyeti ne olacak?"*

Kapsam: ışıksız ve ışıklı tabela · vinil germe · pleksi, paslanmaz ve alüminyum kutu harf · kompozit zemin · önden, arkadan (halo) ve kenardan ışıklı harf · lightbox · neon ve LED neon · totem · çıkma tabela · dijital ekran.

Her tasarım en az **gündüz ve gece** görünümünde üretilebilir; ileri seçenekler: yakın plan · karşı kaldırım · araç yaklaşımı · farklı hava koşulları · farklı ışık sıcaklıkları. Simülasyon dekoratif değildir; seçilen gerçek ışık ve malzeme davranışını yansıtmalıdır.

Maliyet girdileri: en ve boy · harf sayısı ve yüksekliği · malzeme tipi ve kalınlığı · LED türü ve yoğunluğu · güç kaynağı · CNC veya lazer kesim · kaynak ve kasa işçiliği · taşıyıcı konstrüksiyon · baskı · folyo · montaj · vinç veya erişim ihtiyacı · nakliye · bölgesel işçilik · vergi ve para birimi.

Onay sonrası üretilebilecekler: müşteri sunumu · teklif · malzeme listesi · ölçü planı · montaj notu · baskı dosyası · kesim dosyası · üretim iş emri.

### Mimari Görselleştirme Stüdyosu

Amaç, sıradan bir telefon fotoğrafını profesyonel bir mimari sunuma dönüştürmek ve müşterinin işletmesini gelecekteki hâliyle görmesini sağlamaktır.

Saha fotoğrafı **profesyonel kabul edilmez**; eğri çekim, perspektif bozukluğu, düşük ışık, düşük çözünürlük, gürültü, yansıma ve renk hataları beklenir. Bu nedenle önce iyileştirme hattından geçer: perspektif ve lens düzeltme · beyaz dengesi · pozlama · gürültü azaltma · keskinleştirme · süper çözünürlük.

Ardından: mekân analizi (duvar, zemin, tavan, cam, kolon, banko, tabela ve menü board alanları) → otomatik yerleştirme (tabela, cam giydirme, logo, menü board, duvar grafikleri) → iç mimari konsept (masa ve sandalye yerleşimi, renk, aydınlatma, dekor, malzeme) → fotogerçekçi sunum.

**Konsept Mockup ile Teknik Proje ayrıdır** ve birbirinin yerine kullanılamaz. Sunum görselleri üretim/montaj çıktısı olarak kullanılamaz; bu ayrım çıktının üzerinde kalıcı biçimde işaretlenir.

---

# BÖLÜM 8 — UYGULAMA VE ÇALIŞMA ZAMANI MİMARİSİ

## 8.1 Editör çekirdeği

Tek editör çekirdeği vardır; ürün başına ayrı editör yazılmaz.

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

Üretim profilleri (flyer, menü, tabela, cam, tekstil, araç, sosyal, ambalaj ve gelecekte eklenecekler) aynı çekirdeği kullanır.

**Serbestlik ile otomasyon dengesi:** kullanıcı otomatik düzeni kullanabilir, alanları kilitleyebilir, kontrollü override yapabilir, belirli alanları otomatik akıştan hariç tutabilir; tasarımı bozacak müdahalelerde uyarılır.

## 8.2 Renderer bağımsızlığı

```text
Domain Model → Layout Result → Renderer Interface
                                ├── Interactive Renderer
                                ├── Vector Renderer
                                └── Server Renderer
```

Render kütüphanesine doğrudan bağımlılık **yalnız adapter içinde** bulunur. Domain kuralları renderer içine gömülemez. Renderer değişimi TDR ve motor değiştirme kapısına tabidir (Bölüm 2.3).

## 8.3 Sipariş alma sihirbazı

Pazarlamacı grafik ayarı görmez. Akış: müşteri → proje → istenen ürünler → ölçüler → logo ve marka → ürün kataloğu → görseller → iletişim ve QR → teslim tarihi → otomatik tasarım üretimi.

**Dinamik sorular:** sorular yalnız seçilen ürünlere göre açılır (tabela seçilmediyse tabela ölçüsü, tekstil seçilmediyse beden ve konum, QR seçilmediyse hedef adres sorulmaz).

**Soru azaltma motoru:** BrandKit varsa renk, logo varsa görsel, bağlı katalog varsa ürünler, müşteri kaydı varsa adres tekrar sorulmaz; geçmiş ölçüler yeniden kullanılabilir.

**Roller:** grafiker otomatik tasarımı inceler, kilitli kuralları aşmadan düzenler, alternatif üretir, sunumu onaylar, baskı dosyasını serbest bırakır. Grafikeri olmayan firmada bu rolün büyük kısmını otomatik tasarım ve kalite kapıları üstlenir.

## 8.4 Desktop Agent (PC Companion)

TEZGÂH uzun vadede yalnızca web uygulaması olmayacaktır. **İsteğe bağlı** çalışan bir masaüstü ajanı mimarisi bulunur.

**Yetenek alanları:** yerel dosya sistemi · toplu klasör işlemleri · PDF üretimi · render · export · GPU hızlandırma · yerel AI · çevrimdışı çalışma.

**Cihaz ve yazılım bağlantısı** (güvenli connector mimarisi üzerinden): üretim cihazları · yazıcılar · RIP · DTF · UV · CNC · lazer · barkod ve etiket yazıcıları. Uygun API veya otomasyon imkânı oluştuğunda profesyonel tasarım yazılımlarıyla (Photoshop, Illustrator, InDesign, CorelDRAW ve benzerleri) entegrasyon desteklenebilir.

**Güvenlik ve sınırlar:**

- Ajan **sandbox** mantığında çalışır.
- **Açık kullanıcı izni olmadan işlem yapmaz.**
- Tüm işlemler denetim izine yazılır.
- Lisans ve entitlement doğrulaması **STYVA** üzerinden yapılır.
- Yerelde işlenen veri politikası açıkça bildirilir.

**Kural:** Desktop Agent çekirdeğin zorunlu parçası **değildir**. Web sürümü ajan olmadan tam çalışabilir olmaya devam eder.

## 8.5 Baskı ve üretim

**Referans A4 profili:** kesim 210 × 297 mm · bleed her kenarda 3 mm · çalışma alanı 216 × 303 mm · güvenli alan kesimden en az 4 mm içeride · hedef 300 DPI · baskı amacı CMYK · proof ve production export **ayrı**.

**Renk yönetimi sunucu tarafındadır.** Tarayıcı önizlemesi baskı garantisi değildir. Sunucu hattında: ICC profilleri · rendering intent · RGB→CMYK dönüşümü · output intent · PDF/X · şeffaflık düzleştirme politikası · font gömme veya outline · overprint kontrolü.

**Dürüstlük kuralı:** sistem, gerçekten sağlamadığı bir çıktı niteliğini (CMYK uygunluğu, PDF/X, ICC) **iddia edemez**. Doğrulanamayan nitelik sessiz geçilmez; INFO seviyesinde açıkça bildirilir.

**Üretim çıktısı taksonomisi:** her çıktı türü (proof, üretim baskısı, kesim dosyası, nakış çıktısı, mockup, sunum, dijital menü ve benzeri) adlandırılmış bir kanaldır; sürüm sayacı taşır ve dosya adlandırma sözleşmesine uyar. Mockup ve sunum çıktıları üretim dosyası yerine geçmez; bu ayrım çıktının kendisinde görünür olur.

**Üretim fiziği profil tarafından tanımlanır:** panel ve katlama haritaları · malzeme payları · ölçek damgaları (büyük formatta 1:10 gibi) · kesim ve nakış kısıtları · teknik–malzeme uyumu · vektör çıktıda metnin eğriye çevrilmesi gibi makine sözleşmeleri.

## 8.6 Performans

**Zorunlu veri setleri:** 20 · 50 · 100 · 200 ürün.

Hedefler: 20 ürünlü belge açılışı p95 < 2 sn · 50 ürünlü belge p95 < 3 sn · 200 ürün paneli sanal listeyle akıcı · sürükleme ve ölçekleme tepkisi < 100 ms · autosave başarı oranı ≥ %99,9 · önizleme render p95 < 15 sn.

İlkeler: ağır işler worker veya kuyrukta · editörde proxy/thumbnail, export'ta orijinal · sayfa dışı render azaltımı · bellek sızıntısı testi · ölçüm rejimi süreklidir.

---

# BÖLÜM 9 — PLATFORM TEMELLERİ

## 9.1 Security Foundation

- Her kayıt **tenant kapsamındadır**; tüm sorgular tenant filtresiyle yürür. Arayüzde gizlemek yetkilendirme değildir.
- Kimlik doğrulama ve yetkilendirme zorunludur; yetki kontrolü sunucu tarafındadır.
- Dosya erişimi imzalı ve kısa ömürlü bağlantılarla olur; depolama yolları tenant ve proje bazlıdır.
- Yüklenen dosyalarda MIME ve imza kontrolü yapılır; vektör dosyalar sanitize edilir; zararlı içerik taranır.
- Render ve dönüştürme işleri izole ortamda çalışır.
- Cross-tenant erişim testleri zorunludur.
- **Denetim izi değişmezdir**; onaylanan sürüm immutable'dır.
- Dış servise veri gönderimi loglanır; müşteri verisi ortak veri setine girmez.
- Bağımlılık zinciri güvenliği (lisans ve zafiyet taraması) sürekli izlenir.

## 9.2 Observability

Platform gözlemlenebilir olmalıdır: yapılandırılmış log · metrik · dağıtık izleme.

İzlenmesi zorunlu alanlar: render ve export kuyruğu ile süreleri · kalite kapısı sonuçları · AI çağrıları (maliyet, gecikme, başarı) · entegrasyon hataları · tenant bazlı kullanım ve kota · hata bütçesi.

**Ayrım:** denetim izi hukuki ve iş kaydıdır, değişmezdir; telemetri operasyoneldir ve örneklenebilir. Telemetri müşteri içeriği taşımaz.

## 9.3 STYVA SaaS Integration

TEZGÂH **bağımsız üründür**; ticari yönetim tamamen STYVA üzerinden yapılır.

| Katman | Sahip |
|---|---|
| Abonelik · lisans · paket · ödeme · entitlement · kota · merkezî admin | **STYVA** |
| Tasarım · üretim · render · AI · sektör stüdyoları | **TEZGÂH** |

**Kurallar:** iki sistem **ortak veritabanı kullanmaz** · iletişim sürümlü sözleşmelerle olur · TEZGÂH lisans ve kota kararını kendi üretmez, STYVA'dan alır · STYVA tasarım verisine doğrudan erişmez · kimlik ve tenant eşlemesi sözleşmeyle taşınır · bağlantı kesildiğinde tanımlı bir tolerans davranışı uygulanır ve durum görünür olur.

## 9.4 STYVA Package Management

Paket, tenant'a açılan yetenek kümesidir: aktif modüller ve sektör stüdyoları · üretim profilleri · AI ajan sınıfları ve kotaları · depolama ve render kotaları · Desktop Agent hakkı · marketplace erişimi · destek düzeyi.

Paketler sürümlüdür; yükseltme ve düşürme davranışı (veri saklama, salt-okunur düşüş, geri yükleme) tanımlıdır. Paket değişimi mevcut veriyi silmez.

## 9.5 Add-on / Entitlement System

Yetenekler **entitlement** ile açılır; kod içinde sabit "premium" kontrolü yapılmaz.

- Entitlement kaynağı STYVA'dır; TEZGÂH bunları yetki kararına çevirir.
- Kontrol noktaları: modül görünürlüğü · profil kullanımı · AI ajan seçimi · kota tüketimi · Desktop Agent bağlantısı · marketplace işlemleri · bağlayıcı kullanımı.
- Kota aşımında davranış nazik düşüştür (görünür bildirim ve engelleme), sessiz başarısızlık değil.
- Entitlement değişimleri denetim izine yazılır.

## 9.6 STYVA Admin Integration

Merkezî yönetim STYVA'dadır: tenant yaşam döngüsü · paket atama · kullanım ve kota görünümü · faturalama · destek işlemleri.

TEZGÂH bu amaçla **okuma ağırlıklı, sözleşmeli** operasyonel uçlar sunar (kullanım özetleri, kota tüketimi, iş durumu, sağlık). Doğrudan veritabanı erişimi yoktur. Yönetimsel eylemler TEZGÂH tarafında **etki** doğurur; karar STYVA'da alınır.

---

# BÖLÜM 10 — YÜRÜTME

## 10.1 Öncelik sırası (yürürlükteki karar)

**A. Canonical Mimari** → **B. Dynamic Composition Engine** → **C. Production Profiles** → **D. SaaS Omurgası**

- **A.** Mimari kararların bu belgeye işlenmesi. *Mimari güncellenmeden yeni modül geliştirmeye alınmaz.*
- **B.** Ortak dinamik kompozisyon motoru: flyer · menü · katalog · broşür · tabela · tekstil · ambalaj için **tek çekirdek**.
- **C.** Yeni modüller çekirdeğe kod eklenerek değil, **profil** tanımlanarak gelir.
- **D.** Tenant · Auth · veritabanı · nesne depolama · olay veri yolu · entitlement; bu aşamada STYVA entegrasyonu tamamlanır.

> **Kural:** Önce mimari, sonra uygulama. Bu karar bundan sonraki tüm geliştirmeler için geçerlidir.

> **Şerh — Geliştirme Operasyonu modülünün yeri (2026-07-19, ürün sahibi direktifi; 11.8'in şart koştuğu sıra kaydı).**
> Bölüm 11 modülü **B tamamlandıktan sonra** (`d46b877`) yürütülür: **Modül Fazı 0 (Package Journal) → Modül Fazı 1 (Cockpit) → ürün sırasına dönüş.**
> Bu modül bir **ürün fazı değildir**; A-B-C-D'nin arasına giren bir **geliştirme altyapısı şerididir** ve C ile D'nin içeriğini değiştirmez.
> Gerekçe direktifte açıktır: Cockpit "geliştirme sürecinin resmî gözlem yüzeyi" ilan edilmiştir — bundan sonraki tüm paketler onun üzerinden izlenecektir, dolayısıyla **sonraki paketlerden önce** var olması gerekir.
> **Şerh güncellemesi (2026-07-20):** Cockpit sonrası **C mi D mi** sorusu kapandı — **C öncelikli** (ürün sahibi kararı; bkz. 11.8 tablosu ve EK-C). Sıra: A→B→**C**→D.

## 10.2 Faz planı

| Faz | İçerik |
|---|---|
| **0** | Kanonikleştirme, eski protokol analizi ve arşivleme, yetenek audit'i |
| **1** | Proje ve sipariş alma omurgası: Customer, Project, teslimat seçimi, ölçüler, Order Intake, BrandKit, Asset Library, rol bazlı sihirbaz |
| **2** | Dinamik kompozisyon çekirdeği: geometri, dinamik grid, tipografi kuralları, simetri, reflow, undo/redo, autosave |
| **3** | Katalog ve restoran entegrasyonu: dosya → sözleşme → API → olay; snapshot ve değişim etkisi |
| **4** | 20–200 ürün zekâsı: adaptif tipografi, kategori dengeleme, görsel yoğunluğu, son satır kompozisyonu, taşma stratejisi, performans |
| **5** | Görsel işleme: ImageSlot, kırpma, focus point, arka plan silme, standardizasyon, Asset Registry |
| **6** | Baskı: sunucu render, CMYK, ICC, preflight, PDF/X, proof, üretim çıktısı |
| **7** | Eşgüdümlü materyal seti ve sektör profilleri |
| **8** | AI: orkestratör, çok-ajanlı uzman mimarisi, kontrollü benzersizlik, kalite puanlama |
| **9** | Platform: tenant, entitlement, marketplace, observability, Desktop Agent |

Fazların altyapısı paralel hazırlanabilir; ancak her materyal **ortak veri, marka ve layout motorunu** kullanmak zorundadır.

## 10.3 Kalite kapıları

| Kapı | Konu |
|---|---|
| **GT-0** | Protokol ve audit: tek kanonik belge, çelişkiler raporlandı, unutulan kararlar sunuldu |
| **GT-1** | Sipariş alımı: tasarım bilgisi olmadan proje açılabiliyor, yalnız ilgili sorular geliyor, tekrar sorulmuyor |
| **GT-2** | Dinamik kompozisyon: 20/50/100/200 ürün, sırıtmayan reflow, simetri, adaptif tipografi, minimum font koruması |
| **GT-3** | Görsel motor: farklı oranlar, ImageSlot, arka plan silme, ortak stil, düşük DPI uyarısı, izolasyon |
| **GT-4** | Katalog entegrasyonu: import/export, dry-run, idempotency, modifier korunumu, snapshot, çakışma raporu |
| **GT-5** | Eşgüdümlü proje: aynı veriden farklı profillere taşınma, marka tutarlılığı, piksel kopya yok |
| **GT-6** | Baskı: CMYK, bleed, güvenli alan, font, preflight, PDF/X, üretim onayı |
| **GT-7** | Güvenlik: cross-tenant testleri, varlık gizliliği, imzalı bağlantılar, dosya güvenliği, denetim izi, değişmez onay |
| **GT-8** | Platform: entitlement zorlaması, kota davranışı, eklenti izolasyonu, Desktop Agent izin ve denetimi |

**READY kararı için ilgili tüm kapılar geçilmelidir.** İnsan turu gereken kapılarda sözlü onay yeterli değildir; kanıt kaydedilir.

## 10.4 Görev formatları

Görev başında:

```text
MODÜL / PROFİL:
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

Görev sonunda:

```text
1. Yapılan değişiklik       9. Güvenlik
2. Sipariş alma katkısı    10. Performans
3. Dinamik tasarım katkısı 11. Bilinen risk
4. Eşgüdümlü materyal      12. Commit
5. Değişen dosyalar        13. PR
6. Migration / veri        14. Rollback
7. Test sonuçları          15. Merge kararı: READY | BLOCKED
8. GT sonucu
```

## 10.5 Uygulama direktifi

```text
TEZGÂH KANONİK UYGULAMA DİREKTİFİ

Sen TEZGÂH reposunda çalışan kıdemli SaaS ürün ve sistem mühendisisin.

Amaç: müşteriden minimum soruyla sipariş alan, ürün ve marka verisini tek projede
toplayan, farklı içerik yoğunluklarında profesyonel ve simetrik tasarımlar üreten,
seçilen tüm materyalleri eşgüdümlü hazırlayan Creative Production SaaS geliştirmek.

Değişmez kurallar:
- Proje merkezlidir; belge merkezli değildir.
- Flyer kırmızı çizgidir ve layout zekâsının ilk kalite referansıdır.
- Tüm çıktılar aynı proje verisinden paralel üretilir.
- Kullanıcıya gereksiz tasarım kararı verdirme; yalnız gerekli soruyu sor.
- Ürün ekleme/çıkarma tasarımı bozmasın; tipografi dinamik, sınırlar korunur.
- Simetri sürekli kuraldır; tasarımlar kontrollü biçimde benzersizdir.
- Müşteri varlıklarını başka müşteriye gösterme; lisans ve kaynağı izle.
- SWISS_RESTORAN'ın olgun ürün/modifier sistemini yeniden yazma.
- Repolar bağımsız kalsın; entegrasyon sürümlü sözleşmelerle olsun.
- Ticari katman STYVA'nındır; TEZGÂH lisans/kota kararı üretmez.
- Tuval durumunu kanonik veri sayma; render'ı adapter arkasında tut.
- Teknoloji seçimini TDR olmadan değiştirme; çekirdeği teknolojiye bağlama.
- Sağlamadığın çıktı niteliğini iddia etme (CMYK/PDF/X/ICC dahil).
- Mock, sahte buton veya yarım akış bırakma.
- Destructive migration yapma; additive migration ve rollback kullan.
- Eski protokolleri analiz etmeden arşivleme.
- Tüm ilgili GT kapıları geçmeden READY deme.
- Yeni modülü Canonical güncellenmeden geliştirmeye alma.
```

---

# BÖLÜM 11 — GELİŞTİRME OPERASYONU

## 11.1 Kapsam ve sınır

Bu bölüm, TEZGÂH'ın **kendi geliştirme sürecini** gözlemlenebilir kılan modülü tanımlar: teslim edilen her paketin kaydı (**Package Journal**) ve bu kaydın okunduğu yüzey (**Developer Cockpit**).

**Bu bölüm modül mimarisini tanımlar; geliştirme yönetişiminin kendisini (kapıların içeriği, merge/onay yetkisinin kime ait olduğu, rapor biçimi) tanımlamaz.** Yönetişim kurallarının bu belgeye taşınıp taşınmayacağı **EK-C / A-04**'te açıktır; bu bölüm o soruyu kapatmaz. Cockpit, yürürlükteki yönetişim ne ise onu **gösterir**; onu **üretmez**.

*Ayrım:* 11.7'nin getirdiği yetki **kontrol noktası** bir modül-içi tasarım şartıdır (eylem üreten uç tek bir noktadan geçsin), yetki **modeli** değildir. Kimin neye yetkili olduğu bu bölümün dışındadır.

**Bölüm 5.3 ile karıştırılmamalıdır.** 5.3'teki çok-ajanlı uzman mimarisi, **ürünün müşteriye sunduğu** yapay zekâ yeteneğidir; ajan seçimi tenant, lisans paketi ve kota ekseninde yapılır. Bu bölümde geçen ajanlar **TEZGÂH'ı geliştiren** ajanlardır: müşteri kotasına yazılmaz, entitlement'a tabi değildir, müşteri verisine erişmez. İki mimari birbirinin yerine kullanılamaz; ortak terim kullanılacaksa hangi mimariye ait olduğu her seferinde belirtilir.

## 11.2 Çözülen sorun

Bir paketin kalite kapısı sonucu — test sayısı, tip denetimi, lint ihlali, paket boyutu, süre — bugün yalnız **koşum anının terminal çıktısında** yaşar ve oturum kapanınca kaybolur. Kalıcı iz, teslim belgelerine düzyazı olarak elle düşen cümlelerdir: şemasız, ayrıştırılamaz, commit ile bağı kurulmamış, hiçbir mekanizmayla doğrulanmamış.

Bölüm 9.2 gözlemlenebilirlik başlığı altında **kalite kapısı sonuçlarının izlenmesini zorunlu kılar.** Bu zorunluluğun geliştirme sürecindeki karşılığı bugün yoktur. Package Journal bu boşluğu kapatır; Cockpit onu görünür kılar.

## 11.3 Package Journal — tek doğruluk kaynağı

**İlke:** Geliştirme sürecine dair gösterilen her **ölçüm** Package Journal'dan gelir. Cockpit hiçbir ölçümü kendisi türetmez, tahmin etmez, elle girilmiş metinden veya kaynak koddan statik sayımla üretmez. Journal'da karşılığı olmayan bilgi **ölçüm olarak gösterilmez**.

Bu kuralın iki sınırlı istisnası vardır ve ikisi de **işaretlenmek** zorundadır: dış sistemlerin anlık durumu (aşağıda, canlı okuma) ve niyet bilgisi (11.4, plan sınıfı). İşaretsiz hiçbir bilgi ölçüm alanında yer alamaz.

**İki kayıt türü vardır.**

**(a) Paket kaydı** — kayıt birimi pakettir; en az şunları taşır:

| Küme | İçerik |
|---|---|
| Kimlik | Paket adı · amaç · başlangıç ve bitiş anı |
| Canonical Traceability | Sürüm · bölüm(ler) · ADR/TDR · etkilenen modüller ve sözleşmeler · kapsam ve kapsam dışı · risk sınıfı |
| Aşama | Bölüm 11.5'teki yaşam döngüsü konumu |
| Aktör | İşi yürüten insan ve/veya geliştirme ajanları ve rolleri. **Bu alan aktörün kanonik tanımıdır**; 11.7 buna atıf yapar. Aktörün anlık durumu burada değil, olay kaydında yaşar |
| Kapı ölçümleri | Her kapının adı, sonucu, sayısal değeri ve **ölçüldüğü an** |
| Doğrulayıcı | İkinci doğrulayıcının kararı ve bulguları |
| Git | Temel commit · paket commit'leri · merge commit · dal adı |
| Risk | Kalan riskler ve açık kalemler |

**(b) Olay kaydı** — paketten ince taneli, zaman damgalı, sıralı; her olay bir aktör taşır. Aşama geçişleri, kapı koşumları, ajan başlangıç/bitişleri ve durum değişimleri, doğrulayıcı bulguları birer olaydır. Modül fazı 2'nin canlı aktivite akışı bu kayıt türünü okur; paket kaydından türetilemez.

**Canlı okuma istisnası.** **Dış sistem**, TEZGÂH'ın kendi kaydını tutmadığı, durumu yalnız kendisine sorularak öğrenilen sistemdir (kod deposu, dağıtım ortamı, konteyner, kuyruk, işçi, render ve export hatları, depolama, sağlık uçları). Bunların **anlık durumu** Journal'da geçmiş kayıt olarak yaşamaz; canlı okumadır. Cockpit gösterebilir, ancak **canlı okuma olduğu ve okunduğu an** görünür biçimde işaretlenir; geçmiş ölçüm gibi sunulamaz.

İstisna **yalnız anlık duruma** uygulanır. Aynı dış sistemden gelse bile bir **olay** (ör. dağıtım gerçekleşti, kapı koşuldu) olay kaydına yazılır ve Journal rejimine tabidir. Kalite kapısı sonuçları hiçbir koşulda bu istisnaya girmez.

**Değişmezlik.** Journal append-only'dir. Hiçbir kayıt yerinde değiştirilmez. Bu, hem düzeltme hem **normal ilerleme** için geçerlidir: bir paketin aşaması veya bir aktörün durumu değiştiğinde mevcut satır güncellenmez, yeni bir olay kaydı eklenir. Paket kaydındaki aşama ve aktör durumu, o paketin olay akışının **son hâlidir** — bağımsız olarak yazılan bir alan değil, türetilen bir görünümdür. Bu, Bölüm 9.2'nin denetim izi sınıfıdır — telemetri değildir, örneklenemez.

**Ölçüm dürüstlüğü.** Journal yalnız **gerçekten koşulmuş** ölçümü kaydeder. Koşulmayan kapı "geçti" olarak yazılamaz; atlanan kapı **atlandı** olarak yazılır; ölçülemeyen değer **ölçülemedi** olarak yazılır. Bölüm 10.5'in "sağlamadığın çıktı niteliğini iddia etme" kuralı burada da geçerlidir.

**Kaynak dürüstlüğü.** Her ölçüm, üretildiği komutla birlikte kaydedilir. Journal **türetilmiş veya tahmini bir değer taşıyabilir** (ör. tahmini bitiş anı), ancak bu değer kayıtta ölçülmüş değerden **ayırt edilebilir biçimde işaretlenir** ve Cockpit işareti birlikte gösterir. Yasak olan tahminin varlığı değil, tahminin **ölçüm gibi sunulmasıdır**.

## 11.4 Fazlar

Modül dört **modül fazında** gelir. Her faz kendi paketidir; bir sonraki faz, öncekinin kaydı olmadan başlatılmaz.

> **Adlandırma uyarısı:** Buradaki "Modül Fazı 0-3", Bölüm 10.2'deki **program fazlarından (0-9) farklıdır** ve onlarla eşleşmez. Bu bölümde faz numarası geçtiğinde daima modül fazı kastedilir.

**Modül Fazı 0 — Package Journal.** Ekran yok. Tek iş, yukarıdaki kaydın üretilmesi, saklanması ve şemasının sabitlenmesi. Bu faz olmadan sonraki fazlar gösterecek veri bulamaz; elle doldurulan bir panel, ölçüm gibi görünen bir tahmin üretir ve 11.3'ü ihlal eder.

**Modül Fazı 1 — Salt-okunur Cockpit.** Journal'ın okunduğu yüzey. Hiçbir işlem düğmesi yoktur.

Yüzey **iki veri sınıfı** taşır ve bunlar görsel olarak ayrışır:

- **Ölçüm sınıfı** — aktif paket · paket zaman çizelgesi (11.5) · kalite kapısı sonuçları · Canonical izlenebilirlik · Package Journal geçmişi · git durumu. Her alan Journal'daki bir alana birebir karşılık gelir; karşılığı olmayan ölçüm alanı **eklenmez**.
- **Plan sınıfı** — yol haritası ve modül kaydı gibi, henüz ölçülmemiş niyet bilgisi. Kaynağı programın kendi planlama kayıtlarıdır, Journal değildir. Bu sınıf **plan olarak işaretlenir** ve hiçbir koşulda ölçüm gibi sunulmaz.

Ayrım kritiktir: 11.3'ün "Journal'da karşılığı olmayan bilgi gösterilmez" kuralı **ölçüm sınıfını** bağlar. Plan sınıfı yasak değildir; ölçüm kılığına girmesi yasaktır.

**Modül Fazı 2 — Canlı entegrasyon ve olay akışı.** İki iş yapar: (a) **dış sistemlerin** (11.3'teki tanım ve liste) anlık durumunun canlı okumayla gösterimi; (b) **canlı aktivite akışı** — olay kayıtlarının zaman damgalı, sıralı gösterimi. Akış bir kayıt türüdür, bir animasyon değildir; kaynağı 11.3(b) olay kaydıdır. Bu faz gözlem amaçlıdır; eylem üretmez.

**Modül Fazı 3 — Kapı-içi operasyonlar.** Panelden iş tetikleme. **Açılabilecek kalemler:** test koşumu, derleme, önbellek temizliği, işçi yeniden başlatma, kuyruk yönetimi, sağlık denetimi — hepsi geri alınabilir ve hiçbiri main'e yazmaz.

**Kapalı kalemler:** *merge başlat* ve *dağıtım başlat*. Bunlar bu fazın önerilen ama **açılmamış** kalemleridir. Merge kalemi, 11.6'ya uygun olmadan ve **ADR-007** karara bağlanmadan açılamaz. Dağıtım kalemi 11.6 gereği **kategorik olarak kapalıdır** ve ADR-007'nin kararı ne olursa olsun bu bölümle açılmaz.

## 11.5 Paket yaşam döngüsü

Bir paket şu aşamalardan geçer; Cockpit paketin hangi aşamada olduğunu tek bakışta gösterir:

`Planlama → Canonical kaydı → Geliştirme → Test → İkinci doğrulayıcı → Hazır → Merge → Dağıtım`

Aşama, Journal'daki bir alandır; gözlemden türetilir, elle işaretlenmez. Geriye dönüş (ör. doğrulayıcının bulgu çıkarması) geçerli bir geçiştir ve kayda geçer; aşama sessizce ileri atlamaz.

## 11.6 Cockpit yönetişim kapılarını aşamaz

**İlke:** Cockpit bir **icra yüzeyidir, yetki kaynağı değildir.** Bir işlem panelden tetiklenebiliyorsa, o işlemin kapısı **düğmenin içinde** olmak zorundadır; operatörün disiplininde değil. Panelden yapılabilen hiçbir şey, aynı işlemin panel dışında tabi olduğu kapıdan muaf değildir.

Bundan çıkan üç sonuç:

1. **Kapı atlanamaz.** Bir düğme, arkasındaki kapı yeşil değilken işlemi başlatamaz. Kapının yeşil olduğu iddiası Journal'daki ölçüme dayanmalıdır; "muhtemelen geçer" bir gerekçe değildir.
2. **Yarım akış bırakılamaz.** Bölüm 10.5 "mock, sahte buton veya yarım akış bırakma" der. Çok adımlı bir süreç düğmeye bağlanacaksa, düğme sürecin **tamamını** yürütmeli veya hiç var olmamalıdır. Adımların bir kısmını yürütüp gerisini insana bırakan düğme, tamamlandı izlenimi üretir.
3. **İnsan turu gereken kapı otomatikleştirilemez.** Bölüm 10.3, READY kararı için ilgili tüm kapıların geçilmesini ve insan turu gereken kapılarda **sözlü onayın yeterli olmadığını, kanıt kaydedilmesini** şart koşar. Görsel yargı gerektiren kapılar (ör. GT-2'nin "sırıtmayan reflow, simetri" ölçütü) yeşil testle ikame edilemez.

**Canlı ortama dağıtım kararı bu modüle devredilemez.** Bu karar ürün sahibine rezervedir; Cockpit onu hazırlayabilir ve gösterebilir, yerine geçemez. *Bu hüküm bu bölümün ürettiği bir yetki kuralı değildir; yürürlükteki süreç belgelerinde (`docs/00_READ_FIRST.md`, program kokpiti) ürün sahibine ayrılmış kararlar arasında zaten yazılıdır ve buraya olduğu gibi aktarılmıştır — bkz. EK-C / A-04, A-07.*

> **Terim uyarısı:** Buradaki **dağıtım**, yazılımın canlı ortama alınmasıdır. Belgenin geri kalanında "üretim" ve "üretim serbest bırakma" (4.7, 5.1) **baskı/imalat** anlamındadır; iki kavram birbirinin yerine kullanılamaz. Bu bölüm daima "dağıtım" der.

## 11.7 Yetkilendirme — sözleşmede yer, uygulamada erteleme

Cockpit bugün tek operatörlü bir yüzeydir; rol modeli **uygulanmaz**. Ancak sözleşmede yeri **şimdiden ayrılır**:

- Journal'ın her kaydı bir **aktör** alanı taşır — tanımı 11.3'tedir (paket kaydında kimlik ve rol, olay kaydında durum).
- Eylem üreten her uç, tek bir **yetki kontrol noktasından** geçer; bu nokta bugün "izin ver" döner.
- Denetim kaydı, rol modeli geldiğinde geriye dönük anlam kaybetmeyecek biçimde tutulur.

Böylece Bölüm 9.1 ve 9.3 ile birlikte çok kullanıcılı yetkilendirme geldiğinde sözleşme yeniden açılmaz. Yetki modelinin kendisi bu bölümün kapsamı dışındadır.

## 11.8 Modülün açık soruları

| Soru | Durum |
|---|---|
| Panelden otomatik merge yetkisi hangi koşulda doğar? | **ADR-007** — karara bağlanmadı |
| Geliştirme yönetişimi bu belgeye mi taşınacak? | **EK-C / A-04** — açık; bu bölüm kapatmaz |
| Süreç belgelerinin çelişki sıralamasındaki rütbesi | **EK-C / A-07** — açık; ADR-007 buna bağlı |
| Journal'ın saklama yeri ve biçimi | **KAPANDI — `docs/tdr/TDR-001.md`** (2026-07-19): git-izlenen, hash-zincirli JSONL; `docs/journal/events/<package_id>.jsonl`. Migration yok, yeni bağımlılık yok |
| Bu modülün Bölüm 10.1 yürütme sırasındaki (A→B→C→D) yeri | **KAPANDI — bkz. 10.1 şerhi** (2026-07-19, ürün sahibi direktifi): modül **B'den sonra**, geliştirme altyapısı şeridi olarak sıralandı |
| Cockpit sonrası ürün sırası: **C** (Production Profiles) mi, doğrudan **D** (SaaS) mi? | **KAPANDI — C öncelikli (2026-07-20, ürün sahibi kararı).** C (Production Profiles) atlanmayacak; sıra Canonical 10.1'e göre A→B→**C**→D. İlk C paketi: C-P0 Üretim Profili Kimlik Katmanı (ilk profil: flyer). "Öncelikli SaaS paketleri" ibaresi D'yi **C'den sonraya** koyar, C'yi atlamaz |

---

# EK-A — TECHNOLOGY REFERENCE STACK

> **Bu bölüm mimari karar değildir.** Yalnızca güncellenebilir referans listesidir.
> Buradaki hiçbir teknoloji çekirdeğin değiştirilemez parçası değildir; değişim **TDR** ile yapılır.

| Yetenek (port) | Referans adaylar |
|---|---|
| Etkileşimli tuval | Konva · React-Konva |
| Görsel işleme ve onarım | Sharp · OpenCV · Real-ESRGAN · LaMa |
| PDF üretimi ve düzenleme | pdf-lib |
| Vektör optimizasyonu | SVGO |
| Font ve tipografi | OpenType.js |
| Renk yönetimi | LittleCMS |
| 3B ve sahne | Three.js |
| Nesne depolama | MinIO (S3 uyumlu) |
| Kuyruk ve arka plan işleri | Redis · BullMQ |
| Arama | Meilisearch · OpenSearch |
| Gözlemlenebilirlik | OpenTelemetry · Prometheus · Grafana |
| Dosya güvenliği | ClamAV |
| AI çalışma zamanı ve modeller | ComfyUI · Diffusers · Segment Anything · ControlNet · Grounding DINO |

Liste zamanla güncellenir; güncelleme bu belgenin gövdesini değiştirmez.

**Değişmez ilke:** TEZGÂH'ın rekabet avantajı kullandığı kütüphaneler değildir. Kalıcı değer; sektör uzmanlığı · modüler mimari · AI Orchestrator · sektör stüdyoları · baskı ve üretim motorları · workflow · rule engine · kalite kontrolü · STYVA entegrasyonu ve açık, değiştirilebilir teknoloji mimarisi üzerine kurulur. **Teknolojiler değişebilir; mimari korunur.**

---

# EK-B — KARAR KAYDI

**Sürüm 4.0.0'da alınan ve kesinleşen kararlar**

| # | Karar |
|---|---|
| K-01 | Belge profesyonel mimari doküman düzenine getirildi; tekrar eden hükümler tek başlık altında birleştirildi. |
| K-02 | Teknoloji isimleri gövdeden çıkarıldı, **EK-A**'ya taşındı ve bağlayıcı olmadığı ilan edildi. |
| K-03 | **Open Source First** ve **Technology Independence** ilkeleri anayasa düzeyine alındı. |
| K-04 | **ADR/TDR ayrımı** kuruldu; mimari ve teknoloji kararları ayrı numaralandırılır. ✅ **Şerh (v4.2.0):** çakışma **icra edildi** — §0.3 eşleme şerhi + canlı atıf nitelemesi; arşiv korundu, yeniden adlandırma yapılmadı (EK-C / A-08 KAPANDI). |
| K-05 | **Multi-Agent Expert Architecture** benimsendi; ajan seçimi görev, tenant, lisans, performans, kalite ve maliyete göre orkestratörce yapılır. |
| K-06 | **Quality Gate Engine** tek model olarak kuruldu (INFO/WARNING/BLOCKER, kayıtlı onay, değişmez denetim izi). |
| K-07 | **Production Profiles** genişlemenin tek yolu ilan edildi: yeni sektör = yeni profil, çekirdek değişmez. |
| K-08 | **Plugin Architecture**, **Integration Connector Layer**, **Asset Registry** ve **Asset Marketplace** mimariye eklendi. |
| K-09 | **STYVA sınırı** kesinleşti: ticari katman STYVA'nın, üretim katmanı TEZGÂH'ın; ortak veritabanı yok. |
| K-10 | **Desktop Agent** yol haritasına alındı; opsiyonel, sandbox, izinli, denetlenen, entitlement doğrulamalı. |
| K-11 | **Country Package Architecture** ile yerel farklar çekirdekten ayrıldı. |
| K-12 | **Observability** ve **Security Foundation** ayrı platform temelleri olarak tanımlandı. |
| K-13 | Yürütme sırası **A→B→C→D** olarak sabitlendi; mimari güncellenmeden yeni modül geliştirilmez. |
| K-14 | Baskıda **dürüstlük kuralı**: sağlanmayan çıktı niteliği iddia edilemez; doğrulanamayan nitelik açıkça bildirilir. |
| K-15 | Üretim çıktısı taksonomisi, sürüm sayacı, dosya adlandırma sözleşmesi ve mockup ≠ üretim ayrımı mimariye taşındı. |

**Sürüm 4.1.0'da alınan kararlar**

| # | Karar |
|---|---|
| K-16 | **Package Journal** geliştirme sürecinin **ölçüm** verisinde tek doğruluk kaynağı ilan edildi; iki kayıt türü (paket + olay), append-only, ölçüm dürüstlüğü şartlı. İki sınırlı istisna: dış sistemlerin anlık durumu **işaretli canlı okumadır** (11.3); yol haritası gibi niyet bilgisi **işaretli plan sınıfıdır** (11.4). Her ikisi de ölçüm gibi sunulamaz. |
| K-17 | Modül dört **modül fazına** ayrıldı (Journal → salt-okunur → canlı gözlem → kapı-içi operasyon); her faz ayrı pakettir. Bu numaralandırma Bölüm 10.2'nin program fazlarından ayrıdır. |
| K-18 | **Cockpit yetki kaynağı değil, icra yüzeyidir**; panelden yapılabilen hiçbir işlem, panel dışındaki kapısından muaf değildir (Bölüm 11.6). |
| K-19 | Geliştirme ajanları ile **ürün** ajanları (Bölüm 5.3) kavramsal olarak ayrıldı; entitlement ve kota yalnız ikincisine uygulanır. |
| K-20 | Cockpit için **yetkilendirme sözleşmede yer ayırdı, uygulaması ertelendi** (aktör alanı + tek yetki kontrol noktası). |

**Devralınan kararların durumu**

Önceki anayasadan gelen hükümlerin sınıflandırması ve V3.1'de karşılığı bulunmayan hükümlerin listesi `docs/archive/protocols/2026-07/DEVIR_RAPORU.md` içindedir. Bu sürümde söz konusu hükümlerin mimari karşılığı olanlar ilgili bölümlere yerleştirilmiştir (Asset Registry, Quality Gate Engine, üretim çıktısı taksonomisi, migration disiplini, denetim izi değişmezliği, üretim fiziği, mockup ayrımı, harici sözleşme deseni). Yerleştirilemeyenler **EK-C**'dedir.

---

# EK-C — AÇIK MADDELER

Aşağıdakiler ürün sahibi kararı bekler; karara bağlandıkça ilgili bölüme işlenir ve buradan düşer.

| # | Konu | Neden açık |
|---|---|---|
| A-01 | Yaşam döngüsü sözlüğü göçü | Uygulamada birden çok durum sözlüğü var; Bölüm 3.4'e yakınsama planı ve göç adımı gerekiyor. |
| A-02 | SaaS omurgasının zamanlaması | Sıra D olarak sabitlendi; pilot yerel çalıştığı için geçiş anı ayrıca kararlaştırılacak. |
| A-03 | Glif ve karakter kapsam politikası | Mevcut sert engelleme ile Latin dışı alfabe hedefi birlikte yaşayamaz; kural yeniden tanımlanmalı. |
| A-04 | Geliştirme yönetişimi (kapı, yetki, rapor biçimi) | Süreç kuralları bu belgeye mi taşınacak, ayrı süreç belgesinde mi kalacak? |
| A-05 | Geri açılan kapsam kararları | Mimari görselleştirme, arka plan silme ve çok kullanıcılı yetki eskiden kapsam dışıydı; yeni kapsam kayda geçti, uygulama sırası belirlenecek. |
| A-06 | Ölçüm rejiminin Bölüm 8.6 ile eşlenmesi | Bugünkü ölçümler farklı eksende; p95, kuyruk ve autosave metrikleri eklenecek. |
| A-07 | Süreç belgelerinin çelişki sıralamasındaki rütbesi | Merge/push yasağı `docs/00_READ_FIRST.md`'de yaşıyor; bu dosya Bölüm 0.2'nin altı kademesinden hiçbirine karşılık gelmiyor. Yasak geçersiz değil, rütbesi tanımsız. **A-04 ile birlikte çözülmeli**; ADR-007 buna bağlı. |
| A-08 | ADR numaralandırma çakışmasının icrası | **KAPANDI (2026-07-20).** Çözüm: yeniden adlandırma yok, arşiv korundu; çakışma §0.3 **eşleme şerhiyle** ve canlı atıfların açık nitelenmesiyle giderildi (`assets.ts`, `TODO.md` → "arşiv CONSTITUTION teknoloji ADR-n"). Kalan tek canlı atıf `apps/web/src/store/editorStore.ts:1` (ADR-6) UI paketinde ve o paket bu turda kapsam dışıydı; §0.3 eşleme şerhi onu da kanonik olarak disambigüe eder, yorum güncellemesi UI paketine bırakıldı. |

---

# EK-D — SÖZLÜK

**Creative Document** — sürümlü, render'dan bağımsız kanonik tasarım belgesi.
**Production Profile** — bir ürün veya materyal türünün geometri, kural, teknik ve çıktı sözleşmesi.
**Sektör Stüdyosu** — bir profil üzerine kurulmuş uçtan uca karar ekranı.
**Quality Gate** — INFO/WARNING/BLOCKER seviyeli kalite kapısı.
**Entitlement** — STYVA'dan gelen; bir tenant'ın hangi yeteneği hangi kotayla kullanabileceğini belirten hak.
**designSeed** — tasarımın tekrar üretilebilir varyasyon tohumu.
**ADR / TDR** — mimari karar kaydı / teknoloji karar kaydı.
**Desktop Agent** — opsiyonel masaüstü yardımcı; yerel dosya, cihaz ve yazılım köprüsü.
**Asset Registry** — her varlığın kaynak, lisans, türev ve bütünlük kaydı.
**Package Journal** — geliştirme sürecinin append-only kaydı; Cockpit'in tek veri kaynağı.
**Developer Cockpit** — Package Journal'ın okunduğu ve (modül fazı 3'te) kapı-içi işlem tetiklenen yüzey.
