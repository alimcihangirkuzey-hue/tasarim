# TEZGÂH — FAZ 5 GÖREV PAKETİ
### Mimar: Claude Fable 5 · Uygulayıcı: Claude Code · Paket sürümü: 1.0

---

## 0. Ön koşul ve çalışma kuralları

1. Faz 4 `main`'e merge edilmiş olmalı (edildi: `ee47cb4`); main'de ayrıca pilot dönem commit'leri var — hepsi korunur. İş `phase-5`'te yürür; merge kullanıcı kabulüyle.
2. `CONSTITUTION.md` üstündür; "mimar kararı" işaretli maddeler geçerli olup Değişiklik Günlüğü'ne yazılır; işaretsiz çelişkide dur, sor.
3. **PİLOT VERİSİ KORUMASI:** "Aras Restaurant" müşterisi GERÇEK iş verisidir. Kabul senaryolarının tüm YAZAN işlemleri (katalog import, takas, sürükleme, kit değişikliği) bu müşterinin bir klonunda ("Aras Test F5") yapılır; gerçek kayda ve belgelerine yazılmaz. Okuma serbesttir. Kabul sonunda klon silinir (export kanıtları kalır).
4. Kapsam dışı fikirler `TODO.md`'ye; anlamlı her adım ayrı commit; başlamadan plan + onay. Sunucular gerekirse `start-tezgah.bat` davranışıyla başlatılır.

## 1. Kapsam ve mimar kararları

Kapsam (pilot 1. gün saha kayıtlarından): ① A4 3 sütunlu yoğun liste varyantı · ② katalog yapıştır-içe aktarma arayüzü · ③ belgede tıkla-takas · ④ sürükle-bırak sıralama · ⑤ font yükleme · ⑥ şablon seçim rehberi · ⑦ QR dijital menü v1 (statik).

**Mimar kararı #14 (Günlük'e):** 3 sütun, Şablon Fabrikası/JPG yoluyla değil, `menu-liste-premium`'a yoğun (compact) varyant olarak eklenir; yoğun metrik seti (font, satır aralığı, dots) şablon içinde sabittir.
**Mimar kararı #15 (Günlük'e):** Font yüklemede TR+FR glif kapsam bekçisi zorunludur; kapsamı eksik font RED edilir ve eksik glifler kullanıcıya listelenir (M9). Kapsam seti Faz 1'deki glif testi setiyle aynıdır (ğşİıçöü / éèêëçœâîû / €).
**Mimar kararı #16 (Günlük'e):** Dijital menü v1 tek dosyalık statik HTML'dir; barındırma yoktur (Faz S). `export_records.kind` union'ına `"digital_menu"` eklenir (TEXT kolon, yalnız Zod). `BrandKit.contact.menu_url` opsiyonel alanı eklenir; doluysa şablonlardaki QR kaynak listesine `"menu"` seçeneği gelir.
**Mimar kararı #17 (Günlük'e):** Sürükle-bırak için `@dnd-kit` (MIT) kullanımı serbesttir; saf pointer-events çözümü de kabul — CC seçer, gerekçesini commit mesajına yazar. Başka DnD/tuval kütüphanesi alınmaz.

## 2. Şema — migration v6

- Yeni tablo: `custom_fonts(id TEXT PK, family TEXT UNIQUE NOT NULL, filename TEXT NOT NULL, created_at TEXT)`. Dosyalar `data/fonts/` altında (git dışı); server statik servis eder.
- Zod ekleri (migration istemez): `ExportRecord.kind` += `digital_menu`; `BrandKit.contact.menu_url?: string`.
- Migration-replay testine v6 eklenir; Faz 1–4 akışları kırılmadan (kanıt: mevcut replay seti yeşil).

## 3. Üç sütunlu yoğun varyant (`menu-liste-premium`)

- `cols: 3` seçeneği `a4-portrait` ve `a4-landscape` formatlarında açılır (a5'te kapalı kalır).
- Yoğun metrik seti (yalnız cols=3'te): başlık/gövde font kademesi bir düşer, satır aralığı sıkılaşır, leader dots kısalır, açıklamalar (desc) tek satıra kısaltılır ("Açıklamaları göster" kapatılabilir — mevcut anahtar).
- Sütun dengesi mevcut deterministik kırılma motoruyla; sığmazsa sayfa akışı (mevcut davranış). Okunabilirlik tabanı: hesaplanan gövde fontu şablonun min değerinin altına inemez; inecekse M8 uyarısı.
- Analiz + Vitest: 75 ürünlük katalogda 3 sütun dengesi, min-font tabanı, dots kısalması.

## 4. Katalog yapıştır-içe aktarma

- Katalog sekmesine "Yapıştırarak ekle" düğmesi → metin kutusu. Biçim (hata toleranslı, saf parser `packages/shared`):
  `KATEGORİ: <ad>` satırı yeni kategori; ürün satırı `Ad | fiyat | açıklama(ops)`. Fiyat `8,00` / `8.00` / `8` biçimlerini tanır; boş/tanınmayan satır atlanır ve önizlemede "atlandı" listelenir; ürün adındaki aksan/TR karakter korunur.
- Akış: yapıştır → **önizleme** (eklenecek kategori/ürün sayıları + atlananlar) → mod seç: **"Sona ekle"** (default) | **"Tümünü değiştir"** (kırmızı onay diyaloğu) → uygula.
- Uygulamadan önce mevcut katalog `catalog_history`'ye otomatik yazılır (Faz 4 mekanizması, reason: "içe aktarma öncesi otomatik kayıt"); geri yükleme bayt-birebir çalışmalı.
- Vitest: temiz/bozuk/karışık ondalık/aksanlı senaryolar + history round-trip.

## 5. Tıkla-takas (belgede ürün değiştirme)

- Editörde bir ürün slotuna tıklayınca sağ panelde mevcut slot detayının üstüne **"Ürünü değiştir"** eylemi gelir → açılan seçici: aynı kategorinin ürünleri önce, arama kutusu, tüm katalog erişilebilir.
- Seçim `document.selection`'da o kalemi yenisiyle değiştirir (sıra korunur). Eski ürüne bağlı slot override'ları belgede saklı kalır ama pasifleşir (veri kaybı yok); kullanıcıya kısa toast: "X → Y değiştirildi".
- Vitest: saf takas fonksiyonu (sıra korunur, tekrar eklenmez, override anahtarları dokunulmaz).

## 6. Sürükle-bırak sıralama

- İçerik Seçimi panelinde: kategoriler arası ve kategori içi ürün sıralaması sürükle-bırak ile; mevcut ↑↓ okları kalır (erişilebilirlik). Sıra `selection`'a yazılır, yenilemede kalıcı, PDF sırası birebir.
- Katalog sekmesinde aynı mekanizma **ana katalog sırası** için de çalışır (müşteri düzeyi kalıcı sıra).
- Vitest: sıralama saf yardımcıları; UI kanıtı kabul koşusunda ekran + API doğrulaması.

## 7. Font yükleme + glif bekçisi

- Ayarlar → Fontlar: `woff2`/`ttf` yükle → fontkit ile parse → **glif kapsam kontrolü** (#15 seti) → eksikse RED + eksik glif listesi; tamsa `custom_fonts` + `data/fonts/`.
- Yüklenen font: marka kiti Başlık/Gövde seçicilerine ve tema düzenleyicisine katılır; **print sayfası aynı @font-face kaynağını kullanır (M3)** — ekran/PDF farkı olamaz; PDF'e gömüldüğü pdfjs/inceleme ile kanıtlanır.
- Silme: kullanımda olan font (kit/tema referanslı) 409 ile engellenir, nerede kullanıldığı söylenir.
- Vitest: kapsam bekçisi (tam/eksik font fikstürleriyle), kayıt/served yol.

## 8. Şablon seçim rehberi

- "Belge oluştur" akışının başına hafif bir rehber adımı: "Bu iş ne?" → seçenekler kısa açıklamayla: **Yazı yoğun menü/flyer** (→ menu-liste-premium) · **Fotoğraflı kart menü** (→ menu-grid-cells) · **Katlamalı (trifold)** · **Kampanya flyer'ı** · **Sadakat kartı**. "Şablonu doğrudan seç" bağlantısıyla atlanabilir; rehber seçimi yalnız başlangıç şablonunu belirler, sonrası mevcut akış.

## 9. QR dijital menü v1 (statik)

- Belgeler/Katalog ekranından "Dijital menü (HTML) üret": katalog + marka kitinden **tek dosyalık** mobil HTML — inline CSS, harici istek YOK (font: sistem yığını), kategori çapa navigasyonu, fiyatlar `formatPrice` ile, halal rozeti, saat/telefon, kit renkleri.
- Çıktı: `data/exports/<slug>/YYYY-MM-DD_menu-digital_vN.html` + `ExportRecord kind:"digital_menu"` (#16). Dosya `file://` ile çevrimdışı açılır — kabulde kanıtlanır.
- `menu_url` doluysa menü şablonlarının QR kaynak listesine `"menu"` eklenir ve QR o adresi kodlar.
- Vitest: üretici saf fonksiyon (75 ürün → geçerli HTML, harici URL yok, fiyat biçimi), kind kaydı.

## 10. KABUL SENARYOSU (yazanlar "Aras Test F5" klonunda)

1. **3 sütun:** klon 75 ürünlük belge → a4-portrait cols=3 → dengeli, uyarısız (ya da meşru sayfa akışı); pdfjs ölçümü; 2-sütunla yan yana ekran karşılaştırması raporda.
2. **İçe aktarma:** örnek metin (KATEGORİ + `Ad | fiyat | açıklama` karışık biçimlerle, 2 bozuk satır dahil) → önizleme sayıları doğru, bozuklar "atlandı" listesinde → "Sona ekle" uygulanır → history otomatik kaydı var, geri yükleme bayt-birebir.
3. **Tıkla-takas:** belgede bir kebap → seçici (aynı kategori önce, arama çalışır) → başka ürünle takas → selection API'de doğrulanır, export v artar.
4. **Sürükle-bırak:** kategori + ürün sırası sürüklenir → yenilemede kalıcı → PDF sırası birebir; ↑↓ hâlâ çalışıyor; katalog ana sırası da sürüklenip kalıcı.
5. **Font:** TR+FR tam bir font yüklenir → kit/tema seçicilerde görünür → print PDF'te gömülü (kanıt); ğ/œ eksik fikstür font → RED + eksik glif listesi mesajı (ekran kanıtı); kullanımdaki font silme → 409.
6. **Rehber:** yeni belge akışında rehber görünür; "Yazı yoğun" → Premium Yazılı açılır; "doğrudan seç" atlaması çalışır.
7. **Dijital menü:** klondan HTML üretilir → çevrimdışı açılır (harici istek 0 — ağ paneli kanıtı), 75 ürün + fiyat biçimi + halal + saat doğru; ExportRecord `digital_menu v1`; `menu_url` set → menü şablonunda QR kaynağı "menu" render.
8. **Testler:** toplam **≥200** yeşil (migration replay v6 dahil), typecheck temiz, Faz 1–4 testleri kırılmadan; kapanışta "Aras Test F5" silinir (exports kanıtları kalır), gerçek "Aras Restaurant" verisinin değişmediği (katalog hash/karşılaştırma) kanıtlanır.

## 11. Faz S'e KAYIT (uygulama YOK — TODO.md'ye)

Barındırılan dijital menü (abonelik) · arka plan servisi (bat'sız kalıcı çalışma) · arka plan silme/AI foto eşleme · çoklu-yüzey sahne · preset yönetim arayüzü.

## 12. Raporlama

Standart: kabul maddeleri kanıtlarıyla · örnek dosya yolları · riskler/TODO · `phase-5` push; merge kullanıcı kabulüyle. Koşu bölünürse madde sırası (§3→§9) tek başına değer taşır — kaldığı maddeden devam edilir.
