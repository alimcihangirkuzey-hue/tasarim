/* menu-grid-cells analiz: yerleşim + uyarılar TEK yerde hesaplanır; hem bileşen
   hem editör paneli bunu okur (M3 tek kaynak, M4 görünür uyarılar, M8 determinizm). */

import type { ClientDTO, DocumentState, Item } from "@tezgah/shared";
import {
  assetById,
  resolveSelection,
  selectionFlow,
  type BindScope,
  type FlowEntry,
} from "../engine/binding.js";
import {
  checkDpi,
  layoutGrid,
  layoutGridPaged,
  solveFontScale,
  wrapText,
  type GridLayout,
  type GridSpec,
  type LayoutWarning,
  type WrapResult,
} from "../engine/layout.js";
import { currentFormat, paramValue } from "../engine/params.js";
import { buildQr, qrSourceUrl, type QrRender, type QrSource } from "../engine/qr.js";
import { chromeSlotValue } from "../parts/PageChrome.js";
import { CAT_STRIP_H, GRID_GAP, gridRowHeight, pageGeometry, type PageGeometry } from "../parts/geometry.js";
import { priceLines, type PriceLine } from "../parts/price.js";
import { resolveTheme, type Theme } from "../themes.js";
import { manifest } from "./manifest.js";

export interface CellText {
  font_mm: number;
  lines: string[];
  truncated: boolean;
}

export interface CellLayout {
  item: Item;
  name: CellText;
  desc: CellText | null;
  prices: PriceLine[];
  priceFont: number;
  /** Hücre içi foto kutusu (yoksa null → §8.1 yer tutucu/temiz boşluk) */
  photoBox: { x: number; y: number; w: number; h: number } | null;
  photoUrl: string | null;
  /** cover modunda kırpılmış çizim dikdörtgeni (odak noktalı, §5.5); contain'de null */
  photoDraw: { x: number; y: number; w: number; h: number } | null;
  dpi: ReturnType<typeof checkDpi> | null;
}

/** Devam sayfası ince bandı — FAZ4-GOREV §8 (logo + başlık + sayfa no) */
export interface ContBand {
  y: number;
  h: number;
  title: string;
  logoUrl: string | null;
  /** Çıktı FR (M9): "Page 2/4" */
  pageLabel: string;
}

export interface GridAnalysis {
  theme: Theme;
  geo: PageGeometry;
  spec: GridSpec;
  layout: GridLayout;
  cells: Map<string, CellLayout>;
  warnings: LayoutWarning[];
  format: string;
  formatDef: { w_mm: number; h_mm: number };
  cols: number;
  showDesc: boolean;
  priceStyle: "arrow" | "plain";
  flow: FlowEntry[];
  scope: BindScope;
  /** multipage'de gerçek sayfa sayısı; single'da hep 1 */
  pages: number;
  pageIndex: number;
  flowMode: "single" | "multipage";
  /** yalnız devam sayfalarında dolu (pageIndex > 0) */
  contBand: ContBand | null;
  qr: QrRender | null;
}

const CELL_PAD = 4;
const PRICE_ROW_H = 6;
const CONT_BAND_H = 14;

export function analyzeGrid(client: ClientDTO, doc: DocumentState, pageIndex = 0): GridAnalysis {
  const scope: BindScope = { brand: client.brandkit, catalog: client.catalog };
  const theme = resolveTheme(doc.theme_id, client.brandkit);
  const format = currentFormat(manifest, doc);
  const formatDef = (manifest.formats as Record<string, { w_mm: number; h_mm: number }>)[format];
  const geo = pageGeometry(formatDef.w_mm, formatDef.h_mm);
  const flowMode = String(paramValue(manifest, doc, "flow")) as "single" | "multipage";

  const cols = Number(paramValue(manifest, doc, "cols"));
  const showDesc = paramValue(manifest, doc, "showDesc") === true;
  const priceStyle = String(paramValue(manifest, doc, "priceStyle")) as "arrow" | "plain";

  const warnings: LayoutWarning[] = [];

  /* Opsiyonel QR (mimar kararı #2): alt bilgi bölgesinde kart; içerik alanı daraltılır.
     Multipage'de QR yalnız İLK sayfadadır (deterministik). */
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

  const cellW = (geo.content.w - (cols - 1) * GRID_GAP) / cols;
  const spec: GridSpec = {
    cols,
    availW_mm: geo.content.w,
    availH_mm: geo.content.h - qrReserve,
    gap_mm: GRID_GAP,
    rowH_mm: gridRowHeight(cellW),
    catH_mm: CAT_STRIP_H,
  };

  /* Devam sayfası: ince bant → içerik alanı daha yüksek (FAZ4 §8) */
  const contentYCont = geo.margin + CONT_BAND_H + 4;
  const contGeo: PageGeometry = {
    ...geo,
    content: { ...geo.content, y: contentYCont, h: geo.footnoteBaseline - 4 - contentYCont },
  };
  const contSpec: GridSpec = { ...spec, availH_mm: contGeo.content.h };

  const selected = resolveSelection(client.catalog, doc.selection);
  const flow = selectionFlow(selected);

  let layout: GridLayout;
  let pages = 1;
  if (flowMode === "multipage") {
    const paged = layoutGridPaged(flow, spec, contSpec);
    pages = paged.length;
    const pi = Math.min(Math.max(0, pageIndex), pages - 1);
    layout = paged[pi];
    pageIndex = pi;
    /* taşma uyarısı yok: sayfa eklendi (M8) — 30 sayfa tavanı aşılırsa yine uyar */
    if (paged[pages - 1].overflow.length > 0) {
      warnings.push({ type: "overflow-items", count: paged[pages - 1].overflow.length });
    }
  } else {
    pageIndex = 0;
    layout = layoutGrid(flow, spec);
    if (layout.overflow.length > 0) {
      warnings.push({ type: "overflow-items", count: layout.overflow.length });
    }
  }
  if (!assetById(client, chromeSlotValue("logo", doc, scope).value)) {
    warnings.push({ type: "empty-required", slotId: "logo" });
  }

  /* Devam bandı içeriği (yalnız pageIndex > 0) */
  let contBand: ContBand | null = null;
  if (flowMode === "multipage" && pageIndex > 0) {
    const titleVal = chromeSlotValue("title", doc, scope).value;
    const logoAsset = assetById(client, chromeSlotValue("logo", doc, scope).value);
    contBand = {
      y: geo.margin,
      h: CONT_BAND_H,
      title: typeof titleVal === "string" && titleVal ? titleVal : client.name,
      logoUrl: logoAsset ? logoAsset.urls.master : null,
      pageLabel: `Page ${pageIndex + 1}/${pages}`,
    };
  }
  const activeGeo = contBand ? contGeo : geo;

  /* Hücre içi metin/foto yerleşimi */
  const cells = new Map<string, CellLayout>();
  const innerW = cellW - 2 * CELL_PAD;
  const nameSlot = manifest.repeater.itemSlots.find((s) => s.id === "name")!;
  const descSlot = manifest.repeater.itemSlots.find((s) => s.id === "desc")!;

  for (const p of layout.placed) {
    if (p.kind !== "cell") continue;
    const item = p.item;

    const nameText = theme.uppercaseHeading
      ? item.name_fr.toLocaleUpperCase("fr-FR")
      : item.name_fr;
    let nameWrap: WrapResult = { lines: [nameText], truncated: false };
    const nameFit = solveFontScale({
      min: nameSlot.font_mm!.min,
      max: nameSlot.font_mm!.max,
      fits: (f) => {
        const wr = wrapText(nameText, {
          font_mm: f,
          ratio: theme.ratios.item,
          maxWidth_mm: innerW,
          maxLines: nameSlot.maxLines!,
        });
        if (!wr.truncated) nameWrap = wr;
        return !wr.truncated;
      },
    });
    if (!nameFit.fits) {
      nameWrap = wrapText(nameText, {
        font_mm: nameSlot.font_mm!.min,
        ratio: theme.ratios.item,
        maxWidth_mm: innerW,
        maxLines: nameSlot.maxLines!,
      });
      warnings.push({ type: "text-truncated", slotId: "name", itemId: item.id });
    }
    const name: CellText = { font_mm: nameFit.font_mm, lines: nameWrap.lines, truncated: !nameFit.fits };

    let desc: CellText | null = null;
    if (showDesc && item.desc_fr) {
      let descWrap: WrapResult = { lines: [item.desc_fr], truncated: false };
      const descFit = solveFontScale({
        min: descSlot.font_mm!.min,
        max: descSlot.font_mm!.max,
        fits: (f) => {
          const wr = wrapText(item.desc_fr, {
            font_mm: f,
            ratio: theme.ratios.body,
            maxWidth_mm: innerW,
            maxLines: descSlot.maxLines!,
          });
          if (!wr.truncated) descWrap = wr;
          return !wr.truncated;
        },
      });
      if (!descFit.fits) {
        descWrap = wrapText(item.desc_fr, {
          font_mm: descSlot.font_mm!.min,
          ratio: theme.ratios.body,
          maxWidth_mm: innerW,
          maxLines: descSlot.maxLines!,
        });
        /* görünür kısaltma: son satır sonuna … eklenir; uyarı düşer (M8) */
        const last = descWrap.lines[descWrap.lines.length - 1] ?? "";
        descWrap.lines[descWrap.lines.length - 1] = `${last.replace(/\s+\S*$/, "")}…`;
        warnings.push({ type: "text-truncated", slotId: "desc", itemId: item.id });
      }
      desc = { font_mm: descFit.font_mm, lines: descWrap.lines, truncated: !descFit.fits };
    }

    /* Fiyat satırları */
    const priceFont = 4;
    const prices = priceLines(item.prices, client.currency, {
      font_mm: 3.2,
      ratio: theme.ratios.item,
      maxWidth_mm: innerW - (priceStyle === "arrow" ? 4 : 0),
    });

    /* Foto kutusu: ad/açıklama altından fiyat üstüne; hücrenin en fazla %55'i */
    const nameH = name.lines.length * name.font_mm * 1.15;
    const descH = desc ? desc.lines.length * desc.font_mm * 1.25 + 1 : 0;
    const priceH = Math.max(PRICE_ROW_H, prices.length * (priceFont * 1.2));
    const topY = CELL_PAD + nameH + descH + 1.5;
    const botY = p.h - CELL_PAD - priceH;
    const maxPhotoH = p.h * 0.55;
    const rawH = botY - topY;
    const photoH = Math.min(rawH, maxPhotoH);

    let photoBox: CellLayout["photoBox"] = null;
    if (photoH >= 10) {
      photoBox = { x: CELL_PAD, y: topY + (rawH - photoH) / 2, w: innerW, h: photoH };
    }

    const asset = assetById(client, item.photo);
    let dpi: CellLayout["dpi"] = null;
    if (asset && photoBox) {
      dpi = checkDpi(asset.width_px, asset.height_px, photoBox.w, photoBox.h);
      if (dpi.level !== "ok") {
        warnings.push({
          type: "low-dpi",
          slotId: "photo",
          itemId: item.id,
          effectiveDpi: dpi.effectiveDpi,
          level: dpi.level,
        });
      }
    }

    /* Belge bazında foto sığdırma override'ı: {fit:"cover", fx, fy} (M5 işaretli override) */
    let photoDraw: CellLayout["photoDraw"] = null;
    const photoOv = doc.overrides[`item:${item.id}:photo`]?.value as
      | { fit?: string; fx?: number; fy?: number }
      | undefined;
    if (asset && photoBox && photoOv?.fit === "cover" && asset.width_px > 0 && asset.height_px > 0) {
      const scale = Math.max(photoBox.w / asset.width_px, photoBox.h / asset.height_px);
      const dw = asset.width_px * scale;
      const dh = asset.height_px * scale;
      const fx = Math.min(1, Math.max(0, photoOv.fx ?? 0.5));
      const fy = Math.min(1, Math.max(0, photoOv.fy ?? 0.5));
      photoDraw = {
        x: photoBox.x - (dw - photoBox.w) * fx,
        y: photoBox.y - (dh - photoBox.h) * fy,
        w: dw,
        h: dh,
      };
    }

    cells.set(item.id, {
      item,
      name,
      desc,
      prices,
      priceFont,
      photoBox,
      photoUrl: asset ? asset.urls.master : null,
      photoDraw,
      dpi,
    });
  }

  return {
    theme, geo: activeGeo, spec, layout, cells, warnings,
    format, formatDef, cols, showDesc, priceStyle, flow, scope,
    pages, pageIndex, flowMode, contBand,
    /* QR yalnız ilk sayfada çizilir (multipage) */
    qr: pageIndex === 0 ? qr : null,
  };
}
