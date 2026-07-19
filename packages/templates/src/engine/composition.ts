/* DYNAMIC COMPOSITION ENGINE — Canonical Bölüm 4.1 / 4.3 / 7.2
   ============================================================================
   Şablona özel yerleşim politikasının ortak, teknoloji-bağımsız çekirdeği.
   Bu dosya SAF'tır: DOM yok, render yok, rastgelelik yok, saat yok.
   Aynı girdi + aynı ayar = aynı yerleşim (deterministik — Canonical 4.1).

   NEDEN VAR: taşma stratejisi, sütun seçimi, sayfa bölme ve font ölçekleme
   daha önce her şablonun analyze.ts'inde ELLE tekrarlanıyordu; manifest'teki
   `repeater.overflow` alanı ise ilan ediliyor ama HİÇBİR kod tarafından
   okunmuyordu (ölü sözleşme). Artık strateji buradan geçer ve ilan ile
   davranış ayrışamaz.

   İKİ KOMPOZİSYON BİÇİMİ
   · composeColumns — değişken yükseklikli blokların sütun/sayfa akışı
     (menü listesi ailesi: "shrink-then-flow")
   · composeGrid    — sabit hücreli ızgara yerleşimi, kapasite GEOMETRİDEN
     türetilir (flyer/kart aileleri: "shrink-then-warn")

   GENİŞLEME: yeni üretim profili bu sözleşmeleri parametreyle kullanır;
   çekirdek değişmez (Canonical 7.2). */

import { solveFontScale } from "./layout.js";

/* ------------------------------------------------------------------ */
/* Sözleşmeler                                                         */
/* ------------------------------------------------------------------ */

/** Manifest'te ilan edilen taşma stratejisi — artık CANLI kuraldır. */
export const OVERFLOW_STRATEGIES = [
  /** Font sabit; içerik taşarsa sayfa eklenir. Ürün DÜŞMEZ. */
  "flow",
  /** Önce fonta bin, sığmazsa sayfa ekle. Ürün DÜŞMEZ. */
  "shrink-then-flow",
  /** Önce fonta bin, yine sığmazsa sığmayanı GÖRÜNÜR uyarıyla dışarıda bırak. */
  "shrink-then-warn",
  /** Font sabit; sığmayan GÖRÜNÜR uyarıyla dışarıda bırakılır. */
  "truncate-with-warning",
] as const;
export type OverflowStrategy = (typeof OVERFLOW_STRATEGIES)[number];

export function isOverflowStrategy(v: unknown): v is OverflowStrategy {
  return typeof v === "string" && (OVERFLOW_STRATEGIES as readonly string[]).includes(v);
}

/**
 * Manifest ilanını stratejiye çevirir. Bilinmeyen/eksik ilan SESSİZCE
 * varsayılana düşmez — çağıran açık bir yedek vermek zorundadır ki
 * "ilan ile davranış ayrışmasın".
 */
export function resolveOverflowStrategy(
  declared: unknown,
  fallback: OverflowStrategy
): OverflowStrategy {
  return isOverflowStrategy(declared) ? declared : fallback;
}

/** Stratejinin ürün düşürmesine izin var mı? (kalite kapısı bunu okur) */
export function strategyDropsContent(s: OverflowStrategy): boolean {
  return s === "shrink-then-warn" || s === "truncate-with-warning";
}
/** Strateji font küçültüyor mu? */
export function strategyShrinks(s: OverflowStrategy): boolean {
  return s === "shrink-then-flow" || s === "shrink-then-warn";
}

/** Sütun sayısı: sabit ya da İÇERİKTEN türetilen (Canonical 4.1 dinamik grid) */
export type ColumnStrategy =
  | { kind: "fixed"; count: number }
  | { kind: "derive"; min: number; max: number };

export interface CompositionBlock<T> {
  entry: T;
  h_mm: number;
}

export interface PlacedBlock<T> {
  entry: T;
  y_mm: number;
  h_mm: number;
}

export interface CompositionPage<T> {
  columns: Array<Array<PlacedBlock<T>>>;
}

export interface ColumnCompositionRequest<T> {
  /** Verilen font ve sütun sayısında blokları üretir. SAF olmalıdır. */
  build: (font_mm: number, columns: number) => Array<CompositionBlock<T>>;
  typography: { min: number; max: number };
  columns: ColumnStrategy;
  columnHeight_mm: number;
  strategy: OverflowStrategy;
  /** Shrink'in tutturmaya çalıştığı sayfa sayısı (varsayılan 1) */
  targetPages?: number;
  /** Düşüren stratejilerde tutulacak sayfa tavanı (varsayılan targetPages) */
  maxPages?: number;
  /** Son sütun dengeleme (Canonical 4.3) — GÖRSEL DEĞİŞİKLİKTİR, opt-in */
  balanceLastColumn?: boolean;
  /**
   * Varyasyon tohumu (Canonical 4.4). Bugün yerleşimi ETKİLEMEZ; sözleşmede
   * taşınır ki tohumlu varyasyon eklendiğinde imza değişmesin. Determinizm
   * garantisi: aynı seed + aynı veri = aynı sonuç.
   */
  seed?: string;
}

export interface CompositionMetrics {
  blocks: number;
  placed: number;
  pages: number;
  strategy: OverflowStrategy;
  /** Sütun doluluk farkı (0 = kusursuz denge); son satır dengesizliği ölçüsü */
  imbalance_mm: number;
}

export interface CompositionResult<T> {
  font_mm: number;
  /** Hedef sayfa sayısı tutturulabildi mi? (min-font uyarısının kaynağı) */
  fitsTarget: boolean;
  columns: number;
  pages: Array<CompositionPage<T>>;
  /** Strateji gereği dışarıda kalanlar — çağıran GÖRÜNÜR uyarı üretir */
  overflow: T[];
  metrics: CompositionMetrics;
}

/* ------------------------------------------------------------------ */
/* Sütun/sayfa kompozisyonu                                            */
/* ------------------------------------------------------------------ */

/** Blokları sütunlara akıtır (keep-with-next: kategori tek başına kalmaz). */
function flowIntoColumns<T>(
  blocks: Array<CompositionBlock<T>>,
  colH_mm: number,
  colsPerPage: number,
  keepWithNext: (entry: T) => boolean
): Array<Array<Array<CompositionBlock<T>>>> {
  const pages: Array<Array<Array<CompositionBlock<T>>>> = [];
  let page: Array<Array<CompositionBlock<T>>> = [];
  let col: Array<CompositionBlock<T>> = [];
  let used = 0;

  const closeCol = () => {
    page.push(col);
    col = [];
    used = 0;
    if (page.length >= colsPerPage) {
      pages.push(page);
      page = [];
    }
  };

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const next = blocks[i + 1];
    const needed = keepWithNext(b.entry) && next ? b.h_mm + next.h_mm : b.h_mm;
    if (used > 0 && used + needed > colH_mm) closeCol();
    col.push(b);
    used += b.h_mm;
  }
  if (col.length > 0) page.push(col);
  if (page.length > 0) pages.push(page);
  return pages.length > 0 ? pages : [[[]]];
}

/** Sütunları eşit yüksekliğe yaklaştırır (yalnız tek sayfada, opt-in). */
function balanceColumns<T>(
  blocks: Array<CompositionBlock<T>>,
  colsPerPage: number,
  keepWithNext: (entry: T) => boolean
): Array<Array<CompositionBlock<T>>> {
  const total = blocks.reduce((s, b) => s + b.h_mm, 0);
  const target = total / colsPerPage;
  const cols: Array<Array<CompositionBlock<T>>> = [];
  let col: Array<CompositionBlock<T>> = [];
  let used = 0;

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const remainingCols = colsPerPage - cols.length;
    const isLastCol = remainingCols <= 1;
    const next = blocks[i + 1];
    const glued = keepWithNext(b.entry) && next;
    /* hedefi aşacaksa ve bu blokla birlikte kalması gereken bir şey yoksa kapat */
    if (!isLastCol && used > 0 && used + b.h_mm > target && !glued) {
      cols.push(col);
      col = [];
      used = 0;
    }
    col.push(b);
    used += b.h_mm;
  }
  cols.push(col);
  while (cols.length < colsPerPage) cols.push([]);
  return cols;
}

const heightOf = <T,>(col: Array<CompositionBlock<T>>): number =>
  col.reduce((s, b) => s + b.h_mm, 0);

/**
 * Değişken yükseklikli blokların sütun/sayfa kompozisyonu.
 * Deterministik: aynı girdi → aynı font, aynı sütun, aynı yerleşim.
 */
export function composeColumns<T>(
  req: ColumnCompositionRequest<T>,
  keepWithNext: (entry: T) => boolean = () => false
): CompositionResult<T> {
  const targetPages = req.targetPages ?? 1;
  const strategy = req.strategy;

  /* 1) Sütun sayısı — sabit ya da içerikten türetilen */
  const candidates =
    req.columns.kind === "fixed"
      ? [req.columns.count]
      : range(req.columns.min, req.columns.max);

  let columns = candidates[candidates.length - 1];
  if (req.columns.kind === "derive") {
    /* En AZ sütunla hedefi tutturan aday kazanır (deterministik, okunabilirlik
       lehine: daha az sütun = daha geniş satır). */
    for (const c of candidates) {
      const blocks = req.build(req.typography.max, c);
      if (flowIntoColumns(blocks, req.columnHeight_mm, c, keepWithNext).length <= targetPages) {
        columns = c;
        break;
      }
    }
  }

  /* 2) Font — strateji küçültüyorsa hedef sayfaya sığdıran en büyük değer */
  const fit = strategyShrinks(strategy)
    ? solveFontScale({
        min: req.typography.min,
        max: req.typography.max,
        fits: (f) =>
          flowIntoColumns(req.build(f, columns), req.columnHeight_mm, columns, keepWithNext)
            .length <= targetPages,
      })
    : { font_mm: req.typography.max, fits: true };

  const blocks = req.build(fit.font_mm, columns);

  /* 3) Akış (gerekiyorsa dengeli) */
  let pageCols: Array<Array<Array<CompositionBlock<T>>>>;
  const balanced =
    req.balanceLastColumn === true &&
    flowIntoColumns(blocks, req.columnHeight_mm, columns, keepWithNext).length === 1;
  if (balanced) {
    pageCols = [balanceColumns(blocks, columns, keepWithNext)];
  } else {
    pageCols = flowIntoColumns(blocks, req.columnHeight_mm, columns, keepWithNext);
  }

  /* 4) Strateji: düşüren stratejilerde sayfa tavanı uygulanır */
  const overflow: T[] = [];
  const limit = strategyDropsContent(strategy) ? (req.maxPages ?? targetPages) : Infinity;
  const keptPages = pageCols.slice(0, Math.max(1, Math.min(pageCols.length, limit)));
  for (const dropped of pageCols.slice(keptPages.length)) {
    for (const col of dropped) for (const b of col) overflow.push(b.entry);
  }

  /* 5) y konumları — sütun içinde sıralı yığma */
  const pages: Array<CompositionPage<T>> = keptPages.map((cols) => ({
    columns: cols.map((col) => {
      let y = 0;
      return col.map((b) => {
        const placed: PlacedBlock<T> = { entry: b.entry, y_mm: y, h_mm: b.h_mm };
        y += b.h_mm;
        return placed;
      });
    }),
  }));

  const placed = pages.reduce(
    (n, p) => n + p.columns.reduce((m, c) => m + c.length, 0),
    0
  );
  const lastPage = keptPages[keptPages.length - 1] ?? [];
  const heights = lastPage.map((c) => heightOf(c));
  const imbalance =
    heights.length > 1 ? Math.max(...heights) - Math.min(...heights) : 0;

  return {
    font_mm: fit.font_mm,
    fitsTarget: fit.fits && pageCols.length <= targetPages,
    columns,
    pages,
    overflow,
    metrics: {
      blocks: blocks.length,
      placed,
      pages: pages.length,
      strategy,
      imbalance_mm: Math.round(imbalance * 1000) / 1000,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Izgara kompozisyonu                                                 */
/* ------------------------------------------------------------------ */

export interface GridCompositionRequest<T> {
  entries: readonly T[];
  cols: number;
  /** Yerleşim alanı — satır sayısı BURADAN türetilir (sabit ürün sayısı YOK) */
  availableH_mm: number;
  /** Hücrenin inebileceği en küçük yükseklik; kapasiteyi bu belirler */
  minCellH_mm: number;
  gap_mm: number;
  cellW_mm: number;
  originX_mm: number;
  originY_mm: number;
  strategy: OverflowStrategy;
  /** Satır tavanı (opsiyonel; profil isterse sınırlar) */
  maxRows?: number;
}

export interface GridCell<T> {
  entry: T;
  x_mm: number;
  y_mm: number;
  w_mm: number;
  h_mm: number;
}

export interface GridCompositionResult<T> {
  cells: Array<GridCell<T>>;
  overflow: T[];
  rows: number;
  capacity: number;
  cellH_mm: number;
  metrics: CompositionMetrics;
}

/**
 * Sabit hücreli ızgara. Kapasite GEOMETRİDEN türetilir: kaç satır sığıyorsa
 * o kadar. Sığmayanlar stratejiye göre dışarıda kalır (görünür uyarı çağıranın
 * işidir) — sessiz `slice` YOKTUR.
 */
export function composeGrid<T>(req: GridCompositionRequest<T>): GridCompositionResult<T> {
  const { availableH_mm, minCellH_mm, gap_mm, cols } = req;
  const maxRows = Math.max(
    1,
    Math.floor((availableH_mm + gap_mm) / (minCellH_mm + gap_mm))
  );
  const rows = req.maxRows ? Math.min(maxRows, req.maxRows) : maxRows;
  const cellH = (availableH_mm - (rows - 1) * gap_mm) / rows;
  const capacity = cols * rows;

  /* Izgara sabit yüzeydir: kapasite geometrik bir tavandır, strateji onu
     esnetemez. Stratejinin tek işlevi çağıranın taşmayı nasıl RAPORLADIĞIDIR
     (uyarı mı, hata mı) — burada içerik her hâlde tavanda kesilir, ama
     kesilen kayıtlar `overflow` ile geri verilir; sessiz kayıp yoktur. */
  const shown = req.entries.slice(0, capacity);
  const overflow = req.entries.slice(shown.length);

  const cells = shown.map((entry, i) => ({
    entry,
    x_mm: req.originX_mm + (i % cols) * (req.cellW_mm + gap_mm),
    y_mm: req.originY_mm + Math.floor(i / cols) * (cellH + gap_mm),
    w_mm: req.cellW_mm,
    h_mm: cellH,
  }));

  return {
    cells,
    overflow: [...overflow],
    rows,
    capacity,
    cellH_mm: cellH,
    metrics: {
      blocks: req.entries.length,
      placed: cells.length,
      pages: 1,
      strategy: req.strategy,
      imbalance_mm: 0,
    },
  };
}

function range(min: number, max: number): number[] {
  const out: number[] = [];
  for (let i = min; i <= max; i++) out.push(i);
  return out.length > 0 ? out : [Math.max(1, min)];
}
