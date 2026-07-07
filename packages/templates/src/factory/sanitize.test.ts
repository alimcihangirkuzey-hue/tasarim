import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "./sanitize.js";

describe("fabrika temizleyici (FAZ4 §12a)", () => {
  it("script, foreignObject, olay öznitelikleri ve harici referanslar ayıklanır", () => {
    const dirty = `<?xml version="1.0"?>
<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
  <script>alert(1)</script>
  <rect x="0" y="0" width="600" height="400" fill="#fff" onload="hack()"/>
  <foreignObject><body>html</body></foreignObject>
  <image xlink:href="https://kotu.example/x.png" x="0" y="0" width="10" height="10"/>
  <image href="data:image/png;base64,AAA" x="0" y="0" width="10" height="10"/>
  <a href="javascript:alert(2)"><text x="10" y="20">Tıkla</text></a>
  <style>@import url(https://fonts.example/a.css); .t{fill:#000}</style>
</svg>`;
    const r = sanitizeSvg(dirty);
    expect(r.svg).not.toMatch(/<script/i);
    expect(r.svg).not.toMatch(/foreignObject/i);
    expect(r.svg).not.toMatch(/onload/i);
    /* xmlns namespace URI'si meşru ve kalır; harici http href'ler gider */
    expect(r.svg).not.toMatch(/href\s*=\s*["'](?:https?:|file:)/i);
    expect(r.svg).not.toMatch(/javascript:/i);
    expect(r.svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    /* data: ve yerel içerik kalır */
    expect(r.svg).toContain("data:image/png;base64,AAA");
    expect(r.svg).toContain(".t{fill:#000}");
    expect(r.removed.length).toBeGreaterThanOrEqual(5);
  });

  it("viewBox okunur (virgüllü/boşluklu); yoksa null", () => {
    expect(sanitizeSvg(`<svg viewBox="0,0,850.5,1100"></svg>`).viewBox).toEqual({
      x: 0, y: 0, w: 850.5, h: 1100,
    });
    expect(sanitizeSvg(`<svg width="10" height="10"></svg>`).viewBox).toBeNull();
  });
});
