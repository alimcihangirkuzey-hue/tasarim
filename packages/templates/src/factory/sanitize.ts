/* Şablon fabrikası (a) Yükle & temizle — FAZ4-GOREV §12, mimar kararı #12.
   SAF dize işleme (DOM'suz → Vitest node ortamında koşar):
   script / foreignObject / olay öznitelikleri / harici referanslar ayıklanır;
   viewBox okunur (mm normalize diyaloğu bu değerle oranlanır). */

export interface SanitizeResult {
  svg: string;
  /** ayıklanan tehlikeli/harici parçaların özeti (kullanıcıya gösterilir) */
  removed: string[];
  viewBox: { x: number; y: number; w: number; h: number } | null;
}

export function sanitizeSvg(src: string): SanitizeResult {
  const removed: string[] = [];
  let svg = src;

  /* XML bildirimi/doctype ve yorumlar */
  svg = svg.replace(/<\?xml[\s\S]*?\?>/gi, "").replace(/<!DOCTYPE[\s\S]*?>/gi, "");

  /* script blokları */
  svg = svg.replace(/<script[\s\S]*?<\/script\s*>/gi, () => {
    removed.push("script bloğu");
    return "";
  });
  svg = svg.replace(/<script[^>]*\/>/gi, () => {
    removed.push("script bloğu");
    return "";
  });

  /* foreignObject (HTML gömme) */
  svg = svg.replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, () => {
    removed.push("foreignObject");
    return "";
  });

  /* olay öznitelikleri: onload, onclick, ... */
  svg = svg.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, () => {
    removed.push("olay özniteliği");
    return "";
  });

  /* javascript: URI'ları */
  svg = svg.replace(/(href\s*=\s*)("|')javascript:[^"']*("|')/gi, (_m, p1, q) => {
    removed.push("javascript: URI");
    return `${p1}${q}#${q}`;
  });

  /* harici referanslar: http(s)/file href + xlink:href (data: ve #yerel kalır) */
  svg = svg.replace(
    /\s+(xlink:href|href)\s*=\s*("|')(?:https?:|file:)[^"']*("|')/gi,
    (_m, attr) => {
      removed.push(`harici referans (${attr})`);
      return "";
    }
  );

  /* harici CSS @import */
  svg = svg.replace(/@import\s+url\([^)]*\)\s*;?/gi, () => {
    removed.push("@import");
    return "";
  });

  /* viewBox */
  const vb = /viewBox\s*=\s*["']\s*(-?[\d.]+)[\s,]+(-?[\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/i.exec(svg);
  const viewBox = vb
    ? { x: parseFloat(vb[1]), y: parseFloat(vb[2]), w: parseFloat(vb[3]), h: parseFloat(vb[4]) }
    : null;

  return { svg: svg.trim(), removed, viewBox };
}
