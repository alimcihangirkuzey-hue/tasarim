/* menu-trifold analiz — iç yüz 3 sütunlu liste akışı; ÖNCE fonta biner,
   3 sütuna da sığmazsa sığmayanı görünür taşma uyarısıyla dışarıda bırakır
   (M8). Trifold fiziksel olarak tek yüzdür; sayfa eklenemez.

   CE-bağlama: strateji artık manifest'in `repeater.overflow` ilanından OKUNUR
   ve kompozisyon paylaşılan motorda (composeColumns) koşar — ilan ile davranış
   ayrışamaz (Canonical 4.1). Eski `flowColumns`un SABİT KODLADIĞI kategori
   yapıştırması (kategori sütun sonunda tek başına kalmaz) motorun keepWithNext
   callback'iyle birebir taşındı; çıktı eşdeğerliği refactor-öncesi __baseline
   ile diferansiyel testte kanıtlıdır (composition-differential.test.ts). */

import { formatPrice, type ClientDTO, type DocumentState, type Item } from "@tezgah/shared";
import {
  assetById,
  eksikZorunluVarliklar,
  resolveSelection,
  resolveSlotValue,
  selectionFlow,
  type BindScope,
} from "../engine/binding.js";
import { composeColumns, resolveOverflowStrategy } from "../engine/composition.js";
import {
  estimateWidth,
  wrapText,
  type LayoutWarning,
} from "../engine/layout.js";
import { paramValue } from "../engine/params.js";
import { seededVariant } from "../engine/seed.js";
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

/* Canonical 4.4 designSeed — PANEL ÇERÇEVE DİLİ (flyer/grid/carte deseninin
   dördüncü ailesi, journal 2026-07-26-designseed-trifold). Keşif kaydı:
   trifold'un tasarım dili İKİ dekoratif panel çerçevesinde yaşar (dış yüz
   kapak çerçevesi + ön panel kampanya çerçevesi); fold işaretleri ve teal
   kılavuz ÜRETİM KILAVUZUDUR (kapsam dışı); panel geometrisi (97/100/100mm
   roll-fold haritası) FİZİKSEL sözleşmedir — tohumla oynanamaz ("panel
   ritmi" adayı bu gerekçeyle reddedildi). KEŞİF DÜZELTMESİ (uygulamada
   ölçüldü): ön paneldeki çerçeve YALNIZ edit modunda çizilen kapak-foto YER
   TUTUCUSU çıktı — baskı tasarım dili değil, kapsam dışı bırakıldı. Baskıda
   görünen tek tasarım çerçevesi KAPAK (flap) çerçevesidir; dil tek karardır
   (4.3). Tuz "trifold-cerceve". */
export interface TrifoldFrame {
  flapRx: number;
  /** null = düz çizgi */
  flapDash: string | null;
}

/** TABAN = bugünkü sabitler birebir (Template.tsx kapak çerçevesinden taşındı) */
export const TRIFOLD_CERCEVE_TABAN: TrifoldFrame = { flapRx: 2, flapDash: "1.8 1.3" };

const CERCEVE = [
  { flapRx: 0.8, flapDash: "1.1 0.9" },
  TRIFOLD_CERCEVE_TABAN,
  { flapRx: 3.2, flapDash: "1.8 1.3" },
  { flapRx: 2, flapDash: null },
  { flapRx: 3.2, flapDash: null },
] as const satisfies readonly TrifoldFrame[];

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
  /** designSeed panel çerçeve dili — Template iki çerçeveyi buradan çizer */
  frame: TrifoldFrame;
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
  /* Dosya gereksinimi — İLANDAN (7.2/502): eski elle logo if'i jenerik motora
     döndü; cover_photo ilansızdır (boş kalabilir) — çıktı birebir */
  warnings.push(...eksikZorunluVarliklar(manifest.slots, client, doc));
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

  /* KOMPOZİSYON — strateji manifest'ten OKUNUR (ilan = davranış). Bu şablonun
     ilanı "shrink-then-warn": 3 sütunlu TEK yüze sığdırmak için fonta biner;
     min'de de sığmıyorsa taşanlar görünür uyarıya döner (targetPages/maxPages 1
     — trifold sayfa ekleyemez). keepWithNext: kategori, eski flowColumns'un
     sabit kodladığı yapıştırmanın birebir taşınmışıdır. */
  const strategy = resolveOverflowStrategy(manifest.repeater.overflow, "shrink-then-warn");
  const composed = composeColumns<TriRow>(
    {
      build: (font) => buildRows(font).map((r) => ({ entry: r, h_mm: r.h })),
      typography: { min: nameSlot.font_mm!.min, max: nameSlot.font_mm!.max },
      columns: { kind: "fixed", count: 3 },
      columnHeight_mm: colH,
      strategy,
      targetPages: 1,
      maxPages: 1,
    },
    (r) => r.kind === "category" /* kategori sütun sonunda tek başına kalmaz */
  );

  const firstPage = composed.pages[0]?.columns ?? [];
  const innerColumns = INNER_PANELS.map((panel, ci) => {
    const col = firstPage[ci] ?? [];
    const placed = col.map((b) => ({ row: b.entry, y: b.y_mm }));
    return { x: panel.x + PANEL_PAD, w: panel.w - 2 * PANEL_PAD, rows: placed };
  });
  const overflowCount = composed.overflow.length;
  if (overflowCount > 0) warnings.push({ type: "overflow-items", count: overflowCount });

  /* designSeed okuma — v1 doğrulaması birebir (doğrudan doc.params; pozitif
     tamsayı değilse 0 → TABAN NESNESİ aynen) */
  const rawSeed = doc.params["designSeed"];
  const designSeed =
    typeof rawSeed === "number" && Number.isInteger(rawSeed) && rawSeed > 0 ? rawSeed : 0;
  const frame =
    designSeed === 0 ? TRIFOLD_CERCEVE_TABAN : seededVariant(designSeed, CERCEVE, "trifold-cerceve");

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
    frame,
  };
}
