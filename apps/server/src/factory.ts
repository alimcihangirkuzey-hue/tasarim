/* Şablon fabrikası kod üreticisi — FAZ4-GOREV §12 (d), mimar kararı #12.
   SAF dize üretimi: DOM yok (istemci, işaretli elemanları çıkarılmış statik
   markup'ı ve her işaretin ORİJİNAL birimlerdeki geometrisini gönderir).
   Çıktı OKUNABİLİR ve yorumludur — elle rafine edilebilir ilkesi. */

export interface FactoryTextAttrs {
  x: number;
  y: number;
  fontSize: number;
  anchor: string;
  fill: string;
}

export interface FactorySlotMark {
  slotId: string;
  kind: "text" | "image" | "color" | "price" | "qr" | "badge";
  bind: string | null;
  default_fr?: string;
  font_mm?: { min: number; max: number };
  maxLines?: number;
  bbox: { x: number; y: number; w: number; h: number };
  text?: FactoryTextAttrs;
  /** badge: koşullu gösterilecek orijinal parça (outerHTML) */
  chunk?: string;
}

export interface FactoryItemSlot {
  slot: "name" | "desc" | "photo" | "price";
  /** proto sol-üstüne GÖRELİ bbox (orijinal birim) */
  bbox: { x: number; y: number; w: number; h: number };
  text?: FactoryTextAttrs; // proto'ya göreli x/y
}

export interface FactoryProto {
  bbox: { x: number; y: number; w: number; h: number };
  cols: number;
  gap: number; // orijinal birim
  /** akış yönü: row = satır satır (soldan sağa), column = sütun sütun (yukarıdan aşağı) */
  yon: "row" | "column";
  staticChunk: string; // item-slot elemanları çıkarılmış prototip markup'ı
  itemSlots: FactoryItemSlot[];
}

/** Künye (provenance) — FAZ6 §4, mimar #20 (manifest yolu). imported_at sunucuda damgalanır. */
export interface FactoryProvenance {
  source_filename: string;
  source_note: string;
  fonts: string[];
  embedded_assets: number;
  missing_assets: string[];
  svg_sha256: string;
  imported_at: string;
}

export interface FactoryInput {
  id: string;
  name_tr: string;
  w_mm: number;
  h_mm: number;
  viewBox: { x: number; y: number; w: number; h: number };
  /** kök <svg>'nin İÇ markup'ı — işaretli slotlar ve proto çıkarılmış */
  staticInner: string;
  marks: FactorySlotMark[];
  proto: FactoryProto | null;
  /** İçe alma künyesi (mimar #20); yoksa manifest'e yazılmaz */
  provenance?: FactoryProvenance;
}

const ID_RE = /^[a-z][a-z0-9-]{2,40}$/;

export function validateFactoryInput(input: FactoryInput, existingIds: string[]): string | null {
  if (!ID_RE.test(input.id)) return "id küçük harf-kebap olmalı (örn. pizza-menu-a4)";
  if (existingIds.includes(input.id)) return `şablon kimliği zaten var: ${input.id}`;
  /* #21: serbest ölçü sınırları 30–3000 mm */
  if (!(input.w_mm >= 30 && input.h_mm >= 30 && input.w_mm <= 3000 && input.h_mm <= 3000))
    return "gerçek boyut 30–3000 mm aralığında olmalı";
  if (!(input.viewBox.w > 0 && input.viewBox.h > 0)) return "viewBox geçersiz";
  if (input.staticInner.includes("<script")) return "temizlenmemiş içerik (script)";
  /* #21: sıfır-slot (salt dekor/cam-folyo) GEÇERLİDİR — önceki "en az bir slot" kuralı kaldırıldı */
  return null;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

function slotDefLine(m: FactorySlotMark): string {
  const parts = [`id: "${m.slotId}"`, `kind: "${m.kind}"`, `bind: ${m.bind ? `"${m.bind}"` : "null"}`];
  if (m.default_fr) parts.push(`default_fr: ${JSON.stringify(m.default_fr)}`);
  if (m.font_mm) parts.push(`font_mm: { min: ${m.font_mm.min}, max: ${m.font_mm.max} }`);
  if (m.maxLines) parts.push(`maxLines: ${m.maxLines}`);
  if (m.kind === "qr" || m.kind === "badge") parts.push("optional: true");
  return `    { ${parts.join(", ")} },`;
}

export function generateManifestTs(input: FactoryInput): string {
  const slots = input.marks.map(slotDefLine).join("\n");
  const repeater = input.proto
    ? `
  repeater: {
    id: "items",
    bind: "selection.items",
    overflow: "shrink-then-warn",
    itemSlots: [
${input.proto.itemSlots.map((s) => `      { id: "${s.slot}", kind: "${s.slot === "photo" ? "image" : s.slot === "price" ? "price" : "text"}", bind: "item.${s.slot === "photo" ? "photo" : s.slot === "price" ? "prices" : s.slot === "name" ? "name_fr" : "desc_fr"}" },`).join("\n")}
    ],
  },`
    : "";
  const provenance = input.provenance
    ? `\n  /* Künye (mimar #20): içe alma kaydı — yıllar sonra dönen işte sıfır arkeoloji */\n  provenance: ${JSON.stringify(input.provenance)},`
    : "";
  return `/* ÜRETİLDİ — şablon fabrikası (mimar kararı #12). Elle rafine edilebilir. */

import type { TemplateManifest } from "../../types.js";

export const manifest: TemplateManifest = {
  id: "${input.id}",
  type: "menu",
  profile_version: 1,
  name_tr: ${JSON.stringify(input.name_tr)},
  bleed_mm: 3,
  safe_mm: 3,
  formats: { custom: { w_mm: ${input.w_mm}, h_mm: ${input.h_mm}, label_tr: "Özel (${input.w_mm}×${input.h_mm} mm)" } },
  defaultFormat: "custom",
  params: [],
  slots: [
${slots}
  ],${repeater}
  themes: ["or-noir", "aras-orange", "velours-rouge"],${provenance}
};
`;
}

function textRender(varName: string, t: FactoryTextAttrs, sizeExpr: string): string {
  return `<text x={${t.x}} y={${t.y}} fontSize={${sizeExpr}} textAnchor="${t.anchor || "start"}"
          fill="${t.fill || "var(--c-item)"}" style={{ fontFamily: "var(--f-item)" }}>{${varName}}</text>`;
}

export function generateTemplateTsx(input: FactoryInput): string {
  const K = input.w_mm / input.viewBox.w;
  const kRound = Math.round(K * 1e6) / 1e6;

  /* --- sabit slot render blokları --- */
  const slotBlocks = input.marks.map((m) => {
    const b = m.bbox;
    const box = `box={{ x: ${(b.x * K).toFixed(2)}, y: ${(b.y * K).toFixed(2)}, w: ${(b.w * K).toFixed(2)}, h: ${(b.h * K).toFixed(2)} }}`;
    let inner: string;
    switch (m.kind) {
      case "text":
      case "price": {
        const t = m.text ?? { x: b.x, y: b.y + b.h * 0.8, fontSize: b.h * 0.8, anchor: "start", fill: "var(--c-item)" };
        inner = textRender(`str(v.${m.slotId})`, t, `${t.fontSize}`);
        break;
      }
      case "image":
        inner = `{v.${m.slotId} ? (
          <image href={v.${m.slotId} as string} x={${b.x}} y={${b.y}} width={${b.w}} height={${b.h}} preserveAspectRatio="xMidYMid meet" />
        ) : (
          <rect x={${b.x}} y={${b.y}} width={${b.w}} height={${b.h}} fill="none" stroke="var(--c-line)" strokeDasharray="4 3" />
        )}`;
        break;
      case "color":
        inner = `<rect x={${b.x}} y={${b.y}} width={${b.w}} height={${b.h}} fill={typeof v.${m.slotId} === "string" && v.${m.slotId} ? (v.${m.slotId} as string) : "var(--c-accent)"} />`;
        break;
      case "qr":
        inner = `{qr_${m.slotId} && <g transform={\`translate(${b.x}, ${b.y}) scale(\${${b.w} / qr_${m.slotId}!.size})\`} dangerouslySetInnerHTML={{ __html: qr_${m.slotId}!.svgInner }} />}`;
        break;
      case "badge":
        inner = m.chunk
          ? `{v.${m.slotId} === true && <g dangerouslySetInnerHTML={{ __html: BADGE_${m.slotId.toUpperCase().replace(/-/g, "_")} }} />}`
          : `{v.${m.slotId} === true && <circle cx={${b.x + b.w / 2}} cy={${b.y + b.h / 2}} r={${Math.min(b.w, b.h) / 2}} fill="var(--c-accent)" />}`;
        break;
    }
    return `        {/* slot: ${m.slotId} (${m.kind}) */}
        <Slot id="${m.slotId}" mode={mode} selected={selectedSlot === "${m.slotId}"} onSlotClick={onSlotClick} ${box}>
          ${inner}
        </Slot>`;
  });

  const badgeChunks = input.marks
    .filter((m) => m.kind === "badge" && m.chunk)
    .map((m) => `const BADGE_${m.slotId.toUpperCase().replace(/-/g, "_")} = \`${esc(m.chunk!)}\`;`)
    .join("\n");

  const qrDecls = input.marks
    .filter((m) => m.kind === "qr")
    .map(
      (m) => `  const qr_${m.slotId} = typeof v.${m.slotId} === "string" && v.${m.slotId}
    ? buildQr(v.${m.slotId} as string, ${Math.round(m.bbox.w * K)}, theme.vars["--c-item"])
    : null;`
    )
    .join("\n");

  /* --- repeater bloğu --- */
  let protoConst = "";
  let protoRender = "";
  if (input.proto) {
    const p = input.proto;
    const rowH = p.bbox.h + p.gap;
    const colW = p.bbox.w + p.gap;
    protoConst = `
/* Prototip hücrenin statik kısmı (item-slot'lar çıkarıldı) — elle rafine edilebilir */
const PROTO_STATIC = \`${esc(p.staticChunk)}\`;
const PROTO = { x: ${p.bbox.x}, y: ${p.bbox.y}, w: ${p.bbox.w}, h: ${p.bbox.h}, cols: ${p.cols}, colW: ${colW}, rowH: ${rowH} };`;
    const itemSlotRenders = p.itemSlots
      .map((s) => {
        if (s.slot === "photo") {
          return `            {asset(it.photo) && (
              <image href={asset(it.photo)!.urls.master} x={${s.bbox.x}} y={${s.bbox.y}} width={${s.bbox.w}} height={${s.bbox.h}} preserveAspectRatio="xMidYMid slice" />
            )}`;
        }
        const t = s.text ?? { x: s.bbox.x, y: s.bbox.y + s.bbox.h * 0.8, fontSize: s.bbox.h * 0.8, anchor: "start", fill: "var(--c-item)" };
        const value =
          s.slot === "name" ? "it.name_fr" : s.slot === "desc" ? "it.desc_fr" : "priceText(it)";
        return `            ${textRender(value, t, `${t.fontSize}`)}`;
      })
      .join("\n");
    const cellPos =
      p.yon === "column"
        ? `const col = Math.floor(i / rowsPerCol); const row = i % rowsPerCol;`
        : `const col = i % PROTO.cols; const row = Math.floor(i / PROTO.cols);`;
    protoRender = `
        {/* repeater: seçili ürünler prototip hücreye ${p.yon === "column" ? "sütun sütun" : "satır satır"} akar (kapasite üstü kırpılır + uyarı, M8) */}
        {items.slice(0, capacity).map((it, i) => {
          ${cellPos}
          return (
            <g key={it.id} transform={\`translate(\${PROTO.x + col * PROTO.colW}, \${PROTO.y + row * PROTO.rowH})\`}>
              <g dangerouslySetInnerHTML={{ __html: PROTO_STATIC }} />
${itemSlotRenders}
            </g>
          );
        })}`;
  }

  return `/* ÜRETİLDİ — şablon fabrikası (mimar kararı #12), kaynak: ${JSON.stringify(input.name_tr)}.
   Bu dosya OKUNABİLİR ve elle rafine edilebilir; yeniden üretim ÜZERİNE YAZAR.
   Yerleşim orijinal SVG birimindedir; kök grup scale(${kRound}) ile mm'ye oturur. */

import type { ReactNode } from "react";
import { formatPrice, type Item } from "@tezgah/shared";
import { assetById, resolveSelection, resolveSlotValue, type BindScope } from "../../engine/binding.js";
import { buildQr } from "../../engine/qr.js";
import { resolveTheme, themeStyle } from "../../themes.js";
import { customSizeMm } from "../../engine/custom-size.js";
import type { TemplateProps } from "../../types.js";
import { CropMarks, Guides, Slot } from "../../parts/svg.js";
import { manifest } from "./manifest.js";

const W = ${input.w_mm}; /* doğal en (mm) */
const H = ${input.h_mm}; /* doğal boy (mm) */
const K = ${kRound}; /* orijinal birim → mm */

/* Temizlenmiş taban tasarım (işaretli slotlar çıkarıldı) */
const STATIC = \`${esc(input.staticInner)}\`;
${badgeChunks}${protoConst}

const str = (x: unknown): string => (typeof x === "string" ? x : x == null ? "" : String(x));

export function GeneratedTemplate(props: TemplateProps): ReactNode {
  const { client, doc, mode, showGuides, cropMarks, selectedSlot, onSlotClick } = props;
  const theme = resolveTheme(doc.theme_id, client.brandkit);
  const scope: BindScope = { brand: client.brandkit, catalog: client.catalog };
  const asset = (id: string | null) => assetById(client, id);

  /* Slot değerleri: override > bind > default (M1/M5) */
  const v: Record<string, unknown> = {};
  for (const s of manifest.slots) {
    const r = resolveSlotValue(s, doc.overrides, scope);
    v[s.id] = s.kind === "image" ? asset(r.value as string | null)?.urls.master ?? null : r.value;
  }
${qrDecls}

  const items: Item[] = resolveSelection(client.catalog, doc.selection).flatMap((s) => s.items);
  const priceText = (it: Item) =>
    it.prices[0] ? formatPrice(it.prices[0].value, client.currency) : "";
  ${input.proto ? `const rowsPerCol = Math.max(1, Math.floor((H / K - PROTO.y) / PROTO.rowH));
  const capacity = PROTO.cols * rowsPerCol;
  void rowsPerCol;` : "const capacity = items.length;"}
  void capacity;

  /* #21: bleed 3mm + crop marks; belge override (params.width_mm/height_mm) doğal ölçüyü ezer */
  const B = manifest.bleed_mm;
  const cs = customSizeMm(doc);
  const NET_W = cs ? cs.w_mm : W;
  const NET_H = cs ? cs.h_mm : H;
  const sx = NET_W / W;
  const sy = NET_H / H;
  const PW = NET_W + 2 * B;
  const PH = NET_H + 2 * B;

  return (
    <svg viewBox={\`0 0 \${PW} \${PH}\`} width={\`\${PW}mm\`} height={\`\${PH}mm\`}
      xmlns="http://www.w3.org/2000/svg" style={{ ...themeStyle(theme), display: "block" }}>
      <rect width={PW} height={PH} fill="var(--c-bg)" />
      {/* içerik: doğal birim → mm (scale K) → override ölçek (sx,sy) → bleed ofseti */}
      <g transform={\`translate(\${B}, \${B}) scale(\${sx}, \${sy})\`}>
        <g transform={\`scale(\${K})\`}>
          {/* taban tasarım */}
          <g dangerouslySetInnerHTML={{ __html: STATIC }} />
${slotBlocks.join("\n")}${protoRender}
        </g>
      </g>
      {mode === "edit" && showGuides && <Guides w={NET_W} h={NET_H} bleed={B} safe={manifest.safe_mm} />}
      {mode === "print" && cropMarks && <CropMarks w={NET_W} h={NET_H} bleed={B} />}
    </svg>
  );
}
`;
}

export function generateIndexTs(): string {
  return `/* ÜRETİLDİ — şablon fabrikası (mimar kararı #12) */
import type { TemplateEntry } from "../../types.js";
import { manifest } from "./manifest.js";
import { GeneratedTemplate } from "./Template.js";

export const entry: TemplateEntry = { manifest, Component: GeneratedTemplate };
`;
}

/** generated/ altındaki klasörlerden barrel üretir (deterministik sıra) */
export function generateBarrel(ids: string[]): string {
  const sorted = [...ids].sort();
  return `/* ÜRETİLMİŞ ŞABLONLAR — mimar kararı #12.
   Bu barrel şablon fabrikası tarafından OTOMATİK yeniden yazılır
   (apps/server /api/factory/generate); elle düzenleme bir sonraki üretimde
   ezilir. Üretilen şablon klasörleri (generated/<id>/) elle rafine EDİLEBİLİR. */

import type { TemplateEntry } from "../types.js";
${sorted.map((id, i) => `import { entry as g${i} } from "./${id}/index.js";`).join("\n")}

export const GENERATED: Record<string, TemplateEntry> = {
${sorted.map((id, i) => `  "${id}": g${i},`).join("\n")}
};
`;
}
