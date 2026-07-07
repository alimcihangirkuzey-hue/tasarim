/* carte-fidelite analiz — damga grid'i deterministik: 2 satır × (N/2) sütun */

import type { ClientDTO, DocumentState } from "@tezgah/shared";
import { assetById, resolveSlotValue, type BindScope } from "../engine/binding.js";
import { estimateWidth, solveFontScale, type LayoutWarning } from "../engine/layout.js";
import { paramValue } from "../engine/params.js";
import { resolveTheme, type Theme } from "../themes.js";
import { manifest } from "./manifest.js";

export const CARD_W = 85;
export const CARD_H = 54;
const M = 6;

export interface Stamp {
  n: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FideliteAnalysis {
  theme: Theme;
  scope: BindScope;
  warnings: LayoutWarning[];
  pages: 2;
  stampCount: number;
  stamps: Stamp[];
  title: { text: string; detached: boolean };
  subtitle: { text: string; detached: boolean };
  reward: { text: string; detached: boolean };
  rewardFont: number;
  services: { text: string; detached: boolean };
  logoUrl: string | null;
  phone: string;
  address: string;
  hours: string;
}

export function analyzeFidelite(client: ClientDTO, doc: DocumentState): FideliteAnalysis {
  const scope: BindScope = { brand: client.brandkit, catalog: client.catalog };
  const theme = resolveTheme(doc.theme_id, client.brandkit);
  const warnings: LayoutWarning[] = [];

  const slotDef = (id: string) => manifest.slots.find((s) => s.id === id)!;
  const text = (id: string) => {
    const { value, detached } = resolveSlotValue(slotDef(id), doc.overrides, scope);
    return { text: typeof value === "string" ? value : "", detached };
  };

  const logoAsset = assetById(client, resolveSlotValue(slotDef("logo"), doc.overrides, scope).value);
  if (!logoAsset) warnings.push({ type: "empty-required", slotId: "logo" });

  const stampCount = Number(paramValue(manifest, doc, "stampCount"));
  const cols = stampCount / 2;
  const gap = 2;
  const areaW = CARD_W - 2 * M;
  const boxW = (areaW - (cols - 1) * gap) / cols;
  const boxH = 8.6;
  const top = 19.5;
  const stamps: Stamp[] = Array.from({ length: stampCount }, (_, i) => ({
    n: i + 1,
    x: M + (i % cols) * (boxW + gap),
    y: top + Math.floor(i / cols) * (boxH + gap),
    w: boxW,
    h: boxH,
  }));

  /* Ödül bandı metni banda sığana kadar küçülür (geniş script fontlarda taşma QA bulgusu) */
  const reward = text("reward");
  const rewardFit = solveFontScale({
    min: 2.6,
    max: 4.2,
    fits: (f) => estimateWidth(reward.text, f, theme.ratios.heading) <= CARD_W - 10,
  });

  return {
    theme,
    scope,
    warnings,
    pages: 2,
    stampCount,
    stamps,
    title: text("title"),
    subtitle: text("subtitle"),
    reward,
    rewardFont: rewardFit.font_mm,
    services: text("services"),
    logoUrl: logoAsset?.urls.master ?? null,
    phone: text("phone").text,
    address: text("address").text,
    hours: text("hours").text,
  };
}
