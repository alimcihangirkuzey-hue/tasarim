/* BASKI GÜVENLİĞİ / PREFLIGHT — paket 5 (journal 2026-08-07-preflight).

   SORU: "Bu tasarım baskıya güvenli mi?" Acemi kullanıcı baskı tekniği
   bilmeden cevabı görmeli. Bu modül SAF ve DETERMİNİSTİK: aynı belge aynı
   sonucu üretir; React, DOM, rastgelelik, tarih yoktur.

   EŞİKLER TEK MERKEZDE (PRINT_ESIK). Magic number dağıtmak, aynı kuralın iki
   yerde farklı sayıyla yaşamasına ve birinin sessizce bayatlamasına yol açar.

   İKİ AYRIM BU DOSYANIN OMURGASI:

   1. KRİTİK İÇERİK ≠ DEKORATİF İÇERİK. Fiyat, ürün adı, telefon, logo,
      kategori başlığı OKUNMAK zorundadır: güvenli alanın içinde durmalı ve
      kat çizgisinden uzak olmalıdır. Arka plan görseli ise kat üzerinden
      geçebilir, hatta kesim payına KADAR gitmelidir. Aynı kuralı ikisine
      birden uygulamak, ya dekoratif görselde yanlış pozitif ya kritik
      metinde kaçırılmış hata üretirdi.

   2. ÖLÇÜLEMEYEN ≠ GEÇTİ. Görselin piksel ölçüsü bilinmiyorsa DPI hesabı
      YAPILAMAZ. Bunu sessizce "geçti" saymak, kullanıcıya olmayan bir
      güvence vermek olurdu; ayrı bir bulgu olarak söylenir (journal'ın
      "ölçülemedi ≠ geçti" kuralının aynısı).

   OTOMATİK DÜZELTME YOK: bu modül OKUR, yargılar, söyler. Belgeye tek bir
   mutasyon uygulamaz (imza da buna zorlar — LayoutDoc alır, sonuç döndürür). */

import {
  GorselIcerikSchema,
  GridIcerikSchema,
  HeroIcerikSchema,
  IletisimIcerikSchema,
  KampanyaIcerikSchema,
  KategoriIcerikSchema,
  UrunListesiIcerikSchema,
  collisionsIn,
  contentArea,
  foldLines,
  gridKartOlcusu,
  icerikKapasitesi,
  overflowingBlocks,
  panelsOf,
  type Block,
  type BlockKind,
  type LayoutDoc,
  type MenuItem,
  type Panel,
} from "@tezgah/shared";

/* ── Eşikler — TEK MERKEZ ─────────────────────────────────────────────── */

export const PRINT_ESIK = {
  /** Bu DPI'ın altı baskıda gözle görülür bulanıklık (matbaa pratiği) */
  dpi_uyari: 250,
  /** Bu DPI'ın altı basılmamalı */
  dpi_kritik: 150,
  /** Kritik içerik kat çizgisine bundan yakın olmamalı (mm).
      ÖLÇÜLMÜŞ İLİŞKİ — bu sayı safe_mm ile YARIŞIR: kat çizgileri panel
      SINIRLARINDA durur, dolayısıyla güvenli alana kıstırılmış bir bloğun
      kata uzaklığı tam olarak safe_mm kadardır. Varsayılan safe_mm=5 bu
      eşikten (4) BÜYÜK olduğu için kat-yakınlık kuralı varsayılan belgede
      HİÇ ATEŞLENMEZ; ölçüldü: safe 5→[] · 4→[] · 2→fold_yakin · 0→fold_yakin.
      Bu bir kusur değil, doğru sıralamadır: GÜVENLİ ALAN ASIL KORUMADIR,
      kat kuralı onun altına inen belgeler için ARKA DURAKtır. Eşiği safe'in
      üstüne çıkarmak, tam genişlikteki her içerik bloğunu uyarır ve uyarıyı
      gürültüye çevirirdi. Erişilebilirliği testle çivilidir — ölü kural
      bırakılmadı. */
  fold_guvenli_mm: 4,
  /** Kenara bu kadar yaklaşan görsel "edge-to-edge" sayılır (mm) */
  kenar_yakin_mm: 2,
} as const;

/** Bir milimetrede kaç inç — DPI hesabının tek dönüşümü */
const MM_PER_INCH = 25.4;

/* ── Kritik / dekoratif ayrımı ────────────────────────────────────────── */

/** OKUNMAK zorunda olan içerik taşıyan bloklar — güvenli alan ve kat kuralı
    bunlara uygulanır. Dekoratif olanlar (gorsel) listede YOKTUR. */
export const KRITIK_BLOKLAR: ReadonlySet<BlockKind> = new Set<BlockKind>([
  "kategori_basligi",
  "urun_gridi",
  "fiyat_listesi",
  "hero_urun",
  "urun_karti",
  "logo",
  "iletisim",
  "kampanya",
  "qr",
  "bilgi",
]);

/** Kesim payına KADAR gitmesi beklenen bloklar — bleed kuralı bunlara. */
export const BLEED_BEKLENEN: ReadonlySet<BlockKind> = new Set<BlockKind>(["gorsel"]);

/* ── Sonuç modeli ─────────────────────────────────────────────────────── */

export type PreflightSeverity = "pass" | "warning" | "blocking";

export interface PreflightBulgu {
  code: string;
  severity: PreflightSeverity;
  /** Acemi kullanıcının anlayacağı Türkçe — teknik terim yok */
  message_tr: string;
  blockId?: string;
  panelId?: string;
  /** Ölçülen değer (ör. 118 DPI) — "bir şeyler yanlış" demekle yetinilmez */
  olculen?: number;
  /** Beklenen eşik (ör. 250 DPI) */
  esik?: number;
}

export interface PreflightSonuc {
  /** Genel karar: en ağır bulgu neyse o */
  durum: PreflightSeverity;
  bulgular: PreflightBulgu[];
  sayilar: { blocking: number; warning: number };
  /** "Baskıya hazır" kapısı — 12. madde */
  baskiyaHazir: boolean;
}

/* ── Effective DPI ────────────────────────────────────────────────────── */

export interface DpiOlcum {
  dpi_x: number;
  dpi_y: number;
  /** Kalite kararını DÜŞÜK olan belirler — zayıf eksen bulanıklığı yaratır */
  dpi: number;
  seviye: "iyi" | "uyari" | "kritik";
}

/**
 * Gerçek piksel ölçüsü ile BASILACAK fiziksel mm'den effective DPI.
 * Ekran px'i hesaba GİRMEZ (zoom/cihaz oranı/tuval ölçeği ile değişir);
 * baskı kalitesi yalnız "kaç piksel / kaç mm" sorusudur.
 * Geçersiz girdi (0, negatif, NaN) → null; uydurma değer üretilmez.
 */
export function effectiveDpi(
  px_w: number | null,
  px_h: number | null,
  mm_w: number,
  mm_h: number
): DpiOlcum | null {
  const gecerli = (v: unknown): v is number =>
    typeof v === "number" && Number.isFinite(v) && v > 0;
  if (!gecerli(px_w) || !gecerli(px_h) || !gecerli(mm_w) || !gecerli(mm_h)) return null;

  const dpi_x = px_w / (mm_w / MM_PER_INCH);
  const dpi_y = px_h / (mm_h / MM_PER_INCH);
  const dpi = Math.min(dpi_x, dpi_y);
  const seviye =
    dpi < PRINT_ESIK.dpi_kritik ? "kritik" : dpi < PRINT_ESIK.dpi_uyari ? "uyari" : "iyi";
  return { dpi_x, dpi_y, dpi, seviye };
}

/* ── Görsel kullanımları ──────────────────────────────────────────────── */

interface GorselKullanim {
  blockId: string;
  panelId: string;
  ad: string;
  px_w: number | null;
  px_h: number | null;
  /** Görselin BASILACAĞI fiziksel ölçü — kullanıma göre değişir */
  mm_w: number;
  mm_h: number;
}

/**
 * Belgedeki her GÖRSEL KULLANIMINI çıkarır. Aynı asset iki yerde
 * kullanılıyorsa İKİ kullanım doğar: küçük kartta yeterli olan çözünürlük
 * tam panel hero'da yetersiz olabilir — karar kullanım başınadır.
 */
export function gorselKullanimlari(blok: Block): GorselKullanim[] {
  const ortak = { blockId: blok.id, panelId: blok.panel_id };

  if (blok.kind === "hero_urun") {
    const c = HeroIcerikSchema.parse(blok.props);
    if (!c.item?.photo_url) return [];
    /* Hero fotoğrafı bloğun %55'ini kaplar (BlokIcerik ile aynı oran) */
    return [{ ...ortak, ad: c.item.name || "Öne çıkan ürün", px_w: c.item.photo_w, px_h: c.item.photo_h, mm_w: blok.box.w_mm, mm_h: blok.box.h_mm * 0.55 }];
  }

  if (blok.kind === "gorsel" || blok.kind === "logo") {
    const c = GorselIcerikSchema.parse(blok.props);
    if (!c.photo_url) return [];
    return [{ ...ortak, ad: blok.kind === "logo" ? "Logo" : "Görsel", px_w: c.photo_w, px_h: c.photo_h, mm_w: blok.box.w_mm, mm_h: blok.box.h_mm }];
  }

  if (blok.kind === "urun_gridi") {
    const c = GridIcerikSchema.parse(blok.props);
    const aciklamaVar = c.items.some((i) => i.desc.trim() !== "");
    const { card_w_mm, photo_h_mm } = gridKartOlcusu(blok.box.w_mm, c.columns, aciklamaVar);
    /* YALNIZ GÖRÜNEN kartlar ölçülür: gizli kalemin fotoğrafı basılmaz,
       onun için uyarı üretmek gürültü olurdu (taşma zaten ayrı bulgudur). */
    const { fits } = icerikKapasitesi(blok.kind, blok.box, blok.props);
    return c.items
      .slice(0, fits)
      .filter((i: MenuItem) => i.photo_url)
      .map((i: MenuItem) => ({ ...ortak, ad: i.name || "Ürün", px_w: i.photo_w, px_h: i.photo_h, mm_w: card_w_mm, mm_h: photo_h_mm }));
  }

  return [];
}

/* ── Kritik metin taşıyor mu ──────────────────────────────────────────── */

/** Blokta gerçekten kritik metin var mı — boş blok için uyarı üretilmez. */
function kritikMetinVar(blok: Block): boolean {
  switch (blok.kind) {
    case "kategori_basligi":
      return KategoriIcerikSchema.parse(blok.props).title.trim() !== "";
    case "iletisim": {
      const c = IletisimIcerikSchema.parse(blok.props);
      return [c.phone, c.address, c.hours].some((x) => x.trim() !== "");
    }
    case "kampanya": {
      const c = KampanyaIcerikSchema.parse(blok.props);
      return c.title.trim() !== "" || c.line.trim() !== "";
    }
    case "hero_urun":
      return (HeroIcerikSchema.parse(blok.props).item?.name.trim() ?? "") !== "";
    case "fiyat_listesi":
      return UrunListesiIcerikSchema.parse(blok.props).items.length > 0;
    case "urun_gridi":
      return GridIcerikSchema.parse(blok.props).items.length > 0;
    case "logo":
      return GorselIcerikSchema.parse(blok.props).photo_url !== null;
    default:
      return KRITIK_BLOKLAR.has(blok.kind);
  }
}

const BLOK_ADI: Record<string, string> = {
  kategori_basligi: "Kategori başlığı",
  urun_gridi: "Ürün grid'i",
  fiyat_listesi: "Fiyat listesi",
  hero_urun: "Öne çıkan ürün",
  gorsel: "Görsel",
  logo: "Logo",
  iletisim: "İletişim bilgisi",
  kampanya: "Kampanya",
  qr: "QR kodu",
  bilgi: "Bilgi",
  urun_karti: "Ürün kartı",
  ayrac: "Ayraç",
};
const adi = (b: Block): string => BLOK_ADI[b.kind] ?? "Blok";

/* ── Ana işlev ────────────────────────────────────────────────────────── */

export function preflight(doc: LayoutDoc): PreflightSonuc {
  const bulgular: PreflightBulgu[] = [];
  const paneller = panelsOf(doc);
  const panelById = new Map(paneller.map((p) => [p.id, p]));

  const ekle = (b: PreflightBulgu): void => void bulgular.push(b);

  /* 1) ÇÖZÜNÜRLÜK — kullanım başına */
  for (const blok of doc.blocks) {
    for (const k of gorselKullanimlari(blok)) {
      const o = effectiveDpi(k.px_w, k.px_h, k.mm_w, k.mm_h);
      if (o === null) {
        ekle({
          code: "dpi_olculemedi",
          severity: "warning",
          message_tr: `"${k.ad}" fotoğrafının çözünürlüğü okunamadı — baskı kalitesi garanti edilemez.`,
          blockId: k.blockId,
          panelId: k.panelId,
        });
        continue;
      }
      if (o.seviye === "iyi") continue;
      ekle({
        code: o.seviye === "kritik" ? "dpi_kritik" : "dpi_dusuk",
        severity: o.seviye === "kritik" ? "blocking" : "warning",
        message_tr:
          o.seviye === "kritik"
            ? `"${k.ad}" fotoğrafı bu boyutta baskıya uygun değil — çok bulanık çıkar.`
            : `"${k.ad}" fotoğrafı bu boyutta düşük çözünürlüklü — baskıda bulanık görünebilir.`,
        blockId: k.blockId,
        panelId: k.panelId,
        olculen: Math.round(o.dpi),
        esik: o.seviye === "kritik" ? PRINT_ESIK.dpi_kritik : PRINT_ESIK.dpi_uyari,
      });
    }
  }

  /* 2) GÜVENLİ ALAN — yalnız KRİTİK içerik */
  for (const blok of doc.blocks) {
    const panel = panelById.get(blok.panel_id);
    if (!panel) continue;
    if (!KRITIK_BLOKLAR.has(blok.kind) || !kritikMetinVar(blok)) continue;
    const a = contentArea(panel, doc);
    const disari =
      blok.box.x_mm < a.x_mm - 1e-6 ||
      blok.box.y_mm < a.y_mm - 1e-6 ||
      blok.box.x_mm + blok.box.w_mm > a.x_mm + a.w_mm + 1e-6 ||
      blok.box.y_mm + blok.box.h_mm > a.y_mm + a.h_mm + 1e-6;
    if (disari) {
      ekle({
        code: "safe_ihlali",
        severity: "blocking",
        message_tr: `${adi(blok)} güvenli alanın dışına taşıyor — kesimde kırpılabilir.`,
        blockId: blok.id,
        panelId: panel.id,
      });
    }
  }

  /* 3) KAT GÜVENLİĞİ — yalnız KRİTİK içerik.
        Dekoratif görselin kat üzerinden geçmesi HATA DEĞİLDİR ve burada
        hiç sorgulanmaz (KRITIK_BLOKLAR süzgeci). */
  for (const side of ["dis", "ic"] as const) {
    const katlar = foldLines({
      format: doc.format,
      orientation: doc.orientation,
      fold: doc.fold,
      fold_style: doc.fold_style,
      side,
    });
    if (katlar.length === 0) continue;
    for (const blok of doc.blocks) {
      const panel = panelById.get(blok.panel_id);
      if (!panel || panel.side !== side) continue;
      if (!KRITIK_BLOKLAR.has(blok.kind) || !kritikMetinVar(blok)) continue;
      const sol = panel.x_mm + blok.box.x_mm;
      const sag = sol + blok.box.w_mm;
      for (const kat of katlar) {
        const uzeri = kat > sol && kat < sag;
        const yakin =
          !uzeri &&
          (Math.abs(kat - sol) < PRINT_ESIK.fold_guvenli_mm ||
            Math.abs(kat - sag) < PRINT_ESIK.fold_guvenli_mm);
        if (!uzeri && !yakin) continue;
        ekle({
          code: uzeri ? "fold_uzeri" : "fold_yakin",
          severity: uzeri ? "blocking" : "warning",
          message_tr: uzeri
            ? `${adi(blok)} kat çizgisinin üstünde kalıyor — katlanınca okunmaz.`
            : `${adi(blok)} kat çizgisine çok yakın.`,
          blockId: blok.id,
          panelId: panel.id,
          olculen: Math.round(Math.min(Math.abs(kat - sol), Math.abs(kat - sag)) * 10) / 10,
          esik: PRINT_ESIK.fold_guvenli_mm,
        });
      }
    }
  }

  /* 4) BLEED — yalnız kenara dayanan DEKORATİF görsel.
        Logo/metinden bleed BEKLENMEZ (BLEED_BEKLENEN süzgeci). */
  for (const blok of doc.blocks) {
    const panel = panelById.get(blok.panel_id);
    if (!panel || !BLEED_BEKLENEN.has(blok.kind)) continue;
    if (!GorselIcerikSchema.parse(blok.props).photo_url) continue;
    const yaprakSol = panel.x_mm + blok.box.x_mm;
    const yaprakSag = yaprakSol + blok.box.w_mm;
    const ust = blok.box.y_mm;
    const alt = ust + blok.box.h_mm;
    const sheetW = paneller.reduce((s, p) => (p.side === panel.side ? s + p.w_mm : s), 0);
    /* Yaprağın DIŞ kenarına dayanıyor mu — iç panel sınırları kenar değildir */
    const kenarda =
      yaprakSol <= PRINT_ESIK.kenar_yakin_mm ||
      yaprakSag >= sheetW - PRINT_ESIK.kenar_yakin_mm ||
      ust <= PRINT_ESIK.kenar_yakin_mm ||
      alt >= panel.h_mm - PRINT_ESIK.kenar_yakin_mm;
    if (!kenarda) continue;
    /* Kenara dayanıyor ama kesim payına UZANMIYOR → beyaz şerit riski */
    ekle({
      code: "bleed_eksik",
      severity: "warning",
      message_tr: `${adi(blok)} sayfa kenarına dayanıyor ama kesim payına ulaşmıyor — kenarda beyaz şerit çıkabilir.`,
      blockId: blok.id,
      panelId: panel.id,
      esik: doc.bleed_mm,
    });
  }

  /* 5) TAŞMA · ÇAKIŞMA · VERİ KAYBI — paket 3-4 sözleşmesinin preflight bağı.
        Bunlardan biri varsa PASS verilemez: kullanıcının yazdığı bir şey
        basılmıyor demektir. */
  for (const panel of paneller) {
    for (const id of overflowingBlocks(doc, panel.id)) {
      const b = doc.blocks.find((x) => x.id === id);
      ekle({
        code: "panel_tasmasi",
        severity: "blocking",
        message_tr: `${b ? adi(b) : "Bir blok"} panelin dışına taşıyor.`,
        blockId: id,
        panelId: panel.id,
      });
    }
    for (const [a, b] of collisionsIn(doc, panel.id)) {
      ekle({
        code: "cakisma",
        severity: "blocking",
        message_tr: "İki blok üst üste biniyor — biri diğerini kapatıyor.",
        blockId: a,
        panelId: panel.id,
        olculen: undefined,
        esik: undefined,
      });
      void b;
    }
  }
  for (const blok of doc.blocks) {
    const { hidden } = icerikKapasitesi(blok.kind, blok.box, blok.props);
    if (hidden > 0) {
      ekle({
        code: "gizli_urun",
        severity: "blocking",
        message_tr: `${adi(blok)} içinde ${hidden} kalem sığmadığı için basılmayacak.`,
        blockId: blok.id,
        panelId: blok.panel_id,
        olculen: hidden,
        esik: 0,
      });
    }
  }

  const blocking = bulgular.filter((b) => b.severity === "blocking").length;
  const warning = bulgular.filter((b) => b.severity === "warning").length;
  const durum: PreflightSeverity = blocking > 0 ? "blocking" : warning > 0 ? "warning" : "pass";

  return { durum, bulgular, sayilar: { blocking, warning }, baskiyaHazir: blocking === 0 };
}

/** Üstte gösterilecek tek cümle — acemi kullanıcı rapor okumasın. */
export function preflightOzet(s: PreflightSonuc): string {
  if (s.sayilar.blocking > 0) return "Baskıya gönderilemez";
  if (s.sayilar.warning > 0)
    return `${s.sayilar.warning} noktayı gözden geçir`;
  return "Baskıya hazır";
}

export type { Panel };
