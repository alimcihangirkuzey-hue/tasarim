/* ÜRETİLDİ — şablon fabrikası (mimar kararı #12), kaynak: "Kabul Fabrika Menü".
   Bu dosya OKUNABİLİR ve elle rafine edilebilir; yeniden üretim ÜZERİNE YAZAR.
   Yerleşim orijinal SVG birimindedir; kök grup scale(0.35) ile mm'ye oturur. */

import type { ReactNode } from "react";
import { formatPrice, type Item } from "@tezgah/shared";
import { assetById, resolveSelection, resolveSlotValue, type BindScope } from "../../engine/binding.js";
import { buildQr } from "../../engine/qr.js";
import { resolveTheme, themeStyle } from "../../themes.js";
import type { TemplateProps } from "../../types.js";
import { Slot } from "../../parts/svg.js";
import { manifest } from "./manifest.js";

const W = 210;
const H = 297;
const K = 0.35; /* orijinal birim → mm */

/* Temizlenmiş taban tasarım (işaretli slotlar çıkarıldı) */
const STATIC = `
  <!-- Şablon fabrikası kabul 12 örneği: 6 sabit slot adayı + prototip hücre.
       "Illustrator export'u" temsilidir: düz SVG, id'li gruplar. -->
  <rect width="600" height="848" fill="#1D1B1A"></rect>
  <rect x="0" y="0" width="600" height="96" fill="#262321"></rect>

  <!-- 1) logo alanı (image slotu) -->
  

  <!-- 2) başlık (text slotu) -->
  

  <!-- 3) halal rozeti (badge slotu) -->
  

  <!-- 4) telefon şeridi (text slotu) -->
  <rect x="0" y="96" width="600" height="34" fill="#E3A93F"></rect>
  

  <!-- 5) saatler (text slotu) -->
  

  <!-- PROTOTİP HÜCRE: name + price + photo (item-slotlar) -->
  

  <!-- 6) dipnot (text slotu) -->
  
`;
const BADGE_HALAL = `<g id="halal-badge" data-tf-id="tf6" style="outline: rgb(22, 163, 74) solid 2px;">
    <circle cx="556" cy="48" r="22" fill="#0E7A3B" data-tf-id="tf7"></circle>
    <text x="556" y="53" font-size="11" fill="#fff" text-anchor="middle" font-family="Arial" data-tf-id="tf8">HALAL</text>
  </g>`;
/* Prototip hücrenin statik kısmı (item-slot'lar çıkarıldı) — elle rafine edilebilir */
const PROTO_STATIC = `<g id="proto-cell" data-tf-id="tf12" style="">
    <rect x="24" y="160" width="264" height="120" rx="8" fill="none" stroke="#6E675E" stroke-width="1.5" stroke-dasharray="5 4" data-tf-id="tf13"></rect>
    
    
    
  </g>`;
const PROTO = { x: 24, y: 160, w: 264, h: 120, cols: 2, colW: 280, rowH: 136 };

const str = (x: unknown): string => (typeof x === "string" ? x : x == null ? "" : String(x));

export function GeneratedTemplate(props: TemplateProps): ReactNode {
  const { client, doc, mode, selectedSlot, onSlotClick } = props;
  const theme = resolveTheme(doc.theme_id, client.brandkit);
  const scope: BindScope = { brand: client.brandkit, catalog: client.catalog };
  const asset = (id: string | null) => assetById(client, id);

  /* Slot değerleri: override > bind > default (M1/M5) */
  const v: Record<string, unknown> = {};
  for (const s of manifest.slots) {
    const r = resolveSlotValue(s, doc.overrides, scope);
    v[s.id] = s.kind === "image" ? asset(r.value as string | null)?.urls.master ?? null : r.value;
  }


  const items: Item[] = resolveSelection(client.catalog, doc.selection).flatMap((s) => s.items);
  const priceText = (it: Item) =>
    it.prices[0] ? formatPrice(it.prices[0].value, client.currency) : "";
  const rowsPerCol = Math.max(1, Math.floor((H / K - PROTO.y) / PROTO.rowH));
  const capacity = PROTO.cols * rowsPerCol;
  void rowsPerCol;
  void capacity;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={`${W}mm`} height={`${H}mm`}
      xmlns="http://www.w3.org/2000/svg" style={{ ...themeStyle(theme), display: "block" }}>
      <g transform={`scale(${K})`}>
        {/* taban tasarım */}
        <g dangerouslySetInnerHTML={{ __html: STATIC }} />
        {/* slot: title (text) */}
        <Slot id="title" mode={mode} selected={selectedSlot === "title"} onSlotClick={onSlotClick} box={{ x: 62.47, y: 10.82, w: 85.07, h: 13.52 }}>
          <text x={300} y={62} fontSize={34} textAnchor="middle"
          fill="#E3A93F" style={{ fontFamily: "var(--f-item)" }}>{str(v.title)}</text>
        </Slot>
        {/* slot: logo (image) */}
        <Slot id="logo" mode={mode} selected={selectedSlot === "logo"} onSlotClick={onSlotClick} box={{ x: 8.40, y: 6.30, w: 42.00, h: 21.00 }}>
          {v.logo ? (
          <image href={v.logo as string} x={24} y={18} width={120} height={60} preserveAspectRatio="xMidYMid meet" />
        ) : (
          <rect x={24} y={18} width={120} height={60} fill="none" stroke="var(--c-line)" strokeDasharray="4 3" />
        )}
        </Slot>
        {/* slot: halal (badge) */}
        <Slot id="halal" mode={mode} selected={selectedSlot === "halal"} onSlotClick={onSlotClick} box={{ x: 186.90, y: 9.10, w: 15.40, h: 15.40 }}>
          {v.halal === true && <g dangerouslySetInnerHTML={{ __html: BADGE_HALAL }} />}
        </Slot>
        {/* slot: phone (text) */}
        <Slot id="phone" mode={mode} selected={selectedSlot === "phone"} onSlotClick={onSlotClick} box={{ x: 8.40, y: 36.70, w: 37.37, h: 6.27 }}>
          <text x={24} y={119} fontSize={16} textAnchor="start"
          fill="#1D1B1A" style={{ fontFamily: "var(--f-item)" }}>{str(v.phone)}</text>
        </Slot>
        {/* slot: hours (text) */}
        <Slot id="hours" mode={mode} selected={selectedSlot === "hours"} onSlotClick={onSlotClick} box={{ x: 167.30, y: 37.69, w: 34.41, h: 4.95 }}>
          <text x={576} y={119} fontSize={13} textAnchor="end"
          fill="#1D1B1A" style={{ fontFamily: "var(--f-item)" }}>{str(v.hours)}</text>
        </Slot>
        {/* slot: footnote (text) */}
        <Slot id="footnote" mode={mode} selected={selectedSlot === "footnote"} onSlotClick={onSlotClick} box={{ x: 53.07, y: 285.80, w: 103.88, h: 3.96 }}>
          <text x={300} y={826} fontSize={10} textAnchor="middle"
          fill="#B7B0A5" style={{ fontFamily: "var(--f-item)" }}>{str(v.footnote)}</text>
        </Slot>
        {/* repeater: seçili ürünler prototip hücreye satır satır akar (kapasite üstü kırpılır + uyarı, M8) */}
        {items.slice(0, capacity).map((it, i) => {
          const col = i % PROTO.cols; const row = Math.floor(i / PROTO.cols);
          return (
            <g key={it.id} transform={`translate(${PROTO.x + col * PROTO.colW}, ${PROTO.y + row * PROTO.rowH})`}>
              <g dangerouslySetInnerHTML={{ __html: PROTO_STATIC }} />
            <text x={12} y={24} fontSize={15} textAnchor="start"
          fill="#FFFFFF" style={{ fontFamily: "var(--f-item)" }}>{it.name_fr}</text>
            <text x={252} y={24} fontSize={15} textAnchor="end"
          fill="#E3A93F" style={{ fontFamily: "var(--f-item)" }}>{priceText(it)}</text>
            {asset(it.photo) && (
              <image href={asset(it.photo)!.urls.master} x={12} y={36} width={240} height={72} preserveAspectRatio="xMidYMid slice" />
            )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
