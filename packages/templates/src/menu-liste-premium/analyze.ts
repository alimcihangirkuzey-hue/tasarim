/* menu-liste-premium analiz — shrink-then-flow (M8):
   önce tek sayfaya sığdırmak için font izinli aralıkta küçülür;
   min fontta da sığmıyorsa devam sayfalarına akar. */

import {
  formatPrice,
  type Category,
  type ClientDTO,
  type DocumentState,
  type Item,
} from "@tezgah/shared";
import {
  assetById,
  resolveSelection,
  resolveSlotValue,
  selectionFlow,
  type BindScope,
  type FlowEntry,
} from "../engine/binding.js";
import {
  estimateWidth,
  flowColumns,
  solveFontScale,
  wrapText,
  type LayoutWarning,
} from "../engine/layout.js";
import { currentFormat, paramValue } from "../engine/params.js";
import { buildQr, qrSourceUrl, type QrRender, type QrSource } from "../engine/qr.js";
import { chromeSlotValue } from "../parts/PageChrome.js";
import { pageGeometry, type PageGeometry } from "../parts/geometry.js";
import { columnLabels, hasMixedVariants } from "../parts/price.js";
import { resolveTheme, type Theme } from "../themes.js";
import { manifest } from "./manifest.js";

export interface ListRowItem {
  kind: "item";
  item: Item;
  h: number;
  nameLines: string[];
  nameFont: number;
  descLines: string[];
  descFont: number;
  /** inline: tek metin; columns: varyant başına metin (sağdan kolonlara) */
  priceTexts: string[];
  priceMode: "inline" | "columns";
}

export interface ListRowCategory {
  kind: "category";
  id: string;
  name: string;
  note?: string;
  h: number;
  /** columns düzeninde kolon başlıkları (ilk ürünün etiketleri) */
  colHeaders: string[];
}

export type ListRow = ListRowItem | ListRowCategory;

export interface ListPage {
  columns: Array<Array<{ row: ListRow; y: number }>>;
}

export interface ListAnalysis {
  theme: Theme;
  geo: PageGeometry;
  format: string;
  formatDef: { w_mm: number; h_mm: number };
  columns: number;
  colW: number;
  colGap: number;
  showDesc: boolean;
  priceLayout: "inline" | "columns";
  pages: ListPage[];
  warnings: LayoutWarning[];
  scope: BindScope;
  /** Dekor bandı (yalnız ilk sayfa altı): yerleşmiş asset url'leri */
  decor: Array<{ slotId: string; url: string; detached: boolean }>;
  decorBandH: number;
  nameFont: number;
  qr: QrRender | null;
}

const COL_GAP = 8;
const PRICE_COL_W = 16;
const CAT_H = 13;
const ROW_PAD = 2.4;

export function analyzeList(client: ClientDTO, doc: DocumentState): ListAnalysis {
  const scope: BindScope = { brand: client.brandkit, catalog: client.catalog };
  const theme = resolveTheme(doc.theme_id, client.brandkit);
  const format = currentFormat(manifest, doc);
  const formatDef = (manifest.formats as Record<string, { w_mm: number; h_mm: number }>)[format];
  const geo = pageGeometry(formatDef.w_mm, formatDef.h_mm);

  const columns = Number(paramValue(manifest, doc, "columns"));
  const showDesc = paramValue(manifest, doc, "showDesc") === true;
  const priceLayout = String(paramValue(manifest, doc, "priceLayout")) as "inline" | "columns";

  const warnings: LayoutWarning[] = [];
  if (!assetById(client, chromeSlotValue("logo", doc, scope).value)) {
    warnings.push({ type: "empty-required", slotId: "logo" });
  }

  /* Dekor slotları */
  const decor: ListAnalysis["decor"] = [];
  for (const slotId of ["deco1", "deco2", "deco3"]) {
    const slot = manifest.slots.find((s) => s.id === slotId)!;
    const { value, detached } = resolveSlotValue(slot, doc.overrides, scope);
    const asset = assetById(client, value);
    if (asset) decor.push({ slotId, url: asset.urls.master, detached });
  }
  const decorBandH = decor.length > 0 ? 26 : 0;

  /* Opsiyonel QR (mimar kararı #2) */
  let qr: QrRender | null = null;
  if (paramValue(manifest, doc, "showQr") === true) {
    const source = String(paramValue(manifest, doc, "qrSource")) as QrSource;
    const url = qrSourceUrl(source, client.brandkit);
    if (!url) warnings.push({ type: "empty-required", slotId: "qr" });
    else {
      qr = buildQr(url, 16, theme.vars["--c-item"]); // rol setimizde metin rengi --c-item'dır
      if (qr.contrastFallback) warnings.push({ type: "qr-contrast", slotId: "qr" });
    }
  }
  const qrReserve = qr ? 20 : 0;

  const colW = (geo.content.w - (columns - 1) * COL_GAP) / columns;
  const colH = geo.content.h - decorBandH - qrReserve;

  const selected = resolveSelection(client.catalog, doc.selection);
  const flow = selectionFlow(selected);

  /* columns düzeninde karışık varyant uyarısı (kategori bazında) */
  if (priceLayout === "columns") {
    for (const sc of selected) {
      if (hasMixedVariants(sc.items)) {
        warnings.push({ type: "mixed-variants", categoryId: sc.category.id });
      }
    }
  }

  const nameSlot = manifest.repeater.itemSlots.find((s) => s.id === "name")!;
  const descSlot = manifest.repeater.itemSlots.find((s) => s.id === "desc")!;

  /* Satır üretimi: verilen ad fontuna göre yükseklikler */
  const buildRows = (nameFont: number): ListRow[] => {
    const descFont = Math.max(
      descSlot.font_mm!.min,
      Math.min(descSlot.font_mm!.max, nameFont * 0.68)
    );
    const rows: ListRow[] = [];
    for (const entry of flow) {
      if (entry.kind === "category") {
        const items = selected.find((s) => s.category.id === entry.category.id)?.items ?? [];
        rows.push({
          kind: "category",
          id: entry.category.id,
          name: entry.category.name_fr,
          note: entry.category.note_fr,
          h: CAT_H + (entry.category.note_fr ? 3.4 : 0),
          colHeaders: priceLayout === "columns" ? columnLabels(items) : [],
        });
        continue;
      }
      const item = entry.item;
      const priceMode = priceLayout;
      const priceTexts =
        priceMode === "columns"
          ? item.prices.map((p) => formatPrice(p.value, client.currency))
          : [
              item.prices
                .map((p) => formatPrice(p.value, client.currency))
                .join(" / "),
            ];
      const priceZone =
        priceMode === "columns"
          ? Math.max(1, item.prices.length) * PRICE_COL_W + 3
          : estimateWidth(priceTexts[0] ?? "", nameFont, theme.ratios.item) + 8;

      const nameText = theme.uppercaseHeading
        ? item.name_fr.toLocaleUpperCase("fr-FR")
        : item.name_fr;
      const nameWrap = wrapText(nameText, {
        font_mm: nameFont,
        ratio: theme.ratios.item,
        maxWidth_mm: colW - priceZone,
        maxLines: nameSlot.maxLines!,
      });
      const descWrap =
        showDesc && item.desc_fr
          ? wrapText(item.desc_fr, {
              font_mm: descFont,
              ratio: theme.ratios.body,
              maxWidth_mm: colW * 0.78,
              maxLines: descSlot.maxLines!,
            })
          : { lines: [], truncated: false };

      const h =
        nameWrap.lines.length * nameFont * 1.25 +
        descWrap.lines.length * descFont * 1.3 +
        ROW_PAD;

      rows.push({
        kind: "item",
        item,
        h,
        nameLines: nameWrap.lines,
        nameFont,
        descLines: descWrap.lines,
        descFont,
        priceTexts,
        priceMode,
      });
    }
    return rows;
  };

  /* Shrink: tek sayfaya sığdıran en büyük font; olmuyorsa min + flow (M8) */
  const fit = solveFontScale({
    min: nameSlot.font_mm!.min,
    max: nameSlot.font_mm!.max,
    fits: (f) => {
      const rows = buildRows(f);
      const flown = flowColumns(
        rows.map((r) => ({ entry: dummyEntry(r), h_mm: r.h })),
        colH,
        columns
      );
      return flown.pages.length <= 1;
    },
  });

  const rows = buildRows(fit.font_mm);
  const flown = flowColumns(
    rows.map((r) => ({ entry: dummyEntry(r), h_mm: r.h })),
    colH,
    columns
  );

  /* flowColumns FlowEntry taşır; satırları sırayla geri eşle */
  let cursor = 0;
  const pages: ListPage[] = flown.pages.map((pageCols) => ({
    columns: pageCols.map((col) => {
      let y = 0;
      return col.map((blk) => {
        const row = rows[cursor++];
        const placed = { row, y };
        y += blk.h_mm;
        return placed;
      });
    }),
  }));

  /* Kısaltma uyarıları (görünür, M8) */
  for (const r of rows) {
    if (r.kind === "item") {
      const nameText = theme.uppercaseHeading
        ? r.item.name_fr.toLocaleUpperCase("fr-FR")
        : r.item.name_fr;
      const w = wrapText(nameText, {
        font_mm: r.nameFont,
        ratio: theme.ratios.item,
        maxWidth_mm: colW,
        maxLines: nameSlot.maxLines!,
      });
      if (w.truncated) {
        warnings.push({ type: "text-truncated", slotId: "name", itemId: r.item.id });
      }
    }
  }

  return {
    theme, geo, format, formatDef, columns, colW, colGap: COL_GAP,
    showDesc, priceLayout, pages, warnings, scope, decor, decorBandH,
    nameFont: fit.font_mm,
    qr,
  };
}

/* flowColumns yalnız kind bilgisine bakar (keep-with-next); gerçek entry taşımak gerekmez */
function dummyEntry(r: ListRow): FlowEntry {
  const category: Category = {
    id: r.kind === "category" ? r.id : "x",
    name_fr: r.kind === "category" ? r.name : "x",
    order: 0,
    items: [],
  };
  return r.kind === "category"
    ? { kind: "category", category }
    : { kind: "item", item: r.item, category };
}
