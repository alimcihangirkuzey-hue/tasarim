/* ÜRETİLDİ — şablon fabrikası, motor bağlaması (CE; Canonical 4.1).
   Kapasite/taşma muhasebesi paylaşılan motordadır (composeGrid) ve strateji
   manifest'in `repeater.overflow` İLANINDAN okunur — ilan ile davranış
   ayrışamaz. Eski hâlde Template `items.slice(0, capacity)` ile SESSİZCE
   kırpıyordu ve hiçbir uyarı üretilmiyordu (M8 ihlali); artık taşma görünür.

   minCellH=rowH ve gap=0: satır sayısı floor(avail/rowH) — eski kapasite
   formülünün birebir aynısı. Motorun türettiği (esnetilmiş) hücre yüksekliği
   ÇİZİME SOKULMAZ: hücreler prototip damgasının sabit adımıyla çizilir
   (fabrika tasarım sözleşmesi; Template.tsx'teki translate matematiği). */

/* Dosya-gereklilik v1 (7.2/502; journal 2026-07-26-dosya-gereklilik-ilani):
   logo slotu `gereklilik: "zorunlu"` İLANLI ve BAĞLI — logosuz müşteride
   empty-required üretilir. Bu, İLAN VARDI/DAVRANIŞ YOKTU boşluğunun kapanışıdır
   (bilinçli davranış değişikliği; sessiz-kırpma kapanışı emsali): fabrika
   belgeleri artık el yazımı ailelerle aynı üretim kapısına tabidir. Yandaki
   testin eski birebir çivileri aynı pakette ürün kararıyla güncellendi. */

import type { ClientDTO, DocumentState, Item } from "@tezgah/shared";
import { eksikZorunluVarliklar, resolveSelection } from "../../engine/binding.js";
import { composeGrid, resolveOverflowStrategy } from "../../engine/composition.js";
import type { LayoutWarning } from "../../engine/layout.js";
import { manifest } from "./manifest.js";

export const W = 210;
export const H = 297;
export const K = 0.35; /* orijinal birim → mm */
export const PROTO = { x: 24, y: 160, w: 264, h: 120, cols: 2, colW: 280, rowH: 136 };

export interface GeneratedAnalysis {
  /** Kapasiteye sığan ürünler — Template yalnız bunları çizer (sıra korunur) */
  shown: Item[];
  overflowCount: number;
  capacity: number;
  warnings: LayoutWarning[];
}

export function analyzeGenerated(client: ClientDTO, doc: DocumentState): GeneratedAnalysis {
  const items: Item[] = resolveSelection(client.catalog, doc.selection).flatMap((s) => s.items);
  const strategy = resolveOverflowStrategy(manifest.repeater?.overflow, "shrink-then-warn");
  const g = composeGrid<Item>({
    entries: items,
    cols: PROTO.cols,
    availableH_mm: H / K - PROTO.y,
    minCellH_mm: PROTO.rowH,
    gap_mm: 0,
    cellW_mm: PROTO.w,
    originX_mm: PROTO.x,
    originY_mm: PROTO.y,
    strategy,
  });

  /* Taşma raporu — composeGrid sözleşmesi: düşürme izinli ilanda görünür
     taşma uyarısı; "ürün düşmez" ilan edilmişse ihlal raporu (sessiz yutulmaz) */
  const warnings: LayoutWarning[] = [];
  if (g.strategyViolation) {
    warnings.push({
      type: "overflow-strategy-violation",
      declared: g.strategyViolation,
      dropped: g.overflow.length,
    });
  } else if (g.overflow.length > 0) {
    warnings.push({ type: "overflow-items", count: g.overflow.length });
  }
  /* zorunlu varlıklar İLANDAN (taşma bloğundan sonra — el yazımı ailelerin
     uyarı sırası deseni) */
  warnings.push(...eksikZorunluVarliklar(manifest.slots, client, doc));

  return {
    shown: g.cells.map((c) => c.entry),
    overflowCount: g.overflow.length,
    capacity: g.capacity,
    warnings,
  };
}
