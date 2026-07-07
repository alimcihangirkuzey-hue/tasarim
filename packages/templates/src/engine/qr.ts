/* QR altyapısı — FAZ2-GOREV §5 / CONSTITUTION §10.
   Vektör kalır: modüller tek <path> verisine dönüştürülür (deterministik).
   Kontrast kuralı (M4): koyu modüller --c-text; beyaz kart üzerinde yeterli
   kontrast yoksa SİYAHA düşülür ve editör uyarısı üretilir. */

import QRCode from "qrcode";
import type { BrandKit } from "@tezgah/shared";

export type QrSource = "review" | "tel" | "delivery" | "instagram";

export const QR_SOURCES: QrSource[] = ["review", "tel", "delivery", "instagram"];

/** Kaynak → URL (yoksa null; şablon boş-slot uyarısı üretir) */
export function qrSourceUrl(source: QrSource, brand: BrandKit): string | null {
  const c = brand.contact;
  switch (source) {
    case "tel": {
      const digits = c.phone.replace(/[^\d+]/g, "");
      return digits ? `tel:${digits}` : null;
    }
    case "review":
      return c.google_review_url || null;
    case "delivery":
      return c.delivery[0]?.url || null;
    case "instagram": {
      const h = c.instagram.replace(/^@/, "").trim();
      return h ? `https://instagram.com/${h}` : null;
    }
  }
}

export interface QrRender {
  /** Tüm koyu modüller tek path'te; koordinatlar 0..size_mm uzayında */
  d: string;
  modules: number;
  size_mm: number;
  /** Modül rengi: "var(--c-item)" ya da düşük kontrast fallback'inde "#000000" */
  fill: string;
  /** true → tema metin rengi beyaz kartta yetersizdi, siyaha düşüldü (M4 uyarısı) */
  contrastFallback: boolean;
}

/* WCAG bağıl luminans + kontrast oranı (hex #RRGGBB) */
export function relativeLuminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})/i.exec(hex.trim());
  if (!m) return 0;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const [l1, l2] = [relativeLuminance(hexA), relativeLuminance(hexB)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

const MIN_QR_CONTRAST = 4;

/**
 * URL → QR path (hata düzeltme M). Aynı girdi her zaman aynı çıktıyı verir.
 * textColorHex: temanın --c-text değeri (beyaz kart üstünde denenir).
 */
export function buildQr(url: string, size_mm: number, textColorHex: string): QrRender {
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const cell = size_mm / n;
  let d = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (qr.modules.get(x, y)) {
        const px = (x * cell).toFixed(3);
        const py = (y * cell).toFixed(3);
        const c = cell.toFixed(3);
        d += `M${px} ${py}h${c}v${c}h-${c}z`;
      }
    }
  }
  const ok = contrastRatio(textColorHex, "#ffffff") >= MIN_QR_CONTRAST;
  return {
    d,
    modules: n,
    size_mm,
    fill: ok ? "var(--c-item)" : "#000000",
    contrastFallback: !ok,
  };
}
