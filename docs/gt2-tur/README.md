# GT-2 Görsel Tur (Canonical 10.3)

GT-2 kapısının yargı kalemleri — **sırıtmayan reflow** ve **simetri** — insan
kapısıdır (Canonical 11.6/3): yeşil testle ikame edilemez, ajan imzalayamaz.
Bu klasör turu **koşulabilir** yapar; imza ürün sahibinindir.

## Galeri üretimi

```
npx tsx --tsconfig packages/templates/tsconfig.json docs/gt2-tur/uret-galeri.mts
```

Çıktı: `cikti/galeri.html` (gitignore'lu, türetilmiş artefakt — her koşumda
birebir aynı üretilir; kataloglar deterministiktir). Galeri, editör/PDF'in
kullandığı bileşenlerin **aynısını** print modunda çizer (M3 tek render
kaynağı) ve gerçek OFL fontlarını gömer (metin genişlikleri sadık).

## Kapsam

Her yoğunlukta (20 / 50 / 100 / 200 ürün):

| Şablon | Varyantlar |
|---|---|
| menu-liste-premium | 1 / 2 / 3 sütun, tüm sayfalar |
| menu-grid-cells | 3 kolon, single + multipage (tüm sayfalar) |
| menu-trifold | dış + iç yüz |
| flyer | ön yüz (mini grid) |

Her kartın altında ölçümler (font, sayfa sayısı, taşan ürün) ve analiz
uyarıları görünür.

## İş bölümü

**Makinece doğrulanan** (`packages/templates/src/engine/gt2-invariants.test.ts`
— gözle yeniden yargılamaya gerek yok): minimum font aşılmaz · flow
stratejisinde ürün kaybı sıfır · sütun yüksekliği taşılmaz · düşen içerik
daima görünür uyarı üretir · taşma muhasebesi kapanır (yerleşen + taşan =
toplam).

**İnsan yargısı** (galeride bakılacaklar): yoğunluk artarken düzenin
bozulmadan yeniden akması · eşit kenar boşluğu ve ritmik aralık · hizalı
fiyatlar · dengeli sütun/kategori blokları · küçülen tipografinin okunaklı
ve orantılı kalması · boş kalan son satırın duruşu.

## Karar kaydı

Tur sonucu journal'a **insan aktörle** yazılır (ajan bu kapıyı imzalayamaz):

```
npm run journal -- gate --package <paket-id> --gate gt --outcome gecti \
  --evidence "galeri.html <tarih> turu; 4 yoğunluk × 4 şablon gözle doğrulandı" \
  --actor-kind human --actor-id <adın> --actor-role urun-sahibi
```

Bulgu varsa kalem kalem bildir; her bulgu kendi paketine bağlanır.
