/* Fabrika SVG içe alma analizi — FAZ6-GOREV §3, mimar kararı #19.
   SAF dize işleme (DOM'suz → Vitest node ortamında koşar), sanitize.ts ile aynı desen.
   Amaç: içe alma önizlemesine tek kaynaktan besleme (ölçü, canlı/outline metin,
   fontlar, raster gömülü/eksik, boyut sınırı). Karar vermez; olguları raporlar.

   #19(a) ölçü politikası: YALNIZ fiziksel birim (mm/cm/in/pt) güvenle mm'ye çevrilir;
   px/%/birimsiz baskıda ölçü olarak GÜVENİLMEZ (px ekran birimi; InDesign px≈pt mi
   96dpi mi belirsiz) → null döner, çağıran kullanıcıya sorar (türet-önce-sor). */

export const MAX_SVG_BYTES = 25 * 1024 * 1024; // #19(d)

export interface ImportAnalysis {
  /** #19(a): fiziksel birimden türetilen gerçek ölçü; null → kullanıcıya sorulur */
  sizeMm: { w: number; h: number } | null;
  viewBox: { x: number; y: number; w: number; h: number } | null;
  /** #19(b): canlı <text> sayısı (slot bağlanabilir) */
  liveTextCount: number;
  /** #19(b): <path> sayısı — çok path + sıfır canlı metin ⇒ metin muhtemelen eğriye çevrilmiş (outline) */
  pathCount: number;
  /** metin eğriye mi çevrilmiş: hiç canlı metin yok ama path var */
  looksOutlined: boolean;
  /** #19(c): canlı metinde/CSS'te geçen font aileleri (yığının ilk adı, tekilleştirilmiş) */
  fonts: string[];
  /** #19(d): gömülü (data:) raster sayısı — render'a girer */
  embeddedRasterCount: number;
  /** #19(d): harici (http/file) raster referansları — render'a GİRMEZ, eksik varlık */
  externalRasters: string[];
  bytes: number;
  tooBig: boolean;
}

const UNIT_TO_MM: Record<string, number> = {
  mm: 1,
  cm: 10,
  in: 25.4,
  pt: 25.4 / 72, // 1pt = 1/72 in
};

/** Kök <svg> width/height fiziksel birimden mm; türetilemezse null (#19a) */
export function deriveSizeMm(svg: string): { w: number; h: number } | null {
  const open = /<svg\b[^>]*>/i.exec(svg);
  if (!open) return null;
  const tag = open[0];
  const dim = (attr: string): number | null => {
    const m = new RegExp(`\\b${attr}\\s*=\\s*["']\\s*([\\d.]+)\\s*(mm|cm|in|pt|px|%)?\\s*["']`, "i").exec(tag);
    if (!m) return null;
    const val = parseFloat(m[1]);
    const unit = (m[2] || "").toLowerCase();
    if (!Number.isFinite(val) || val <= 0) return null;
    // px/%/birimsiz → güvenilmez (baskı ölçüsü değil)
    return unit in UNIT_TO_MM ? val * UNIT_TO_MM[unit] : null;
  };
  const w = dim("width");
  const h = dim("height");
  if (w == null || h == null) return null;
  return { w: Math.round(w * 100) / 100, h: Math.round(h * 100) / 100 };
}

function parseViewBox(svg: string): ImportAnalysis["viewBox"] {
  const vb = /viewBox\s*=\s*["']\s*(-?[\d.]+)[\s,]+(-?[\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/i.exec(svg);
  return vb ? { x: parseFloat(vb[1]), y: parseFloat(vb[2]), w: parseFloat(vb[3]), h: parseFloat(vb[4]) } : null;
}

/** font-family bildirimlerinden (attr + CSS) ilk aile adlarını tekilleştir */
function extractFonts(svg: string): string[] {
  const out = new Set<string>();
  const re = /font-family\s*[:=]\s*("([^"]*)"|'([^']*)'|([^;"'>}]+))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg))) {
    const raw = (m[2] ?? m[3] ?? m[4] ?? "").trim();
    if (!raw) continue;
    // yığının ilk ailesi
    const first = raw.split(",")[0].trim().replace(/^["']|["']$/g, "").trim();
    // jenerik anahtar kelimeleri atla
    if (first && !/^(sans-serif|serif|monospace|cursive|fantasy|system-ui|inherit|initial)$/i.test(first)) {
      out.add(first);
    }
  }
  return [...out];
}

/** <image>/<use> href'lerini gömülü (data:) ↔ harici (http/file) ayır */
function classifyRasters(svg: string): { embedded: number; external: string[] } {
  let embedded = 0;
  const external: string[] = [];
  const re = /\b(?:xlink:href|href)\s*=\s*("([^"]*)"|'([^']*)')/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg))) {
    const href = (m[2] ?? m[3] ?? "").trim();
    if (!href || href.startsWith("#")) continue; // yerel referans (clip/mask/gradient) sayılmaz
    if (/^data:/i.test(href)) embedded++;
    else if (/^(https?:|file:)/i.test(href)) external.push(href);
    // göreli yollar da harici sayılır (paketlenmemiş varlık → render'a girmez)
    else external.push(href);
  }
  return { embedded, external };
}

export function analyzeSvg(svg: string): ImportAnalysis {
  const bytes = new TextEncoder().encode(svg).length;
  const liveTextCount = (svg.match(/<text\b/gi) || []).length;
  const pathCount = (svg.match(/<path\b/gi) || []).length;
  const rasters = classifyRasters(svg);
  return {
    sizeMm: deriveSizeMm(svg),
    viewBox: parseViewBox(svg),
    liveTextCount,
    pathCount,
    looksOutlined: liveTextCount === 0 && pathCount > 0,
    fonts: extractFonts(svg),
    embeddedRasterCount: rasters.embedded,
    externalRasters: rasters.external,
    bytes,
    tooBig: bytes > MAX_SVG_BYTES,
  };
}
