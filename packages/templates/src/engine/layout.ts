/* Overflow motoru — CONSTITUTION §5.6 / M8: yerleşim deterministiktir.
   Sıra: (1) shrink — font izinli aralıkta küçülür; (2) manifest'e göre
   flow (devama akar) ya da warn (görünür sayaç). İçerik sessizce kırpılmaz.
   SVG <text> otomatik satır kırmaz; sarma burada, ortalama glif genişliği
   oranıyla deterministik yapılır. */

import type { Category, Item } from "@tezgah/shared";
import type { FlowEntry } from "./binding.js";

/* ------------------------------------------------------------------ */
/* Metin ölçümü ve sarma                                               */
/* ------------------------------------------------------------------ */

/** Karakter sınıfına göre genişlik çarpanı (base = font_mm × ratio) */
function charFactor(ch: string): number {
  if ("iıjltf.,'’·:;!|()[] ".includes(ch)) return 0.55;
  if ("mwMW€ŒÆ%@—".includes(ch)) return 1.45;
  if (ch >= "A" && ch <= "Z") return 1.15;
  if ("ĞŞİÇÖÜ".includes(ch)) return 1.15;
  return 1;
}

/** Deterministik genişlik tahmini (mm) */
export function estimateWidth(text: string, font_mm: number, ratio: number): number {
  let units = 0;
  for (const ch of text) units += charFactor(ch);
  return units * font_mm * ratio;
}

export interface WrapResult {
  lines: string[];
  /** true → maxLines'a sığmadı; çağıran görünür kısaltma (…) + uyarı üretir (M8) */
  truncated: boolean;
}

/** Kelime bazlı açgözlü sarma; satıra sığmayan tek kelime karakterden bölünür */
export function wrapText(
  text: string,
  opts: { font_mm: number; ratio: number; maxWidth_mm: number; maxLines: number }
): WrapResult {
  const { font_mm, ratio, maxWidth_mm, maxLines } = opts;
  const fits = (s: string) => estimateWidth(s, font_mm, ratio) <= maxWidth_mm;

  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";

  const pushLine = () => {
    if (cur) lines.push(cur);
    cur = "";
  };

  for (const word of words) {
    const candidate = cur ? `${cur} ${word}` : word;
    if (fits(candidate)) {
      cur = candidate;
      continue;
    }
    pushLine();
    if (fits(word)) {
      cur = word;
      continue;
    }
    /* tek kelime satıra sığmıyor → karakterden böl */
    let piece = "";
    for (const ch of word) {
      if (fits(piece + ch)) piece += ch;
      else {
        if (piece) lines.push(piece);
        piece = ch;
      }
    }
    cur = piece;
  }
  pushLine();

  if (lines.length <= maxLines) return { lines, truncated: false };
  return { lines: lines.slice(0, maxLines), truncated: true };
}

/* ------------------------------------------------------------------ */
/* Shrink çözücü                                                       */
/* ------------------------------------------------------------------ */

/**
 * font_mm aralığında (max→min, sabit adım) sığan en büyük boyu bulur.
 * Hiçbiri sığmazsa min + fits:false döner (çağıran flow ya da warn uygular).
 */
export function solveFontScale(opts: {
  min: number;
  max: number;
  step?: number;
  fits: (font_mm: number) => boolean;
}): { font_mm: number; fits: boolean } {
  const step = opts.step ?? 0.2;
  const steps = Math.max(0, Math.round((opts.max - opts.min) / step));
  for (let i = 0; i <= steps; i++) {
    const font = Math.round((opts.max - i * step) * 100) / 100;
    if (opts.fits(font)) return { font_mm: font, fits: true };
  }
  return { font_mm: opts.min, fits: false };
}

/* ------------------------------------------------------------------ */
/* Grid yerleşimi — shrink-then-warn (menu-grid-cells)                 */
/* ------------------------------------------------------------------ */

export interface GridSpec {
  cols: number;
  availW_mm: number;
  availH_mm: number;
  gap_mm: number;
  rowH_mm: number;
  catH_mm: number;
}

export type GridPlacement =
  | { kind: "category"; category: Category; x: number; y: number; w: number; h: number }
  | { kind: "cell"; item: Item; category: Category; x: number; y: number; w: number; h: number };

export interface GridLayout {
  placed: GridPlacement[];
  /** Sığmayan ürünler — editörde kırmızı sayaç: "N ürün sığmıyor" (kabul §7/6) */
  overflow: Array<{ item: Item; category: Category }>;
  cellW_mm: number;
  usedH_mm: number;
}

/**
 * Tek sayfalık grid akışı. Kategori ayracı tam genişlik şerittir; ardından
 * en az bir hücre satırı sığmıyorsa şerit de bir sonrakilerle birlikte taşar
 * (asılı başlık bırakılmaz).
 */
export function layoutGrid(flow: FlowEntry[], spec: GridSpec): GridLayout {
  const { cols, availW_mm, availH_mm, gap_mm, rowH_mm, catH_mm } = spec;
  const cellW = (availW_mm - (cols - 1) * gap_mm) / cols;

  const placed: GridPlacement[] = [];
  const overflow: Array<{ item: Item; category: Category }> = [];

  let y = 0;
  let col = 0;
  let rowOpen = false;
  let overflowing = false;

  const closeRow = () => {
    if (rowOpen) {
      y += rowH_mm + gap_mm;
      col = 0;
      rowOpen = false;
    }
  };

  for (const entry of flow) {
    if (entry.kind === "category") {
      closeRow();
      /* şerit + en az bir satır sığmalı; yoksa buradan itibaren taşma */
      if (overflowing || y + catH_mm + gap_mm + rowH_mm > availH_mm) {
        overflowing = true;
        continue;
      }
      placed.push({ kind: "category", category: entry.category, x: 0, y, w: availW_mm, h: catH_mm });
      y += catH_mm + gap_mm;
      continue;
    }

    if (overflowing) {
      overflow.push({ item: entry.item, category: entry.category });
      continue;
    }

    if (!rowOpen) {
      if (y + rowH_mm > availH_mm) {
        overflowing = true;
        overflow.push({ item: entry.item, category: entry.category });
        continue;
      }
      rowOpen = true;
      col = 0;
    }

    placed.push({
      kind: "cell",
      item: entry.item,
      category: entry.category,
      x: col * (cellW + gap_mm),
      y,
      w: cellW,
      h: rowH_mm,
    });
    col++;
    if (col >= cols) closeRow();
  }
  closeRow();

  return { placed, overflow, cellW_mm: cellW, usedH_mm: y > 0 ? y - gap_mm : 0 };
}

/**
 * Çok sayfalı grid akışı — FAZ4-GOREV §8 (M8: taşma uyarısı yerine sayfa eklenir).
 * İlk sayfa tam başlıklı spec'le, devam sayfaları ince bant spec'iyle dizilir.
 * Sayfa ortasında bölünen kategorinin şeridi devam sayfasında yeniden konur
 * (asılı ürün bırakılmaz); ilerleme olmayan turda döngü kırılır (determinizm).
 */
export function layoutGridPaged(
  flow: FlowEntry[],
  firstSpec: GridSpec,
  contSpec: GridSpec,
  maxPages = 30
): GridLayout[] {
  const pages: GridLayout[] = [];
  let remaining = flow;
  while (remaining.length > 0 && pages.length < maxPages) {
    const spec = pages.length === 0 ? firstSpec : contSpec;
    let f = remaining;
    if (pages.length > 0 && f[0]?.kind === "item") {
      f = [{ kind: "category", category: f[0].category }, ...f];
    }
    const l = layoutGrid(f, spec);
    pages.push(l);
    if (l.placed.length === 0) break; /* hiçbir şey sığmadı → sonsuz döngü koruması */
    remaining = l.overflow.map((o) => ({ kind: "item" as const, item: o.item, category: o.category }));
  }
  if (pages.length === 0) pages.push(layoutGrid(flow, firstSpec));
  return pages;
}

/* ------------------------------------------------------------------ */
/* Sütun/sayfa akışı — shrink-then-flow (menu-liste-premium)           */
/* ------------------------------------------------------------------ */

export interface FlowBlock {
  entry: FlowEntry;
  h_mm: number;
}

export interface ColumnFlow {
  /** pages[p][c] = o sütundaki bloklar */
  pages: FlowBlock[][][];
}

/**
 * Blokları sütunlara, sütunları sayfalara akıtır. Kategori bloğu tek başına
 * sütun sonunda kalmaz (keep-with-next). Sütundan uzun blok, taze sütuna
 * yerleştirilir (sonsuz döngü koruması; görünür taşmayı çağıran raporlar).
 */
export function flowColumns(
  blocks: FlowBlock[],
  colH_mm: number,
  colsPerPage: number
): ColumnFlow {
  const pages: FlowBlock[][][] = [];
  let page: FlowBlock[][] = [];
  let colBlocks: FlowBlock[] = [];
  let used = 0;

  const closeCol = () => {
    page.push(colBlocks);
    colBlocks = [];
    used = 0;
    if (page.length >= colsPerPage) {
      pages.push(page);
      page = [];
    }
  };

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const isCat = b.entry.kind === "category";
    const next = blocks[i + 1];
    /* kategori: bir sonraki blokla birlikte sığmalı */
    const needed = isCat && next ? b.h_mm + next.h_mm : b.h_mm;

    if (used > 0 && used + needed > colH_mm) closeCol();
    colBlocks.push(b);
    used += b.h_mm;
  }
  if (colBlocks.length > 0 || page.length > 0) {
    if (colBlocks.length > 0) page.push(colBlocks);
    if (page.length > 0) pages.push(page);
  }

  return { pages: pages.length > 0 ? pages : [[[]]] };
}

/* ------------------------------------------------------------------ */
/* Çözünürlük eşikleri — CONSTITUTION §9.2 (M4)                        */
/* ------------------------------------------------------------------ */

export interface DpiCheck {
  effectiveDpi: number;
  level: "ok" | "yellow" | "red";
}

/** Etkin DPI = piksel / (mm / 25.4). Menü ürün ailesi: sarı <250, kırmızı <150 */
export function checkDpi(
  px_w: number,
  px_h: number,
  w_mm: number,
  h_mm: number,
  thresholds: { yellow: number; red: number } = { yellow: 250, red: 150 }
): DpiCheck {
  if (px_w <= 0 || px_h <= 0 || w_mm <= 0 || h_mm <= 0) {
    return { effectiveDpi: 0, level: "red" };
  }
  const dpiW = px_w / (w_mm / 25.4);
  const dpiH = px_h / (h_mm / 25.4);
  const dpi = Math.round(Math.min(dpiW, dpiH));
  const level = dpi < thresholds.red ? "red" : dpi < thresholds.yellow ? "yellow" : "ok";
  return { effectiveDpi: dpi, level };
}

/* Ortak uyarı modeli — editör sağ paneli ve export özeti bunları gösterir (M4) */
export type LayoutWarning =
  | { type: "overflow-items"; count: number }
  | { type: "text-truncated"; slotId: string; itemId?: string }
  | { type: "low-dpi"; slotId: string; itemId?: string; effectiveDpi: number; level: "yellow" | "red" }
  | { type: "empty-required"; slotId: string }
  | { type: "mixed-variants"; categoryId: string }
  | { type: "qr-contrast"; slotId: string }
  | { type: "contrast"; ratio: number }
  | { type: "mono-suggest"; slotId: string }
  | { type: "fine-detail"; areaId: string }
  /* FAZ4 §3 (mimar #8 devamı): her broderie belgesinde silik bilgi notu */
  | { type: "broderie-info" };
