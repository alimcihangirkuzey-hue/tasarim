/* menu-trifold bileşeni — pageIndex 0: dış yüz, 1: iç yüz.
   Katlama kılavuzları YALNIZ print varyantında, bleed bölgesinde tik olarak. */

import type { ReactNode } from "react";
import { themeStyle } from "../themes.js";
import type { TemplateProps } from "../types.js";
import { CropMarks, Guides, Slot, TextLines } from "../parts/svg.js";
import { analyzeTrifold, PAGE_H, PAGE_W } from "./analyze.js";
import { FOLDS_INNER, FOLDS_OUTER, manifest, OUTER_PANELS } from "./manifest.js";

function FoldMarks({ folds, bleed }: { folds: number[]; bleed: number }): ReactNode {
  return (
    <g pointerEvents="none">
      {folds.map((x) => (
        <g key={x} stroke="#000" strokeWidth={0.25} strokeDasharray="1.2 0.9">
          <line x1={bleed + x} y1={0.5} x2={bleed + x} y2={bleed - 0.5} />
          <line x1={bleed + x} y1={bleed + PAGE_H + 0.5} x2={bleed + x} y2={bleed + PAGE_H + bleed - 0.5} />
        </g>
      ))}
    </g>
  );
}

export function MenuTrifoldTemplate(props: TemplateProps): ReactNode {
  const { client, doc, mode, pageIndex = 0, showGuides, cropMarks, selectedSlot, onSlotClick } = props;
  const a = analyzeTrifold(client, doc);
  const B = manifest.bleed_mm;
  const W = PAGE_W + 2 * B;
  const H = PAGE_H + 2 * B;
  const interact = { mode, onSlotClick } as const;
  const outer = pageIndex === 0;

  const flap = OUTER_PANELS[0];
  const back = OUTER_PANELS[1];
  const front = OUTER_PANELS[2];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={`${W}mm`}
      height={`${H}mm`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ ...themeStyle(a.theme), display: "block" }}
    >
      <defs>
        <radialGradient id="tf-glow" cx="0.5" cy="0.4" r="0.8">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.05} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="tf-band" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--c-panel)" />
          <stop offset="1" stopColor="var(--c-panel)" stopOpacity={0} />
        </linearGradient>
      </defs>

      <rect width={W} height={H} fill="var(--c-bg)" />
      <rect width={W} height={H} fill="url(#tf-glow)" />

      <g transform={`translate(${B}, ${B})`}>
        {outer ? (
          <>
            {/* ---- İÇ KANAT (97): öne çıkanlar ---- */}
            <g transform={`translate(${flap.x}, 0)`}>
              <rect x={4} y={12} width={flap.w - 8} height={PAGE_H - 24} rx={2}
                fill="none" stroke="var(--c-line)" strokeWidth={0.5} strokeDasharray="1.8 1.3" />
              <Slot id="flap_title" {...interact} selected={selectedSlot === "flap_title"}
                detached={a.flapTitle.detached} box={{ x: 8, y: 18, w: flap.w - 16, h: 16 }}>
                <TextLines
                  lines={[a.flapTitle.text]}
                  x={flap.w / 2} y={28} lineH={7}
                  font="var(--f-heading)" size={6} fill="var(--c-heading)"
                  weight={a.theme.weights.heading} anchor="middle" letterSpacing={0.9448818898}
                  uppercase={a.theme.uppercaseHeading}
                />
              </Slot>
              <rect x={flap.w / 2 - 11} y={33} width={22} height={1} fill="var(--c-accent)" />
              {a.flapItems.map((it, i) => (
                <g key={i} transform={`translate(10, ${48 + i * 34})`}>
                  <text x={0} y={0} fontSize={4} fill="var(--c-item)"
                    style={{ fontFamily: "var(--f-item)", fontWeight: a.theme.weights.item }}>
                    {a.theme.uppercaseHeading ? it.name.toLocaleUpperCase("fr-FR") : it.name}
                  </text>
                  <text x={0} y={7.5} fontSize={4.6} fill="var(--c-price)"
                    style={{ fontFamily: "var(--f-item)", fontWeight: a.theme.weights.item }}>
                    {it.price}
                  </text>
                  <line x1={0} y1={12} x2={flap.w - 20} y2={12} stroke="var(--c-line)" strokeWidth={0.3} strokeDasharray="0.01 1.4" strokeLinecap="round" />
                </g>
              ))}
            </g>

            {/* ---- ARKA KAPAK (100): iletişim + QR ---- */}
            <g transform={`translate(${back.x}, 0)`}>
              <rect x={0} y={0} width={back.w} height={12} fill="url(#tf-band)" />
              <text x={back.w / 2} y={30} fontSize={6} textAnchor="middle" fill="var(--c-heading)"
                style={{ fontFamily: "var(--f-heading)", fontWeight: a.theme.weights.heading, letterSpacing: "1.1339px" }}>
                CONTACT
              </text>
              <rect x={back.w / 2 - 11} y={34} width={22} height={1} fill="var(--c-accent)" />
              <Slot id="phone" {...interact} selected={selectedSlot === "phone"} box={{ x: 10, y: 42, w: back.w - 20, h: 10 }}>
                <TextLines lines={a.phone ? [a.phone] : []} x={back.w / 2} y={49} lineH={5}
                  font="var(--f-item)" size={5} fill="var(--c-item)" weight={a.theme.weights.item} anchor="middle" />
              </Slot>
              <Slot id="address" {...interact} selected={selectedSlot === "address"} box={{ x: 10, y: 56, w: back.w - 20, h: 16 }}>
                <TextLines lines={a.address ? a.address.split(",").map((s) => s.trim()) : []}
                  x={back.w / 2} y={62} lineH={4.4} font="var(--f-body)" size={3.4} fill="var(--c-desc)" anchor="middle" />
              </Slot>
              <Slot id="hours" {...interact} selected={selectedSlot === "hours"} box={{ x: 10, y: 76, w: back.w - 20, h: 10 }}>
                <TextLines lines={a.hours ? [a.hours] : []} x={back.w / 2} y={82} lineH={4}
                  font="var(--f-body)" size={3.4} fill="var(--c-desc)" anchor="middle" />
              </Slot>
              {a.qr && (
                <Slot id="qr" {...interact} selected={selectedSlot === "qr"}
                  box={{ x: back.w / 2 - 11.5, y: 96, w: 23, h: 23 }}>
                  <g transform={`translate(${back.w / 2 - 11.5}, 96)`}>
                    <rect width={23} height={23} rx={1.8} fill="#ffffff" stroke="var(--c-line)" strokeWidth={0.3} />
                    <g transform="translate(2.5, 2.5)">
                      <path d={a.qr.d} fill={a.qr.fill} />
                    </g>
                  </g>
                </Slot>
              )}
              {client.brandkit.contact.instagram && (
                <text x={back.w / 2} y={128} fontSize={3.4} textAnchor="middle" fill="var(--c-desc)"
                  style={{ fontFamily: "var(--f-body)" }}>
                  {client.brandkit.contact.instagram}
                </text>
              )}
              <text x={back.w / 2} y={PAGE_H - 12} fontSize={2.6} textAnchor="middle" fill="var(--c-desc)"
                opacity={0.85} style={{ fontFamily: "var(--f-body)" }}>
                {a.footnote}
              </text>
            </g>

            {/* ---- ÖN KAPAK (100): logo + slogan + dekor ---- */}
            <g transform={`translate(${front.x}, 0)`}>
              <Slot id="logo" {...interact} selected={selectedSlot === "logo"} box={{ x: 20, y: 26, w: front.w - 40, h: 48 }}>
                {a.logoUrl ? (
                  <image href={a.logoUrl} x={20} y={26} width={front.w - 40} height={48} preserveAspectRatio="xMidYMid meet" />
                ) : (
                  <text x={front.w / 2} y={52} fontSize={11} textAnchor="middle" fill="var(--c-heading)"
                    style={{ fontFamily: "var(--f-heading)", fontWeight: a.theme.weights.heading, letterSpacing: "1.8898px" }}>
                    {client.name.toLocaleUpperCase("fr-FR")}
                  </text>
                )}
              </Slot>
              <Slot id="slogan" {...interact} selected={selectedSlot === "slogan"}
                detached={a.slogan.detached} box={{ x: 12, y: 82, w: front.w - 24, h: 14 }}>
                <TextLines lines={a.slogan.text ? [a.slogan.text] : []} x={front.w / 2} y={91}
                  lineH={6} font="var(--f-script)" size={5.6} fill="var(--c-heading)" anchor="middle" />
              </Slot>
              <Slot id="cover_photo" {...interact} selected={selectedSlot === "cover_photo"}
                box={{ x: 14, y: 104, w: front.w - 28, h: 82 }}>
                {a.coverUrl ? (
                  <image href={a.coverUrl} x={14} y={104} width={front.w - 28} height={82} preserveAspectRatio="xMidYMid meet" />
                ) : mode === "edit" ? (
                  <rect x={14} y={104} width={front.w - 28} height={82} rx={2} fill="none"
                    stroke="var(--c-line)" strokeWidth={0.4} strokeDasharray="2 1.5" />
                ) : null}
              </Slot>
              <rect x={0} y={PAGE_H - 9} width={front.w} height={9} fill="var(--c-panel)" />
              <text x={front.w / 2} y={PAGE_H - 3.2} fontSize={3.6} textAnchor="middle" fill="var(--c-heading)"
                style={{ fontFamily: "var(--f-item)", fontWeight: a.theme.weights.item, letterSpacing: "1.1339px" }}>
                {a.phone}
              </text>
            </g>
          </>
        ) : (
          <>
            {/* ---- İÇ YÜZ: 3 sütun menü akışı ---- */}
            {a.innerColumns.map((col, ci) => (
              <g key={ci} transform={`translate(${col.x}, 14)`}>
                {ci > 0 && (
                  <line x1={-9.5} y1={2} x2={-9.5} y2={a.colH - 2} stroke="var(--c-line)" strokeWidth={0.3} opacity={0.6} />
                )}
                {col.rows.map(({ row, y }, ri) => (
                  <g key={ri} transform={`translate(0, ${y})`}>
                    {row.kind === "category" ? (
                      <>
                        <text x={0} y={6} fontSize={5.2} fill="var(--c-heading)"
                          style={{ fontFamily: "var(--f-heading)", fontWeight: a.theme.weights.heading, letterSpacing: "1.0583px" }}>
                          {a.theme.uppercaseHeading ? (row.name ?? "").toLocaleUpperCase("fr-FR") : row.name}
                        </text>
                        <rect x={0.2} y={7.8} width={18} height={0.9} fill="var(--c-accent)" />
                        {row.note && (
                          <text x={0} y={row.h - 1.6} fontSize={2.5} fill="var(--c-desc)" style={{ fontFamily: "var(--f-body)" }}>
                            {row.note}
                          </text>
                        )}
                      </>
                    ) : (
                      <Slot id={`item:${row.item!.id}`} mode={mode}
                        selected={selectedSlot === `item:${row.item!.id}`} onSlotClick={onSlotClick}
                        box={{ x: -1, y: -0.5, w: col.w + 2, h: row.h }}>
                        <TextLines lines={row.nameLines!} x={0} y={row.nameFont! * 1.05}
                          lineH={row.nameFont! * 1.3} font="var(--f-item)" size={row.nameFont!}
                          fill="var(--c-item)" weight={a.theme.weights.item} />
                        <text x={col.w} y={row.nameFont! * 1.05} fontSize={row.nameFont! * 0.9}
                          textAnchor="end" fill="var(--c-price)"
                          style={{ fontFamily: "var(--f-item)", fontWeight: a.theme.weights.item }}>
                          {row.priceText}
                        </text>
                        {row.descLines!.length > 0 && (
                          <TextLines lines={row.descLines!} x={0}
                            y={row.nameLines!.length * row.nameFont! * 1.3 + row.descFont! * 0.8}
                            lineH={row.descFont! * 1.3} font="var(--f-body)" size={row.descFont!} fill="var(--c-desc)" />
                        )}
                      </Slot>
                    )}
                  </g>
                ))}
              </g>
            ))}
          </>
        )}
      </g>

      {mode === "edit" && showGuides && (
        <>
          <Guides w={PAGE_W} h={PAGE_H} bleed={B} safe={manifest.safe_mm} />
          {/* edit modunda katlama çizgileri tam boy gösterilir (yalnız kılavuz) */}
          <g pointerEvents="none" stroke="#0891B2" strokeWidth={0.25} strokeDasharray="3 2" opacity={0.8}>
            {(outer ? FOLDS_OUTER : FOLDS_INNER).map((x) => (
              <line key={x} x1={B + x} y1={B} x2={B + x} y2={B + PAGE_H} />
            ))}
          </g>
        </>
      )}
      {mode === "print" && cropMarks && (
        <>
          <CropMarks w={PAGE_W} h={PAGE_H} bleed={B} />
          <FoldMarks folds={outer ? FOLDS_OUTER : FOLDS_INNER} bleed={B} />
        </>
      )}
    </svg>
  );
}
