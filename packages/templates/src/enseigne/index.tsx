/* Tabela (enseigne-panneau) — FAZ3-GOREV §5. cm bazlı tek panel;
   kontrast bekçisi: zemin-metin luminans < 3:1 → M4 uyarısı. */

import type { ReactNode } from "react";
import {
  TabelaParamsSchema,
  type ClientDTO,
  type DocumentState,
  type TabelaParams,
} from "@tezgah/shared";
import { assetById, resolveSlotValue, type BindScope } from "../engine/binding.js";
import { contrastRatio } from "../engine/qr.js";
import { checkDpi, type LayoutWarning } from "../engine/layout.js";
import { relToMM, scaleRule } from "../engine/ratio.js";
import { resolveTheme, themeStyle, type Theme } from "../themes.js";
import type { TemplateEntry, TemplateManifest, TemplateProps } from "../types.js";
import { Slot, TextLines, ls } from "../parts/svg.js";

const SLOTS = [
  { id: "logo", kind: "image" as const, bind: "brand.logo_primary" },
  { id: "title", kind: "text" as const, bind: null, maxLines: 1 },
  { id: "services", kind: "text" as const, bind: null, default_fr: "kebab · tacos · burger", maxLines: 1 },
  { id: "phone", kind: "text" as const, bind: "brand.contact.phone", maxLines: 1 },
];

export const manifest: TemplateManifest = {
  id: "enseigne-panneau",
  type: "menu",
  name_tr: "Tabela (tek panel)",
  bleed_mm: 0,
  safe_mm: 0,
  formats: { libre: { w_mm: 3000, h_mm: 600, label_tr: "Serbest (cm)" } },
  defaultFormat: "libre",
  params: [
    { id: "w_cm", type: "number", default: 300, min: 50, max: 2000, step: 1, label_tr: "Genişlik (cm)" },
    { id: "h_cm", type: "number", default: 60, min: 20, max: 500, step: 1, label_tr: "Yükseklik (cm)" },
    { id: "bleed_mm", type: "choice", options: [0, 3, 5], default: 0, label_tr: "Bleed (mm)" },
  ],
  slots: SLOTS,
  themes: ["or-noir", "aras-orange", "velours-rouge"],
};

export interface EnseigneAnalysis {
  theme: Theme;
  params: TabelaParams;
  w_mm: number;
  h_mm: number;
  scale: 1 | 10;
  stamp: string | null;
  warnings: LayoutWarning[];
  logoUrl: string | null;
  title: string;
  services: string;
  phone: string;
}

export function analyzeEnseigne(client: ClientDTO, doc: DocumentState): EnseigneAnalysis {
  const scope: BindScope = { brand: client.brandkit, catalog: client.catalog };
  const theme = resolveTheme(doc.theme_id, client.brandkit);
  const params = TabelaParamsSchema.parse(doc.params);
  const w_mm = params.w_cm * 10;
  const h_mm = params.h_cm * 10;
  const { scale, stamp } = scaleRule(w_mm, h_mm);
  const warnings: LayoutWarning[] = [];

  const sv = (id: string) => resolveSlotValue(SLOTS.find((s) => s.id === id)!, doc.overrides, scope);
  const title = (typeof sv("title").value === "string" && (sv("title").value as string)) || client.name;
  const logoAsset = assetById(client, sv("logo").value);

  /* Kontrast bekçisi (§5): zemin (bg) ↔ başlık rengi */
  const ratio = contrastRatio(theme.vars["--c-bg"], theme.vars["--c-heading"]);
  if (ratio < 3) warnings.push({ type: "contrast", ratio: Math.round(ratio * 100) / 100 });

  if (logoAsset) {
    const box = relToMM({ x: 0.02, y: 0.15, w: 0.16, h: 0.7 }, w_mm, h_mm);
    const dpi = checkDpi(logoAsset.width_px, logoAsset.height_px, box.w, box.h, { yellow: 100, red: 72 });
    if (dpi.level !== "ok") {
      warnings.push({ type: "low-dpi", slotId: "logo", effectiveDpi: dpi.effectiveDpi, level: dpi.level });
    }
  } else {
    warnings.push({ type: "empty-required", slotId: "logo" });
  }

  return {
    theme, params, w_mm, h_mm, scale, stamp, warnings,
    logoUrl: logoAsset?.urls.master ?? null,
    title,
    services: String(sv("services").value ?? ""),
    phone: String(sv("phone").value ?? ""),
  };
}

function EnseigneTemplate(props: TemplateProps): ReactNode {
  const { client, doc, mode, selectedSlot, onSlotClick } = props;
  const a = analyzeEnseigne(client, doc);
  const B = a.params.bleed_mm;
  const W = a.w_mm + 2 * B;
  const H = a.h_mm + 2 * B;
  const interact = { mode, onSlotClick } as const;
  const fs = a.h_mm; // yükseklik bazlı tipografi
  const logoBox = relToMM({ x: 0.02, y: 0.15, w: 0.16, h: 0.7 }, a.w_mm, a.h_mm);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={`${W / a.scale}mm`} height={`${H / a.scale}mm`}
      xmlns="http://www.w3.org/2000/svg" style={{ ...themeStyle(a.theme), display: "block" }}>
      <defs>
        <linearGradient id="ens-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--c-panel)" />
          <stop offset="1" stopColor="var(--c-bg)" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#ens-bg)" />
      <g transform={`translate(${B}, ${B})`}>
        <Slot id="logo" {...interact} selected={selectedSlot === "logo"} box={logoBox}>
          {a.logoUrl ? (
            <image href={a.logoUrl} x={logoBox.x} y={logoBox.y} width={logoBox.w} height={logoBox.h}
              preserveAspectRatio="xMidYMid meet" />
          ) : <g />}
        </Slot>
        <Slot id="title" {...interact} selected={selectedSlot === "title"}
          box={relToMM({ x: 0.2, y: 0.1, w: 0.78, h: 0.55 }, a.w_mm, a.h_mm)}>
          <TextLines
            lines={[a.title]}
            x={a.w_mm * 0.2}
            y={a.h_mm * 0.52}
            lineH={fs * 0.4}
            font="var(--f-heading)"
            size={fs * 0.38}
            fill="var(--c-heading)"
            weight={a.theme.weights.heading}
            letterSpacing={ls(fs * 0.045354)}
            uppercase
          />
        </Slot>
        {/* alt bilgi şeridi */}
        <rect x={0} y={a.h_mm * 0.74} width={a.w_mm} height={a.h_mm * 0.26} fill="var(--c-accent)" />
        <Slot id="services" {...interact} selected={selectedSlot === "services"}
          box={relToMM({ x: 0.02, y: 0.76, w: 0.6, h: 0.2 }, a.w_mm, a.h_mm)}>
          <TextLines lines={[a.services]} x={a.w_mm * 0.03} y={a.h_mm * 0.92}
            lineH={fs * 0.14} font="var(--f-item)" size={fs * 0.13}
            fill="var(--c-bg)" weight={a.theme.weights.item} letterSpacing={ls(fs * 0.015118)} />
        </Slot>
        <Slot id="phone" {...interact} selected={selectedSlot === "phone"}
          box={relToMM({ x: 0.62, y: 0.76, w: 0.36, h: 0.2 }, a.w_mm, a.h_mm)}>
          <TextLines lines={a.phone ? [a.phone] : []} x={a.w_mm * 0.98} y={a.h_mm * 0.92}
            lineH={fs * 0.14} font="var(--f-item)" size={fs * 0.13}
            fill="var(--c-bg)" weight={a.theme.weights.item} anchor="end" letterSpacing={ls(fs * 0.022677)} />
        </Slot>
      </g>
      {mode === "print" && a.stamp && (
        <text x={W - fs * 0.1} y={H - fs * 0.06} fontSize={fs * 0.05} textAnchor="end"
          fill="var(--c-item)" opacity={0.9} style={{ fontFamily: "var(--f-body)", fontWeight: 600 }}>
          {a.stamp}
        </text>
      )}
    </svg>
  );
}

export const enseignePanneau: TemplateEntry = {
  manifest,
  Component: EnseigneTemplate,
  pageCount: () => 1,
  pageSizeMM: (_c, doc) => {
    const p = TabelaParamsSchema.parse(doc.params);
    const { scale } = scaleRule(p.w_cm * 10, p.h_cm * 10);
    return { w_mm: (p.w_cm * 10) / scale, h_mm: (p.h_cm * 10) / scale, bleed_mm: p.bleed_mm / scale };
  },
};
