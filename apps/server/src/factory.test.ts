/* Kod üreticisi birim testleri — mimar kararı #12 (FAZ4 §12d) */

import { describe, expect, it } from "vitest";
import {
  generateBarrel,
  generateManifestTs,
  generateTemplateTsx,
  validateFactoryInput,
  type FactoryInput,
} from "./factory.js";

function makeInput(): FactoryInput {
  return {
    id: "pizza-menu-a4",
    name_tr: "Pizza Menü (fabrika)",
    w_mm: 210,
    h_mm: 297,
    viewBox: { x: 0, y: 0, w: 600, h: 848 },
    staticInner: `<rect width="600" height="848" fill="#1D1B1A"/><text x="30" y="60" font-size="20">Dekor</text>`,
    marks: [
      {
        slotId: "title",
        kind: "text",
        bind: null,
        default_fr: "NOTRE CARTE",
        font_mm: { min: 6, max: 12 },
        maxLines: 1,
        bbox: { x: 40, y: 30, w: 300, h: 40 },
        text: { x: 40, y: 62, fontSize: 34, anchor: "start", fill: "#E3A93F" },
      },
      {
        slotId: "logo",
        kind: "image",
        bind: "brand.logo_primary",
        bbox: { x: 470, y: 20, w: 100, h: 60 },
      },
      {
        slotId: "halal",
        kind: "badge",
        bind: "brand.badges.halal",
        bbox: { x: 560, y: 20, w: 30, h: 30 },
        chunk: `<circle cx="575" cy="35" r="15" fill="#0a0"/>`,
      },
    ],
    proto: {
      bbox: { x: 40, y: 120, w: 250, h: 90 },
      cols: 2,
      gap: 20,
      yon: "row",
      staticChunk: `<rect width="250" height="90" rx="6" fill="none" stroke="#666"/>`,
      itemSlots: [
        { slot: "name", bbox: { x: 10, y: 8, w: 180, h: 20 }, text: { x: 10, y: 24, fontSize: 16, anchor: "start", fill: "#fff" } },
        { slot: "price", bbox: { x: 190, y: 8, w: 50, h: 20 }, text: { x: 240, y: 24, fontSize: 16, anchor: "end", fill: "#E3A93F" } },
        { slot: "photo", bbox: { x: 10, y: 34, w: 230, h: 48 } },
      ],
    },
  };
}

describe("şablon fabrikası kod üreticisi", () => {
  it("manifest: slot tanımları + repeater item-slot eşlemesi", () => {
    const m = generateManifestTs(makeInput());
    expect(m).toContain(`id: "pizza-menu-a4"`);
    expect(m).toContain(`{ id: "title", kind: "text", bind: null, default_fr: "NOTRE CARTE", font_mm: { min: 6, max: 12 }, maxLines: 1 },`);
    expect(m).toContain(`bind: "brand.logo_primary"`);
    expect(m).toContain(`bind: "item.name_fr"`);
    expect(m).toContain(`bind: "item.prices"`);
    expect(m).toContain(`w_mm: 210, h_mm: 297`);
  });

  it("template: ölçek, statik taban, Slot sarmalayıcıları, repeater; script yok", () => {
    const t = generateTemplateTsx(makeInput());
    expect(t).toContain("const K = 0.35;"); /* 210/600 */
    expect(t).toContain("dangerouslySetInnerHTML={{ __html: STATIC }}");
    expect(t).toContain(`<Slot id="title"`);
    expect(t).toContain(`<Slot id="logo"`);
    expect(t).toContain("BADGE_HALAL");
    expect(t).toContain("PROTO.cols");
    expect(t).toContain("resolveSlotValue");
    expect(t).not.toContain("<script");
    /* okunabilirlik: üretildi başlığı + rafine notu */
    expect(t).toContain("ÜRETİLDİ");
    expect(t).toContain("elle rafine");
  });

  it("doğrulama: kötü id, çakışan id, temizlenmemiş içerik reddedilir", () => {
    const ok = makeInput();
    expect(validateFactoryInput(ok, ["menu-grid-cells"])).toBeNull();
    expect(validateFactoryInput({ ...ok, id: "Kötü ID" }, [])).toMatch(/kebap/);
    expect(validateFactoryInput(ok, ["pizza-menu-a4"])).toMatch(/zaten var/);
    expect(
      validateFactoryInput({ ...ok, staticInner: `<script>x</script>` }, [])
    ).toMatch(/script/);
  });

  it("#21: sıfır-slot (salt dekor) GEÇERLİ + ölçü sınırı 30–3000mm", () => {
    const ok = makeInput();
    /* sıfır-slot dekor şablonu — önceki 'en az bir slot' kuralı kaldırıldı */
    expect(validateFactoryInput({ ...ok, marks: [], proto: null }, [])).toBeNull();
    /* ölçü sınırları */
    expect(validateFactoryInput({ ...ok, w_mm: 20, h_mm: 297 }, [])).toMatch(/30.*3000/);
    expect(validateFactoryInput({ ...ok, w_mm: 210, h_mm: 5000 }, [])).toMatch(/30.*3000/);
    expect(validateFactoryInput({ ...ok, w_mm: 3000, h_mm: 3000 }, [])).toBeNull();
    expect(validateFactoryInput({ ...ok, w_mm: 30, h_mm: 30 }, [])).toBeNull();
  });

  it("yön=column: hücreler sütun sütun akar (rowsPerCol mantığı)", () => {
    const input = makeInput();
    input.proto!.yon = "column";
    const t = generateTemplateTsx(input);
    expect(t).toContain("Math.floor(i / rowsPerCol)");
    expect(t).toContain("i % rowsPerCol");
    expect(t).toContain("sütun sütun");
    /* row yönünde ise tersi */
    const r = generateTemplateTsx(makeInput());
    expect(r).toContain("i % PROTO.cols");
    expect(r).toContain("satır satır");
  });

  it("barrel deterministik ve sıralı", () => {
    const b = generateBarrel(["z-son", "a-ilk"]);
    expect(b.indexOf(`"a-ilk"`)).toBeLessThan(b.indexOf(`"z-son"`));
    expect(b).toContain(`import { entry as g0 } from "./a-ilk/index.js";`);
    expect(b).toContain("OTOMATİK yeniden yazılır");
  });
});
