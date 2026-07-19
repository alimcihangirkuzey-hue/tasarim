/* DONMUŞ TABAN — REFACTOR ÖNCESİ KOD. ELLE DÜZENLENMEZ.
   ============================================================================
   Bu dosya `git show main:<yol>` ile Dynamic Composition Engine paketinden
   ÖNCEKİ koddan çıkarılmıştır ve YALNIZCA `composition-differential.test.ts`
   tarafından kullanılır: eski davranış ile yeni davranış yan yana koşturulup
   birebir karşılaştırılır.

   NEDEN REPODA DURUYOR: köken iddiası ("çıktı birebir korundu") aksi halde
   yalnız bir kereye mahsus, tekrar üretilemez bir ölçüme dayanırdı. Bu dosya
   sayesinde sonraki geliştirici iddiayı KENDİ koşturarak doğrulayabilir.

   Üretime dahil değildir (yalnız test tarafından import edilir, tree-shake
   ile bundle dışında kalır). Motor davranışı bilinçli olarak değiştiğinde bu
   dosya GÜNCELLENMEZ — diferansiyel test o değişikliği görünür kılmalıdır;
   değişiklik onaylandığında taban yeni bir commit'ten yeniden çıkarılır. */
/* flyer analiz — ön: kampanya + mini grid (format bazlı kapasite);
   arka: iletişim + QR + teslimat bloğu + çift saat (boş bloklar gizlenir). */

import { formatPrice, type ClientDTO, type DocumentState } from "@tezgah/shared";
import {
  assetById,
  resolveSelection,
  resolveSlotValue,
  type BindScope,
} from "../engine/binding.js";
import type { LayoutWarning } from "../engine/layout.js";
import { currentFormat, paramValue } from "../engine/params.js";
import { buildQr, qrSourceUrl, type QrRender, type QrSource } from "../engine/qr.js";
import { resolveTheme, type Theme } from "../themes.js";
import { manifest } from "./manifest.js";

const MARGIN = 10;

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

  /* Mini grid: a5 → 2 sütun (4 hücre), 21x21 → 3 sütun (6 hücre) */
  const cols = format === "21x21" ? 3 : 2;
  const capacity = cols * 2;
  const selected = resolveSelection(client.catalog, doc.selection);
  const all = selected.flatMap((s) => s.items);
  const shown = all.slice(0, capacity);
  if (all.length > capacity) {
    warnings.push({ type: "overflow-items", count: all.length - capacity });
  }

  const gridTop = 96;
  const gridBottom = H - 14;
  const gap = 4;
  const cellW = (W - 2 * MARGIN - (cols - 1) * gap) / cols;
  const cellH = (gridBottom - gridTop - gap) / 2;
  const items: FlyerMiniItem[] = shown.map((it, i) => {
    const asset = assetById(client, it.photo);
    return {
      id: it.id,
      name: it.name_fr,
      price: it.prices[0] ? formatPrice(it.prices[0].value, client.currency) : "",
      photoUrl: asset?.urls.master ?? null,
      x: MARGIN + (i % cols) * (cellW + gap),
      y: gridTop + Math.floor(i / cols) * (cellH + gap),
      w: cellW,
      h: cellH,
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
