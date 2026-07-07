/* Homografi — FAZ3-GOREV §3.1 (mimar kararı #5).
   Kaynak dikdörtgen (0,0)-(w,h) → hedef quad [TL, TR, BR, BL] için
   8 bilinmeyenli projektif dönüşüm; çıktı CSS matrix3d (column-major 16).
   Saf fonksiyon: DOM yok; canlı önizleme ve Puppeteer JPG aynı matrisi kullanır. */

import type { Quad } from "./schemas.js";

export interface Homography {
  /** column-major 16 eleman (CSS matrix3d sırası) */
  matrix3d: number[];
  /** `matrix3d(...)` CSS değeri (transform-origin: 0 0 ile kullanılır) */
  css: string;
}

function cross(ox: number, oy: number, ax: number, ay: number, bx: number, by: number): number {
  return (ax - ox) * (by - oy) - (ay - oy) * (bx - ox);
}

/** Quad doğrulaması: dejenere (sıfır alan) ya da kendini kesen (papyon) → hata */
export function validateQuad(quad: Quad): void {
  if (quad.length !== 4) throw new Error("Geçersiz quad: 4 köşe gerekli");
  const [p0, p1, p2, p3] = quad;
  const signs = [
    cross(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y),
    cross(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y),
    cross(p2.x, p2.y, p3.x, p3.y, p0.x, p0.y),
    cross(p3.x, p3.y, p0.x, p0.y, p1.x, p1.y),
  ];
  if (signs.some((s) => s === 0)) {
    throw new Error("Geçersiz quad: dejenere (köşeler aynı doğrultuda)");
  }
  const pos = signs.filter((s) => s > 0).length;
  if (pos !== 0 && pos !== 4) {
    throw new Error("Geçersiz quad: kendini kesiyor (köşe sırası TL-TR-BR-BL olmalı)");
  }
}

/**
 * (0,0)-(srcW,srcH) dikdörtgenini quad'a taşıyan matrix3d.
 * Köşe sırası SABİT: sol-üst, sağ-üst, sağ-alt, sol-alt (FAZ3-GOREV §3.2).
 */
export function quadTransform(srcW: number, srcH: number, quad: Quad): Homography {
  if (srcW <= 0 || srcH <= 0) throw new Error("Geçersiz kaynak boyutu");
  validateQuad(quad);
  const [tl, tr, br, bl] = quad;

  /* birim kare → quad kapalı çözüm (Heckbert): köşeler u,v ∈ {0,1} */
  const x0 = tl.x, y0 = tl.y;
  const x1 = tr.x, y1 = tr.y;
  const x2 = br.x, y2 = br.y;
  const x3 = bl.x, y3 = bl.y;

  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;

  let a: number, b: number, d: number, e: number, g: number, h: number;
  const c = x0;
  const f = y0;

  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) {
    /* affine (paralel kenarlar) */
    a = x1 - x0;
    b = x3 - x0;
    d = y1 - y0;
    e = y3 - y0;
    g = 0;
    h = 0;
  } else {
    const den = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(den) < 1e-9) throw new Error("Geçersiz quad: çözüm yok (dejenere)");
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
    a = x1 - x0 + g * x1;
    b = x3 - x0 + h * x3;
    d = y1 - y0 + g * y1;
    e = y3 - y0 + h * y3;
  }

  /* kaynak (0..srcW, 0..srcH) → birim kare ölçeklemesi matrise gömülür */
  const m: number[] = [
    a / srcW, d / srcW, 0, g / srcW,
    b / srcH, e / srcH, 0, h / srcH,
    0, 0, 1, 0,
    c, f, 0, 1,
  ];
  return { matrix3d: m, css: `matrix3d(${m.map((v) => +v.toFixed(8)).join(",")})` };
}

/** Test/doğrulama yardımcısı: matrisi (x,y) noktasına uygular (perspektif bölmeli) */
export function mapPoint(m: number[], x: number, y: number): { x: number; y: number } {
  const X = m[0] * x + m[4] * y + m[12];
  const Y = m[1] * x + m[5] * y + m[13];
  const W = m[3] * x + m[7] * y + m[15];
  return { x: X / W, y: Y / W };
}
