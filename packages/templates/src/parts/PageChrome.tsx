/* Ortak sabit slotlar: logo · başlık · telefon şeridi · adres+saat · halal · dipnot
   (FAZ1-GOREV §4/§5 "sabit slotlar aynı set"). Net sayfa uzayında çizer. */

import type { ReactNode } from "react";
import type { ClientDTO, DocumentState } from "@tezgah/shared";
import { assetById, resolveSlotValue, type BindScope } from "../engine/binding.js";
import { estimateWidth, solveFontScale } from "../engine/layout.js";
import type { Theme } from "../themes.js";
import type { SlotDef } from "../types.js";
import type { PageGeometry } from "./geometry.js";
import { Slot, TextLines } from "./svg.js";

export const CHROME_SLOTS: SlotDef[] = [
  { id: "logo", kind: "image", bind: "brand.logo_primary" },
  { id: "title", kind: "text", bind: null, default_fr: "NOTRE CARTE", font_mm: { min: 8, max: 14 }, maxLines: 1 },
  { id: "phone", kind: "text", bind: "brand.contact.phone", font_mm: { min: 3.4, max: 4.4 }, maxLines: 1 },
  { id: "address", kind: "text", bind: "brand.contact.address", font_mm: { min: 2.6, max: 3.2 }, maxLines: 1 },
  { id: "hours", kind: "text", bind: "brand.contact.hours", font_mm: { min: 2.6, max: 3.2 }, maxLines: 1 },
  { id: "halal", kind: "badge", bind: "brand.badges.halal", optional: true },
  { id: "footnote", kind: "text", bind: "catalog.footnote_fr", font_mm: { min: 2.2, max: 3 }, maxLines: 1 },
];

function slotDef(id: string): SlotDef {
  return CHROME_SLOTS.find((s) => s.id === id)!;
}

export function chromeSlotValue(
  id: string,
  doc: DocumentState,
  scope: BindScope
): { value: unknown; detached: boolean } {
  return resolveSlotValue(slotDef(id), doc.overrides, scope);
}

export function PageChrome(props: {
  geo: PageGeometry;
  theme: Theme;
  client: ClientDTO;
  doc: DocumentState;
  scope: BindScope;
  mode: "edit" | "print";
  selectedSlot?: string | null;
  onSlotClick?: (id: string) => void;
  /** Devam sayfalarında yalnız dipnot + telefon şeridi çizilir */
  compact?: boolean;
}): ReactNode {
  const { geo, theme, client, doc, scope, mode, selectedSlot, onSlotClick, compact } = props;
  const { w, margin } = geo;

  const sv = (id: string) => chromeSlotValue(id, doc, scope);
  const text = (id: string) => {
    const { value, detached } = sv(id);
    return { str: typeof value === "string" ? value : "", detached };
  };

  const title = text("title");
  const phone = text("phone");
  const address = text("address");
  const hours = text("hours");
  const footnote = text("footnote");
  const halalOn = sv("halal").value === true;
  const logoAsset = assetById(client, sv("logo").value);

  const interact = { mode, onSlotClick } as const;

  /* Başlık: tek satır, 14→8 mm shrink; sağa yaslı */
  const titleMaxW = w - margin - (geo.header.logo.x + geo.header.logo.w + 8);
  const titleText = theme.uppercaseHeading ? title.str.toLocaleUpperCase("fr-FR") : title.str;
  const titleFit = solveFontScale({
    min: 8,
    max: 14,
    fits: (f) => estimateWidth(titleText, f, theme.ratios.heading) <= titleMaxW,
  });
  const titleBaseline = geo.header.y + geo.header.h - 7;

  const halalCx = w - margin - 7;
  const halalCy = geo.header.y + 7;

  return (
    <g>
      {!compact && (
        <>
          {/* LOGO */}
          <Slot
            id="logo"
            {...interact}
            selected={selectedSlot === "logo"}
            box={{ ...geo.header.logo, x: geo.header.logo.x, y: geo.header.logo.y }}
          >
            {logoAsset ? (
              <image
                href={logoAsset.urls.master}
                x={geo.header.logo.x}
                y={geo.header.logo.y}
                width={geo.header.logo.w}
                height={geo.header.logo.h}
                preserveAspectRatio="xMidYMid meet"
              />
            ) : mode === "edit" ? (
              <g>
                <rect
                  x={geo.header.logo.x}
                  y={geo.header.logo.y}
                  width={geo.header.logo.w}
                  height={geo.header.logo.h}
                  fill="none"
                  stroke="var(--c-line)"
                  strokeWidth={0.4}
                  strokeDasharray="2 1.5"
                  rx={2}
                />
                <text
                  x={geo.header.logo.x + geo.header.logo.w / 2}
                  y={geo.header.logo.y + geo.header.logo.h / 2 + 1.2}
                  fontSize={3}
                  textAnchor="middle"
                  fill="var(--c-desc)"
                  style={{ fontFamily: "var(--f-body)" }}
                >
                  Logo bekleniyor
                </text>
              </g>
            ) : null}
          </Slot>

          {/* BAŞLIK */}
          <Slot
            id="title"
            {...interact}
            selected={selectedSlot === "title"}
            detached={title.detached}
            box={{ x: geo.header.logo.x + geo.header.logo.w + 6, y: geo.header.y + 4, w: titleMaxW, h: geo.header.h - 6 }}
          >
            <TextLines
              lines={titleText ? [titleText] : []}
              x={w - margin}
              y={titleBaseline}
              lineH={titleFit.font_mm * 1.1}
              font="var(--f-heading)"
              size={titleFit.font_mm}
              fill="var(--c-heading)"
              weight={theme.weights.heading}
              anchor="end"
              letterSpacing={0.12}
            />
          </Slot>

          {/* HALAL rozeti — başlığın üstünde, sağ üst köşe */}
          {halalOn && (
            <Slot
              id="halal"
              {...interact}
              selected={selectedSlot === "halal"}
              box={{ x: halalCx - 7, y: halalCy - 7, w: 14, h: 14 }}
            >
              <g>
                <circle cx={halalCx} cy={halalCy} r={6.4} fill="var(--c-accent)" />
                <circle cx={halalCx} cy={halalCy} r={5.4} fill="none" stroke="var(--c-bg)" strokeWidth={0.35} />
                <text
                  x={halalCx}
                  y={halalCy + 1.3}
                  fontSize={2.9}
                  textAnchor="middle"
                  fill="var(--c-bg)"
                  style={{ fontFamily: "var(--f-body)", fontWeight: 600, letterSpacing: "0.2mm" }}
                >
                  HALAL
                </text>
              </g>
            </Slot>
          )}
        </>
      )}

      {/* TELEFON ŞERİDİ — tam genişlik bant */}
      <Slot
        id="phone"
        {...interact}
        selected={selectedSlot === "phone"}
        detached={phone.detached}
        box={{ x: 0, y: geo.phoneStrip.y, w, h: geo.phoneStrip.h }}
      >
        <g>
          <rect x={-4} y={geo.phoneStrip.y} width={w + 8} height={geo.phoneStrip.h} fill="var(--c-panel)" />
          {phone.str && (
            <TextLines
              lines={[phone.str]}
              x={margin}
              y={geo.phoneStrip.y + geo.phoneStrip.h / 2 + 1.5}
              lineH={4}
              font="var(--f-item)"
              size={4}
              fill="var(--c-heading)"
              weight={theme.weights.item}
              letterSpacing={0.25}
            />
          )}
          {client.brandkit.slogan_fr && (
            <TextLines
              lines={[client.brandkit.slogan_fr]}
              x={w - margin}
              y={geo.phoneStrip.y + geo.phoneStrip.h / 2 + 1.3}
              lineH={3}
              font="var(--f-script)"
              size={3.4}
              fill="var(--c-heading)"
              anchor="end"
            />
          )}
        </g>
      </Slot>

      {!compact && (
        <>
          {/* ADRES + SAAT */}
          <Slot
            id="address"
            {...interact}
            selected={selectedSlot === "address"}
            detached={address.detached}
            box={{ x: margin, y: geo.addressLine.y, w: (w - 2 * margin) * 0.55, h: geo.addressLine.h }}
          >
            {address.str ? (
              <TextLines
                lines={[address.str]}
                x={margin}
                y={geo.addressLine.y + 3.6}
                lineH={3.2}
                font="var(--f-body)"
                size={3}
                fill="var(--c-desc)"
              />
            ) : <g />}
          </Slot>
          <Slot
            id="hours"
            {...interact}
            selected={selectedSlot === "hours"}
            detached={hours.detached}
            box={{ x: margin + (w - 2 * margin) * 0.58, y: geo.addressLine.y, w: (w - 2 * margin) * 0.42, h: geo.addressLine.h }}
          >
            {hours.str ? (
              <TextLines
                lines={[hours.str]}
                x={w - margin}
                y={geo.addressLine.y + 3.6}
                lineH={3.2}
                font="var(--f-body)"
                size={3}
                fill="var(--c-desc)"
                anchor="end"
              />
            ) : <g />}
          </Slot>
        </>
      )}

      {/* DİPNOT — allerjen (yasal, her sayfada) */}
      <Slot
        id="footnote"
        {...interact}
        selected={selectedSlot === "footnote"}
        detached={footnote.detached}
        box={{ x: margin, y: geo.footnoteBaseline - 3.4, w: w - 2 * margin, h: 5 }}
      >
        {footnote.str ? (
          <TextLines
            lines={[footnote.str]}
            x={w / 2}
            y={geo.footnoteBaseline}
            lineH={3}
            font="var(--f-body)"
            size={2.6}
            fill="var(--c-desc)"
            anchor="middle"
            opacity={0.9}
          />
        ) : <g />}
      </Slot>
    </g>
  );
}
