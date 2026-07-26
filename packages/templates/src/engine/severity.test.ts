/* Şiddet katmanı testleri — Canonical 4.7 v1.
   Nöbetçi: blocker tier'ı BOŞ kalmalıdır — bir türü blocker ilan etmek,
   o yolu gerçekten durduran enforcement ile AYNI pakette gelir. */

import { describe, expect, it } from "vitest";
import type { LayoutWarning } from "./layout.js";
import { WARNING_SEVERITIES, WARNING_TYPES, severityOf, warningEmphasis } from "./severity.js";

/** Her türden temsilî bir uyarı örneği (payload'lı türler dahil) */
const ORNEKLER: LayoutWarning[] = [
  { type: "overflow-items", count: 3 },
  { type: "text-truncated", slotId: "name", itemId: "i1" },
  { type: "low-dpi", slotId: "photo", effectiveDpi: 80, level: "yellow" },
  { type: "low-dpi", slotId: "photo", effectiveDpi: 50, level: "red" },
  { type: "empty-required", slotId: "logo" },
  { type: "empty-price", itemId: "i2" },
  { type: "mixed-variants", categoryId: "c1" },
  { type: "qr-contrast", slotId: "qr" },
  { type: "contrast", ratio: 2.1 },
  { type: "mono-suggest", slotId: "area:x:logo" },
  { type: "fine-detail", areaId: "chest_left" },
  { type: "broderie-info" },
  { type: "min-font", slotId: "name" },
  { type: "overflow-strategy-violation", declared: "flow", dropped: 2 },
];

describe("severityOf — bildirilmiş, eksiksiz sınıflandırma", () => {
  it("örnek kümesi TÜM türleri kapsar (test kör noktasız)", () => {
    const kapsanan = new Set(ORNEKLER.map((w) => w.type));
    expect([...kapsanan].sort()).toEqual([...WARNING_TYPES].sort());
  });

  it("her uyarı geçerli bir şiddet alır (sınıfsız tür yok)", () => {
    for (const w of ORNEKLER) {
      expect(WARNING_SEVERITIES, w.type).toContain(severityOf(w));
    }
  });

  it("info kümesi = bilgilendirme/öneri türleri (kayıtlı niyet)", () => {
    const info = ORNEKLER.filter((w) => severityOf(w) === "info").map((w) => w.type);
    expect([...new Set(info)].sort()).toEqual(["broderie-info", "empty-price", "mono-suggest"]);
  });

  it("NÖBETÇİ: blocker tier'ı BOŞ — enforcement'sız blocker ilan edilemez", () => {
    const blockerlar = ORNEKLER.filter((w) => severityOf(w) === "blocker").map((w) => w.type);
    expect(
      blockerlar,
      "Bir tür blocker ilan edilmiş: o yolu GERÇEKTEN durduran enforcement bu pakette mi? " +
        "(Canonical 4.7 kayıtlı onay modeli + ürün sahibi kararı olmadan blocker açılamaz — " +
        "bloklamayan blocker yalan ilandır)"
    ).toEqual([]);
  });
});

describe("warningEmphasis — eski satır-içi kural birebir (görünüm, şiddet değil)", () => {
  /* EditorPage:627'den sökülen ifadenin REFERANS KOPYASI */
  const eskiInline = (w: LayoutWarning): boolean =>
    w.type === "overflow-items" || ("level" in w && w.level === "red");

  it("tüm örneklerde eski ifadeyle birebir aynı", () => {
    for (const w of ORNEKLER) {
      expect(warningEmphasis(w), w.type + JSON.stringify(w)).toBe(eskiInline(w));
    }
  });

  it("vurgulu küme tam olarak: overflow-items + low-dpi(red)", () => {
    const vurgulu = ORNEKLER.filter(warningEmphasis).map((w) =>
      w.type === "low-dpi" ? `low-dpi:${(w as { level: string }).level}` : w.type
    );
    expect(vurgulu.sort()).toEqual(["low-dpi:red", "overflow-items"]);
  });
});
