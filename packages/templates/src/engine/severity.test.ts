/* Şiddet katmanı testleri — Canonical 4.7 + 4.5 profil katmanı.
   Nöbetçi: ÇEKİRDEK blocker kümesi TAM OLARAK çivilenir — kümeye tür eklemek,
   o yolu gerçekten durduran enforcement ile AYNI pakette gelmek zorundadır
   (bugünkü küme + enforcement: blocker-enforcement paketi, ürün sahibi onaylı).
   Kayıtlı PROFİL override tabloları ayrıca kayıt-defteri-geneli nöbetçiyle
   çivilidir (../profil-siddet.test.ts). Buradaki `undefined` ikinci argüman
   bilinçli ÇEKİRDEK beyanıdır (parametre zorunlu — sessiz düşüş yok). */

import { describe, expect, it } from "vitest";
import type { LayoutWarning } from "./layout.js";
import {
  WARNING_SEVERITIES,
  WARNING_TYPES,
  blockersOf,
  dogrulaSeverityOverrides,
  isBlockerType,
  severityOf,
  warningEmphasis,
  type SeverityOverrides,
} from "./severity.js";

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
      expect(WARNING_SEVERITIES, w.type).toContain(severityOf(w, undefined));
    }
  });

  it("info kümesi = bilgilendirme/öneri türleri (kayıtlı niyet)", () => {
    const info = ORNEKLER.filter((w) => severityOf(w, undefined) === "info").map((w) => w.type);
    expect([...new Set(info)].sort()).toEqual(["broderie-info", "empty-price", "mono-suggest"]);
  });

  it("NÖBETÇİ: ÇEKİRDEK blocker kümesi TAM {empty-required, overflow-strategy-violation}", () => {
    const blockerlar = ORNEKLER.filter((w) => severityOf(w, undefined) === "blocker").map((w) => w.type);
    expect(
      [...new Set(blockerlar)].sort(),
      "Blocker kümesi değişmiş: yeni tür eklemek/çıkarmak, o yolu GERÇEKTEN durduran " +
        "enforcement değişikliğiyle (export modalı + 409 backstop) ve ürün sahibi " +
        "kararıyla AYNI pakette gelmek zorundadır — bloklamayan blocker yalan ilandır"
    ).toEqual(["empty-required", "overflow-strategy-violation"]);
  });

  it("blockersOf yalnız blocker'ları süzer (export kapısının okuduğu küme)", () => {
    const b = blockersOf(ORNEKLER, undefined);
    expect(b.map((w) => w.type).sort()).toEqual(["empty-required", "overflow-strategy-violation"]);
    expect(blockersOf(ORNEKLER.filter((w) => severityOf(w, undefined) !== "blocker"), undefined)).toEqual([]);
  });

  it("isBlockerType (sunucu backstop'u, tipsiz giriş): blocker türleri true, gerisi ve çöp false", () => {
    expect(isBlockerType("empty-required", undefined)).toBe(true);
    expect(isBlockerType("overflow-strategy-violation", undefined)).toBe(true);
    expect(isBlockerType("overflow-items", undefined)).toBe(false);
    expect(isBlockerType("broderie-info", undefined)).toBe(false);
    expect(isBlockerType("olmayan-tur", undefined)).toBe(false);
    expect(isBlockerType("", undefined)).toBe(false);
    expect(isBlockerType("toString", undefined)).toBe(false); // prototip zinciri sınıf değildir
  });
});

describe("profil katmanı — çekirdek → profil (4.5), yalnız sıkılaştırma", () => {
  const MONO: LayoutWarning = { type: "mono-suggest", slotId: "area:x:logo" };
  const TASMA: LayoutWarning = { type: "overflow-items", count: 3 };

  it("override etkin şiddeti değiştirir; tabloda olmayan türler çekirdekten akar", () => {
    const o: SeverityOverrides = { "mono-suggest": "warning" };
    expect(severityOf(MONO, o)).toBe("warning");
    expect(severityOf(MONO, undefined)).toBe("info"); /* çekirdek değişmedi */
    expect(severityOf(TASMA, o)).toBe("warning"); /* tabloda yok → çekirdek */
    expect(severityOf({ type: "empty-required", slotId: "logo" }, o)).toBe("blocker");
  });

  it("warning→blocker sıkılaştırması blockersOf VE isBlockerType'ta aynı anda etkir (enforcement hazır)", () => {
    const o: SeverityOverrides = { "overflow-items": "blocker" };
    expect(blockersOf([MONO, TASMA], o).map((w) => w.type)).toEqual(["overflow-items"]);
    expect(isBlockerType("overflow-items", o)).toBe(true);
    expect(isBlockerType("overflow-items", undefined)).toBe(false);
    expect(blockersOf([MONO, TASMA], undefined)).toEqual([]);
  });

  it("bilinmeyen tür override'la BİLE blocker sayılamaz; prototip zinciri profilde de sınıf değildir", () => {
    const o = { "olmayan-tur": "blocker", toString: "blocker" } as unknown as SeverityOverrides;
    expect(isBlockerType("olmayan-tur", o)).toBe(false);
    expect(isBlockerType("toString", o)).toBe(false);
  });

  it("doğrulama: geçerli sıkılaştırmalar geçer (info→warning, info→blocker, warning→blocker)", () => {
    expect(() => dogrulaSeverityOverrides("t", undefined)).not.toThrow();
    expect(() => dogrulaSeverityOverrides("t", {})).not.toThrow();
    expect(() => dogrulaSeverityOverrides("t", { "mono-suggest": "warning" })).not.toThrow();
    expect(() => dogrulaSeverityOverrides("t", { "empty-price": "blocker" })).not.toThrow();
    expect(() => dogrulaSeverityOverrides("t", { "overflow-items": "blocker" })).not.toThrow();
  });

  it("doğrulama: bilinmeyen tür REDDEDİLİR (yazım hatası sessiz no-op olamaz)", () => {
    expect(() =>
      dogrulaSeverityOverrides("t", { "mono-sugest": "warning" } as unknown as SeverityOverrides)
    ).toThrow(/bilinmeyen uyarı türü/);
  });

  it("doğrulama: geçersiz şiddet değeri REDDEDİLİR", () => {
    expect(() =>
      dogrulaSeverityOverrides("t", { "mono-suggest": "kritik" } as unknown as SeverityOverrides)
    ).toThrow(/geçersiz şiddet/);
  });

  it("doğrulama: GEVŞETME reddedilir — çekirdek asgari güvencedir (4.7 profil eliyle delinemez)", () => {
    expect(() => dogrulaSeverityOverrides("t", { "empty-required": "warning" })).toThrow(/GEVŞETİYOR/);
    expect(() => dogrulaSeverityOverrides("t", { "overflow-items": "info" })).toThrow(/GEVŞETİYOR/);
  });

  it("doğrulama: çekirdeği TEKRARLAYAN ilan ölü ilandır, reddedilir (blocker'lar tabloda hiç görünemez)", () => {
    expect(() => dogrulaSeverityOverrides("t", { "mono-suggest": "info" })).toThrow(/ölü ilan/);
    expect(() => dogrulaSeverityOverrides("t", { "empty-required": "blocker" })).toThrow(/ölü ilan/);
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
