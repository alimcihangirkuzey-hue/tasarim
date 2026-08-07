/* ÇOK SAYFALI BELGE + GLOBAL REFLOW — paket 6.5
   (journal 2026-08-07-cok-sayfa).

   PAKET 6'NIN MOTORU YENİDEN YAZILMADI — GENELLEŞTİRİLDİ. autoYerlestir tek
   yaprağı doldurur ve artanı `yerlesmeyenBloklar` olarak döndürür; buradaki
   döngü o artanı BİR SONRAKİ YAPRAĞA verir. Yani sayfalama, tek-yaprak
   motorunun üstüne kurulan ince bir sarmaldır; ikinci bir yerleşim motoru
   doğmaz (paket 4'ten beri geçerli kural).

   BELGE MODELİ: Belge = YAPRAK dizisi. Her yaprak zaten kendi panellerini
   (fold geometrisinden) türetir, dolayısıyla Document → Sheet → Panel →
   Block zinciri kurulmuş olur. Tek yapraklı eski belgeler GEÇERLİDİR:
   `[doc]` bir belgedir ve aynı işlevlerden geçer (geriye uyum, ek şema yok).

   İKİ KURAL:

   1. ORTADA BOŞLUK KALMAZ. Ürün silinince önceki yaprakların yeri
      korunmaz; TÜM içerik baştan akıtılır. Bu yüzden reflow "aktif sayfayı
      düzelt" değil "belgeyi baştan diz"dir — yerel düzeltme, sayfa 3'te
      delik bırakıp sayfa 4'ü olduğu gibi tutardı.

   2. GEREKSİZ YAPRAK KALKAR, GEREKEN DOĞAR. Akış bittiğinde artan yaprak
      SİLİNİR; içerik sığmıyorsa yeni yaprak AÇILIR. Sayfa sayısı bir sonuç,
      kullanıcının elle yöneteceği bir ayar değil. */

import { LayoutDocSchema, type Block, type LayoutDoc } from "@tezgah/shared";
import { autoYerlestir, zinciriBirlestir, type AutoRapor } from "./blok-yerlesim.js";

/** Belge = yaprak dizisi. En az bir yaprak her zaman vardır. */
export type CokSayfaliBelge = LayoutDoc[];

/** Sonsuz döngü korkuluğu: içerik hiç eksilmiyorsa akış durur ve raporlar. */
export const MAX_YAPRAK = 40;

export interface ReflowRapor {
  yaprakSayisi: number;
  /** Girişteki toplam ürün — veri kaybı denetiminin sol tarafı */
  urunToplam: number;
  /** Yapraklara yerleşen toplam ürün — sağ tarafı */
  urunYerlesen: number;
  /** Hiçbir yaprağa sığmayan (tavan doldu) — GİZLİ DEĞİL, raporlu */
  yerlesmeyen: AutoRapor["yerlesmeyen"];
  /** Devam bloğuna bölünen blok sayısı (tüm yapraklar toplamı). Bölünme bir
      KAYIP DEĞİL akıştır, ama kullanıcıya söylenir — sessiz bölünme, ürünün
      neden iki yerde göründüğünü açıklamaz. */
  bolunen: number;
  /** Yaprak başına adaptif karar — her sayfa kendi yoğunluğunu yaşar */
  sayfaKararlari: AutoRapor["adaptif"][];
}

/** Yaprak iskeleti: geometri KOPYALANIR, içerik boş başlar. */
function bosYaprak(ornek: LayoutDoc): LayoutDoc {
  return LayoutDocSchema.parse({
    v: 1,
    format: ornek.format,
    orientation: ornek.orientation,
    fold: ornek.fold,
    fold_style: ornek.fold_style,
    tuck_mm: ornek.tuck_mm,
    grid_mm: ornek.grid_mm,
    bleed_mm: ornek.bleed_mm,
    safe_mm: ornek.safe_mm,
    blocks: [],
  });
}

const kalemSayisi = (b: Block): number => {
  const it = (b.props as { items?: unknown[] }).items;
  return Array.isArray(it) ? it.length : 0;
};
const toplamKalem = (bs: readonly Block[]): number => bs.reduce((s, b) => s + kalemSayisi(b), 0);

/**
 * BELGENİN TAMAMINI yeniden akıtır.
 *
 * Girişteki yaprak sırası içerik SIRASINI verir: yaprak 1'in blokları, sonra
 * yaprak 2'nin... Bu sıra korunur (kullanıcının semantik düzeni auto-layout
 * tarafından keyfî bozulmaz — paket 6 kuralı, çok sayfada da geçerli).
 */
export function globalReflow(belge: CokSayfaliBelge): {
  belge: CokSayfaliBelge;
  rapor: ReflowRapor;
} {
  const ornek = belge[0] ?? LayoutDocSchema.parse({ format: "a4", orientation: "yatay", fold: 2 });

  /* 1) TÜM içeriği tek sıraya diz. Yaprak sınırları burada KAYBOLUR —
        global akışın anlamı budur: sayfa 3'ün deliği, sayfa 4'ün içeriğiyle
        kapanabilsin diye önce hepsi tek akışa döner.

        DEVAM ZİNCİRİ BURADA, BELGE ÖLÇEĞİNDE BİRLEŞİR. autoYerlestir da
        birleştirme yapıyor ama o YALNIZ kendi yaprağını görür; zincirin bir
        ucu 1. yaprakta, öteki 3. yaprakta olduğunda yaprak yaprak
        birleştirme onları hiç buluşturamaz. Ölçüldü (gerçek tarayıcı):
        birleştirme yaprak ölçeğinde kaldığında 2. yaprağın artan parçası
        kök adına çevrilip 1. yaprağın bloğuyla ÇAKIŞIYOR, ürünler
        çoğalıyordu (174 → 383). Zincir bir kez, burada, bütün belge için
        toplanır; yapraklara ondan sonra dağıtılır. */
  const tumBloklar: Block[] = zinciriBirlestir(belge.flatMap((y) => y.blocks));
  const urunToplam = toplamKalem(tumBloklar);

  const yapraklar: LayoutDoc[] = [];
  const sayfaKararlari: ReflowRapor["sayfaKararlari"] = [];
  let kalan = tumBloklar;
  let sonRapor: AutoRapor | null = null;
  let bolunen = 0;

  while (kalan.length > 0 && yapraklar.length < MAX_YAPRAK) {
    const aday = { ...bosYaprak(ornek), blocks: kalan };
    const { doc: dolu, rapor } = autoYerlestir(aday);
    sonRapor = rapor;

    /* İLERLEME KORKULUĞU: bu yaprak hiçbir şey alamadıysa döngü sonsuza
       gider. Böyle bir durumda akış DURUR ve artan rapora düşer — sessizce
       dönmek sayfayı kilitler ve kullanıcıya hiçbir şey söylemezdi. */
    if (dolu.blocks.length === 0) break;

    yapraklar.push(dolu);
    sayfaKararlari.push(rapor.adaptif);
    bolunen += rapor.bolunen;
    kalan = rapor.yerlesmeyenBloklar;
  }

  /* 2) GEREKSİZ YAPRAK KALMAZ. Hiç blok almamış yapraklar zaten
        eklenmedi; en az bir yaprak her zaman durur (boş belge de bir
        belgedir ve kullanıcı ona blok bırakabilmelidir). */
  if (yapraklar.length === 0) yapraklar.push(bosYaprak(ornek));

  const urunYerlesen = yapraklar.reduce((s, y) => s + toplamKalem(y.blocks), 0);

  return {
    belge: yapraklar,
    rapor: {
      yaprakSayisi: yapraklar.length,
      urunToplam,
      urunYerlesen,
      /* Tavan dolduysa ya da ilerleme durduysa artan RAPORLANIR */
      yerlesmeyen:
        kalan.length > 0
          ? kalan.map((b) => ({ kind: b.kind, baslik: b.kind, urun: kalemSayisi(b) }))
          : (sonRapor?.yerlesmeyen ?? []).filter(() => false),
      bolunen,
      sayfaKararlari,
    },
  };
}

/** Tek yapraklı eski belgeyi çok sayfalı belgeye çevirir (geriye uyum). */
export function belgeyeCevir(doc: LayoutDoc): CokSayfaliBelge {
  return [doc];
}
