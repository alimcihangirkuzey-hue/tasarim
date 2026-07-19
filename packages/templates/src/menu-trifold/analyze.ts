/* menu-trifold analiz — iç yüz 3 sütunlu liste akışı (satır motoru yeniden kullanımı);
   ÖNCE fonta biner, 3 sütuna da sığmazsa sığmayanı görünür taşma uyarısıyla
   dışarıda bırakır (M8) — yani "shrink-then-warn". Trifold fiziksel olarak tek
   yüzdür; sayfa eklenemez.

   ŞERH: bu şablon manifest'teki `repeater.overflow` ilanını HENÜZ OKUMUYOR,
   davranışı burada sabit kodlu. İlan ile davranış (manifest.ts'te) hizalandı
   ama bağ kurulmadı — motora bağlama ayrı pakettir. */

import { formatPrice, type ClientDTO, type DocumentState, type Item } from "@tezgah/shared";
import {
  assetById,
  resolveSelection,
  resolveSlotValue,
  selectionFlow,
  type BindScope,
} from "../engine/binding.js";
import {
  estimateWidth,
  flowColumns,
  solveFontScale,
  wrapText,
  type FlowBlock,
  type LayoutWarning,
} from "../engine/layout.js";
import { paramValue } from "../engine/params.js";
import { buildQr, qrSourceUrl, type QrRender, type QrSource } from "../engine/qr.js";
import { resolveTheme, type Theme } from "../themes.js";
import { INNER_PANELS, manifest } from "./manifest.js";

export const PAGE_W = 297;
export const PAGE_H = 210;
const PANEL_PAD = 9;
const INNER_TOP = 14;
const INNER_BOTTOM = 16;
const CAT_H = 11;
const ROW_PAD = 2;

export interface TriRow {
  kind: "category" | "item";
  h: number;
  /* category */
  name?: string;
  note?: string;
  /* item */
  item?: Item;
  nameLines?: string[];
  nameFont?: number;
  descLines?: string[];
  descFont?: number;
  priceText?: string;
}

export interface TrifoldAnalysis {
  theme: Theme;
  scope: BindScope;
  warnings: LayoutWarning[];
  pages: 2;
  /* dış yüz */
  slogan: { text: string; detached: boolean };
  flapTitle: { text: string; detached: boolean };
  coverUrl: string | null;
  logoUrl: string | null;
  phone: string;
  address: string;
  hours: string;
  qr: QrRender | null;
  footnote: string;
  flapItems: Array<{ name: string; price: string }>;
  /* iç yüz: 3 sütun (x/w panel haritasından) */
  innerColumns: Array<{ x: number; w: number; rows: Array<{ row: TriRow; y: number }> }>;
  overflowCount: number;
  showDesc: boolean;
  colH: number;
}

export function analyzeTrifold(client: ClientDTO, doc: DocumentState): TrifoldAnalysis {
  const scope: BindScope = { brand: client.brandkit, catalog: client.catalog };
  const theme = resolveTheme(doc.theme_id, client.brandkit);
  const warnings: LayoutWarning[] = [];

  const slot = (id: string) => manifest.slots.find((s) => s.id === id)!;
  const sv = (id: string) => resolveSlotValue(slot(id), doc.overrides, scope);
  const text = (id: string) => {
    const { value, detached } = sv(id);
    return { text: typeof value === "string" ? value : "", detached };
  };

  const logoAsset = assetById(client, sv("logo").value);
  if (!logoAsset) warnings.push({ type: "empty-required", slotId: "logo" });
  const coverAsset = assetById(client, sv("cover_photo").value);

  /* QR standart: seçili kaynak boşsa tel'e düşer; o da yoksa boş + uyarı */
  const source = String(paramValue(manifest, doc, "qrSource")) as QrSource;
  const url = qrSourceUrl(source, client.brandkit) ?? qrSourceUrl("tel", client.brandkit);
  let qr: QrRender | null = null;
  if (!url) warnings.push({ type: "empty-required", slotId: "qr" });
  else {
    qr = buildQr(url, 18, theme.vars["--c-item"]);
    if (qr.contrastFallback) warnings.push({ type: "qr-contrast", slotId: "qr" });
  }

  const showDesc = paramValue(manifest, doc, "showDesc") === true;

  /* İç kanat: populaire etiketliler önce, en fazla 4 ürün */
  const selected = resolveSelection(client.catalog, doc.selection);
  const allItems = selected.flatMap((s) => s.items);
  const flapPick = [
    ...allItems.filter((i) => i.tags.includes("populaire")),
    ...allItems.filter((i) => !i.tags.includes("populaire")),
  ].slice(0, 4);
  const flapItems = flapPick.map((i) => ({
    name: i.name_fr,
    price: i.prices[0] ? formatPrice(i.prices[0].value, client.currency) : "",
  }));

  /* İç yüz satırları — en dar panel genişliğiyle sarılır (deterministik, temkinli) */
  const colH = PAGE_H - INNER_TOP - INNER_BOTTOM;
  const minColW = Math.min(...INNER_PANELS.map((p) => p.w)) - 2 * PANEL_PAD;
  const nameSlot = manifest.repeater.itemSlots.find((s) => s.id === "name")!;
  const descSlot = manifest.repeater.itemSlots.find((s) => s.id === "desc")!;
  const flow = selectionFlow(selected);

  const buildRows = (nameFont: number): TriRow[] => {
    const descFont = Math.max(descSlot.font_mm!.min, Math.min(descSlot.font_mm!.max, nameFont * 0.7));
    const rows: TriRow[] = [];
    for (const e of flow) {
      if (e.kind === "category") {
        rows.push({
          kind: "category",
          name: e.category.name_fr,
          note: e.category.note_fr,
          h: CAT_H + (e.category.note_fr ? 3 : 0),
        });
        continue;
      }
      const item = e.item;
      const priceText = item.prices
        .map((p) => formatPrice(p.value, client.currency))
        .join(" / ");
      const priceW = estimateWidth(priceText, nameFont * 0.9, theme.ratios.item) + 6;
      const nameText = theme.uppercaseHeading ? item.name_fr.toLocaleUpperCase("fr-FR") : item.name_fr;
      const nw = wrapText(nameText, {
        font_mm: nameFont,
        ratio: theme.ratios.item,
        maxWidth_mm: minColW - priceW,
        maxLines: nameSlot.maxLines!,
      });
      const dw =
        showDesc && item.desc_fr
          ? wrapText(item.desc_fr, {
              font_mm: descFont,
              ratio: theme.ratios.body,
              maxWidth_mm: minColW * 0.85,
              maxLines: descSlot.maxLines!,
            })
          : { lines: [] as string[], truncated: false };
      rows.push({
        kind: "item",
        item,
        h: nw.lines.length * nameFont * 1.3 + dw.lines.length * descFont * 1.3 + ROW_PAD,
        nameLines: nw.lines,
        nameFont,
        descLines: dw.lines,
        descFont,
        priceText,
      });
    }
    return rows;
  };

  const toBlocks = (rows: TriRow[]): FlowBlock[] =>
    rows.map((r) => ({
      h_mm: r.h,
      entry:
        r.kind === "category"
          ? { kind: "category", category: { id: "c", name_fr: r.name ?? "", order: 0, items: [] } }
          : { kind: "item", item: r.item!, category: { id: "c", name_fr: "", order: 0, items: [] } },
    }));

  /* shrink: 3 sütunlu TEK yüze sığdır; min'de de sığmıyorsa taşanlar uyarıya döner */
  const fit = solveFontScale({
    min: nameSlot.font_mm!.min,
    max: nameSlot.font_mm!.max,
    fits: (f) => flowColumns(toBlocks(buildRows(f)), colH, 3).pages.length <= 1,
  });
  const rows = buildRows(fit.font_mm);
  const flown = flowColumns(toBlocks(rows), colH, 3);

  let cursor = 0;
  const firstPage = flown.pages[0] ?? [];
  const innerColumns = INNER_PANELS.map((panel, ci) => {
    const col = firstPage[ci] ?? [];
    let y = 0;
    const placed = col.map((blk) => {
      const row = rows[cursor++];
      const out = { row, y };
      y += blk.h_mm;
      return out;
    });
    return { x: panel.x + PANEL_PAD, w: panel.w - 2 * PANEL_PAD, rows: placed };
  });
  const overflowCount = rows.length - cursor;
  if (overflowCount > 0) warnings.push({ type: "overflow-items", count: overflowCount });

  return {
    theme,
    scope,
    warnings,
    pages: 2,
    slogan: text("slogan"),
    flapTitle: text("flap_title"),
    coverUrl: coverAsset?.urls.master ?? null,
    logoUrl: logoAsset?.urls.master ?? null,
    phone: text("phone").text,
    address: text("address").text,
    hours: text("hours").text,
    qr,
    footnote: text("footnote").text,
    flapItems,
    innerColumns,
    overflowCount,
    showDesc,
    colH,
  };
}
