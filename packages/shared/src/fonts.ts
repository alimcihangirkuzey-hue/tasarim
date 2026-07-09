/* Font glif kapsam bekçisi — FAZ5-GOREV §7, mimar kararı #18.
   FR+TR pratik repertuvar, büyük/küçük her iki form + €. Kullanıcı yüklediği
   fontlar bu kümeyi TAM karşılamalı; eksikse RED + eksik glif listesi (M9).
   Yerleşik repo fontları çalışma zamanında MUAF (hepsi bu kümeyi geçtiği
   fonts.test.ts ile kanıtlı). SAF: fontkit'e bağlı değil (has() dışarıdan). */

const LOWER = "çğıiöşüàâéèêëîïôœùû";
const UPPER = "ÇĞİÖŞÜÀÂÉÈÊËÎÏÔŒÙÛ";
export const GLYPH_COVERAGE: string = LOWER + UPPER + "€";

/** Kümeden, has(codePoint) false dönen glifler (kapsam eksikleri). */
export function missingCoverageGlyphs(has: (codePoint: number) => boolean): string[] {
  const out: string[] = [];
  for (const ch of GLYPH_COVERAGE) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined && !has(cp)) out.push(ch);
  }
  return out;
}

/** packages/templates/fonts altındaki yerleşik OFL aileleri (ADR-8).
    Fabrika font bekçisi (mimar #19c): sistemde kurulu = bunlar ∪ custom_fonts. */
export const REPO_FONT_FAMILIES: readonly string[] = [
  "Anton",
  "Oswald",
  "Archivo Black",
  "Bitter",
  "Inter",
  "Pacifico",
];

/** Kullanılan aile adlarından, kurulu (repo ∪ custom) kümede OLMAYANLAR.
    Karşılaştırma büyük/küçük harf ve kenar boşluğu duyarsız (#19c). */
export function missingFontFamilies(used: string[], installed: string[]): string[] {
  const norm = (s: string) => s.trim().toLowerCase();
  const have = new Set(installed.map(norm));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of used) {
    const key = norm(u);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (!have.has(key)) out.push(u.trim());
  }
  return out;
}
