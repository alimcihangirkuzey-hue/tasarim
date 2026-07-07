/* carte-fidelite bileşeni — pageIndex 0: ön (damgalar + ödül bandı), 1: arka (kimlik).
   Yuvarlak köşe (r=3) YALNIZ edit önizlemesinde kılavuz; PDF düz kesim + matbaa notu. */

import type { ReactNode } from "react";
import { themeStyle } from "../themes.js";
import type { TemplateProps } from "../types.js";
import { CropMarks, Guides, Slot, TextLines } from "../parts/svg.js";
import { analyzeFidelite, CARD_H, CARD_W } from "./analyze.js";
import { manifest } from "./manifest.js";

export function CarteFideliteTemplate(props: TemplateProps): ReactNode {
  const { client, doc, mode, pageIndex = 0, showGuides, cropMarks, selectedSlot, onSlotClick } = props;
  const a = analyzeFidelite(client, doc);
  const B = manifest.bleed_mm;
  const W = CARD_W + 2 * B;
  const H = CARD_H + 2 * B;
  const interact = { mode, onSlotClick } as const;
  const front = pageIndex === 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={`${W}mm`} height={`${H}mm`}
      xmlns="http://www.w3.org/2000/svg" style={{ ...themeStyle(a.theme), display: "block" }}>
      <rect width={W} height={H} fill="var(--c-bg)" />

      <g transform={`translate(${B}, ${B})`}>
        {front ? (
          <>
            <Slot id="title" {...interact} selected={selectedSlot === "title"}
              detached={a.title.detached} box={{ x: 4, y: 3, w: 50, h: 9 }}>
              <TextLines lines={[a.title.text]} x={6} y={9.6} lineH={6}
                font="var(--f-heading)" size={5.4} fill="var(--c-heading)"
                weight={a.theme.weights.heading} letterSpacing={0.22}
                uppercase={a.theme.uppercaseHeading} />
            </Slot>
            <Slot id="subtitle" {...interact} selected={selectedSlot === "subtitle"}
              detached={a.subtitle.detached} box={{ x: 55, y: 3, w: 26, h: 10 }}>
              <TextLines lines={[a.subtitle.text]} x={CARD_W - 6} y={7} lineH={3}
                font="var(--f-body)" size={2.4} fill="var(--c-desc)" anchor="end" />
            </Slot>
            <rect x={6} y={13.2} width={22} height={0.9} fill="var(--c-accent)" />

            {/* NUMARALI damga grid'i */}
            {a.stamps.map((s) => (
              <g key={s.n} transform={`translate(${s.x}, ${s.y})`}>
                <rect x={0.2} y={0.2} width={s.w - 0.4} height={s.h - 0.4} rx={1.2}
                  fill="none" stroke="var(--c-line)" strokeWidth={0.4} strokeDasharray="1.2 1" />
                <text x={s.w / 2} y={s.h / 2 + 1.6} fontSize={4} textAnchor="middle"
                  fill="var(--c-desc)" opacity={0.9}
                  style={{ fontFamily: "var(--f-item)", fontWeight: a.theme.weights.item }}>
                  {s.n}.
                </text>
              </g>
            ))}

            {/* ödül bandı — tam genişlik, bleed'e taşar */}
            <Slot id="reward" {...interact} selected={selectedSlot === "reward"}
              detached={a.reward.detached} box={{ x: 0, y: CARD_H - 11.5, w: CARD_W, h: 10 }}>
              <g>
                <rect x={-B} y={CARD_H - 11.5} width={CARD_W + 2 * B} height={11.5 + B} fill="var(--c-accent)" />
                <text x={CARD_W / 2} y={CARD_H - 4.6} fontSize={3.8} textAnchor="middle"
                  fill="var(--c-bg)"
                  style={{ fontFamily: "var(--f-heading)", fontWeight: a.theme.weights.heading, letterSpacing: "0.24mm" }}>
                  {a.reward.text}
                </text>
              </g>
            </Slot>
          </>
        ) : (
          <>
            <Slot id="logo" {...interact} selected={selectedSlot === "logo"} box={{ x: CARD_W / 2 - 16, y: 4, w: 32, h: 13 }}>
              {a.logoUrl ? (
                <image href={a.logoUrl} x={CARD_W / 2 - 16} y={4} width={32} height={13} preserveAspectRatio="xMidYMid meet" />
              ) : (
                <text x={CARD_W / 2} y={12} fontSize={5.2} textAnchor="middle" fill="var(--c-heading)"
                  style={{ fontFamily: "var(--f-heading)", fontWeight: a.theme.weights.heading }}>
                  {client.name.toLocaleUpperCase("fr-FR")}
                </text>
              )}
            </Slot>
            <text x={CARD_W / 2} y={23} fontSize={3.6} textAnchor="middle" fill="var(--c-heading)"
              style={{ fontFamily: "var(--f-heading)", fontWeight: a.theme.weights.heading, letterSpacing: "0.35mm" }}>
              {a.title.text}
            </text>
            <Slot id="phone" {...interact} selected={selectedSlot === "phone"} box={{ x: 10, y: 26, w: CARD_W - 20, h: 7 }}>
              <TextLines lines={a.phone ? [a.phone] : []} x={CARD_W / 2} y={31} lineH={4}
                font="var(--f-item)" size={4} fill="var(--c-item)" weight={a.theme.weights.item} anchor="middle" />
            </Slot>
            <Slot id="address" {...interact} selected={selectedSlot === "address"} box={{ x: 6, y: 34, w: CARD_W - 12, h: 8 }}>
              <TextLines lines={a.address ? [a.address] : []} x={CARD_W / 2} y={38} lineH={3.2}
                font="var(--f-body)" size={2.6} fill="var(--c-desc)" anchor="middle" />
            </Slot>
            <Slot id="services" {...interact} selected={selectedSlot === "services"}
              detached={a.services.detached} box={{ x: 6, y: 42, w: CARD_W - 12, h: 6 }}>
              <TextLines lines={[a.services.text]} x={CARD_W / 2} y={45.6} lineH={3}
                font="var(--f-body)" size={2.8} fill="var(--c-accent)" anchor="middle" />
            </Slot>
            <Slot id="hours" {...interact} selected={selectedSlot === "hours"} box={{ x: 6, y: 48, w: CARD_W - 12, h: 5 }}>
              <TextLines lines={a.hours ? [a.hours] : []} x={CARD_W / 2} y={51.4} lineH={3}
                font="var(--f-body)" size={2.6} fill="var(--c-desc)" anchor="middle" />
            </Slot>
          </>
        )}
      </g>

      {mode === "edit" && showGuides && (
        <>
          <Guides w={CARD_W} h={CARD_H} bleed={B} safe={manifest.safe_mm} />
          {/* yuvarlak köşe kesim ÖNİZLEMESİ (r=3) — yalnız ekranda */}
          <rect x={B} y={B} width={CARD_W} height={CARD_H} rx={3} fill="none"
            stroke="#0891B2" strokeWidth={0.3} strokeDasharray="1 1" opacity={0.9} />
        </>
      )}
      {mode === "print" && cropMarks && <CropMarks w={CARD_W} h={CARD_H} bleed={B} />}
    </svg>
  );
}
