/* text→path dönüştürücü — mimar kararı #7: fontkit (woff2 doğrudan).
   Sayfadan çıkarılan metin koşuları (tspan bazında) glif path'lerine çevrilir;
   çıktı SVG'de hiçbir <text> kalmaz (découpe + broderie şartı).
   Koşunun matrisi YEREL matristir (parentCTM⁻¹ × ownCTM): grup, metnin DOM
   konumuna geri konduğu için ata dönüşümleri (miroir kökü, viewBox ölçeği)
   zaten bir kez uygulanır — mutlak CTM gömmek onları ikinci kez uygular ve
   px uzayını mm viewBox'ına taşırdı (kabul koşusunda yakalanan hata). */

import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as fontkitNS from "fontkit";

type FontLike = {
  unitsPerEm: number;
  layout(s: string): {
    glyphs: Array<{ path: { toSVG(): string }; advanceWidth: number }>;
    positions: Array<{ xAdvance: number }>;
  };
};
const fk = fontkitNS as unknown as {
  create?: (b: Buffer) => FontLike;
  default?: { create: (b: Buffer) => FontLike };
};
const createFont = (fk.create ?? fk.default?.create)!;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.resolve(HERE, "..", "..", "..", "packages", "templates", "fonts");

const FONT_TABLE: Array<{ family: string; weight: number; file: string }> = [
  { family: "oswald", weight: 600, file: "oswald-600.woff2" },
  { family: "oswald", weight: 700, file: "oswald-700.woff2" },
  { family: "anton", weight: 400, file: "anton-400.woff2" },
  { family: "archivo black", weight: 400, file: "archivo-black-400.woff2" },
  { family: "inter", weight: 400, file: "inter-400.woff2" },
  { family: "inter", weight: 600, file: "inter-600.woff2" },
  { family: "bitter", weight: 700, file: "bitter-700.woff2" },
  { family: "pacifico", weight: 400, file: "pacifico-400.woff2" },
];

const fontCache = new Map<string, FontLike>();

function pickFont(familyList: string, weight: number): FontLike {
  const fam = familyList.split(",")[0].replace(/["']/g, "").trim().toLowerCase();
  const candidates = FONT_TABLE.filter((f) => f.family === fam);
  const pool = candidates.length > 0 ? candidates : FONT_TABLE.filter((f) => f.family === "inter");
  const best = pool.reduce((a, b) =>
    Math.abs(a.weight - weight) <= Math.abs(b.weight - weight) ? a : b
  );
  const key = best.file;
  if (!fontCache.has(key)) {
    fontCache.set(key, createFont(readFileSync(path.join(FONTS_DIR, key))));
  }
  return fontCache.get(key)!;
}

export interface TextRun {
  id: number;
  text: string;
  x: number;
  y: number;
  size: number; // mm (SVG user unit)
  family: string;
  weight: number;
  anchor: "start" | "middle" | "end";
  fill: string;
  letterSpacing: number; // mm
  /** metnin KENDİ yerel dönüşümü (ata dönüşümleri hariç); çoğunlukla birim matris */
  ctm: [number, number, number, number, number, number];
}

/** Koşuyu path grubuna çevirir (baseline yerel (0,0); transform yerelMatris+translate) */
export function runToPath(run: TextRun): string {
  const font = pickFont(run.family, run.weight);
  const scale = run.size / font.unitsPerEm;
  const layout = font.layout(run.text);

  let penX = 0;
  const parts: string[] = [];
  layout.glyphs.forEach((glyph, i) => {
    const d = glyph.path.toSVG();
    if (d) {
      parts.push(
        `<path d="${d}" transform="translate(${penX.toFixed(3)},0) scale(${scale.toFixed(6)},${(-scale).toFixed(6)})"/>`
      );
    }
    penX += layout.positions[i].xAdvance * scale + run.letterSpacing;
  });
  const totalW = penX - run.letterSpacing;
  const offset = run.anchor === "middle" ? -totalW / 2 : run.anchor === "end" ? -totalW : 0;
  const [a, b, c, d, e, f] = run.ctm;
  return (
    `<g fill="${run.fill}" transform="matrix(${a},${b},${c},${d},${e},${f}) ` +
    `translate(${(run.x + offset).toFixed(3)},${run.y.toFixed(3)})">${parts.join("")}</g>`
  );
}

/** Sayfa içinde çalıştırılacak çıkarım fonksiyonu (string olarak evaluate edilir) */
export const EXTRACT_TEXT_RUNS = `
(() => {
  const svg = document.querySelector(".sheet svg") || document.querySelector("svg");
  if (!svg) return { runs: [], error: "svg yok" };
  const runs = [];
  let id = 0;
  const rgbToHex = (s) => {
    const m = /rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/.exec(s);
    if (!m) return s;
    return "#" + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, "0")).join("");
  };
  for (const t of Array.from(svg.querySelectorAll("text"))) {
    const cs = getComputedStyle(t);
    const size = parseFloat(t.getAttribute("font-size") || "4");
    const anchor = t.getAttribute("text-anchor") || "start";
    const family = cs.fontFamily;
    const weight = parseInt(cs.fontWeight) || 400;
    const fill = rgbToHex(cs.fill);
    /* letter-spacing HESAPLANMIŞ değerden: CSS "mm"/"em" tarayıcıda px'e
       (= SVG kullanıcı birimi) çözülür; ham stil dizesini parse etmek
       3.78× dar aralık üretiyordu (kabul koşusunda yakalandı) */
    const ls = cs.letterSpacing === "normal" ? 0 : parseFloat(cs.letterSpacing) || 0;
    /* YEREL matris: parentCTM⁻¹ × ownCTM — ata dönüşümlerini (miroir, viewBox
       ölçeği) DIŞARIDA bırakır; onlar DOM konumu sayesinde zaten uygulanır */
    const r6 = (n) => Math.round(n * 1e6) / 1e6;
    let ctm = [1, 0, 0, 1, 0, 0];
    const own = t.getCTM();
    const par = t.parentNode && t.parentNode.getCTM ? t.parentNode.getCTM() : null;
    if (own && par) {
      const loc = par.inverse().multiply(own);
      ctm = [r6(loc.a), r6(loc.b), r6(loc.c), r6(loc.d), r6(loc.e), r6(loc.f)];
    }
    const baseX = parseFloat(t.getAttribute("x") || "0");
    const baseY = parseFloat(t.getAttribute("y") || "0");
    const tspans = Array.from(t.querySelectorAll("tspan"));
    const push = (text, x, y) => {
      if (!text) return;
      const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
      el.setAttribute("data-tpid", String(id));
      t.parentNode.insertBefore(el, t);
      runs.push({ id: id++, text, x, y, size, family, weight, anchor, fill, letterSpacing: ls, ctm });
    };
    if (tspans.length === 0) {
      push(t.textContent || "", baseX, baseY);
    } else {
      let y = baseY;
      for (const sp of tspans) {
        const dy = parseFloat(sp.getAttribute("dy") || "0");
        y += dy;
        push(sp.textContent || "", parseFloat(sp.getAttribute("x") || String(baseX)), y);
      }
    }
    t.remove();
  }
  return { runs, outer: svg.outerHTML };
})()
`;

/** Yer tutucuları gerçek path gruplarıyla değiştirir; <text> kalmadığını doğrular */
export function injectPaths(svgOuter: string, runs: TextRun[]): string {
  let out = svgOuter;
  for (const run of runs) {
    const g = runToPath(run);
    const re = new RegExp(`<path data-tpid="${run.id}"\\s*/?>(</path>)?`);
    out = out.replace(re, g);
  }
  if (out.includes("<text")) {
    throw new Error("text->path dönüşümü eksik: çıktıda <text> kaldı");
  }
  return out;
}
