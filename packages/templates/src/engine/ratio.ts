/* Oransal (0-1) layout + büyük format ölçek kuralı — FAZ3-GOREV §4 */

export interface RelBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 0-1 oransal kutu → mm (sayfa net ölçüsünde) */
export function relToMM(
  box: RelBox,
  pageW_mm: number,
  pageH_mm: number
): { x: number; y: number; w: number; h: number } {
  return {
    x: box.x * pageW_mm,
    y: box.y * pageH_mm,
    w: box.w * pageW_mm,
    h: box.h * pageH_mm,
  };
}

/**
 * Uzun kenar > 5000 mm ise çıktı 1:10 ölçeklenir ve "ÉCHELLE 1:10" damgalanır
 * (FAZ3-GOREV §4 export kuralı). PDF sayfa ölçüsü = gerçek / scale.
 */
export function scaleRule(w_mm: number, h_mm: number): { scale: 1 | 10; stamp: string | null } {
  if (Math.max(w_mm, h_mm) > 5000) return { scale: 10, stamp: "ÉCHELLE 1:10" };
  return { scale: 1, stamp: null };
}
