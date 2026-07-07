# TEZGÂH

Fransa'daki Türk restoranları/dönerciler için grafik atölyesi otomasyon sistemi.
Anayasa ve tam spesifikasyon: **CONSTITUTION.md** (önce onu oku). Faz 1 tasarım
detayları: **FAZ1-GOREV.md**.

**Mevcut durum: Faz 1 — MVP Menü Hattı** (marka kiti + katalog editörü + binding
motoru + `menu-grid-cells` & `menu-liste-premium` şablonları + kısıtlı editör +
Puppeteer PDF export + eksik görsel akışı)

## Gereksinimler

- Node.js **20+** (22 önerilir) — https://nodejs.org
- İlk kurulumda internet (paketler iner); sonrası tamamen çevrimdışı çalışır (M7)

## Kurulum ve çalıştırma

```bash
npm install        # repo kökünde, tüm workspace'leri kurar
npm run dev        # server (3001) + web (5173) birlikte açılır
```

Tarayıcıda: **http://localhost:5173**
API sağlık kontrolü: http://localhost:3001/api/health

Veriler `data/` klasöründe yaşar (SQLite + görseller). **Yedek = bu klasörü kopyalamak.**
`data/` git'e girmez.

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
├── FAZ1-GOREV.md          Faz 1 görev paketi (mimar tasarım detayı)
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
