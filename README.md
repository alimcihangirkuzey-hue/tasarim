# TEZGÂH

Fransa'daki Türk restoranları/dönerciler için grafik atölyesi otomasyon sistemi.
Anayasa ve tam spesifikasyon: **CONSTITUTION.md** (önce onu oku). Faz 1 tasarım
detayları: **FAZ1-GOREV.md**.

**Mevcut durum: Faz 5 — Menü Yoğunluğu + Kişiselleştirme** (Faz 4 üzerine:
A4 3-sütun yoğun menü varyantı, katalog yapıştır-içe aktarma (önizleme + atlanan
satır listesi), belgede tıkla-takas ürün değiştirme, sürükle-bırak kategori/ürün
sıralaması (saf pointer-events), kullanıcı font yükleme + FR/TR glif kapsam bekçisi
(mimar #18), şablon seçim rehberi ("Bu iş ne?"), QR dijital menü v1 (tek dosyalık
statik HTML, çevrimdışı). Faz 5 detayları: **FAZ5-GOREV.md**.

## Gereksinimler

- Node.js **20+** (22 önerilir) — https://nodejs.org
- İlk kurulumda internet (paketler iner); sonrası tamamen çevrimdışı çalışır (M7)

## Kurulum ve çalıştırma

```bash
npm install        # repo kökünde, tüm workspace'leri kurar
npm run dev        # server (3001) + web (5173) birlikte açılır
```

Günlük başlatma: **start-tezgah.bat** (çift tık) — server+web'i açıp pencereyi açık tutar.

Tarayıcıda: **http://localhost:5173**
API sağlık kontrolü: http://localhost:3001/api/health

Veriler `data/` klasöründe yaşar (SQLite + görseller). **Yedek = bu klasörü kopyalamak.**
`data/` git'e girmez.

## Faz 5 el testi (kabul senaryosu — FAZ5-GOREV §10)

1. Yazı yoğun menü belgesinde (menu-liste-premium) **format a4-portrait + Sütun: 3** →
   yoğun varyant; 75 ürün tek sayfaya sığar, font 2-sütundan büyük kalır, taşma uyarısı yok.
2. Katalog → **Yapıştırarak ekle**: "KATEGORİ: …" + "Ad | fiyat | açıklama" karışık biçim
   (bozuk satırlar "atlandı" listesinde) → önizleme sayıları doğru → Sona ekle; Geçmişten
   geri yükle bayt-birebir döner (içe aktarma öncesi otomatik kayıt).
3. Editörde bir üründe **Ürünü değiştir** (aynı kategori, arama) → seçilen ürün sırası
   korunarak gelir; export yeni versiyon açar.
4. Seçim panelinde kategori/ürünü **sürükle** (⠿) ya da ↑↓ → yenilemede kalıcı; PDF sırası
   birebir; katalog ana sırası da sürüklenip kalıcı.
5. Ayarlar → **Fontlar**: TR+FR tam bir woff2/ttf yükle → marka kiti & tema seçicilerinde
   görünür, print PDF'e gömülür; glifi eksik font **RED + eksik glif listesi**; kullanımdaki
   font silme **409** (nerede kullanıldığı).
6. Yeni belge akışında **"Bu iş ne?"** rehberi → "Yazı yoğun menü" Premium Yazılı'yı açar;
   "Şablonu doğrudan seç" tam listeye geçer.
7. Belgeler'de **Dijital menü üret** → tek dosyalık HTML; `file://` ile çevrimdışı açılır
   (harici istek yok), kategoriler + fiyat + halal + saat doğru; menü şablonunun QR kaynağı
   "menu" seçilince `menu_url`'i kodlar.

## Faz 4 el testi (kabul senaryosu — FAZ4-GOREV §14)

1. Üst barda **Ayarlar** → Temalar: yeni tema türet (renk/font), canlı önizleme gerçek
   grid şablonu; kaydet → editör tema listesinde ★ ile görünür; yerleşikler silinemez.
2. Katalog → **Toplu güncelle**: "%5 + X,90" önizleme tablosu (eski→yeni) → Uygula;
   Geçmiş sekmesinden geri yükle → fiyatlar birebir döner.
3. Editör Geçmiş → **⤺ Bu versiyona dön**: belge eski duruma döner; dönüş öncesi
   "güvenlik kaydı (dönüş öncesi)" satırı düşer.
4. Üst barda **Yedek al** → tezgah-yedek-*.zip iner (app.db + assets + exports).
5. Grid belgede **Sayfa akışı: multipage** + büyük katalog → sayfa sekmeleri; devam
   sayfaları ince bantlı ("Page N/M"); PDF sayfa sayısı editörle aynı; taşma uyarısı yok.
6. Görseller sekmesinde fotoğrafa **etiket** yaz (ör. "adana") → fotosuz "Assiette
   Adana" ürününde editör eksik-foto panelinde **Öneri — bağla** çipi → tek tık bağlar.
7. Ayarlar → Parse Sözlüğü: "cephe → tabela" ekle → Sipariş yapıştır'da "ürün: cephe
   panosu" artık Tabela çözülür (aynı oturumda).
8. Görselde ✕: kullanılan foto silinemez (nerede kullanıldığı listelenir); kullanılmayan
   silinir (orig/master/thumb üçü de).
9. Müşteri genel sekmesinde **📦 Açılış Takımı oluştur** → proje + 4 kalem
   (vitrophanie ölçü bekliyor).
10. Ayarlar → **Şablon Fabrikası**: `packages/templates/test-assets/factory-sample.svg`
    yükle → başlık/logo/halal/tel/saat/dipnot slotlarını işaretle → proto hücrede
    name/price/photo eşle → Üret → yeni şablonla belge aç, katalog verisi dolar (≤10 dk).
11. Editörde **Print (CMYK)**: Ghostscript kuruluysa aktif (son print PDF'ten
    _print-cmyk.pdf); değilse pasif + kurulum ipucu.

## Faz 3 el testi (kabul senaryosu — FAZ3-GOREV §8)

1. Müşteri → **Sahneler** sekmesi → vitrin fotoğrafı yükle → 4 köşe tutamacını sürükle
   (canlı önizlemede örnek tasarım cama "yapışır") → kaydet. "Ortak" sekmesindeki
   sahneler her müşteriden görünür ve yönetilir.
2. Editörde herhangi bir belgede **Mockup** → sahne seç → `data/exports/{musteri}/`
   altına JPG düşer; geçmişte "mockup" türüyle listelenir.
3. **Vitrophanie** belgesi (cm bazlı): mode `impression|decoupe`, **miroir** (iç yüz)
   rozetle gösterilir; découpe SVG exportunda **hiç `<text>` kalmaz** (fontkit text→path),
   raster logo varsa export 400 ile reddedilir.
4. 500 cm'den uzun kenar → PDF **1:10** iner ve "ÉCHELLE 1:10" damgası basılır.
5. **Tabela** (enseigne): zemin-metin kontrastı < 3:1 ise editörde görünür uyarı (M4).
6. **Tişört/önlük**: alan seçimi (göğüs sol/sırt/kol...), koyu kumaşta otomatik mono
   logo; impression → alan başına **300 dpi alfa PNG** (30 cm = 3543 px) + PDF;
   broderie → alan başına text→path SVG + A4 **Broderie Fişi** (iplik/renk/ölçü).
7. Projeden sunum üretirken **"Mockup'ları ekle"** açıksa her belgenin son mockup'ı
   karttan sonra tam sayfa gelir ("Mise en situation").
8. Sipariş kaleminden **Tasarıma başla**: vitrophanie/tabela/tişört kalemleri ölçü ve
   teknikleriyle doğru şablona akar (ör. 180×120 dış cam → vitro-centre, impression).

## Faz 2 el testi (kabul senaryosu — FAZ2-GOREV §9)

1. Müşteri → **Projeler** sekmesi → "Sipariş yapıştır"a pazarlamacı metnini yapıştır →
   Çözümle → eşleşme/yeni müşteri onayı → proje + kalemler açılır (ham metin saklanır).
2. Ölçüsüz tabela kalemi kırmızı "eksik" rozetli; durumunu değiştiremezsin — ölçü gir, geçer.
3. Kalemde **Tasarıma başla** → şablon önerisi → belge projeye açılır, kalem "Tasarımda".
4. Belge/müşteri **Klonla** → benzer dönerciden yeni dönerci + ilk PDF dakikalar içinde.
5. Trifold/Flyer/Sadakat kartı belgeleri: 2 sayfalı editör, katlama kılavuzları yalnız
   print PDF'te; flyer arkasında çift saat + teslimat bloğu (boşsa gizli); QR "QR göster"
   parametresiyle menülere de eklenebilir.
6. Projeden **Sunum PDF'i oluştur** → kapak + sunum kartları + BAT (imza) sayfası.
7. Editör sağ panelinde **Geçmiş**: tüm exportlar v numarasıyla; 📂 klasörde gösterir.
8. Ortak havuz: Görseller sekmesinde "Ortak havuza" yükle → tüm müşterilerin
   seçicilerinde "Ortak" sekmesinde görünür.

## Faz 1 el testi (kabul senaryosu — FAZ1-GOREV §7)

1. Müşteri aç → **Katalog** sekmesinde kategori/ürün/varyantlı fiyat gir (Ctrl+S kaydeder).
2. **Belgeler** sekmesi → "Resimli Izgara Menü" ile yeni belge → editör açılır, menü
   katalogdan otomatik dolar.
3. Editörde: hücreye tıkla (sağ panelde ürün düzenle), başlığa çift tıkla (yerinde
   override — ⛓ işareti + "veriye geri bağla"), tema/format/kolon değiştir, Ctrl+Z geri al.
4. Üst bardan şablonu "Premium Yazılı Menü"ye çevir → veri ve seçim korunur;
   `priceLayout: columns` ile SEUL/MENU kolonları hizalanır.
5. Fotoğrafsız üründe yer tutucuya tıkla → dosya seç → foto anında oturur; sağ panelde
   "Eksik fotoğraflar" listesi + "Talep metnini kopyala".
6. **Export** → `data/exports/{musteri}/` altına print (216×303, crop marks) + preview
   PDF'leri v numarasıyla düşer; kapasite aşarsan kırmızı "N ürün sığmıyor" uyarısı.

## Faz 0 el testi (CONSTITUTION §13 — geçti ✓)

1. Yeni müşteri ekle → detay sayfası açılır.
2. "Logo yükle" ile PNG/JPG/SVG yükle → logo kutusunda görünür.
3. Müşteriler listesinde kartta logo **thumbnail** görünür.
4. Fotoğraflar "Görseller" panelinde listelenir.
5. `data/` klasörünü kopyala = tam yedek (M7).

## Yapı

```
tezgah/
├── CONSTITUTION.md        anayasa + spesifikasyon (tek doğruluk kaynağı)
├── FAZ1/2/3-GOREV.md      faz görev paketleri (mimar tasarım detayı)
├── TODO.md                faz dışına düşen notlar
├── apps/
│   ├── server/            Fastify + SQLite + sharp + Puppeteer export (port 3001)
│   └── web/               Vite + React: yönetim + kısıtlı editör + /print rotası (5173)
├── packages/
│   ├── shared/            Zod şemaları, formatPrice(EUR|CHF), slugify
│   └── templates/         şablon kayıt defteri + binding/overflow motoru + temalar + fonts/
└── data/                  (git dışı) app.db, assets/{orig,master,thumb}, exports/
```

Testler: `npm test` (binding çözümleyici, overflow motoru, formatPrice, font glif
kapsamı, şablon analizleri — §12 gereği zorunlu çekirdek testleri).

## Geliştirme modeli

- **Claude Fable 5** kodu yazar (sohbet ortamında internet kapalıdır, orada test edilemez).
- **Sen** makinede `npm run dev` ile çalıştırır, hata/çıktıyı sohbete yapıştırırsın; düzeltme gelir.
- **Claude Opus 4.8** geliştirmeyi devraldığında önce `CONSTITUTION.md` (özellikle §2 Anayasa ve §14
  çalıştırma talimatları) ve `TODO.md` okunur. Faz disiplinine (M10) uyulur.

## Sorun giderme

- **`npm install` sırasında better-sqlite3 / sharp hatası:** İkisi de hazır derlenmiş (prebuilt)
  gelir; hata alırsan Node sürümünü kontrol et (`node --version` → 20 veya 22 LTS olmalı),
  gerekirse Node'u LTS ile yeniden kur ve `npm install`'u tekrarla. Çözülmezse hata çıktısının
  tamamını sohbete yapıştır.
- **Port dolu (3001/5173):** Açık kalan eski bir `npm run dev` olabilir; kapat ya da
  `PORT=3002 npm run dev -w apps/server` ile portu değiştir (vite proxy'sini de güncelle).
- **Görsel yüklenmiyor:** Yalnız PNG, JPEG, WebP ve SVG kabul edilir; sınır 25 MB.
