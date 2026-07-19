/* flyer analiz — ön: kampanya + mini grid (format bazlı kapasite);
   arka: iletişim + QR + teslimat bloğu + çift saat (boş bloklar gizlenir). */

import { formatPrice, type ClientDTO, type DocumentState } from "@tezgah/shared";
import {
  assetById,
  resolveSelection,
  resolveSlotValue,
  type BindScope,
} from "../engine/binding.js";
import { composeGrid, resolveOverflowStrategy } from "../engine/composition.js";
import type { LayoutWarning } from "../engine/layout.js";
import { currentFormat, paramValue } from "../engine/params.js";
import { buildQr, qrSourceUrl, type QrRender, type QrSource } from "../engine/qr.js";
import { resolveTheme, type Theme } from "../themes.js";
import { manifest } from "./manifest.js";

const MARGIN = 10;
/* Bir mini hücrenin okunabilir kaldığı en küçük yükseklik (foto + ad + fiyat).
   Izgara kapasitesi bundan türer — sabit ürün sayısı yerine ölçülebilir sınır. */
const MIN_CELL_H = 34;

export interface FlyerMiniItem {
  id: string;
  name: string;
  price: string;
  photoUrl: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FlyerAnalysis {
  theme: Theme;
  scope: BindScope;
  warnings: LayoutWarning[];
  pages: 2;
  format: string;
  formatDef: { w_mm: number; h_mm: number };
  logoUrl: string | null;
  campaign: {
    title: { text: string; detached: boolean };
    price: { text: string; detached: boolean };
    sub: { text: string; detached: boolean };
  };
  mini: { items: FlyerMiniItem[]; cols: number };
  phone: string;
  address: string;
  hours: string;
  deliveryHours: string;
  deliveryNote: { text: string; detached: boolean };
  qr: QrRender | null;
  footnote: string;
}

export function analyzeFlyer(client: ClientDTO, doc: DocumentState): FlyerAnalysis {
  const scope: BindScope = { brand: client.brandkit, catalog: client.catalog };
  const theme = resolveTheme(doc.theme_id, client.brandkit);
  const warnings: LayoutWarning[] = [];
  const format = currentFormat(manifest, doc);
  const formatDef = manifest.formats[format];
  const W = formatDef.w_mm;
  const H = formatDef.h_mm;

  const slotDef = (id: string) => manifest.slots.find((s) => s.id === id)!;
  const sv = (id: string) => resolveSlotValue(slotDef(id), doc.overrides, scope);
  const text = (id: string) => {
    const { value, detached } = sv(id);
    return { text: typeof value === "string" ? value : "", detached };
  };

  const logoAsset = assetById(client, sv("logo").value);
  if (!logoAsset) warnings.push({ type: "empty-required", slotId: "logo" });

  const source = String(paramValue(manifest, doc, "qrSource")) as QrSource;
  const url = qrSourceUrl(source, client.brandkit) ?? qrSourceUrl("tel", client.brandkit);
  let qr: QrRender | null = null;
  if (!url) warnings.push({ type: "empty-required", slotId: "qr" });
  else {
    qr = buildQr(url, 18, theme.vars["--c-item"]);
    if (qr.contrastFallback) warnings.push({ type: "qr-contrast", slotId: "qr" });
  }

  /* Mini ızgara — kompozisyon motoru (Canonical 4.1).
     Sütun sayısı formattan gelir; SATIR sayısı artık sabit "2" değil,
     kullanılabilir yükseklikten türetilir. Bugünkü geometride
     (a5: 178mm, 21x21: 106mm alan · minCellH 34mm) sonuç 2 satırdır —
     yani çıktı birebir aynı; fark, yeni bir format/profil geldiğinde
     ızgaranın kendiliğinden uyarlanması ve kapasitenin artık
     el yazması bir sabit olmamasıdır. */
  const cols = format === "21x21" ? 3 : 2;
  const selected = resolveSelection(client.catalog, doc.selection);
  const all = selected.flatMap((s) => s.items);

  const gridTop = 96;
  const gridBottom = H - 14;
  const gap = 4;
  const grid = composeGrid({
    entries: all,
    cols,
    availableH_mm: gridBottom - gridTop,
    minCellH_mm: MIN_CELL_H,
    gap_mm: gap,
    cellW_mm: (W - 2 * MARGIN - (cols - 1) * gap) / cols,
    originX_mm: MARGIN,
    originY_mm: gridTop,
    strategy: resolveOverflowStrategy(manifest.repeater.overflow, "shrink-then-warn"),
  });
  if (grid.overflow.length > 0) {
    warnings.push({ type: "overflow-items", count: grid.overflow.length });
  }

  const items: FlyerMiniItem[] = grid.cells.map((cell) => {
    const it = cell.entry;
    const asset = assetById(client, it.photo);
    return {
      id: it.id,
      name: it.name_fr,
      price: it.prices[0] ? formatPrice(it.prices[0].value, client.currency) : "",
      photoUrl: asset?.urls.master ?? null,
      x: cell.x_mm,
      y: cell.y_mm,
      w: cell.w_mm,
      h: cell.h_mm,
    };
  });

  return {
    theme,
    scope,
    warnings,
    pages: 2,
    format,
    formatDef,
    logoUrl: logoAsset?.urls.master ?? null,
    campaign: {
      title: text("campaign_title"),
      price: text("campaign_price"),
      sub: text("campaign_sub"),
    },
    mini: { items, cols },
    phone: text("phone").text,
    address: text("address").text,
    hours: text("hours").text,
    deliveryHours: client.brandkit.contact.delivery_hours,
    deliveryNote: text("delivery_note"),
    qr,
    footnote: text("footnote").text,
  };
}
