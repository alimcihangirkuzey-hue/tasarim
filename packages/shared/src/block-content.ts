/* BLOK İÇERİK MODELİ + KAPASİTE MATEMATİĞİ — paket 3.

   Paket 2'de blok bir YER TUTUCUYDU (props: {} serbest kayıt). Burada içerik
   TİPLENİR: kategori başlığı bir metin, ürün grid'i bir ürün listesi taşır.

   İKİ KURAL BU DOSYANIN VAR OLMA SEBEBİ:

   1. SESSİZ VERİ KAYBI YOK. Bloğa sığmayan ürün SİLİNMEZ — belgede kalır,
      "gizli" sayılır ve çağırana ADEDİYLE bildirilir. Kullanıcı 12 ürün
      girip 9'unu görüyorsa bunu ÖĞRENMELİDİR; eksik basılmış bir menü,
      matbaadan döndükten sonra fark edilir.

   2. KAPASİTE GEOMETRİDEN HESAPLANIR, DOM'DAN ÖLÇÜLMEZ. Saf ve test
      edilebilir olması için. Bedeli: arayüz BU dosyanın mm sabitleriyle
      çizmek ZORUNDADIR — başka bir satır yüksekliğiyle çizerse vaat
      (“metin bloktan taşmaz”) sessizce yalan olur. Bu bağ testle korunur.

   KATALOG BAĞI (bilerek BOŞ): MenuItem.catalog_item_id bugün hep null.
   Alan şimdi açıldı ki yarın katalog ürünü bağlandığında şema değişmesin —
   ama bu pakette hiçbir yer onu doldurmaz ve okumaz (ürün sahibi sınırı:
   "gerçek katalog entegrasyonu YOK"). */

import { z } from "zod";

/* ── Ürün ─────────────────────────────────────────────────────────────── */

/** Tek menü kalemi. Fiyat METİN olarak taşınır: "12,50" · "6 CHF" · "12.50 €"
    aynı belgede yaşayabilir ve para birimi/ayraç kararı ürün sahibinindir.
    Sayıya çevirmek burada erken bir karar olurdu (katalog bağlanınca fiyat
    yapısal alandan gelecek — o gün dönüşüm TEK yerde yapılır). */
export const MenuItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().default(""),
  price: z.string().default(""),
  desc: z.string().default(""),
  /** Yerel fotoğraf (object URL / data URI). Varlık deposu ayrı paket. */
  photo_url: z.string().nullable().default(null),
  /* GERÇEK PİKSEL ÖLÇÜSÜ — effective DPI'ın olmazsa olmazı (paket 5).
     Ekran px'inden hesap YAPILAMAZ: ekran ölçeği zoom'a, cihaz piksel
     oranına ve tuval ölçeğine bağlıdır; baskı kalitesi ise yalnız
     "kaç piksel / kaç mm" sorusudur. Bilinmiyorsa null — o zaman DPI
     ÖLÇÜLEMEZ ve preflight bunu "geçti" diye YUTMAZ, ayrıca söyler. */
  photo_w: z.number().int().positive().nullable().default(null),
  photo_h: z.number().int().positive().nullable().default(null),
  /** YARININ KATALOG BAĞI — bugün hep null, okunmaz. Şema kararlılığı için. */
  catalog_item_id: z.string().nullable().default(null),
});
export type MenuItem = z.infer<typeof MenuItemSchema>;

/* ── Blok içerikleri ──────────────────────────────────────────────────── */

export const KategoriIcerikSchema = z.object({
  title: z.string().default(""),
  subtitle: z.string().default(""),
});

export const UrunListesiIcerikSchema = z.object({
  items: z.array(MenuItemSchema).default([]),
});

export const GridIcerikSchema = z.object({
  items: z.array(MenuItemSchema).default([]),
  columns: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
});

export const HeroIcerikSchema = z.object({
  item: MenuItemSchema.nullable().default(null),
});

export const GorselIcerikSchema = z.object({
  photo_url: z.string().nullable().default(null),
  photo_w: z.number().int().positive().nullable().default(null),
  photo_h: z.number().int().positive().nullable().default(null),
});

export const KampanyaIcerikSchema = z.object({
  title: z.string().default(""),
  line: z.string().default(""),
});

export const IletisimIcerikSchema = z.object({
  phone: z.string().default(""),
  address: z.string().default(""),
  hours: z.string().default(""),
});

/* ── Tipografi ve kutu sabitleri (mm) ─────────────────────────────────────
   ARAYÜZ BUNLARLA ÇİZMEK ZORUNDADIR. Kapasite hesabı bu sayılardan doğar;
   arayüz başka bir satır yüksekliği kullanırsa "taşmaz" vaadi yalan olur. */
export const TYPO_MM = {
  /** Blok iç payı (dört kenar) */
  pad: 2.5,
  /** Fiyat listesi: ad+fiyat satırının yüksekliği */
  list_row: 5.5,
  /** Fiyat listesi: açıklama alt satırının EK yüksekliği */
  list_desc: 3.4,
  /** Grid: kartlar arası boşluk */
  grid_gap: 2.5,
  /** Grid: kart metin bloğu (ad + fiyat) */
  card_text: 8,
  /** Grid: kartta açıklama varsa EK yükseklik */
  card_desc: 3.4,
  /** Grid: kart fotoğrafının karta oranı (yükseklik/genişlik) */
  card_photo_ratio: 0.72,
  /** Kategori başlığı: başlık + (varsa) alt başlık */
  cat_title: 6,
  cat_subtitle: 4,
} as const;

/* ── Kapasite ─────────────────────────────────────────────────────────── */

export interface Kapasite {
  /** Bloğa SIĞAN kalem sayısı */
  fits: number;
  /** Sığmayan kalem sayısı — SİLİNMEZ, gizlenir ve bildirilir */
  hidden: number;
}

const kalan = (v: number): number => (v > 0 ? v : 0);

/**
 * Fotoğrafsız fiyat listesinin kapasitesi.
 * Satır yüksekliği açıklamalı kalemde artar — bu yüzden kalemler TEK TEK
 * toplanır, "yükseklik / sabit satır" gibi bir kestirme kullanılmaz
 * (kestirme, açıklamalı listede sessizce taşardı).
 */
export function listeKapasitesi(
  h_mm: number,
  items: readonly MenuItem[],
  /* TİPOGRAFİ ÖLÇEĞİ (paket 6). Yoğun içerikte satırlar sıkışır; kapasite
     bunu BİLMEK zorundadır — arayüz küçük çizip kapasite büyük satır
     varsayarsa "sıkıştırdım" iddiası ölçüye yansımaz ve blok yine taşar. */
  olcek = 1
): Kapasite {
  const alan = kalan(h_mm - TYPO_MM.pad * 2);
  let kullanilan = 0;
  let fits = 0;
  for (const it of items) {
    const satir = (TYPO_MM.list_row + (it.desc.trim() !== "" ? TYPO_MM.list_desc : 0)) * olcek;
    if (kullanilan + satir > alan) break;
    kullanilan += satir;
    fits += 1;
  }
  return { fits, hidden: items.length - fits };
}

/** Grid kartının hesaplanmış ölçüleri — arayüz de bunu kullanır (tek kaynak). */
export function gridKartOlcusu(
  w_mm: number,
  columns: number,
  aciklamaVar: boolean,
  olcek = 1
): { card_w_mm: number; card_h_mm: number; photo_h_mm: number } {
  const ic = kalan(w_mm - TYPO_MM.pad * 2);
  const card_w_mm = kalan((ic - TYPO_MM.grid_gap * (columns - 1)) / columns);
  /* FOTOĞRAF ORANI SABİT — ölçek yalnız METİN bloğunu sıkıştırır. Oranı
     ölçekle bozmak, ürün sahibinin açık yasağı ("fotoğraf oranını bozma"). */
  const photo_h_mm = card_w_mm * TYPO_MM.card_photo_ratio;
  const card_h_mm =
    photo_h_mm + (TYPO_MM.card_text + (aciklamaVar ? TYPO_MM.card_desc : 0)) * olcek;
  return { card_w_mm, card_h_mm, photo_h_mm };
}

/**
 * Ürün grid'inin kapasitesi. Kart yüksekliği TÜM grid için tektir (kartlar
 * hizalı olmalı), bu yüzden açıklama varlığı kalem başına değil GRID başına
 * sorulur: kalemlerden biri açıklamalıysa bütün kartlar yüksek olur.
 * Alternatif (kart başına değişken yükseklik) hizayı bozar ve acemi
 * kullanıcıya "bozuk" görünür — bilinçli tercih.
 */
export function gridKapasitesi(
  w_mm: number,
  h_mm: number,
  columns: number,
  items: readonly MenuItem[],
  olcek = 1
): Kapasite {
  const aciklamaVar = items.some((i) => i.desc.trim() !== "");
  const { card_h_mm } = gridKartOlcusu(w_mm, columns, aciklamaVar, olcek);
  if (card_h_mm <= 0) return { fits: 0, hidden: items.length };
  const alan = kalan(h_mm - TYPO_MM.pad * 2);
  /* n satır için gereken yükseklik: n*kart + (n-1)*boşluk */
  const satir = Math.floor((alan + TYPO_MM.grid_gap) / (card_h_mm + TYPO_MM.grid_gap));
  const fits = Math.min(items.length, kalan(satir) * columns);
  return { fits, hidden: items.length - fits };
}

/**
 * Bir bloğun İÇERİK taşması — blok kutusunun panel taşmasından AYRI bir
 * kavramdır. Blok panele sığabilir ama içindeki 12 üründen 3'ü görünmüyor
 * olabilir; ikisi de sessiz kalmamalıdır.
 */
export function icerikKapasitesi(
  kind: string,
  box: { w_mm: number; h_mm: number },
  props: Record<string, unknown>
): Kapasite {
  /* TİPOGRAFİ ÖLÇEĞİ BLOĞUN ÜSTÜNDE TAŞINIR (paket 6). Otomatik yerleşim
     yoğunluğa göre sıkıştırıyorsa kapasite ve çizim AYNI sayıyı görmek
     zorundadır — biri 0.8, diğeri 1 varsayarsa blok bölünmüş ama "gizli
     ürün" diye raporlanmış olur (ölçüldü: 300 kalemlik belgede hidden=9). */
  const olcek = blokOlcegi(props);
  if (kind === "fiyat_listesi") {
    const c = UrunListesiIcerikSchema.parse(props);
    return listeKapasitesi(box.h_mm, c.items, olcek);
  }
  if (kind === "urun_gridi") {
    const c = GridIcerikSchema.parse(props);
    return gridKapasitesi(box.w_mm, box.h_mm, c.columns, c.items, olcek);
  }
  if (kind === "kategori_basligi") {
    /* Alt başlık İSTEĞE BAĞLI bir kalemdir: sığmazsa çizilmez ve SAYILIR.
       Sessizce kırpmak, kullanıcının yazdığı bir metnin baskıda yok olması
       demekti (görsel provada gerçekten yaşandı). */
    const c = KategoriIcerikSchema.parse(props);
    if (c.subtitle.trim() === "") return { fits: 0, hidden: 0 };
    const gereken = TYPO_MM.pad * 2 + TYPO_MM.cat_title + TYPO_MM.cat_subtitle;
    return box.h_mm >= gereken ? { fits: 1, hidden: 0 } : { fits: 0, hidden: 1 };
  }
  /* Diğer bloklar tek/sabit içerik taşır — kalem kapasitesi kavramı yoktur */
  return { fits: 0, hidden: 0 };
}

/** Bloğun taşıdığı tipografi ölçeği; yoksa 1 (eski blok / manuel yerleşim). */
export function blokOlcegi(props: Record<string, unknown>): number {
  const v = props["olcek"];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 1;
}

/** Boş ürün — form açılışında kullanılır. */
export function bosUrun(id: string): MenuItem {
  return MenuItemSchema.parse({ id });
}

/** Blok tipine göre BOŞ içerik — blok doğduğu anda tipli içerikle doğar. */
export function varsayilanIcerik(kind: string): Record<string, unknown> {
  switch (kind) {
    case "kategori_basligi":
      return KategoriIcerikSchema.parse({});
    case "urun_gridi":
      return GridIcerikSchema.parse({});
    case "fiyat_listesi":
      return UrunListesiIcerikSchema.parse({});
    case "hero_urun":
      return HeroIcerikSchema.parse({});
    case "gorsel":
    case "logo":
      return GorselIcerikSchema.parse({});
    case "kampanya":
      return KampanyaIcerikSchema.parse({});
    case "iletisim":
      return IletisimIcerikSchema.parse({});
    default:
      return {};
  }
}
