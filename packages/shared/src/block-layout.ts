/* BLOK YERLEŞİM MODELİ — acemi tasarım builder'ın SAF çekirdeği.
   (journal 2026-08-07-blok-yerlesim-modeli)

   ÜRÜN HEDEFİ: grafik programı bilmeyen biri, baskılı bir ürünü seçip
   ölçü/format belirleyerek blokları tıklayıp sürükleyerek baskıya hazır
   tasarım üretebilmeli. CorelDRAW klonu DEĞİL — kısıtlı, akıllı, blok tabanlı.

   NEDEN YENİ BİR ÇEKİRDEK (ölçüldü): depoda iki ayrı dünya var ve bağlı değiller.
     · ŞABLON dünyası gerçek baskıyı üretir (manifest + slot + repeater +
       engine/layout + bleed/safe; menu-trifold mm cinsinden GERÇEK panel
       haritası taşır) — ama yerleşim SABİTTİR: aynı panelde grid ile fiyat
       listesi yan yana duramaz.
     · KANVAS dünyası (canvas.ts) yeniden dizilebilir — ama serbest şekildir
       (rect/ellipse/text), sahnesi 900×600 PİKSELdir ve PRINT'E HİÇ GİRMEZ
       (composition.ts · PrintPage · exports.ts içinde tek `canvas` referansı
       yoktur; yalnız AtolyePage'de yaşar).
   Yani bugün sürüklenebilen şey basılmıyor, basılan şey sürüklenemiyor. Bu
   modül aradaki omurgadır: BLOK tabanlı (serbest şekil değil) · mm/panel
   farkında (şablon gibi) · yeniden dizilebilir (kanvas gibi).

   GENELLİK KURALI: motor ÜRÜN TİPİNE değil BASKILI YÜZEYE geneldir. Burada
   "flyer" kelimesi geçmez; format × yön × katlama üçlüsü neyse panel ondan
   TÜRETİLİR. Bugün restoran menüsü, yarın A5 broşür / A3 menü / Amerikan
   servis / tabela aynı motoru kullanır.

   SAFLIK: React yok, Konva yok, DB yok. canvas.ts'in korkuluk felsefesi
   aynen: mutasyon tek kapıdan geçer ve kapı izin-listelidir. */

import { z } from "zod";

/* ── Blok sözlüğü ─────────────────────────────────────────────────────── */

/* KAPALI SÖZLÜK — blok tipi bir YERLEŞİM DAVRANIŞIDIR, içerik değil.
   PALET ≠ MOTOR ŞERHİ: ürün sahibinin blok kütüphanesi 13 kalem sayar ve
   "İçecek listesi" ayrı bir kalemdir. Motorda ayrı tip DEĞİLDİR: içecek
   listesi, içecek kategorisine bağlanmış bir `fiyat_listesi`dir — yerleşim
   davranışı birebir aynıdır. Ayrı tip açmak aynı yerleşim mantığını iki
   yerde yaşatırdı (ve ikisi sessizce ayrışırdı). Kullanıcı yine 13 blok
   görür; palet katmanı `fiyat_listesi`nin üstüne bir ÖN AYAR koyar. Aynı
   ilişki "büyük görsel bloğu" ile `gorsel` arasında da vardır.
   Yeni tip eklemek = yeni YERLEŞİM davranışı kanıtlamak. */
export const BLOCK_KINDS = [
  "kategori_basligi",
  "urun_karti",
  "urun_gridi",
  "fiyat_listesi",
  "hero_urun",
  "gorsel",
  "logo",
  "iletisim",
  "kampanya",
  "qr",
  "bilgi",
  "ayrac",
] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];
export const BlockKindSchema = z.enum(BLOCK_KINDS);

/* Paletten bırakılan bloğun BAŞLANGIÇ ölçüsü (mm). Bu bir yerleşim bilgisidir,
   UI süsü değil: acemi kullanıcı boyut girmez — bloğu bırakır ve makul bir
   şeyle karşılaşır. Genişlikler A4 üç-panel (≈97mm, safe sonrası ≈87mm)
   ölçeğine göre seçildi; daha dar bir panele bırakılırsa placeBlock içerik
   alanına sıkıştırır (taşma sessiz kalmaz, bildirilir).
   Yeniden boyutlandırma kullanıcının elindedir — bunlar yalnız TOHUM. */
export const BLOCK_DEFAULT_SIZE_MM: Record<BlockKind, { w_mm: number; h_mm: number }> = {
  /* 18mm: pad + başlık + ayraç + ALT BAŞLIK. 12mm idi ve alt başlık
     sessizce kırpılıyordu — görsel provada ölçüldü (26px kutuya 38px içerik). */
  kategori_basligi: { w_mm: 85, h_mm: 18 },
  urun_karti: { w_mm: 40, h_mm: 45 },
  urun_gridi: { w_mm: 85, h_mm: 70 },
  fiyat_listesi: { w_mm: 85, h_mm: 60 },
  hero_urun: { w_mm: 85, h_mm: 75 },
  gorsel: { w_mm: 85, h_mm: 55 },
  logo: { w_mm: 45, h_mm: 25 },
  iletisim: { w_mm: 85, h_mm: 25 },
  kampanya: { w_mm: 85, h_mm: 30 },
  qr: { w_mm: 25, h_mm: 25 },
  bilgi: { w_mm: 85, h_mm: 20 },
  ayrac: { w_mm: 85, h_mm: 5 },
};

/* ── Sayfa geometrisi ─────────────────────────────────────────────────── */

/** ISO 216 kısa/uzun kenar (mm) — dikey yönde w=kısa, h=uzun */
export const PAGE_FORMATS = {
  a3: { short_mm: 297, long_mm: 420, label_tr: "A3" },
  a4: { short_mm: 210, long_mm: 297, label_tr: "A4" },
  a5: { short_mm: 148, long_mm: 210, label_tr: "A5" },
} as const;
export type PageFormat = keyof typeof PAGE_FORMATS;
export const PageFormatSchema = z.enum(
  Object.keys(PAGE_FORMATS) as [PageFormat, ...PageFormat[]]
);

export const OrientationSchema = z.enum(["dikey", "yatay"]);
export type Orientation = z.infer<typeof OrientationSchema>;

/* Kırım sayısı: 0 katlamasız · 1 tek kırım · 2 iki kırım. Panel sayısı
   kırımdan TÜREVDİR (kırım + 1), elle girilmez — kullanıcı teknik ölçü
   hesaplamaz, ürün sahibinin kuralı budur. */
export const FoldCountSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);
export type FoldCount = z.infer<typeof FoldCountSchema>;

/* İki kırımda katlama BİÇİMİ geometriyi değiştirir ve bu fiziksel bir
   gerçektir, süs değil:
     · roll (sarmal): en içteki panel diğerlerinin İÇİNE kıvrılır, bu yüzden
       PAYI KADAR DAR olmak zorundadır — yoksa katlanınca kabarır. menu-trifold
       bunu 297mm'de 97/100/100 diye zaten uyguluyor (tuck = 3mm).
     · akordeon (zikzak): paneller birbirinin içine girmez → EŞİT genişlik.
   Tek kırımda iç içe girme yoktur → pay 0 (bilinçli varsayılan). */
export const FoldStyleSchema = z.enum(["roll", "akordeon"]);
export type FoldStyle = z.infer<typeof FoldStyleSchema>;

/** Sarmal katlamada içe kıvrılan panelin daraltma payı (mm) — trifold emsali */
export const DEFAULT_TUCK_MM = 3;
/** Yerleştirme ızgarası (mm). canvas.ts'in CANVAS_GRID'i piksel; bu mm. */
export const DEFAULT_GRID_MM = 5;

export const PANEL_ROLES = ["on", "arka", "kanat", "ic"] as const;
export type PanelRole = (typeof PANEL_ROLES)[number];

/** Türetilmiş panel — SAKLANMAZ, format+yön+katlamadan her okumada üretilir
    (paket kaydının foldPackageJournal deseni: türetilebilir olan yazılmaz). */
export interface Panel {
  id: string;
  /** dış = kapalıyken görünen yüz, iç = açılınca görünen yüz */
  side: "dis" | "ic";
  /** yüz içindeki sıra (0 tabanlı, soldan sağa) */
  index: number;
  /** yaprağın sol kenarından ofset (mm) */
  x_mm: number;
  w_mm: number;
  h_mm: number;
  role: PanelRole;
  label_tr: string;
}

/** Yaprağın (açık hâlin) fiziksel ölçüsü */
export function sheetSize(
  format: PageFormat,
  orientation: Orientation
): { w_mm: number; h_mm: number } {
  const f = PAGE_FORMATS[format];
  return orientation === "yatay"
    ? { w_mm: f.long_mm, h_mm: f.short_mm }
    : { w_mm: f.short_mm, h_mm: f.long_mm };
}

/* Panel genişlikleri. Kırımlar UZUN eksene diktir (yaprağın genişliği bölünür) —
   basılı katlanır işlerin standardı budur ve trifold da böyledir.
   TOPLAM KORUNUR: paylar dağıtılırken w_mm toplamı yaprak genişliğine EŞİT
   kalır; aksi hâlde kullanıcı göremediği bir mm kaybının bedelini baskıda öder. */
function panelWidths(sheetW: number, fold: FoldCount, style: FoldStyle, tuck: number): {
  dis: number[];
  ic: number[];
} {
  if (fold === 0) return { dis: [sheetW], ic: [sheetW] };
  if (fold === 1) {
    const half = sheetW / 2;
    return { dis: [half, half], ic: [half, half] };
  }
  if (style === "akordeon") {
    const third = sheetW / 3;
    return { dis: [third, third, third], ic: [third, third, third] };
  }
  /* roll: taban = (W + tuck) / 3; kıvrılan panel taban - tuck.
     297 & tuck 3 → taban 100 → [97,100,100] (menu-trifold ile birebir). */
  const base = (sheetW + tuck) / 3;
  return { dis: [base - tuck, base, base], ic: [base, base, base - tuck] };
}

/* Rol ataması. Kapalı hâlde ELE GELEN yüz "dış"tır; kullanıcı panel sırası
   düşünmesin diye roller ANLAM taşır (kapak/arka/kanat), sayı değil. */
function panelRoles(fold: FoldCount, side: "dis" | "ic"): PanelRole[] {
  if (side === "ic") return fold === 0 ? ["arka"] : fold === 1 ? ["ic", "ic"] : ["ic", "ic", "ic"];
  if (fold === 0) return ["on"];
  if (fold === 1) return ["arka", "on"];
  return ["kanat", "arka", "on"]; // menu-trifold OUTER_PANELS sırası
}

const ROLE_LABEL: Record<PanelRole, string> = {
  on: "Ön kapak",
  arka: "Arka",
  kanat: "İç kanat",
  ic: "İç",
};

/**
 * Format × yön × katlamadan panel haritasını ÜRETİR.
 * menu-trifold'un SABİT haritası (OUTER_PANELS/INNER_PANELS) burada
 * genelleştirilmiştir — kopyalanmamıştır; a4-yatay-2-roll çağrısı o haritanın
 * birebir aynısını verir ve bu testle çivilenir.
 */
export function buildPanels(cfg: {
  format: PageFormat;
  orientation: Orientation;
  fold: FoldCount;
  fold_style?: FoldStyle;
  tuck_mm?: number;
}): Panel[] {
  const { w_mm: sheetW, h_mm: sheetH } = sheetSize(cfg.format, cfg.orientation);
  const style = cfg.fold_style ?? "roll";
  const tuck = cfg.tuck_mm ?? DEFAULT_TUCK_MM;
  const widths = panelWidths(sheetW, cfg.fold, style, tuck);

  const panels: Panel[] = [];
  for (const side of ["dis", "ic"] as const) {
    const roles = panelRoles(cfg.fold, side);
    let x = 0;
    widths[side].forEach((w, i) => {
      const role = roles[i];
      panels.push({
        id: `${side}-${i}`,
        side,
        index: i,
        x_mm: x,
        w_mm: w,
        h_mm: sheetH,
        role,
        label_tr:
          cfg.fold === 0
            ? side === "dis"
              ? "Ön yüz"
              : "Arka yüz"
            : role === "ic"
              ? `İç ${i + 1}`
              : ROLE_LABEL[role],
      });
      x += w;
    });
  }
  return panels;
}

/** Kat çizgilerinin yaprak solundan mm konumları (tek yüz için aynıdır) */
export function foldLines(cfg: {
  format: PageFormat;
  orientation: Orientation;
  fold: FoldCount;
  fold_style?: FoldStyle;
  tuck_mm?: number;
  side?: "dis" | "ic";
}): number[] {
  const side = cfg.side ?? "dis";
  const panels = buildPanels(cfg).filter((p) => p.side === side);
  /* Son panelin sağ kenarı yaprağın kenarıdır — kat çizgisi DEĞİLDİR */
  return panels.slice(0, -1).map((p) => p.x_mm + p.w_mm);
}

/* ── Blok ve belge ────────────────────────────────────────────────────── */

/** Bir bloğun panel-YEREL kutusu (mm). Panel-yerel: blok başka panele
    taşınınca koordinatı yeniden hesaplanmaz, yalnız panel_id değişir. */
export const BlockBoxSchema = z.object({
  x_mm: z.number().min(0),
  y_mm: z.number().min(0),
  w_mm: z.number().positive(),
  h_mm: z.number().positive(),
});
export type BlockBox = z.infer<typeof BlockBoxSchema>;

export const BlockSchema = z.object({
  id: z.string().min(1),
  kind: BlockKindSchema,
  panel_id: z.string().min(1),
  box: BlockBoxSchema,
  /* İçerik BAĞI — blok neyi gösterir. Motor içeriği YORUMLAMAZ (paket 3'ün
     işi); burada yalnız taşınır. Serbest kayıt: yarının blok tipi bugünün
     şemasını kırmasın (CD v1'in "bilinmeyen alan toleransı" felsefesi). */
  props: z.record(z.unknown()).default({}),
});
export type Block = z.infer<typeof BlockSchema>;

export const LayoutDocSchema = z.object({
  v: z.literal(1).default(1),
  format: PageFormatSchema,
  orientation: OrientationSchema,
  fold: FoldCountSchema,
  fold_style: FoldStyleSchema.default("roll"),
  tuck_mm: z.number().min(0).max(20).default(DEFAULT_TUCK_MM),
  /* Yerleştirme ızgarası — 0 İZİN VERİLMEZ: ızgarasız yerleşim "serbest
     koordinat kaosu"dur ve ürün sahibinin açıkça reddettiği şeydir. */
  grid_mm: z.number().positive().max(50).default(DEFAULT_GRID_MM),
  /* Kenar payları: bleed baskı sonrası kesilir, safe içine metin girmez.
     Şablon dünyasındaki bleed_mm/safe_mm ilanlarıyla aynı anlam. */
  bleed_mm: z.number().min(0).max(20).default(3),
  safe_mm: z.number().min(0).max(30).default(5),
  blocks: z.array(BlockSchema).default([]),
});
export type LayoutDoc = z.infer<typeof LayoutDocSchema>;

export function panelsOf(doc: LayoutDoc): Panel[] {
  return buildPanels({
    format: doc.format,
    orientation: doc.orientation,
    fold: doc.fold,
    fold_style: doc.fold_style,
    tuck_mm: doc.tuck_mm,
  });
}

/** Panelin blok konabilen iç alanı (safe payı düşülmüş, panel-yerel) */
export function contentArea(panel: Panel, doc: LayoutDoc): BlockBox {
  const s = doc.safe_mm;
  return {
    x_mm: s,
    y_mm: s,
    w_mm: Math.max(0, panel.w_mm - s * 2),
    h_mm: Math.max(0, panel.h_mm - s * 2),
  };
}

/* ── Snap · çarpışma · taşma ──────────────────────────────────────────── */

/** Kayan nokta gürültüsünü mm'nin binde birine yuvarlar — 97.00000000000001
    gibi bir değerin "hizalı değil" sayılmasını engeller. */
const round3 = (n: number): number => Math.round(n * 1000) / 1000;

const snapTo = (v: number, step: number): number => round3(Math.round(v / step) * step);

/** İki kutu çakışıyor mu (kenar teması çakışma DEĞİLDİR) */
export function overlaps(a: BlockBox, b: BlockBox): boolean {
  return (
    a.x_mm < b.x_mm + b.w_mm &&
    b.x_mm < a.x_mm + a.w_mm &&
    a.y_mm < b.y_mm + b.h_mm &&
    b.y_mm < a.y_mm + a.h_mm
  );
}

export interface PlaceResult {
  box: BlockBox;
  /** Izgaraya ya da komşu kenarına hizalandı mı (akıllı kılavuz sinyali) */
  snapped: boolean;
  /** Çarpışma nedeniyle aşağı itildi mi */
  pushed: boolean;
  /** İçerik alanına sığmıyor — kullanıcıya "bu panel doldu" denecek durum */
  overflow: boolean;
}

/* Hizalama toleransı (mm): komşu kenarına bu kadar yakınsa kenara yapışır.
   Izgaradan AYRI bir mekanizmadır — ürün sahibinin "akıllı kılavuz" isteği
   ızgara adımından bağımsızdır (5mm ızgarada 2mm'lik kayıklık kılavuzsuz
   düzelmez). */
export const SNAP_TOLERANCE_MM = 2.5;

/**
 * Bir bloğu panele yerleştirir: ızgaraya + komşu kenarlarına snap, çarpışma
 * varsa AŞAĞI it, sonra taşmayı bildir.
 *
 * NEDEN "AŞAĞI İT" (ve neden reddetmiyoruz): acemi kullanıcı bloğu kabaca
 * doğru yere bırakır; isteği "buraya koy"dur, "şu koordinata koy" değil.
 * Reddetmek onu piksel avına gönderirdi — ürün sahibinin reddettiği kaos da
 * tam olarak bu. İtme yönü DİKEYdir çünkü baskılı yüzeyde içerik akışı
 * yukarıdan aşağıyadır; yana itmek sütun düzenini bozardı.
 *
 * SAF: doc'u DEĞİŞTİRMEZ, sonucu döndürür (canvas.ts'in reducer disiplini).
 */
export function placeBlock(
  doc: LayoutDoc,
  panel: Panel,
  candidate: BlockBox,
  opts?: { ignoreBlockId?: string }
): PlaceResult {
  const area = contentArea(panel, doc);
  const others = doc.blocks.filter(
    (b) => b.panel_id === panel.id && b.id !== opts?.ignoreBlockId
  );

  /* 0. GEÇERSİZ SAYI KORKULUĞU. Koordinat DOM'dan gelir (sürükleme bırakma
     noktası: clientX - rect.left) ve o zincirin herhangi bir halkası tanımsız
     dönerse sonuç NaN olur. NaN sessizce geçseydi kutu NaN olarak BELGEYE
     yazılırdı — geçersiz kayıt üretmek bu depoda yasaktır (intake'in "sessiz
     yarım kayıt YASAK" kuralıyla aynı ilke). Karşılığı: geçersiz konum içerik
     alanının başına düşer, geçersiz ölçü ızgara adımına iner. Sessiz DÜZELTME
     değil sessiz BOZULMA engelleniyor; kullanıcı bloğu yine görür ve taşır.
     (Bu açık paket 2'nin jsdom turunda gerçek bir NaN uyarısıyla yakalandı —
     spekülatif değil, ölçülmüş.) */
  const sayi = (v: number, yedek: number): number => (Number.isFinite(v) ? v : yedek);
  const olcu = (v: number): number => (Number.isFinite(v) && v > 0 ? v : doc.grid_mm);
  const istekX = sayi(candidate.x_mm, area.x_mm);
  const istekY = sayi(candidate.y_mm, area.y_mm);

  /* 1. Izgaraya snap */
  let x = snapTo(istekX, doc.grid_mm);
  let y = snapTo(istekY, doc.grid_mm);
  const w = round3(olcu(candidate.w_mm));
  const h = round3(olcu(candidate.h_mm));
  let snapped = x !== round3(istekX) || y !== round3(istekY);

  /* 2. İçerik alanına sıkıştır — safe payının DIŞINA blok konmaz */
  x = Math.min(Math.max(x, area.x_mm), Math.max(area.x_mm, area.x_mm + area.w_mm - w));
  y = Math.min(Math.max(y, area.y_mm), Math.max(area.y_mm, area.y_mm + area.h_mm - h));

  /* 3. Komşu kenarlarına hizala (akıllı kılavuz) — ızgaradan SONRA, çünkü
     kullanıcının gözüne çarpan hizasızlık komşuya göredir, ızgaraya göre değil. */
  for (const o of others) {
    for (const edge of [o.box.x_mm, o.box.x_mm + o.box.w_mm]) {
      if (Math.abs(x - edge) <= SNAP_TOLERANCE_MM && edge + w <= area.x_mm + area.w_mm) {
        x = round3(edge);
        snapped = true;
      }
    }
    for (const edge of [o.box.y_mm, o.box.y_mm + o.box.h_mm]) {
      if (Math.abs(y - edge) <= SNAP_TOLERANCE_MM) {
        y = round3(edge);
        snapped = true;
      }
    }
  }

  /* 4. Çarpışma → aşağı it. Sıralı tarama: itildikçe yeni komşularla
     çakışabilir, o yüzden sabit noktaya kadar dönülür. Tur sayısı komşu
     sayısıyla sınırlı (sonsuz döngü imkânsız — her tur y ARTAR). */
  let pushed = false;
  let box: BlockBox = { x_mm: x, y_mm: y, w_mm: w, h_mm: h };
  for (let i = 0; i <= others.length; i++) {
    const hit = others.find((o) => overlaps(box, o.box));
    if (!hit) break;
    box = { ...box, y_mm: round3(hit.box.y_mm + hit.box.h_mm) };
    pushed = true;
  }

  /* 5. Taşma: itildikten sonra içerik alanının ALTINDAN taştı mı. Sessizce
     kırpılmaz — çağıran kullanıcıya "bu panel doldu" der (M8 dürüstlüğü). */
  const overflow =
    box.y_mm + box.h_mm > round3(area.y_mm + area.h_mm) ||
    box.x_mm + box.w_mm > round3(area.x_mm + area.w_mm);

  return { box, snapped, pushed, overflow };
}

/** Panelde birbiriyle çakışan blok çiftleri (id ikilileri) — nöbetçi/teşhis */
export function collisionsIn(doc: LayoutDoc, panelId: string): Array<[string, string]> {
  const inPanel = doc.blocks.filter((b) => b.panel_id === panelId);
  const out: Array<[string, string]> = [];
  for (let i = 0; i < inPanel.length; i++) {
    for (let j = i + 1; j < inPanel.length; j++) {
      if (overlaps(inPanel[i].box, inPanel[j].box)) out.push([inPanel[i].id, inPanel[j].id]);
    }
  }
  return out;
}

/** İçerik alanını aşan bloklar — "yazı katlama çizgisine çok yakın" sınıfı
    uyarıların veri kaynağı (insan dili paket 5'te kurulur). */
export function overflowingBlocks(doc: LayoutDoc, panelId: string): string[] {
  const panel = panelsOf(doc).find((p) => p.id === panelId);
  if (!panel) return [];
  const area = contentArea(panel, doc);
  return doc.blocks
    .filter((b) => b.panel_id === panelId)
    .filter(
      (b) =>
        b.box.x_mm < area.x_mm ||
        b.box.y_mm < area.y_mm ||
        round3(b.box.x_mm + b.box.w_mm) > round3(area.x_mm + area.w_mm) ||
        round3(b.box.y_mm + b.box.h_mm) > round3(area.y_mm + area.h_mm)
    )
    .map((b) => b.id);
}
