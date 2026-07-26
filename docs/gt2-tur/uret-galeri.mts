/* GT-2 GÖRSEL TUR GALERİSİ ÜRETİCİSİ (Canonical 10.3)
   ============================================================================
   Koşum (repo kökünden):
     npx tsx --tsconfig packages/templates/tsconfig.json docs/gt2-tur/uret-galeri.mts
   (--tsconfig ZORUNLU: şablon .tsx'leri otomatik JSX runtime'la derlenmeli —
    bayraksız tsx klasik runtime'a düşer ve "React is not defined" patlar; ölçüldü.)
   Çıktı: docs/gt2-tur/cikti/galeri.html  (gitignore'lu — türetilmiş artefakt)

   GERÇEK şablon bileşenleri react-dom/server ile print modunda çizilir —
   editör/PDF'in kullandığı bileşenin AYNISI (M3 tek render kaynağı). Yoğunluk
   katalogları DETERMİNİSTİKTİR (Math.random yok): aynı betik aynı galeriyi
   üretir, tur tekrarlanabilir. Gerçek OFL woff2 fontları base64 gömülür ki
   metin genişlikleri layout matematiğinin (estimateWidth) varsaydığıyla aynı
   ailelerle görünsün — fallback font, reflow yargısını yalancı kılardı.

   Bu betik paket src'lerinin DIŞINDA yaşar: workspace tsc/eslint kapsamına
   girmez; react-dom yalnız bu betiğin bağımlılığıdır (hoisted kökten çözülür),
   templates paketine sokulmaz. */

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
import {
  TEMPLATES,
  analyzeGrid,
  analyzeList,
  analyzeTrifold,
  analyzeFlyer,
} from "@tezgah/templates";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const CIKTI = path.join(HERE, "cikti");

/* ── Deterministik yoğunluk katalogları ─────────────────────────────────── */

const ADLAR = [
  "Kebab", "Pizza Margherita", "Assiette Mixte Spéciale du Chef", "Tacos XL",
  "Burger Maison", "Dürüm Poulet Mariné aux Herbes", "Salade César", "Pide Fromage",
  "Lahmacun", "Menu Enfant avec Boisson et Dessert", "Soupe du Jour", "Baklava Pistache",
];
const ACIKLAMALAR = [
  "tomate · mozzarella · basilic",
  "salade · tomates · oignons · sauce au choix accompagnée de frites maison",
  "",
  "viande grillée · légumes de saison",
];

function katalog(n: number): ClientDTO {
  /* Kategori dağılımı: her 8 üründe bir kategori (GT-2 'kategori başına ürün'
     girdi değişkenini de gezdirir); ad/açıklama/fiyat çeşitliliği indeks bazlı */
  const katSayisi = Math.max(1, Math.ceil(n / 8));
  let kalan = n;
  const categories = Array.from({ length: katSayisi }, (_, c) => {
    const buKat = Math.min(8, kalan);
    kalan -= buKat;
    return {
      id: `c${c}`,
      name_fr: `Catégorie ${c + 1}`,
      note_fr: c % 3 === 1 ? "Servi avec accompagnement au choix" : undefined,
      order: c,
      items: Array.from({ length: buKat }, (_, i) => {
        const g = c * 8 + i;
        return {
          id: `c${c}i${i}`,
          name_fr: `${ADLAR[g % ADLAR.length]} ${g + 1}`,
          desc_fr: ACIKLAMALAR[g % ACIKLAMALAR.length] || undefined,
          prices:
            g % 5 === 0
              ? [
                  { label: "petite", value: 8 + (g % 7) },
                  { label: "grande", value: 12 + (g % 7) },
                ]
              : [{ label: "seul", value: 7.5 + (g % 9) }],
          tags: g % 11 === 0 ? ["populaire"] : [],
          order: i,
        };
      }),
    };
  });
  return {
    id: "cli_gt2",
    name: "GT-2 Tur",
    slug: "gt2-tur",
    notes: "",
    currency: "EUR",
    menu_language: "fr",
    brandkit: BrandKitSchema.parse({ slogan_fr: "Le goût authentique" }),
    catalog: CatalogSchema.parse({ categories }),
    assets: [],
    created_at: "t",
    updated_at: "t",
  } as ClientDTO;
}

/* ── Render yardımcıları ────────────────────────────────────────────────── */

const doc = (template_id: string, params: Record<string, unknown> = {}): DocumentState =>
  DocumentStateSchema.parse({ template_id, params });

function svgOf(templateId: string, d: DocumentState, c: ClientDTO, pageIndex = 0): string {
  const entry = TEMPLATES[templateId];
  return renderToStaticMarkup(
    React.createElement(entry.Component, { client: c, doc: d, mode: "print", pageIndex })
  );
}

interface Kart {
  baslik: string;
  olcum: string;
  uyarilar: string[];
  svg: string;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

/* ── Bölüm üreticileri ──────────────────────────────────────────────────── */

function listeKartlari(n: number, c: ClientDTO): Kart[] {
  const kartlar: Kart[] = [];
  for (const columns of [1, 2, 3]) {
    const d = doc("menu-liste-premium", { columns });
    const a = analyzeList(c, d);
    for (let p = 0; p < a.pages.length; p++) {
      kartlar.push({
        baslik: `liste · ${n} ürün · ${columns} sütun · sayfa ${p + 1}/${a.pages.length}`,
        olcum: `font ${r2(a.nameFont)}mm · ${a.pages.length} sayfa · denge ${r2(a.imbalance_mm)}mm`,
        uyarilar: p === 0 ? a.warnings.map((w) => JSON.stringify(w)) : [],
        svg: svgOf("menu-liste-premium", d, c, p),
      });
    }
  }
  return kartlar;
}

function gridKartlari(n: number, c: ClientDTO): Kart[] {
  const kartlar: Kart[] = [];
  for (const flow of ["single", "multipage"] as const) {
    const d = doc("menu-grid-cells", { cols: 3, flow });
    const a0 = analyzeGrid(c, d);
    const sayfalar = flow === "multipage" ? a0.pages : 1;
    for (let p = 0; p < sayfalar; p++) {
      const a = analyzeGrid(c, d, p);
      kartlar.push({
        baslik: `grid · ${n} ürün · 3 kolon · ${flow} · sayfa ${p + 1}/${sayfalar}`,
        olcum: `kapasite/sayfa ölçümü: yerleşen ${a.layout.placed.filter((x) => x.kind === "cell").length}`,
        uyarilar: p === 0 ? a0.warnings.map((w) => JSON.stringify(w)) : [],
        svg: svgOf("menu-grid-cells", d, c, p),
      });
    }
  }
  return kartlar;
}

function trifoldKartlari(n: number, c: ClientDTO): Kart[] {
  const d = doc("menu-trifold", {});
  const a = analyzeTrifold(c, d);
  return [0, 1].map((p) => ({
    baslik: `trifold · ${n} ürün · ${p === 0 ? "dış yüz" : "iç yüz"}`,
    olcum: `taşan ürün: ${a.overflowCount}`,
    uyarilar: p === 1 ? a.warnings.map((w) => JSON.stringify(w)) : [],
    svg: svgOf("menu-trifold", d, c, p),
  }));
}

function flyerKartlari(n: number, c: ClientDTO): Kart[] {
  const d = doc("flyer", {});
  const a = analyzeFlyer(c, d);
  return [
    {
      baslik: `flyer · ${n} ürün · ön yüz (mini grid ${a.mini.cols} kolon)`,
      olcum: `mini kart: ${a.mini.items.length}`,
      uyarilar: a.warnings.map((w) => JSON.stringify(w)),
      svg: svgOf("flyer", d, c, 0),
    },
  ];
}

/* ── Fontlar (base64 gömülü — sadık metin genişliği) ────────────────────── */

function fontCss(): string {
  const fontsDir = path.join(ROOT, "packages/templates/fonts");
  const css = readFileSync(path.join(fontsDir, "fonts.css"), "utf8");
  return css.replace(/url\("\.\/([^"]+)"\)/g, (_m, dosya: string) => {
    const b64 = readFileSync(path.join(fontsDir, dosya)).toString("base64");
    return `url("data:font/woff2;base64,${b64}")`;
  });
}

/* ── Galeri ─────────────────────────────────────────────────────────────── */

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const YOGUNLUKLAR = [20, 50, 100, 200];

const bolumler: string[] = [];
for (const n of YOGUNLUKLAR) {
  const c = katalog(n);
  const kartlar = [
    ...listeKartlari(n, c),
    ...gridKartlari(n, c),
    ...trifoldKartlari(n, c),
    ...flyerKartlari(n, c),
  ];
  const kartHtml = kartlar
    .map(
      (k) => `<figure class="kart">
  <div class="cerceve">${k.svg}</div>
  <figcaption>
    <strong>${esc(k.baslik)}</strong><br>${esc(k.olcum)}
    ${k.uyarilar.length ? `<div class="uyari">⚠ ${k.uyarilar.map(esc).join("<br>⚠ ")}</div>` : ""}
  </figcaption>
</figure>`
    )
    .join("\n");
  bolumler.push(`<section><h2>${n} ürün</h2><div class="izgara">${kartHtml}</div></section>`);
}

const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<title>GT-2 Görsel Tur Galerisi — 20/50/100/200 ürün</title>
<style>
${fontCss()}
body { font-family: system-ui, sans-serif; margin: 24px; background: #f4f2ee; color: #1d1b1a; }
h1 { font-size: 20px; } h2 { margin-top: 40px; border-bottom: 2px solid #ccc; padding-bottom: 4px; }
.izgara { display: flex; flex-wrap: wrap; gap: 20px; }
.kart { margin: 0; width: 340px; }
.cerceve { background: #fff; box-shadow: 0 1px 6px rgba(0,0,0,.25); }
.cerceve svg { width: 100%; height: auto; display: block; }
figcaption { font-size: 12px; margin-top: 6px; line-height: 1.5; }
.uyari { color: #9a3412; margin-top: 4px; word-break: break-all; }
.protokol { background: #fff; border-left: 4px solid #E3A93F; padding: 12px 16px; max-width: 900px; }
</style></head><body>
<h1>GT-2 Görsel Tur Galerisi (Canonical 10.3)</h1>
<div class="protokol">
<p><strong>Yargı kalemleri (insan):</strong> her yoğunlukta — <em>sırıtmayan reflow</em>
(yoğunluk artınca düzen bozulmadan yeniden akıyor mu?) · <em>simetri</em> (eşit kenar
boşluğu, ritmik aralık, hizalı fiyatlar, dengeli sütunlar) · <em>adaptif tipografi</em>
(küçülme okunaklı ve orantılı mı?).</p>
<p><strong>Makinece zaten doğrulananlar</strong> (testli, burada yeniden yargılamana gerek yok):
minimum font aşılmıyor · flow'da ürün kaybı yok · sütun/sayfa taşması yok · düşen içerik
daima görünür uyarı üretiyor.</p>
<p><strong>Karar kaydı:</strong> tur sonucunu bildir — geçtiyse
<code>npm run journal -- gate --package &lt;paket&gt; --gate gt --outcome gecti --evidence "..."
--actor-kind human --actor-id &lt;sen&gt; --actor-role urun-sahibi</code> ile imzalanır;
bulgu varsa kalem kalem yaz, paketlenir.</p>
</div>
${bolumler.join("\n")}
</body></html>`;

mkdirSync(CIKTI, { recursive: true });
writeFileSync(path.join(CIKTI, "galeri.html"), html, "utf8");
const kb = Math.round(Buffer.byteLength(html) / 1024);
console.log(`galeri üretildi: docs/gt2-tur/cikti/galeri.html (${kb} KB, ${YOGUNLUKLAR.length} yoğunluk bölümü)`);
