# TEZGÂH

Fransa'daki Türk restoranları/dönerciler için grafik atölyesi otomasyon sistemi.
Anayasa ve tam spesifikasyon: **CONSTITUTION.md** (önce onu oku).

**Mevcut durum: Faz 0 — İskelet** (müşteri kaydı, marka kiti temeli, görsel yükleme hattı)

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

## Faz 0 el testi (kabul kriterleri — CONSTITUTION §13)

1. Yeni müşteri ekle (ör. "Antalya Kebab — Lyon") → detay sayfası açılır.
2. "Logo yükle" ile bir PNG/JPG/SVG logo yükle → logo kutusunda görünür.
3. Müşteriler sayfasına dön → kartta logo **thumbnail** olarak görünür.
4. Birkaç fotoğraf yükle → "Görseller" panelinde thumbnail'ler listelenir.
5. Uygulamayı kapat, `data/` klasörünü başka yere kopyala → tam yedeğin bu.

Beşi de geçiyorsa Faz 0 tamamdır → Faz 1'e (katalog + menü şablonları + PDF) geçilir.

## Yapı

```
tezgah/
├── CONSTITUTION.md        anayasa + spesifikasyon (tek doğruluk kaynağı)
├── TODO.md                faz dışına düşen notlar
├── apps/
│   ├── server/            Fastify + SQLite + sharp (port 3001)
│   └── web/               Vite + React arayüz (port 5173, /api ve /assets proxy'li)
├── packages/
│   └── shared/            Zod şemaları, formatPrice, slugify (iki taraf da buradan tip alır)
└── data/                  (git dışı) app.db, assets/{orig,master,thumb}, exports/
```

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
