/* letterSpacing birim bekçisi — mimar kararı #10 (FAZ4 §2).
   Şablon kaynaklarında CSS-mm çağına ("Nmm" letterSpacing) ya da min-font
   kıskaçlı fs(...) letterSpacing kullanımına dönüşü derleme öncesi yakalar. */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...tsxFiles(p));
    else if (name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

describe("letterSpacing birimi (mimar #10)", () => {
  const files = tsxFiles(join(__dirname));

  it("hiçbir şablonda CSS-mm letterSpacing kalmadı (px = kullanıcı birimi; em serbest)", () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      if (/letterSpacing:\s*"[\d.]+mm"/.test(src)) offenders.push(f);
      if (/letterSpacing:\s*`[^`]*mm`/.test(src)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it("letterSpacing fs() min-kıskacından geçmiyor", () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      if (/letterSpacing=\{fs\(/.test(src)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});
