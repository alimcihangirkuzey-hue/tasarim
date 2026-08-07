/* OTOMATİK BLOK YERLEŞİMİ — paket 4 (journal 2026-08-07-otomatik-yerlesim).

   NE YAPAR: içeriği girilmiş bir LayoutDoc'u alır, blokları panellere
   deterministik biçimde dağıtır ve YENİ bir doc döndürür. Saf: React yok,
   DOM yok, rastgelelik yok, tarih yok — aynı girdi hep aynı çıktı.

   NEDEN BURADA (templates/engine) VE shared'da DEĞİL: akış kararı zaten
   burada yaşıyor. composeColumns<T> generic, keepWithNext yüklemli,
   deterministik olduğu belgeli ve taşanı `overflow` alanıyla AÇIKÇA
   raporlayan bir bestecidir. İkinci bir akış motoru yazmak, aynı kararı iki
   yerde yaşatmak olurdu (ve ikisi sessizce ayrışırdı). shared → templates
   bağımlılığı ters yönde imkânsız olduğu için modül bu tarafta durur;
   blok tipleri shared'dan gelir, akış kararı buradan.

   İÇERİK SIĞMIYORSA — ÜÇ ADIMLI, HİÇBİRİ GİZLEMEK DEĞİL:
     1. BÖL: ürün taşıyan blok sütun boyuna göre DEVAM bloklarına ayrılır
        (14 kalemlik liste → 10 + 4). Kalem düşmez, blok çoğalır.
        Bu, paket 3'ün "+N gizli" davranışının otomatik yerleşimdeki YERİNİ
        ALIR: ürün sahibi kuralı — "+N gizli nihai sonuç OLMASIN".
     2. AKIT: parçalar composeColumns ile panellere akar (strateji "flow" —
        ilanı "Ürün DÜŞMEZ").
     3. RAPORLA: yaprakta yer kalmadıysa artan parçalar SESSİZCE atılmaz,
        rapora ADIYLA ve ÜRÜN SAYISIYLA girer; arayüz açık uyarı basar.

   MANUEL TASARIMA SAYGI: bu işlev yalnız açık kullanıcı eylemiyle çağrılır.
   Kendiliğinden koşan bir yol YOKTUR — arka planda yeniden dizmek,
   kullanıcının elle kurduğu düzeni habersiz bozmak olurdu. */

import {
  BLOCK_DEFAULT_SIZE_MM,
  GridIcerikSchema,
  KategoriIcerikSchema,
  TYPO_MM,
  UrunListesiIcerikSchema,
  contentArea,
  gridKartOlcusu,
  panelsOf,
  type Block,
  type BlockKind,
  type LayoutDoc,
  type MenuItem,
  type Panel,
} from "@tezgah/shared";
import { composeColumns, type CompositionBlock } from "./composition.js";

/* ── Panel eğilimi ────────────────────────────────────────────────────── */

/** Bloğun hangi panele AİT OLMAK İSTEDİĞİ. Kapak/arka ayrımı bir baskı
    geleneğidir: logo ve öne çıkan ürün kapakta, telefon/kampanya arkada
    durur. İçerik blokları açılınca görülen yüzü ister. */
export type PanelEgilimi = "kapak" | "arka" | "icerik";

export const BLOK_EGILIMI: Record<BlockKind, PanelEgilimi> = {
  logo: "kapak",
  hero_urun: "kapak",
  gorsel: "kapak",
  iletisim: "arka",
  kampanya: "arka",
  qr: "arka",
  bilgi: "arka",
  kategori_basligi: "icerik",
  urun_gridi: "icerik",
  fiyat_listesi: "icerik",
  urun_karti: "icerik",
  ayrac: "icerik",
};

/** Hero anlamını kaybetmesin: bundan kısası "büyük ürün" olmaktan çıkar. */
export const HERO_MIN_H_MM = 55;

const yukariIzgara = (v: number, g: number): number => Math.ceil(v / g) * g;

/* ── Doğal yükseklik ──────────────────────────────────────────────────── */

/** Ürün taşıyan blokta N kalemin gerektirdiği yükseklik (mm). */
function listeYuksekligi(items: readonly MenuItem[]): number {
  let h = TYPO_MM.pad * 2;
  for (const it of items) {
    h += TYPO_MM.list_row + (it.desc.trim() !== "" ? TYPO_MM.list_desc : 0);
  }
  return h;
}

function gridYuksekligi(items: readonly MenuItem[], columns: number, w_mm: number): number {
  if (items.length === 0) return TYPO_MM.pad * 2;
  const aciklamaVar = items.some((i) => i.desc.trim() !== "");
  const { card_h_mm } = gridKartOlcusu(w_mm, columns, aciklamaVar);
  const satir = Math.ceil(items.length / columns);
  return TYPO_MM.pad * 2 + satir * card_h_mm + (satir - 1) * TYPO_MM.grid_gap;
}

/**
 * Bloğun İÇERİĞİNİN istediği yükseklik. "Yoğunluğa göre alan kullansın"
 * kuralı buradan doğar: 3 ürünlü liste kısa, 12 ürünlü liste uzun olur —
 * sabit varsayılan yükseklik ikisine de yanlış davranırdı.
 */
export function dogalYukseklik(blok: Block, w_mm: number, grid_mm: number): number {
  const varsayilan = BLOCK_DEFAULT_SIZE_MM[blok.kind].h_mm;
  let h = varsayilan;

  if (blok.kind === "fiyat_listesi") {
    const c = UrunListesiIcerikSchema.parse(blok.props);
    h = c.items.length === 0 ? varsayilan : listeYuksekligi(c.items);
  } else if (blok.kind === "urun_gridi") {
    const c = GridIcerikSchema.parse(blok.props);
    h = c.items.length === 0 ? varsayilan : gridYuksekligi(c.items, c.columns, w_mm);
  } else if (blok.kind === "kategori_basligi") {
    /* Alt başlıksız başlık daha kısadır — boşluğu boşuna yemesin */
    const c = KategoriIcerikSchema.parse(blok.props);
    h = c.subtitle.trim() === "" ? TYPO_MM.pad * 2 + TYPO_MM.cat_title : varsayilan;
  } else if (blok.kind === "hero_urun") {
    h = Math.max(varsayilan, HERO_MIN_H_MM);
  }
  return yukariIzgara(h, grid_mm);
}

/* ── Bölme (devam blokları) ───────────────────────────────────────────── */

/** Verilen yüksekliğe kaç kalem sığar — bölme noktasını bulur. */
function kacKalemSigar(blok: Block, h_mm: number, w_mm: number, items: readonly MenuItem[]): number {
  if (blok.kind === "fiyat_listesi") {
    let kullanilan = TYPO_MM.pad * 2;
    let n = 0;
    for (const it of items) {
      const satir = TYPO_MM.list_row + (it.desc.trim() !== "" ? TYPO_MM.list_desc : 0);
      if (kullanilan + satir > h_mm) break;
      kullanilan += satir;
      n += 1;
    }
    return n;
  }
  const c = GridIcerikSchema.parse(blok.props);
  const aciklamaVar = items.some((i) => i.desc.trim() !== "");
  const { card_h_mm } = gridKartOlcusu(w_mm, c.columns, aciklamaVar);
  if (card_h_mm <= 0) return 0;
  const alan = h_mm - TYPO_MM.pad * 2;
  const satir = Math.floor((alan + TYPO_MM.grid_gap) / (card_h_mm + TYPO_MM.grid_gap));
  return Math.max(0, satir) * c.columns;
}

const kalemleriOku = (blok: Block): MenuItem[] => {
  if (blok.kind === "fiyat_listesi") return UrunListesiIcerikSchema.parse(blok.props).items;
  if (blok.kind === "urun_gridi") return GridIcerikSchema.parse(blok.props).items;
  return [];
};

const kalemleriYaz = (blok: Block, items: MenuItem[]): Block => ({
  ...blok,
  props: { ...blok.props, items },
});

/**
 * Sütun boyuna sığmayan ürün bloğunu DEVAM bloklarına böler.
 * Kalem SİLİNMEZ — parçalar arasında dağıtılır ve toplamları korunur.
 * Devam bloğunun id'i kaynaktan TÜRETİLİR (`~2`, `~3`) ki aynı girdi aynı
 * id'leri üretsin (determinizm; rastgele id kaydı okunamaz kılardı).
 */
export function parcala(
  blok: Block,
  colH_mm: number,
  w_mm: number,
  grid_mm: number,
  /* İLK dilimin bütçesi. Kategori başlığından hemen sonra gelen blokta
     colH'den KÜÇÜKTÜR: başlık ile ilk parça AYNI sütuna sığsın diye başlığın
     payı düşülür. Bu olmadan uzun bir liste tam-sütun parçalara bölünür ve
     başlık ile ilk parça hiçbir zaman birlikte sığamaz — başlık sütun sonunda
     yalnız kalır (ölçüldü: "Pizzalar" ürünlerinden koparılmıştı). */
  ilkDilim_mm: number = colH_mm
): Block[] {
  const items = kalemleriOku(blok);
  if (items.length === 0) return [blok];
  if (dogalYukseklik(blok, w_mm, grid_mm) <= ilkDilim_mm) return [blok];

  const parcalar: Block[] = [];
  let kalan = items;
  let sira = 1;
  while (kalan.length > 0) {
    const butce = sira === 1 ? ilkDilim_mm : colH_mm;
    const n = kacKalemSigar(blok, butce, w_mm, kalan);
    /* SONSUZ DÖNGÜ KORKULUĞU: tek kalem bile sığmıyorsa (aşırı dar sütun)
       zorla bir kalem alırız — parça yine de taşar ama AKIŞ İLERLER ve
       taşma çağıranın raporuna düşer. Sessizce sonsuza dönmek, sayfayı
       kilitleyip hiçbir şey söylememek olurdu. */
    const al = Math.max(1, n);
    const dilim = kalan.slice(0, al);
    kalan = kalan.slice(al);
    const p = kalemleriYaz(blok, dilim);
    parcalar.push(
      sira === 1
        ? p
        : { ...p, id: `${blok.id}~${sira}` }
    );
    sira += 1;
  }
  return parcalar;
}

/* ── Gruplama ─────────────────────────────────────────────────────────── */

interface Parca {
  blok: Block;
  /** Kategori başlığı bir sonraki blokla birlikte kalmalı (keep-with-next) */
  basliktir: boolean;
}

/* ── Rapor ────────────────────────────────────────────────────────────── */

export interface YerlesmeyenKalem {
  kind: BlockKind;
  /** Kullanıcının tanıyacağı ad (kategori adı ya da ilk ürün) */
  baslik: string;
  urun: number;
}

export interface AutoRapor {
  /** Yaprağa yerleşen blok sayısı */
  yerlesen: number;
  /** Bölme sonucu doğan DEVAM bloğu sayısı */
  bolunen: number;
  /** Yer kalmadığı için yaprağa girmeyenler — GİZLİ DEĞİL, RAPORLU */
  yerlesmeyen: YerlesmeyenKalem[];
  /** Girişteki toplam ürün sayısı */
  urunToplam: number;
  /** Yaprağa yerleşen ürün sayısı */
  urunYerlesen: number;
}

function blokBasligi(b: Block): string {
  if (b.kind === "kategori_basligi") {
    const c = KategoriIcerikSchema.parse(b.props);
    return c.title || "Kategori";
  }
  const items = kalemleriOku(b);
  if (items.length > 0) return items[0].name || "Ürün";
  return b.kind;
}

/* ── Ana işlev ────────────────────────────────────────────────────────── */

/**
 * Blokları panellere deterministik olarak dağıtır.
 * SAF: girdi doc'u DEĞİŞTİRMEZ, yeni doc döndürür.
 */
export function autoYerlestir(doc: LayoutDoc): { doc: LayoutDoc; rapor: AutoRapor } {
  const paneller = panelsOf(doc);
  const alanlar = new Map(paneller.map((p) => [p.id, contentArea(p, doc)]));

  /* Panelleri role göre seç. Rol yoksa (katlamasız) makul yedeğe düşülür —
     motor ÜRÜN TİPİNE değil GEOMETRİYE genel olmalı. */
  const rolile = (r: string): Panel | undefined => paneller.find((p) => p.role === r);
  const kapakPaneli = rolile("on") ?? paneller[paneller.length - 1];
  const arkaPaneli = rolile("arka") ?? paneller[0];
  /* İçerik yüzü tercihi: önce iç yüz, sonra dış yüzün kanadı, sonra KALAN
     her panel. Katlamasız (fold 0) bir yaprakta yalnız iki panel vardır ve
     ikisi de kapak/arka olarak tutulur — o durumda içerik gidecek yer
     bulamaz ve blok kapak yığınının ÜSTÜNE yazılırdı (ölçüldü: A4 dikey
     katlamasızda iki çakışma). Bu yüzden panel havuzu DIŞLAMAZ, ARTIK
     YÜKSEKLİK ile çalışır: her panelin kapak/arka yığınından geriye kalanı
     bilinir ve içerik oradan başlar. */
  const icerikPanelleri = [
    ...paneller.filter((p) => p.side === "ic"),
    ...paneller.filter((p) => p.side === "dis" && p.role === "kanat"),
    ...paneller.filter((p) => p.side === "dis" && p.role !== "kanat"),
  ];

  const girisUrun = doc.blocks.reduce((s, b) => s + kalemleriOku(b).length, 0);

  /* 1) Sınıflandır — belge SIRASI korunur (determinizm) */
  const kapak = doc.blocks.filter((b) => BLOK_EGILIMI[b.kind] === "kapak");
  const arka = doc.blocks.filter((b) => BLOK_EGILIMI[b.kind] === "arka");
  const icerik = doc.blocks.filter((b) => BLOK_EGILIMI[b.kind] === "icerik");

  const yeniBloklar: Block[] = [];
  /** Panel başına kapak/arka yığınının tükettiği yükseklik (mm) */
  const doluluk = new Map<string, number>();

  /** Bir paneli yukarıdan aşağı doldurur; sığmayanı geri döndürür. */
  const istifle = (bloklar: Block[], panel: Panel | undefined): Block[] => {
    if (!panel) return bloklar;
    const alan = alanlar.get(panel.id)!;
    let y = alan.y_mm + (doluluk.get(panel.id) ?? 0);
    const artan: Block[] = [];
    for (const b of bloklar) {
      const h = Math.min(dogalYukseklik(b, alan.w_mm, doc.grid_mm), alan.h_mm);
      if (y + h > alan.y_mm + alan.h_mm) {
        artan.push(b);
        continue;
      }
      yeniBloklar.push({
        ...b,
        panel_id: panel.id,
        box: { x_mm: alan.x_mm, y_mm: y, w_mm: alan.w_mm, h_mm: h },
      });
      y += h;
    }
    doluluk.set(panel.id, y - alan.y_mm);
    return artan;
  };

  const kapakArtan = istifle(kapak, kapakPaneli);
  const arkaArtan = istifle(arka, arkaPaneli);

  /* 2) İçerik akışı. Sütun yüksekliği tüm panellerde aynı (yaprak boyu);
        genişlik farklı olabilir (sarmal payı) — EN DAR panel esas alınır ki
        hesap her panelde geçerli olsun (geniş panelde biraz boşluk kalır,
        dar panelde taşma OLMAZ; güvenli yön seçildi). */
  /* SÜTUN HAVUZU: önce HİÇ DOKUNULMAMIŞ paneller. Kapak/arka yığını taşıyan
     bir paneli havuza katmak sütun yüksekliğini HERKES için aşağı çekiyordu
     (min alınır) — boş iç paneller 36 kalem alabilecekken 13'e kısıtlanıyor
     ve yaprağın %70'i boş kalıyordu (görsel provada ölçüldü). Boş panel hiç
     yoksa (katlamasız yaprakta iki panel de kapak/arka olur) dolu panellerin
     ARTIK yüksekliğine düşülür — içerik yine kaybolmaz. */
  const bosPaneller = icerikPanelleri.filter((p) => (doluluk.get(p.id) ?? 0) === 0);
  const sutunPanelleri = bosPaneller.length > 0 ? bosPaneller : icerikPanelleri;
  const colH = Math.min(
    ...sutunPanelleri.map((p) => alanlar.get(p.id)!.h_mm - (doluluk.get(p.id) ?? 0))
  );
  /* GENİŞLİK TEK OLMAK ZORUNDA — ve yerleşim de AYNI genişliği kullanmalı.
     Önce yükseklik en dar panele göre hesaplanıp blok panelin TAM genişliğine
     çiziliyordu; grid kartının yüksekliği genişlikle büyüdüğü için kartlar
     bütçeden UZUN çıkıyor ve ürün gizleniyordu (ölçüldü: 6 ürünlük grid'de
     "+2 gizli"). Hesap ile çizim aynı sayıyı kullanır; geniş panelde sağda
     bir miktar boşluk kalır — sessiz gizlemeye tercih edilir. */
  const colW = Math.min(...sutunPanelleri.map((p) => alanlar.get(p.id)!.w_mm));

  /* 2a) BÖL — sütuna sığmayan ürün bloğu devam bloklarına ayrılır */
  const parcalar: Parca[] = [];
  let bolunen = 0;
  /* Bir önceki bloğun başlık yüksekliği — sonraki bloğun İLK dilimi bu kadar
     daraltılır ki başlık ile ürünleri aynı sütunda buluşsun. */
  let oncekiBaslikH = 0;
  for (const b of icerik) {
    const ilkDilim = Math.max(1, colH - oncekiBaslikH);
    const p = parcala(b, colH, colW, doc.grid_mm, ilkDilim);
    bolunen += p.length - 1;
    for (const x of p) parcalar.push({ blok: x, basliktir: x.kind === "kategori_basligi" });
    oncekiBaslikH =
      b.kind === "kategori_basligi" ? dogalYukseklik(b, colW, doc.grid_mm) : 0;
  }

  /* 2b) AKIT — ortak besteci. strategy "flow": ilanı "Ürün DÜŞMEZ";
        sığmayan sayfa AÇAR, biz de 1. sayfadan sonrasını RAPORA çeviririz
        (yaprak sabit — yeni sayfa basılamaz, ama sessizce de kaybolmaz). */
  const compose = composeColumns<Parca>(
    {
      build: () =>
        parcalar.map<CompositionBlock<Parca>>((p) => ({
          entry: p,
          h_mm: dogalYukseklik(p.blok, colW, doc.grid_mm),
        })),
      typography: { min: 1, max: 1 }, // font ölçeklemesi BU pakette yok
      columns: { kind: "fixed", count: Math.max(1, sutunPanelleri.length) },
      columnHeight_mm: colH,
      strategy: "flow",
      targetPages: 1,
      maxPages: 1,
    },
    (p) => p.basliktir
  );

  const ilkSayfa = compose.pages[0]?.columns ?? [];
  ilkSayfa.forEach((sutun, i) => {
    const panel = sutunPanelleri[i];
    if (!panel) return;
    const alan = alanlar.get(panel.id)!;
    for (const yerlesik of sutun) {
      yeniBloklar.push({
        ...yerlesik.entry.blok,
        panel_id: panel.id,
        box: {
          x_mm: alan.x_mm,
          y_mm: alan.y_mm + (doluluk.get(panel.id) ?? 0) + yerlesik.y_mm,
          w_mm: colW,
          h_mm: Math.min(yerlesik.h_mm, colH),
        },
      });
    }
  });

  /* 3) RAPORLA — 1. sayfaya girmeyen her şey + panele sığmayan kapak/arka */
  const artanParcalar = compose.pages
    .slice(1)
    .flatMap((s) => s.columns.flat().map((b) => b.entry.blok))
    .concat(compose.overflow.map((p) => p.blok));

  const yerlesmeyen: YerlesmeyenKalem[] = [...kapakArtan, ...arkaArtan, ...artanParcalar].map(
    (b) => ({ kind: b.kind, baslik: blokBasligi(b), urun: kalemleriOku(b).length })
  );

  const urunYerlesen = yeniBloklar.reduce((s, b) => s + kalemleriOku(b).length, 0);

  return {
    doc: { ...doc, blocks: yeniBloklar },
    rapor: {
      yerlesen: yeniBloklar.length,
      bolunen,
      yerlesmeyen,
      urunToplam: girisUrun,
      urunYerlesen,
    },
  };
}
