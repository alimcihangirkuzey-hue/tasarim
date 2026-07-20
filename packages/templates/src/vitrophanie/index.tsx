/* Vitrophanie ailesi — FAZ3-GOREV §4. Üç kompozisyon (bandeau/centre/colonne),
   ortak analiz + render. Slotlar ORANSAL (0-1) tanımlı, mm'ye çevrilir.
   decoupe: yalnız logo_mono + metin, TEK kesim rengi; miroir rozeti editörde. */

import type { ReactNode } from "react";
import {
  VitroParamsSchema,
  formatPrice,
  type ClientDTO,
  type DocumentState,
  type VitroParams,
} from "@tezgah/shared";
import { assetById, resolveSelection, resolveSlotValue, type BindScope } from "../engine/binding.js";
import { checkDpi, type LayoutWarning } from "../engine/layout.js";
import { relToMM, scaleRule, type RelBox } from "../engine/ratio.js";
import { resolveTheme, themeStyle, type Theme } from "../themes.js";
import type { TemplateEntry, TemplateManifest, TemplateProps } from "../types.js";
import { Guides, Slot, TextLines, ls } from "../parts/svg.js";

type VitroVariant = "bandeau" | "centre" | "colonne";

export interface VitroAnalysis {
  theme: Theme;
  scope: BindScope;
  params: VitroParams;
  w_mm: number;
  h_mm: number;
  scale: 1 | 10;
  stamp: string | null;
  warnings: LayoutWarning[];
  logoUrl: string | null;
  monoUrl: string | null;
  hours: string;
  slogan: { text: string; detached: boolean };
  phone: string;
  items: Array<{ name: string; price: string }>;
}

const SLOT_DEFS = [
  { id: "logo", kind: "image" as const, bind: "brand.logo_primary" },
  { id: "logo_mono", kind: "image" as const, bind: "brand.logo_mono" },
  { id: "hours", kind: "text" as const, bind: "brand.contact.hours", maxLines: 1 },
  { id: "slogan", kind: "text" as const, bind: "brand.slogan_fr", maxLines: 2 },
  { id: "phone", kind: "text" as const, bind: "brand.contact.phone", maxLines: 1 },
];

function makeManifest(variant: VitroVariant, name_tr: string): TemplateManifest {
  return {
    id: `vitro-${variant}`,
    type: "cam",
    profile_version: 1,
    name_tr,
    bleed_mm: 0, // gerçek bleed param'dan; manifest değeri taban
    safe_mm: 0,
    formats: { libre: { w_mm: 1000, h_mm: 1000, label_tr: "Serbest (cm)" } },
    defaultFormat: "libre",
    params: [
      { id: "w_cm", type: "number", default: 100, min: 10, max: 2000, step: 1, label_tr: "Genişlik (cm)" },
      { id: "h_cm", type: "number", default: 100, min: 10, max: 2000, step: 1, label_tr: "Yükseklik (cm)" },
      { id: "mode", type: "choice", options: ["impression", "decoupe"], default: "impression", label_tr: "Mod" },
      { id: "miroir", type: "toggle", default: false, label_tr: "Miroir (içten uygulama)" },
      { id: "cut_color", type: "color", default: "#1A1A1A", label_tr: "Kesim rengi" },
      { id: "bleed_mm", type: "choice", options: [0, 3, 5], default: 0, label_tr: "Bleed (mm)" },
    ],
    slots: SLOT_DEFS,
    themes: ["or-noir", "aras-orange", "velours-rouge"],
  };
}

export function analyzeVitro(client: ClientDTO, doc: DocumentState): VitroAnalysis {
  const scope: BindScope = { brand: client.brandkit, catalog: client.catalog };
  const theme = resolveTheme(doc.theme_id, client.brandkit);
  const params = VitroParamsSchema.parse(doc.params);
  const w_mm = params.w_cm * 10;
  const h_mm = params.h_cm * 10;
  const { scale, stamp } = scaleRule(w_mm, h_mm);
  const warnings: LayoutWarning[] = [];

  const slot = (id: string) => SLOT_DEFS.find((s) => s.id === id)!;
  const text = (id: string) => {
    const { value, detached } = resolveSlotValue(slot(id), doc.overrides, scope);
    return { text: typeof value === "string" ? value : "", detached };
  };

  const logoAsset = assetById(client, resolveSlotValue(slot("logo"), doc.overrides, scope).value);
  const monoAsset = assetById(client, resolveSlotValue(slot("logo_mono"), doc.overrides, scope).value);

  if (params.mode === "decoupe" && !monoAsset) {
    warnings.push({ type: "empty-required", slotId: "logo_mono" });
  }
  if (params.mode === "impression" && !logoAsset) {
    warnings.push({ type: "empty-required", slotId: "logo" });
  }

  /* Büyük format DPI (§9.2: hedef 100, sarı <100, kırmızı <72) — logo alanı üzerinden */
  const active = params.mode === "decoupe" ? monoAsset : logoAsset;
  if (active) {
    const logoBox = relToMM({ x: 0.3, y: 0.2, w: 0.4, h: 0.3 }, w_mm, h_mm);
    const dpi = checkDpi(active.width_px, active.height_px, logoBox.w, logoBox.h, {
      yellow: 100,
      red: 72,
    });
    if (dpi.level !== "ok") {
      warnings.push({
        type: "low-dpi",
        slotId: params.mode === "decoupe" ? "logo_mono" : "logo",
        effectiveDpi: dpi.effectiveDpi,
        level: dpi.level,
      });
    }
  }

  const selected = resolveSelection(client.catalog, doc.selection);
  const items = selected
    .flatMap((s) => s.items)
    .slice(0, 6)
    .map((i) => ({
      name: i.name_fr,
      price: i.prices[0] ? formatPrice(i.prices[0].value, client.currency) : "",
    }));

  return {
    theme, scope, params, w_mm, h_mm, scale, stamp, warnings,
    logoUrl: logoAsset?.urls.master ?? null,
    monoUrl: monoAsset?.urls.master ?? null,
    hours: text("hours").text,
    slogan: text("slogan"),
    phone: text("phone").text,
    items,
  };
}

/* Oransal kompozisyonlar — değişkene göre kutular */
const LAYOUTS: Record<VitroVariant, Record<string, RelBox>> = {
  bandeau: {
    band: { x: 0, y: 0.3, w: 1, h: 0.4 },
    hours: { x: 0.05, y: 0.38, w: 0.62, h: 0.24 },
    logo: { x: 0.72, y: 0.34, w: 0.23, h: 0.32 },
  },
  centre: {
    logo: { x: 0.28, y: 0.16, w: 0.44, h: 0.34 },
    slogan: { x: 0.1, y: 0.56, w: 0.8, h: 0.14 },
    phone: { x: 0.2, y: 0.74, w: 0.6, h: 0.1 },
  },
  colonne: {
    logo: { x: 0.15, y: 0.04, w: 0.7, h: 0.14 },
    list: { x: 0.08, y: 0.22, w: 0.84, h: 0.6 },
    phone: { x: 0.08, y: 0.87, w: 0.84, h: 0.07 },
  },
};

function VitroTemplate(variant: VitroVariant) {
  return function Vitro(props: TemplateProps): ReactNode {
    const { client, doc, mode, showGuides, selectedSlot, onSlotClick } = props;
    const a = analyzeVitro(client, doc);
    const B = a.params.bleed_mm;
    const W = a.w_mm + 2 * B;
    const H = a.h_mm + 2 * B;
    const L = LAYOUTS[variant];
    const decoupe = a.params.mode === "decoupe";
    const ink = decoupe ? a.params.cut_color : undefined;
    const interact = { mode, onSlotClick } as const;
    const box = (k: string) => relToMM(L[k], a.w_mm, a.h_mm);
    /* metin boyları sayfayla ölçeklenir (oransal tasarım) */
    const fs = (rel: number) => Math.max(8, rel * Math.min(a.w_mm, a.h_mm));

    const content = (
      <g transform={`translate(${B}, ${B})`}>
        {variant === "bandeau" && (
          <>
            {!decoupe && (
              <rect x={box("band").x} y={box("band").y} width={box("band").w} height={box("band").h}
                fill="var(--c-panel)" opacity={0.92} />
            )}
            <Slot id="hours" {...interact} selected={selectedSlot === "hours"} box={box("hours")}>
              <TextLines
                lines={a.hours ? [a.hours] : []}
                x={box("hours").x}
                y={box("hours").y + box("hours").h * 0.7}
                lineH={fs(0.16)}
                font="var(--f-heading)"
                size={fs(0.15)}
                fill={ink ?? "var(--c-heading)"}
                weight={a.theme.weights.heading}
                /* 0.022677 = 0.006 × 3,7795 (mimar #10 taşıma) — Faz 3 onaylı görünüm */
                letterSpacing={ls(0.022677 * Math.min(a.w_mm, a.h_mm))}
                uppercase
              />
            </Slot>
            <VitroLogo a={a} b={box("logo")} decoupe={decoupe} interact={interact} selectedSlot={selectedSlot} name={client.name} />
          </>
        )}
        {variant === "centre" && (
          <>
            <VitroLogo a={a} b={box("logo")} decoupe={decoupe} interact={interact} selectedSlot={selectedSlot} name={client.name} />
            <Slot id="slogan" {...interact} selected={selectedSlot === "slogan"} detached={a.slogan.detached} box={box("slogan")}>
              <TextLines
                lines={a.slogan.text ? [a.slogan.text] : []}
                x={a.w_mm / 2}
                y={box("slogan").y + box("slogan").h * 0.72}
                lineH={fs(0.1)}
                font={decoupe ? "var(--f-item)" : "var(--f-script)"}
                size={fs(0.09)}
                fill={ink ?? "var(--c-heading)"}
                anchor="middle"
              />
            </Slot>
            <Slot id="phone" {...interact} selected={selectedSlot === "phone"} box={box("phone")}>
              <TextLines
                lines={a.phone ? [a.phone] : []}
                x={a.w_mm / 2}
                y={box("phone").y + box("phone").h * 0.75}
                lineH={fs(0.07)}
                font="var(--f-item)"
                size={fs(0.065)}
                fill={ink ?? "var(--c-item)"}
                weight={a.theme.weights.item}
                anchor="middle"
                /* 0.015118 = 0.004 × 3,7795 (mimar #10); fs() min-8 kıskacı
                   letterSpacing'den kalktı (FAZ4 §2) — küçük belgede aralık daralır */
                letterSpacing={ls(0.015118 * Math.min(a.w_mm, a.h_mm))}
              />
            </Slot>
          </>
        )}
        {variant === "colonne" && (
          <>
            <VitroLogo a={a} b={box("logo")} decoupe={decoupe} interact={interact} selectedSlot={selectedSlot} name={client.name} />
            <g>
              {a.items.map((it, i) => {
                const lb = box("list");
                const rowH = lb.h / 6;
                const y = lb.y + i * rowH;
                return (
                  <g key={i}>
                    <text x={lb.x} y={y + rowH * 0.55} fontSize={fs(0.05)} fill={ink ?? "var(--c-item)"}
                      style={{ fontFamily: "var(--f-item)", fontWeight: a.theme.weights.item }}>
                      {it.name.toLocaleUpperCase("fr-FR")}
                    </text>
                    <text x={lb.x + lb.w} y={y + rowH * 0.55} fontSize={fs(0.05)} textAnchor="end"
                      fill={ink ?? "var(--c-price)"}
                      style={{ fontFamily: "var(--f-item)", fontWeight: a.theme.weights.item }}>
                      {it.price}
                    </text>
                    {!decoupe && (
                      <line x1={lb.x} y1={y + rowH * 0.8} x2={lb.x + lb.w} y2={y + rowH * 0.8}
                        stroke="var(--c-line)" strokeWidth={a.w_mm * 0.001} strokeDasharray="0.1 4" strokeLinecap="round" />
                    )}
                  </g>
                );
              })}
            </g>
            <Slot id="phone" {...interact} selected={selectedSlot === "phone"} box={box("phone")}>
              <TextLines lines={a.phone ? [a.phone] : []} x={a.w_mm / 2}
                y={box("phone").y + box("phone").h * 0.75} lineH={fs(0.055)}
                font="var(--f-item)" size={fs(0.05)} fill={ink ?? "var(--c-heading)"}
                weight={a.theme.weights.item} anchor="middle" />
            </Slot>
          </>
        )}
      </g>
    );

    /* 1:10 kuralı: viewBox GERÇEK mm kalır (vektör), fiziksel boyut ölçeklenir */
    const outW = W / a.scale;
    const outH = H / a.scale;
    const badgeFs = Math.min(W, H) * 0.035;

    return (
      <svg viewBox={`0 0 ${W} ${H}`} width={`${outW}mm`} height={`${outH}mm`}
        xmlns="http://www.w3.org/2000/svg" style={{ ...themeStyle(a.theme), display: "block" }}>
        {/* decoupe önizlemesi: cam hissi için nötr zemin; kesim SVG çıktısında zemin YOK */}
        <rect width={W} height={H} fill={decoupe ? "#DDE3E8" : "var(--c-bg)"} />
        {/* miroir: içerik kökte yatay aynalanır (içten uygulama) */}
        <g transform={a.params.miroir ? `translate(${W}, 0) scale(-1, 1)` : undefined}>{content}</g>
        {mode === "edit" && a.params.miroir && (
          <g transform={`translate(${W - badgeFs * 0.6}, ${badgeFs * 1.6})`}>
            <rect x={-badgeFs * 5.4} y={-badgeFs * 1.1} width={badgeFs * 5.4} height={badgeFs * 1.5} rx={badgeFs * 0.25} fill="#0891B2" />
            <text x={-badgeFs * 2.7} y={0} fontSize={badgeFs * 0.9} textAnchor="middle" fill="#fff" style={{ fontWeight: 700 }}>
              MIROIR
            </text>
          </g>
        )}
        {mode === "print" && a.stamp && (
          <text x={W - badgeFs * 0.5} y={H - badgeFs * 0.5} fontSize={badgeFs} textAnchor="end"
            fill={decoupe ? a.params.cut_color : "var(--c-item)"} opacity={0.9}
            style={{ fontFamily: "var(--f-body)", fontWeight: 600 }}>
            {a.stamp}
          </text>
        )}
        {mode === "edit" && showGuides && B > 0 && <Guides w={a.w_mm} h={a.h_mm} bleed={B} safe={10} />}
      </svg>
    );
  };
}

function VitroLogo({ a, b, decoupe, interact, selectedSlot, name }: {
  a: VitroAnalysis;
  b: { x: number; y: number; w: number; h: number };
  decoupe: boolean;
  interact: { mode: "edit" | "print"; onSlotClick?: (id: string) => void };
  selectedSlot?: string | null;
  name: string;
}): ReactNode {
  const id = decoupe ? "logo_mono" : "logo";
  const url = decoupe ? a.monoUrl : a.logoUrl;
  return (
    <Slot id={id} {...interact} selected={selectedSlot === id} box={b}>
      {url ? (
        <image href={url} x={b.x} y={b.y} width={b.w} height={b.h} preserveAspectRatio="xMidYMid meet" />
      ) : (
        /* logo yoksa işletme adı — decoupe'ta metin zaten serbesttir */
        <text x={b.x + b.w / 2} y={b.y + b.h * 0.62}
          fontSize={Math.min(b.w * 0.16, b.h * 0.5)} textAnchor="middle"
          fill={decoupe ? a.params.cut_color : "var(--c-heading)"}
          style={{ fontFamily: "var(--f-heading)", fontWeight: a.theme.weights.heading, letterSpacing: "0.06em" }}>
          {name.toLocaleUpperCase("fr-FR")}
        </text>
      )}
    </Slot>
  );
}

const entryFor = (variant: VitroVariant, name_tr: string): TemplateEntry => {
  const manifest = makeManifest(variant, name_tr);
  return {
    manifest,
    Component: VitroTemplate(variant),
    pageCount: () => 1,
    pageSizeMM: (_c, doc) => {
      const p = VitroParamsSchema.parse(doc.params);
      const { scale } = scaleRule(p.w_cm * 10, p.h_cm * 10);
      return {
        w_mm: (p.w_cm * 10) / scale,
        h_mm: (p.h_cm * 10) / scale,
        bleed_mm: p.bleed_mm / scale,
      };
    },
  };
};

export const vitroBandeau = entryFor("bandeau", "Vitrophanie — Saat Bandı");
export const vitroCentre = entryFor("centre", "Vitrophanie — Merkez Logo");
export const vitroColonne = entryFor("colonne", "Vitrophanie — Menü Kolonu");
