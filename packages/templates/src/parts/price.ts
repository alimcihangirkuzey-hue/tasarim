/* Fiyat bloğu üretimi — varyant etiketleri serbesttir, özel durum yok (FAZ1-GOREV §2.4) */

import { formatPrice, type Currency, type PriceVariant } from "@tezgah/shared";
import { estimateWidth } from "../engine/layout.js";

export interface PriceLine {
  /** "seul 7,50 €" gibi tek parça; tek varyantta yalnız fiyat */
  text: string;
}

/**
 * Varyantları satır(lar)a döker: tek varyant → sade fiyat; çok varyant →
 * "etiket fiyat · etiket fiyat" tek satır; sığmazsa varyant başına satır (alt alta).
 */
export function priceLines(
  prices: PriceVariant[],
  currency: Currency,
  opts: { font_mm: number; ratio: number; maxWidth_mm: number }
): PriceLine[] {
  if (prices.length === 0) return [];
  if (prices.length === 1) return [{ text: formatPrice(prices[0].value, currency) }];

  const parts = prices.map((p) => `${p.label} ${formatPrice(p.value, currency)}`);
  const inline = parts.join(" · ");
  if (estimateWidth(inline, opts.font_mm, opts.ratio) <= opts.maxWidth_mm) {
    return [{ text: inline }];
  }
  return parts.map((text) => ({ text }));
}

/** Liste şablonu "columns" düzeni: kategori içindeki ilk ürünün etiketleri kolon başlığı olur */
export function columnLabels(items: Array<{ prices: PriceVariant[] }>): string[] {
  const first = items.find((i) => i.prices.length > 0);
  return first ? first.prices.map((p) => p.label) : [];
}

/** Kategoride etiket seti karışık mı? (editör uyarısı — FAZ1-GOREV §5) */
export function hasMixedVariants(items: Array<{ prices: PriceVariant[] }>): boolean {
  const labels = columnLabels(items);
  const key = labels.join("|");
  return items.some(
    (i) => i.prices.length > 0 && i.prices.map((p) => p.label).join("|") !== key
  );
}
