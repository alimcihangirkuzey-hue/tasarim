/* flyer bileşeni — pageIndex 0: ön (kampanya + mini grid), 1: arka (iletişim/QR/teslimat/çift saat) */

import type { ReactNode } from "react";
import { themeStyle } from "../themes.js";
import type { TemplateProps } from "../types.js";
import { CropMarks, Guides, Slot, TextLines } from "../parts/svg.js";
import { analyzeFlyer } from "./analyze.js";
import { manifest } from "./manifest.js";

const M = 10;

export function FlyerTemplate(props: TemplateProps): ReactNode {
  const { client, doc, mode, pageIndex = 0, showGuides, cropMarks, selectedSlot, onSlotClick } = props;
  const a = analyzeFlyer(client, doc);
  const B = manifest.bleed_mm;
  const PW = a.formatDef.w_mm;
  const PH = a.formatDef.h_mm;
  const W = PW + 2 * B;
  const H = PH + 2 * B;
  const interact = { mode, onSlotClick } as const;
  const front = pageIndex === 0;

  /* Arka yüz blokları: dolu olanlar sırayla dizilir (boş blok yer kaplamaz) */
  const backBlocks: Array<{ key: string; h: number; render: (y: number) => ReactNode }> = [];
  if (front === false) {
    if (a.hours || a.deliveryHours) {
      const rows: Array<[string, string]> = [];
      if (a.hours) rows.push(["HORAIRES", a.hours]);
      if (a.deliveryHours) rows.push(["LIVRAISON", a.deliveryHours]);
      backBlocks.push({
        key: "hours",
        h: rows.length * 14 + 8,
        render: (y) => (
          <g key="hours" transform={`translate(${M}, ${y})`}>
            {rows.map(([label, value], i) => (
              <g key={label} transform={`translate(0, ${i * 14})`}>
                <text x={0} y={4.4} fontSize={3.6} fill="var(--c-accent)"
                  style={{ fontFamily: "var(--f-item)", fontWeight: 600, letterSpacing: "1.1339px" }}>
                  {label}
                </text>
                <text x={0} y={9.6} fontSize={3.6} fill="var(--c-item)" style={{ fontFamily: "var(--f-body)" }}>
                  {value}
                </text>
              </g>
            ))}
          </g>
        ),
      });
    }
    if (a.deliveryNote.text) {
      backBlocks.push({
        key: "delivery_note",
        h: 24,
        render: (y) => (
          <Slot key="dn" id="delivery_note" {...interact} selected={selectedSlot === "delivery_note"}
            detached={a.deliveryNote.detached} box={{ x: M, y, w: PW - 2 * M, h: 22 }}>
            <g transform={`translate(${M}, ${y})`}>
              <rect width={PW - 2 * M} height={22} rx={1.6} fill="var(--c-panel)" />
              <text x={4} y={6.4} fontSize={3.4} fill="var(--c-accent)"
                style={{ fontFamily: "var(--f-item)", fontWeight: 600, letterSpacing: "1.1339px" }}>
                LIVRAISON — ZONES & MINIMUM
              </text>
              <TextLines
                lines={a.deliveryNote.text.split("\n").slice(0, 3)}
                x={4} y={11.6} lineH={4}
                font="var(--f-body)" size={3.2} fill="var(--c-item)"
              />
            </g>
          </Slot>
        ),
      });
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={`${W}mm`} height={`${H}mm`}
      xmlns="http://www.w3.org/2000/svg" style={{ ...themeStyle(a.theme), display: "block" }}>
      <defs>
        <radialGradient id="fl-glow" cx="0.5" cy="0.35" r="0.85">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.06} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill="var(--c-bg)" />
      <rect width={W} height={H} fill="url(#fl-glow)" />

      <g transform={`translate(${B}, ${B})`}>
        {/* üst şerit: logo + telefon (iki yüzde de) */}
        <rect x={-B} y={0} width={PW + 2 * B} height={16} fill="var(--c-panel)" />
        <Slot id="logo" {...interact} selected={selectedSlot === "logo"} box={{ x: M, y: 2, w: 34, h: 12 }}>
          {a.logoUrl ? (
            <image href={a.logoUrl} x={M} y={2} width={34} height={12} preserveAspectRatio="xMidYMid meet" />
          ) : (
            <text x={M} y={10.4} fontSize={5} fill="var(--c-heading)"
              style={{ fontFamily: "var(--f-heading)", fontWeight: a.theme.weights.heading }}>
              {client.name.toLocaleUpperCase("fr-FR")}
            </text>
          )}
        </Slot>
        <text x={PW - M} y={10} fontSize={4.4} textAnchor="end" fill="var(--c-heading)"
          style={{ fontFamily: "var(--f-item)", fontWeight: a.theme.weights.item, letterSpacing: "0.7559px" }}>
          {a.phone}
        </text>

        {front ? (
          <>
            {/* KAMPANYA BLOĞU */}
            <g transform={`translate(0, 22)`}>
              <rect x={M - 2} y={0} width={PW - 2 * M + 4} height={66} rx={2.5}
                fill="var(--c-panel)" stroke="var(--c-accent)" strokeWidth={0.8} />
              <Slot id="campaign_title" {...interact} selected={selectedSlot === "campaign_title"}
                detached={a.campaign.title.detached} box={{ x: M + 2, y: 4, w: PW - 2 * M - 4, h: 18 }}>
                <TextLines lines={[a.campaign.title.text]} x={PW / 2} y={14} lineH={10}
                  font="var(--f-heading)" size={9.5} fill="var(--c-heading)"
                  weight={a.theme.weights.heading} anchor="middle" letterSpacing={1.1339}
                  uppercase={a.theme.uppercaseHeading} />
              </Slot>
              <Slot id="campaign_price" {...interact} selected={selectedSlot === "campaign_price"}
                detached={a.campaign.price.detached} box={{ x: PW / 2 - 40, y: 20, w: 80, h: 30 }}>
                <TextLines lines={[a.campaign.price.text]} x={PW / 2} y={44} lineH={24}
                  font="var(--f-heading)" size={23} fill="var(--c-accent)"
                  weight={a.theme.weights.heading} anchor="middle" />
              </Slot>
              <Slot id="campaign_sub" {...interact} selected={selectedSlot === "campaign_sub"}
                detached={a.campaign.sub.detached} box={{ x: M + 2, y: 50, w: PW - 2 * M - 4, h: 12 }}>
                <TextLines lines={a.campaign.sub.text ? [a.campaign.sub.text] : []} x={PW / 2} y={58}
                  lineH={5} font="var(--f-script)" size={4.6} fill="var(--c-item)" anchor="middle" />
              </Slot>
            </g>

            {/* MİNİ GRID */}
            {a.mini.items.map((it) => (
              <Slot key={it.id} id={`item:${it.id}`} mode={mode}
                selected={selectedSlot === `item:${it.id}`} onSlotClick={onSlotClick}
                box={{ x: it.x, y: it.y, w: it.w, h: it.h }}>
                <g transform={`translate(${it.x}, ${it.y})`}>
                  <rect x={0.25} y={0.25} width={it.w - 0.5} height={it.h - 0.5} rx={1.8}
                    fill="none" stroke="var(--c-line)" strokeWidth={0.45} strokeDasharray="1.7 1.2" />
                  {it.photoUrl && (
                    <image href={it.photoUrl} x={3} y={3} width={it.w - 6} height={it.h * 0.52}
                      preserveAspectRatio="xMidYMid meet" />
                  )}
                  <text x={3} y={it.h - 9} fontSize={3.4} fill="var(--c-item)"
                    style={{ fontFamily: "var(--f-item)", fontWeight: a.theme.weights.item }}>
                    {a.theme.uppercaseHeading ? it.name.toLocaleUpperCase("fr-FR") : it.name}
                  </text>
                  <text x={it.w - 3} y={it.h - 3.4} fontSize={4.2} textAnchor="end" fill="var(--c-price)"
                    style={{ fontFamily: "var(--f-item)", fontWeight: a.theme.weights.item }}>
                    {it.price}
                  </text>
                </g>
              </Slot>
            ))}
          </>
        ) : (
          <>
            {/* ARKA: iletişim + QR + bloklar */}
            <text x={PW / 2} y={30} fontSize={6.2} textAnchor="middle" fill="var(--c-heading)"
              style={{ fontFamily: "var(--f-heading)", fontWeight: a.theme.weights.heading, letterSpacing: "1.1339px" }}>
              {client.name.toLocaleUpperCase("fr-FR")}
            </text>
            <Slot id="address" {...interact} selected={selectedSlot === "address"} box={{ x: M, y: 36, w: PW - 2 * M, h: 12 }}>
              <TextLines lines={a.address ? [a.address] : []} x={PW / 2} y={42} lineH={4.4}
                font="var(--f-body)" size={3.4} fill="var(--c-desc)" anchor="middle" />
            </Slot>

            {a.qr && (
              <Slot id="qr" {...interact} selected={selectedSlot === "qr"}
                box={{ x: PW / 2 - 11.5, y: 50, w: 23, h: 23 }}>
                <g transform={`translate(${PW / 2 - 11.5}, 50)`}>
                  <rect width={23} height={23} rx={1.8} fill="#ffffff" stroke="var(--c-line)" strokeWidth={0.3} />
                  <g transform="translate(2.5, 2.5)">
                    <path d={a.qr.d} fill={a.qr.fill} />
                  </g>
                </g>
              </Slot>
            )}

            {backBlocks.reduce<{ y: number; nodes: ReactNode[] }>(
              (acc, b) => {
                acc.nodes.push(b.render(acc.y));
                acc.y += b.h + 4;
                return acc;
              },
              { y: 80, nodes: [] }
            ).nodes}

            <text x={PW / 2} y={PH - 7} fontSize={2.6} textAnchor="middle" fill="var(--c-desc)"
              opacity={0.9} style={{ fontFamily: "var(--f-body)" }}>
              {a.footnote}
            </text>
          </>
        )}
      </g>

      {mode === "edit" && showGuides && <Guides w={PW} h={PH} bleed={B} safe={manifest.safe_mm} />}
      {mode === "print" && cropMarks && <CropMarks w={PW} h={PH} bleed={B} />}
    </svg>
  );
}
