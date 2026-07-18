/* HF-TRIO-01 — GT m.1 + m.4 derslerinin SAF çekirdeği (web'de vitest yok; mantık
   burada test edilir — WT-01'e dek desen bu).

   m.1/FIX-1 (çip: a — ürün sahibi kararı): Kaldır onay-koşulu AYNEN kalır;
   onaysız kaldırma 5 sn GERİ-AL kazanır. Liste işlemleri saf: yakala/geri-koy.

   m.4/FIX-2: ad-fallback'i artık SESSİZ DEĞİL — pickML zinciriyle (fr→tr→de ·
   de→fr→tr · tr→fr→de) AYNI sırada boşluk işareti üretir; çıktı, çip gap'leriyle
   aynı şekle (ProjectionResult.translationGaps satırı) uyar. */

import type { MenuLanguage } from "./schemas.js";

/* ---- FIX-1: kaldırma yakalama / geri koyma (saf) ---- */

export interface RemovalCapture<T> {
  removed: T;
  index: number;
  next: T[];
}

/** uid'li elemanı listeden çıkarır; yerini ve kendisini GERİ-AL için yakalar. */
export function captureRemoval<T extends { uid: string }>(
  list: T[],
  uid: string
): RemovalCapture<T> | null {
  const index = list.findIndex((p) => p.uid === uid);
  if (index === -1) return null;
  return { removed: list[index], index, next: [...list.slice(0, index), ...list.slice(index + 1)] };
}

/** Yakalanan elemanı ESKİ sırasına geri koyar (index taşarsa sona kelepçelenir). */
export function restoreRemoval<T>(list: T[], removed: T, index: number): T[] {
  const i = Math.max(0, Math.min(index, list.length));
  return [...list.slice(0, i), removed, ...list.slice(i)];
}

/* ---- FIX-2: ad-fallback boşluk işareti (saf) ---- */

export interface LocalizedNameLike {
  tr: string;
  fr: string;
  de: string;
}

/** pickML (web) / resolveChip (projection) ile AYNI fallback sıraları. */
const NAME_FALLBACK_ORDER: Record<MenuLanguage, Array<"tr" | "fr" | "de">> = {
  fr: ["fr", "tr", "de"],
  de: ["de", "fr", "tr"],
  tr: ["tr", "fr", "de"],
};

/** İstenen dil BOŞSA ve fallback kullanılacaksa gap bilgisi; istenen dil doluysa
    ya da ad tümden boşsa (basılacak şey yok — D1 refine zaten engeller) null. */
export function localizedNameGap(
  name: LocalizedNameLike,
  want: MenuLanguage
): { usedLang: "tr" | "fr" | "de"; label: string } | null {
  if ((name[want] ?? "").trim() !== "") return null;
  for (const k of NAME_FALLBACK_ORDER[want]) {
    const v = (name[k] ?? "").trim();
    if (v !== "") return { usedLang: k, label: v };
  }
  return null;
}

export interface NameGapSource {
  name: LocalizedNameLike;
  category_name: LocalizedNameLike;
}

/** Operatör-görünür ad (pickDisplay kuralı: tr→fr→de). */
function displayTr(n: LocalizedNameLike): string {
  return ([n.tr, n.fr, n.de].find((v) => v && v.trim() !== "") ?? "").trim();
}

/* Ürün + kategori adlarının fallback boşlukları — özet ekranı bunları çip
   gap'leriyle BİRLEŞTİRİP basar (m.4: "boşluk varken görünmedi" biter).
   Kategori başına TEK kayıt (dedup); item alanı "(kategori adı)" işaretli. */
export function intakeNameGaps(
  products: NameGapSource[],
  lang: MenuLanguage
): Array<{ category: string; item: string; label: string; missingLang: MenuLanguage; usedLang: "tr" | "fr" | "de" }> {
  const out: Array<{ category: string; item: string; label: string; missingLang: MenuLanguage; usedLang: "tr" | "fr" | "de" }> = [];
  const seenCat = new Set<string>();
  for (const p of products) {
    const catLabel = displayTr(p.category_name);
    const g = localizedNameGap(p.name, lang);
    if (g) {
      out.push({ category: catLabel, item: displayTr(p.name), label: g.label, missingLang: lang, usedLang: g.usedLang });
    }
    if (!seenCat.has(catLabel)) {
      seenCat.add(catLabel);
      const cg = localizedNameGap(p.category_name, lang);
      if (cg) {
        out.push({ category: catLabel, item: "(kategori adı)", label: cg.label, missingLang: lang, usedLang: cg.usedLang });
      }
    }
  }
  return out;
}
