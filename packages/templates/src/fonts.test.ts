/* M9 + FAZ1-GOREV §3 font kuralı: her font eklenmeden ğşİı + éèçœ (+€) test edilir.
   Pacifico script fonttur; kurdele metni yalnız FR karakter içerir → FR seti yeterli. */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as fontkitNS from "fontkit";

const FONTS_DIR = fileURLToPath(new URL("../fonts/", import.meta.url));

type FontLike = { hasGlyphForCodePoint(cp: number): boolean };
const fk = fontkitNS as unknown as {
  create?: (buf: Buffer) => FontLike;
  default?: { create: (buf: Buffer) => FontLike };
};
const createFont = fk.create ?? fk.default?.create;

const TR_FR = "ğşİıéèçœ€·";
const FR_ONLY = "éèçœ";

const CASES: Array<[file: string, required: string]> = [
  ["oswald-600.woff2", TR_FR],
  ["oswald-700.woff2", TR_FR],
  ["anton-400.woff2", TR_FR],
  ["archivo-black-400.woff2", TR_FR],
  ["inter-400.woff2", TR_FR],
  ["inter-600.woff2", TR_FR],
  ["bitter-700.woff2", TR_FR],
  ["pacifico-400.woff2", FR_ONLY],
];

describe("font karakter kapsamı (M9)", () => {
  it("fontkit yüklenebildi", () => {
    expect(createFont).toBeTypeOf("function");
  });

  for (const [file, required] of CASES) {
    it(`${file} gerekli glifleri içerir`, () => {
      const font = createFont!(readFileSync(FONTS_DIR + file));
      const missing = [...required].filter(
        (ch) => !font.hasGlyphForCodePoint(ch.codePointAt(0)!)
      );
      expect(missing, `${file} eksik glifler: ${missing.join(" ")}`).toEqual([]);
    });
  }
});
