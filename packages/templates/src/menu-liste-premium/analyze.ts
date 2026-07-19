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
import { estimateWidth, wrapText, type LayoutWarning } from "../engine/layout.js";
import { composeColumns, resolveOverflowStrategy } from "../engine/composition.js";
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

/* FAZ5 §3 (mimar #14): yoğun (3 sütun) metrik seti. Analiz VE Template aynı
   çarpanları buradan okur (M3 tek kaynak — iki yerde sürüklenmez). */
export interface ListMetrics {
  compact: boolean;
  nameLineH: number; // ad satır aralığı çarpanı
  descLineH: number; // açıklama satır aralığı çarpanı
  catH: number; // kategori satırı yüksekliği
  rowPad: number; // ürün satırı alt boşluğu
  nameMaxFont: number; // solveFontScale tavanı (compact → bir kademe düşük)
  descMaxLines: number; // compact → tek satır
  dotsMaxLen: number; // leader dots azami uzunluğu (compact → kısa)
}

export function listMetrics(columns: number, nameFontMax: number, descMaxLines: number): ListMetrics {
  const compact = columns >= 3;
  return compact
    ? {
        compact: true,
        nameLineH: 1.12,
        descLineH: 1.15,
        catH: 10,
        rowPad: 1.4,
        nameMaxFont: Math.min(nameFontMax, 3.6), // bir kademe düşük tavan
        descMaxLines: 1,
        dotsMaxLen: 10,
      }
    : {
        compact: false,
        nameLineH: 1.25,
        descLineH: 1.3,
        catH: 13,
        rowPad: 2.4,
        nameMaxFont: nameFontMax,
        descMaxLines,
        dotsMaxLen: Infinity,
      };
}

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
  /** FAZ5 §3: yoğun (3 sütun) mod metrikleri — Template aynısını okur */
  metrics: ListMetrics;
  qr: QrRender | null;
}

const COL_GAP = 8;
const PRICE_COL_W = 16;

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

  /* Fiyat-bekliyor (K3/F7-A): fiyatsız görünür ürün için bilgi uyarısı — render
     güvenli (boş fiyat basılmaz), ama sessiz kaybolmaz (M8) */
  for (const sc of selected) {
    for (const it of sc.items) {
      if (it.prices.length === 0) warnings.push({ type: "empty-price", itemId: it.id });
    }
  }

  const nameSlot = manifest.repeater.itemSlots.find((s) => s.id === "name")!;
  const descSlot = manifest.repeater.itemSlots.find((s) => s.id === "desc")!;
  const metrics = listMetrics(columns, nameSlot.font_mm!.max, descSlot.maxLines!);

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
          h: metrics.catH + (entry.category.note_fr ? 3.4 : 0),
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
              maxLines: metrics.descMaxLines,
            })
          : { lines: [], truncated: false };

      const h =
        nameWrap.lines.length * nameFont * metrics.nameLineH +
        descWrap.lines.length * descFont * metrics.descLineH +
        metrics.rowPad;

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

  /* KOMPOZİSYON — Canonical 4.1: politika artık paylaşılan motorda.
     Strateji manifest'ten OKUNUR (`repeater.overflow`); ilan ile davranış
     ayrışamaz. Bu şablonun ilanı "shrink-then-flow": önce fonta bin, sığmazsa
     sayfa ekle — ürün DÜŞMEZ (M8: sessiz kırpma yok). */
  const strategy = resolveOverflowStrategy(manifest.repeater.overflow, "shrink-then-flow");
  const composed = composeColumns<ListRow>(
    {
      build: (font) => buildRows(font).map((r) => ({ entry: r, h_mm: r.h })),
      typography: { min: nameSlot.font_mm!.min, max: metrics.nameMaxFont },
      columns: { kind: "fixed", count: columns },
      columnHeight_mm: colH,
      strategy,
      targetPages: 1,
    },
    (row) => row.kind === "category" /* kategori tek başına sütun sonunda kalmaz */
  );

  /* FAZ5 §3: yoğun modda font okunabilirlik tabanına (min) dayandıysa uyar (M8);
     içerik yine akar (sayfa eklenir), sessiz kırpma yok. */
  if (metrics.compact && !composed.fitsTarget) {
    warnings.push({ type: "min-font", slotId: "name" });
  }
  /* Strateji ürün düşürdüyse GÖRÜNÜR uyarı (bu şablonda düşmez; sözleşme gereği) */
  if (composed.overflow.length > 0) {
    warnings.push({ type: "overflow-items", count: composed.overflow.length });
  }

  const rows = buildRows(composed.font_mm);
  const pages: ListPage[] = composed.pages.map((p) => ({
    columns: p.columns.map((col) => col.map((b) => ({ row: b.entry, y: b.y_mm }))),
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
    nameFont: composed.font_mm,
    metrics,
    qr,
  };
}
