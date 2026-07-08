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
