/* Garment (tişört/önlük) — FAZ3-GOREV §6. Her ALAN bağımsız mini tasarım ve
   ayrı "sayfa"dır (pageIndex = alan sırası). Metinler marka kitinden bağlanır
   (M1/M5); koyu kumaşta mono önerisi; broderie + <15 cm → ince-detay uyarısı. */

import type { ReactNode } from "react";
import {
  GARMENT_AREAS,
  GarmentParamsSchema,
  areasForKind,
  type ClientDTO,
  type DocumentState,
  type GarmentAreaId,
  type GarmentParams,
} from "@tezgah/shared";
import { assetById, type BindScope } from "../engine/binding.js";
import { relativeLuminance } from "../engine/qr.js";
import { checkDpi, type LayoutWarning } from "../engine/layout.js";
import { resolveTheme, themeStyle, type Theme } from "../themes.js";
import type { TemplateEntry, TemplateManifest, TemplateProps } from "../types.js";
import { Slot } from "../parts/svg.js";

export type LineSource = "none" | "phone" | "address" | "instagram" | "custom";

export interface GarmentLine {
  source: LineSource;
  text: string; // çözülmüş metin (custom'da override metni)
}

export interface GarmentAreaLayout {
  id: GarmentAreaId;
  w_mm: number;
  h_mm: number;
  label_tr: string;
  logoVariant: "primary" | "mono";
  logoUrl: string | null;
  lines: [GarmentLine, GarmentLine];
  inkColor: string; // kumaşa göre otomatik koyu/açık
}

export interface GarmentAnalysis {
  theme: Theme;
  params: GarmentParams;
  areas: GarmentAreaLayout[];
  warnings: LayoutWarning[];
  fabricHex: string;
  fabricDark: boolean;
}

const FABRIC_HEX: Record<string, string> = {
  white: "#FFFFFF",
  black: "#1A1A1A",
  red: "#C8102E",
  blue: "#1D4ED8",
};

export const manifest: TemplateManifest = {
  id: "garment",
  type: "tekstil",
  profile_version: 1,
  name_tr: "Tişört / Önlük",
  bleed_mm: 0,
  safe_mm: 0,
  formats: { libre: { w_mm: 300, h_mm: 400, label_tr: "Alan bazlı (cm)" } },
  defaultFormat: "libre",
  params: [
    {
      id: "garment_kind",
      type: "choice",
      options: ["tshirt", "apron_bavette", "apron_taille"],
      default: "tshirt",
      label_tr: "Ürün",
    },
    { id: "fabric_color", type: "color", default: "#FFFFFF", label_tr: "Kumaş rengi" },
    {
      id: "technique",
      type: "choice",
      options: ["impression", "broderie"],
      default: "impression",
      label_tr: "Teknik",
    },
  ],
  slots: [
    { id: "logo", kind: "image", bind: "brand.logo_primary" },
    { id: "logo_mono", kind: "image", bind: "brand.logo_mono" },
  ],
  themes: ["or-noir", "aras-orange", "velours-rouge"],
};

function fabricToHex(v: string): string {
  return FABRIC_HEX[v] ?? (v.startsWith("#") ? v : "#FFFFFF");
}

function lineFor(
  doc: DocumentState,
  client: ClientDTO,
  areaId: string,
  n: 1 | 2
): GarmentLine {
  const ov = doc.overrides[`area:${areaId}:line${n}`]?.value as
    | { source?: LineSource; text?: string }
    | undefined;
  const source: LineSource = ov?.source ?? (n === 1 ? "phone" : "none");
  const c = client.brandkit.contact;
  const text =
    source === "custom"
      ? ov?.text ?? ""
      : source === "phone"
        ? c.phone
        : source === "address"
          ? c.address
          : source === "instagram"
            ? c.instagram
            : "";
  return { source, text };
}

export function analyzeGarment(client: ClientDTO, doc: DocumentState): GarmentAnalysis {
  const theme = resolveTheme(doc.theme_id, client.brandkit);
  const params = GarmentParamsSchema.parse(doc.params);
  const warnings: LayoutWarning[] = [];
  const scope: BindScope = { brand: client.brandkit, catalog: client.catalog };
  void scope;

  const fabricHex = fabricToHex(params.fabric_color);
  const fabricDark = relativeLuminance(fabricHex) < 0.5;
  const ink = fabricDark ? "#FFFFFF" : "#1A1A1A";

  /* FAZ4 §3 (mimar #8 devamı): her broderie belgesinde bir kez silik bilgi notu;
     <15 cm alan uyarısı (fine-detail) aşağıda aynen durur */
  if (params.technique === "broderie") {
    warnings.push({ type: "broderie-info" });
  }

  /* kind'e uymayan alanlar elenir; boşsa kind'in ilk alanı */
  const valid = areasForKind(params.garment_kind);
  let areaIds = params.areas.filter((a) => valid.includes(a));
  if (areaIds.length === 0) areaIds = [valid[0]];

  const primary = assetById(client, client.brandkit.logo_primary);
  const mono = assetById(client, client.brandkit.logo_mono);

  const areas: GarmentAreaLayout[] = areaIds.map((id) => {
    const preset = GARMENT_AREAS[id];
    const ov = doc.overrides[`area:${id}:logo`]?.value;
    const wanted: "primary" | "mono" =
      ov === "mono" || ov === "primary" ? ov : fabricDark && mono ? "mono" : "primary";
    const asset = wanted === "mono" ? mono : primary;
    const w_mm = preset.w_cm * 10;
    const h_mm = preset.h_cm * 10;

    if (asset) {
      const dpi = checkDpi(asset.width_px, asset.height_px, w_mm * 0.8, h_mm * 0.5, {
        yellow: 300,
        red: 300,
      });
      if (params.technique === "impression" && dpi.effectiveDpi < 300) {
        warnings.push({
          type: "low-dpi",
          slotId: `area:${id}:logo`,
          effectiveDpi: dpi.effectiveDpi,
          level: "red",
        });
      }
    } else {
      warnings.push({ type: "empty-required", slotId: wanted === "mono" ? "logo_mono" : "logo" });
    }

    /* Koyu kumaş + renkli logo → mono öner (§6) */
    if (fabricDark && wanted === "primary") {
      warnings.push({ type: "mono-suggest", slotId: `area:${id}:logo` });
    }
    /* Broderie ince-detay: uzun kenar < 15 cm (§6) */
    if (params.technique === "broderie" && Math.max(preset.w_cm, preset.h_cm) < 15) {
      warnings.push({ type: "fine-detail", areaId: id });
    }

    return {
      id,
      w_mm,
      h_mm,
      label_tr: preset.label_tr,
      logoVariant: wanted,
      logoUrl: asset?.urls.master ?? null,
      lines: [lineFor(doc, client, id, 1), lineFor(doc, client, id, 2)],
      inkColor: ink,
    };
  });

  return { theme, params, areas, warnings, fabricHex, fabricDark };
}

function GarmentTemplate(props: TemplateProps): ReactNode {
  const { client, doc, mode, pageIndex = 0, selectedSlot, onSlotClick } = props;
  const a = analyzeGarment(client, doc);
  const area = a.areas[Math.min(pageIndex, a.areas.length - 1)];
  const W = area.w_mm;
  const H = area.h_mm;
  const interact = { mode, onSlotClick } as const;
  const lineFs = Math.min(W, H) * 0.07;
  const linesShown = area.lines.filter((l) => l.text);
  const logoH = H * (linesShown.length > 0 ? 0.52 : 0.68);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={`${W}mm`} height={`${H}mm`}
      xmlns="http://www.w3.org/2000/svg" style={{ ...themeStyle(a.theme), display: "block" }}>
      {/* edit: kumaş önizlemesi + dikiş çerçevesi; print: ŞEFFAF (alfa PNG) */}
      {mode === "edit" && (
        <>
          <rect width={W} height={H} fill={a.fabricHex} />
          <rect x={1} y={1} width={W - 2} height={H - 2} rx={3} fill="none"
            stroke={area.inkColor} strokeOpacity={0.35} strokeWidth={0.6} strokeDasharray="3 2" />
          <text x={3} y={H - 3} fontSize={Math.min(W, H) * 0.045} fill={area.inkColor} opacity={0.55}
            style={{ fontFamily: "var(--f-body)" }}>
            {area.label_tr} · {area.w_mm / 10}×{area.h_mm / 10} cm
          </text>
        </>
      )}

      <Slot id={`area:${area.id}:logo`} {...interact}
        selected={selectedSlot === `area:${area.id}:logo`}
        box={{ x: W * 0.08, y: H * 0.06, w: W * 0.84, h: logoH }}>
        {area.logoUrl ? (
          <image href={area.logoUrl} x={W * 0.08} y={H * 0.06} width={W * 0.84} height={logoH}
            preserveAspectRatio="xMidYMid meet" />
        ) : (
          <text x={W / 2} y={H * 0.06 + logoH * 0.6} fontSize={Math.min(W * 0.14, logoH * 0.4)}
            textAnchor="middle" fill={area.inkColor}
            style={{ fontFamily: "var(--f-heading)", fontWeight: a.theme.weights.heading, letterSpacing: "0.05em" }}>
            {client.name.toLocaleUpperCase("fr-FR")}
          </text>
        )}
      </Slot>

      {linesShown.map((l, i) => (
        <Slot key={i} id={`area:${area.id}:line${i + 1}`} {...interact}
          selected={selectedSlot === `area:${area.id}:line${i + 1}`}
          box={{ x: W * 0.06, y: H * (0.66 + i * 0.14), w: W * 0.88, h: H * 0.12 }}>
          <text x={W / 2} y={H * (0.74 + i * 0.14)} fontSize={lineFs} textAnchor="middle"
            fill={area.inkColor}
            style={{ fontFamily: "var(--f-item)", fontWeight: a.theme.weights.item, letterSpacing: "0.03em" }}>
            {l.text}
          </text>
        </Slot>
      ))}
    </svg>
  );
}

export const garment: TemplateEntry = {
  manifest,
  Component: GarmentTemplate,
  transparentBg: true,
  pageCount: (client, doc) => analyzeGarment(client, doc).areas.length,
  pageSizeMM: (client, doc) => {
    const a = analyzeGarment(client, doc).areas[0];
    return { w_mm: a.w_mm, h_mm: a.h_mm, bleed_mm: 0 };
  },
  pageSizeMMAt: (client, doc, i) => {
    const areas = analyzeGarment(client, doc).areas;
    const a = areas[Math.min(i, areas.length - 1)];
    return { w_mm: a.w_mm, h_mm: a.h_mm, bleed_mm: 0 };
  },
};
