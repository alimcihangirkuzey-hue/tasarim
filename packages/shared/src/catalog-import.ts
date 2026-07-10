/* Katalog yapıştır-içe aktarma motoru — FAZ5-GOREV §4. SAF parser (DOM/IO yok).
   Biçim: "KATEGORİ: <ad>" yeni kategori; ürün satırı "Ad | fiyat | açıklama?".
   Fiyat 8,00 / 8.00 / 8 tanınır. Boş/tanınmayan satır atlanır ve raporlanır.
   Aksan/TR karakter korunur. Kategori öncesi ürün satırı → atlanır (kategori yok).
   Önizleme ve uygulama AYNI parse çıktısını kullanır (tek doğruluk kaynağı). */

import type { Catalog, Category, Item } from "./schemas.js";

const CAT_PREFIXES = ["kategori:", "categorie:", "catégorie:", "category:"];

export interface ImportSkip {
  line: number; // 1-tabanlı
  text: string;
  reason: "no-category" | "no-price" | "empty-name";
}

export interface ImportPreview {
  categories: Array<{ name_fr: string; items: Array<{ name_fr: string; value: number; desc_fr: string }> }>;
  catCount: number;
  itemCount: number;
  skipped: ImportSkip[];
}

/** Fiyat metnini sayıya çevir: "8,00" | "8.00" | "8" | "8,5 €" → 8 / 8.5; yoksa null */
export function parsePrice(raw: string): number | null {
  const m = /-?\d+(?:[.,]\d+)?/.exec(raw);
  if (!m) return null;
  const v = parseFloat(m[0].replace(",", "."));
  return Number.isFinite(v) && v >= 0 ? v : null;
}

function catNameOf(line: string): string | null {
  const low = line.toLocaleLowerCase("tr-TR");
  for (const pre of CAT_PREFIXES) {
    if (low.startsWith(pre)) return line.slice(pre.length).trim();
  }
  return null;
}

/** Metni önizlemeye çevirir (uygulamadan bağımsız; UI önce bunu gösterir) */
export function parseCatalogText(text: string): ImportPreview {
  const cats: ImportPreview["categories"] = [];
  let cur: ImportPreview["categories"][number] | null = null;
  const skipped: ImportSkip[] = [];
  let itemCount = 0;

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const catName = catNameOf(line);
    if (catName !== null) {
      if (!catName) {
        skipped.push({ line: i + 1, text: lines[i], reason: "empty-name" });
        continue;
      }
      cur = { name_fr: catName, items: [] };
      cats.push(cur);
      continue;
    }

    const parts = line.split("|").map((s) => s.trim());
    const name = parts[0] ?? "";
    const priceStr = parts[1] ?? "";
    const desc = parts[2] ?? "";
    if (!name) {
      skipped.push({ line: i + 1, text: lines[i], reason: "empty-name" });
      continue;
    }
    const value = parsePrice(priceStr);
    if (value === null) {
      skipped.push({ line: i + 1, text: lines[i], reason: "no-price" });
      continue;
    }
    if (!cur) {
      skipped.push({ line: i + 1, text: lines[i], reason: "no-category" });
      continue;
    }
    cur.items.push({ name_fr: name, value, desc_fr: desc });
    itemCount++;
  }

  return {
    categories: cats,
    catCount: cats.length,
    itemCount,
    skipped,
  };
}

/** Önizlemeyi Catalog kategorilerine çevirir (id/order üretir; deterministik). */
function previewToCategories(preview: ImportPreview, idPrefix: string): Category[] {
  return preview.categories.map((c, ci) => ({
    id: `${idPrefix}_c${ci + 1}`,
    name_fr: c.name_fr,
    order: ci + 1,
    items: c.items.map(
      (it, ii): Item => ({
        id: `${idPrefix}_c${ci + 1}_i${ii + 1}`,
        name_fr: it.name_fr,
        desc_fr: it.desc_fr,
        photo: null,
        prices: [{ label: "seul", value: it.value }],
        ingredients: [], // içe aktarmada çip yok (Sipariş Modu projeksiyonu doldurur) — F7-A
        tags: [],
        visible: true,
        order: ii + 1,
      })
    ),
  }));
}

export type ImportMode = "append" | "replace";

/** Mevcut kataloğa uygular; SAF (girdi kataloğu değişmez). idSeed dış (ör. tarih)
    verilir ki determinizm testte sabitlenebilsin. */
export function applyCatalogImport(
  current: Catalog,
  preview: ImportPreview,
  mode: ImportMode,
  idSeed: string
): Catalog {
  const fresh = previewToCategories(preview, `imp_${idSeed}`);
  if (mode === "replace") {
    return { ...current, categories: fresh };
  }
  /* append: mevcut sıraların sonuna; order'ları yeniden numaralandır */
  const merged = [...current.categories, ...fresh].map((c, i) => ({ ...c, order: i + 1 }));
  return { ...current, categories: merged };
}
