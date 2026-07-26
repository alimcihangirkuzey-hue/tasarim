/* designSeed@grid GÖRSEL GT galerisi (Canonical 4.4; journal 2026-07-26-designseed-grid).
   Çalıştırma (repo kökünden — JSX automatic runtime için tsconfig ŞART):
     npx tsx --tsconfig packages/templates/tsconfig.json docs/gt-designseed-grid/uret-galeri.mts */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BrandKitSchema,
  CatalogSchema,
  DocumentStateSchema,
  type ClientDTO,
  type DocumentState,
} from "@tezgah/shared";
import { TEMPLATES, analyzeGrid, type GridFrame } from "@tezgah/templates";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const CIKTI = path.join(HERE, "cikti");

const ADLAR = ["Kebab", "Pizza Margherita", "Tacos XL", "Burger Maison", "Salade César", "Pide Fromage", "Lahmacun", "Soupe du Jour", "Baklava", "Dürüm Poulet", "Menu Enfant", "Assiette Mixte"];

function musteri(): ClientDTO {
  return {
    id: "cli_dsg",
    name: "Chez Demo",
    slug: "chez-demo",
    notes: "",
    currency: "EUR",
    menu_language: "fr",
    brandkit: BrandKitSchema.parse({ slogan_fr: "Le goût authentique" }),
    catalog: CatalogSchema.parse({
      categories: [{
        id: "c1", name_fr: "Spécialités", order: 1,
        items: ADLAR.map((ad, i) => ({
          id: `i${i}`, name_fr: ad, order: i,
          desc_fr: i % 3 === 0 ? "tomate · mozzarella · basilic" : undefined,
          prices: [{ label: "seul", value: 7.5 + (i % 6) }],
        })),
      }],
    }),
    assets: [],
    created_at: "t",
    updated_at: "t",
  } as ClientDTO;
}

const doc = (params: Record<string, unknown> = {}, theme_id?: string): DocumentState =>
  DocumentStateSchema.parse({ template_id: "menu-grid-cells", params: { cols: 3, ...params }, theme_id });

function svgOf(d: DocumentState, c: ClientDTO): string {
  return renderToStaticMarkup(
    React.createElement(TEMPLATES["menu-grid-cells"].Component, { client: c, doc: d, mode: "print", pageIndex: 0 })
  );
}

/* Varyant temsilcileri — deterministik ilk-görülen taraması */
const c = musteri();
const temsilci = new Map<string, { seed: number; frame: GridFrame }>();
for (let s = 1; s <= 200 && temsilci.size < 5; s++) {
  const frame = analyzeGrid(c, doc({ designSeed: s })).frame;
  const anahtar = JSON.stringify(frame);
  if (!temsilci.has(anahtar)) temsilci.set(anahtar, { seed: s, frame });
}
if (temsilci.size < 5) throw new Error(`5 varyantın yalnız ${temsilci.size} tanesi 1..200 aralığında görüldü`);

const frameEtiket = (f: GridFrame): string =>
  `hücre rx ${f.cellRx} · çizgi ${f.cellDash === null ? "düz" : `kesikli ${f.cellDash}`}`;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface Kart { baslik: string; alt: string; svg: string; }

const varyantKartlari: Kart[] = [
  {
    baslik: "TABAN (seed 0) — bugünkü üretim birebir",
    alt: frameEtiket(analyzeGrid(c, doc({})).frame),
    svg: svgOf(doc({}), c),
  },
  ...[...temsilci.values()].map(({ seed, frame }) => ({
    baslik: `seed ${seed}`,
    alt: frameEtiket(frame),
    svg: svgOf(doc({ designSeed: seed }), c),
  })),
];

const temaSeed = [...temsilci.values()].find((t) => t.frame.cellDash === null)?.seed ?? 1;
const temaKartlari: Kart[] = ["or-noir", "aras-orange", "velours-rouge"].map((tema) => ({
  baslik: `seed ${temaSeed} · tema ${tema}`,
  alt: "çerçeve dili temadan bağımsız — üçünde de aynı frame",
  svg: svgOf(doc({ designSeed: temaSeed }, tema), c),
}));

function fontCss(): string {
  const fontsDir = path.join(ROOT, "packages/templates/fonts");
  const css = readFileSync(path.join(fontsDir, "fonts.css"), "utf8");
  return css.replace(/url\("\.\/([^"]+)"\)/g, (_m, dosya: string) => {
    const b64 = readFileSync(path.join(fontsDir, dosya)).toString("base64");
    return `url("data:font/woff2;base64,${b64}")`;
  });
}

const kartHtml = (kartlar: Kart[]): string =>
  kartlar
    .map(
      (k) => `<figure class="kart">
  <div class="cerceve">${k.svg}</div>
  <figcaption><strong>${esc(k.baslik)}</strong><br>${esc(k.alt)}</figcaption>
</figure>`
    )
    .join("\n");

const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>designSeed@grid — hücre çerçeve varyantları (görsel GT)</title>
<style>
${fontCss()}
body { font-family: system-ui, sans-serif; margin: 16px; background: #f4f2ee; color: #1d1b1a; }
h1 { font-size: 18px; } h2 { margin-top: 32px; border-bottom: 2px solid #ccc; padding-bottom: 4px; font-size: 16px; }
.izgara { display: flex; flex-wrap: wrap; gap: 16px; }
.kart { margin: 0; width: min(340px, 100%); }
.cerceve { background: #fff; box-shadow: 0 1px 6px rgba(0,0,0,.25); }
.cerceve svg { width: 100%; height: auto; display: block; }
figcaption { font-size: 12px; margin-top: 6px; line-height: 1.5; }
.protokol { background: #fff; border-left: 4px solid #E3A93F; padding: 12px 16px; max-width: 900px; font-size: 14px; }
</style></head><body>
<h1>designSeed@grid — hücre çerçeve varyantları (Canonical 4.4)</h1>
<div class="protokol">
<p><strong>Yargı kalemleri (insan):</strong> hücre çerçeve dili sayfa genelinde TUTARLI mı? ·
beş varyantın her biri baskı kalitesinde mi? · taban (seed 0) gözle de bozulmamış mı?</p>
<p><strong>Makinece zaten doğrulananlar</strong> (testli): taban birebir · tohum YALNIZ
çerçeveyi değiştirir (kapasite/sayfalama/uyarılar derin-eşit, multipage dahil) · kapalı
5'li küme · determinizm · tuzlar aileleri ayrıştırır (flyer'la bağımsız karar).</p>
<p><strong>Karar:</strong> "grid varyantları uygun" (ya da rapor protokolünce "devam et")
insan kapısını imzalar; bulgu varsa kalem kalem yazın.</p>
</div>
<h2>Beş varyant + taban (tema: or-noir, 3 kolon)</h2>
<div class="izgara">${kartHtml(varyantKartlari)}</div>
<h2>Tek tohum × üç tema — çerçeve temadan bağımsız</h2>
<div class="izgara">${kartHtml(temaKartlari)}</div>
</body></html>`;

mkdirSync(CIKTI, { recursive: true });
writeFileSync(path.join(CIKTI, "galeri.html"), html, "utf8");
const kb = Math.round(Buffer.byteLength(html) / 1024);
console.log(`galeri üretildi: docs/gt-designseed-grid/cikti/galeri.html (${kb} KB, ${varyantKartlari.length}+${temaKartlari.length} kart)`);
console.log("temsilciler:", [...temsilci.values()].map((t) => `seed ${t.seed} → ${frameEtiket(t.frame)}`).join(" | "));