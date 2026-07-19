/* F1 completeness engine + Spec-referans testleri (P2).
   İki aile için: eksik zorunlu · koşullu tetikleme (PAYDA değişimi) · istisna
   bayrağı · REDDET-istisna imkânsızlığı (F1.5) · %100 sınırı · katman ayrımı. */

import { describe, expect, it } from "vitest";
import {
  F1_GARMENT_SIZES,
  F1_GARMENT_SPEC,
  F1_MENU_SPEC,
  f1SpecFor,
  f1TotalQuantity,
  isAllowedSpecRef,
  validateSizeDistribution,
} from "./f1-spec.js";
import {
  computeF1Completeness,
  f1HasValue,
  toF1Readiness,
  type F1BriefInput,
} from "./f1-completeness.js";
import { canTransitionF1 } from "./f1-state.js";

/* ---- tam dolu örnekler (testler bunlardan alan EKSİLTEREK çalışır) ---- */

const MENU_FULL: F1BriefInput = {
  family: "menu",
  spec_ref: { template_id: "menu-liste-premium", format: "a4-portrait" },
  values: {
    format: "a4-portrait",
    languages: ["tr", "fr"],
    content_skeleton: { categories: 4 },
    requested_publications: ["digital_menu"],
    prices: { filled: true },
    delivery_deadline: "2026-08-01",
  },
  files: [{ role: "logo", status: "valid" }],
  context: { has_brand_ref: true, format_free_choice: false },
};

const GARMENT_FULL: F1BriefInput = {
  family: "garment",
  spec_ref: { template_id: "garment", format: "libre" },
  values: {
    garment_type: "tshirt",
    placements: ["chest_center"],
    fabric_color: "black",
    size_distribution: { S: 10, M: 20, L: 5 },
    technique: "broderie",
    delivery_deadline: "2026-08-01",
    print_size_position: { chest_center: { w_cm: 25, h_cm: 30 } },
  },
  files: [{ role: "tasarim", status: "valid" }],
  context: { has_brand_ref: true },
};

const drop = (input: F1BriefInput, ...ids: string[]): F1BriefInput => {
  const values = { ...(input.values ?? {}) };
  for (const id of ids) delete values[id];
  return { ...input, values };
};

describe("Spec-referans modeli (DB tablosu YOK — manifest'e referans)", () => {
  it("menü izinli formatları keşif-kanıtlı: A4P · A4L-trifold · A3P-grid, DL YOK", () => {
    const ids = F1_MENU_SPEC.allowed_specs.map((s) => `${s.template_id}:${s.format}`);
    expect(ids).toEqual([
      "menu-liste-premium:a4-portrait",
      "menu-grid-cells:a4-portrait",
      "menu-grid-cells:a4-landscape",
      "menu-grid-cells:a3-portrait",
      "menu-trifold:a4-landscape",
    ]);
    expect(ids.some((i) => i.toLowerCase().includes("dl"))).toBe(false);
    expect(isAllowedSpecRef("menu", { template_id: "menu-trifold", format: "a4-landscape" })).toBe(true);
    expect(isAllowedSpecRef("menu", { template_id: "menu-trifold", format: "dl" })).toBe(false);
  });

  it("KEŞİF DÜZELTMESİ: garment teknikleri broderie + genel_baski; decoupe YOK, DTF yalnız BİLGİLENDİRİR", () => {
    expect([...F1_GARMENT_SPEC.allowed_techniques]).toEqual(["broderie", "genel_baski"]);
    expect(F1_GARMENT_SPEC.allowed_techniques).not.toContain("decoupe");
    expect(F1_GARMENT_SPEC.info_techniques.dtf).toMatch(/alfa-PNG/i);
  });

  it("dosya şartları brief_files.role ile hizalı (menü: logo · garment: tasarim)", () => {
    expect(f1SpecFor("menu").file_requirements.map((f) => f.role)).toEqual(["logo"]);
    expect(f1SpecFor("garment").file_requirements.map((f) => f.role)).toEqual(["tasarim"]);
  });

  it("toplam adet HESAPLANIR (ayrı alan değil)", () => {
    expect(f1TotalQuantity({ S: 10, M: 20, L: 5 })).toBe(35);
    expect(f1TotalQuantity(null)).toBe(0);
  });

  it("f1HasValue: 0 ve false anlamlı; boş dize/dizi/nesne eksiktir", () => {
    expect(f1HasValue(0)).toBe(true);
    expect(f1HasValue(false)).toBe(true);
    expect(f1HasValue("")).toBe(false);
    expect(f1HasValue("  ")).toBe(false);
    expect(f1HasValue([])).toBe(false);
    expect(f1HasValue({})).toBe(false);
    expect(f1HasValue(undefined)).toBe(false);
  });
});

describe("beden×adet KATI doğrulama (D-63) — sessiz düzeltme YOK", () => {
  it("geçerli dağılım: 0 adet meşru, toplam hesaplanır", () => {
    const r = validateSizeDistribution({ XS: 0, S: 10, M: 20, L: 15, XL: 5 });
    expect(r).toMatchObject({ ok: true, total: 50 });
    if (r.ok) expect(r.value).toEqual({ XS: 0, S: 10, M: 20, L: 15, XL: 5 });
  });

  it("negatif · ondalık · metin · NaN · bilinmeyen beden REDDEDİLİR (gerekçeli)", () => {
    const cases: Array<[unknown, string]> = [
      [{ S: -1 }, "negative"],
      [{ S: 2.5 }, "not_integer"],
      [{ S: "10" }, "not_number"],
      [{ S: Number.NaN }, "not_number"],
      [{ XXXL: 1 }, "unknown_size"],
    ];
    for (const [input, reason] of cases) {
      const r = validateSizeDistribution(input);
      expect(r.ok, JSON.stringify(input)).toBe(false);
      if (!r.ok) {
        expect(r.issues[0].reason).toBe(reason);
        expect(r.issues[0].detail_tr.length).toBeGreaterThan(0);
      }
    }
  });

  it("nesne olmayan girdi (dizi/null/metin) reddedilir", () => {
    for (const bad of [[1, 2], null, "S:10", 42]) {
      const r = validateSizeDistribution(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.issues[0].reason).toBe("not_object");
    }
  });

  it("beden seti TEK kaynaktan (XS-XXL) ve toplam hesaplanan alandır", () => {
    expect([...F1_GARMENT_SIZES]).toEqual(["XS", "S", "M", "L", "XL", "XXL"]);
    expect(f1TotalQuantity({ S: 3, M: 4 })).toBe(7);
  });

  it("TOPLAM=0 → alan EKSİK sayılır (varlık kontrolü yetmez; özel doluluk kuralı)", () => {
    const sifir = computeF1Completeness({
      ...GARMENT_FULL,
      values: { ...GARMENT_FULL.values, size_distribution: { S: 0, M: 0 } },
    });
    expect(sifir.missing.map((m) => m.id)).toContain("size_distribution");
    expect(sifir.productionCompleteness).toBeLessThan(100);

    const dolu = computeF1Completeness({
      ...GARMENT_FULL,
      values: { ...GARMENT_FULL.values, size_distribution: { S: 0, M: 1 } },
    });
    expect(dolu.missing).toEqual([]);
  });
});

describe("MENÜ ailesi — eksiksizlik", () => {
  it("tam brief: design hazır, %100, eksik yok", () => {
    const r = computeF1Completeness(MENU_FULL);
    expect(r.designReady).toBe(true);
    expect(r.productionCompleteness).toBe(100);
    expect(r.missing).toEqual([]);
    expect(r.openRejects).toBe(0);
  });

  it("KATMAN AYRIMI: yalnız üretim eksikse tasarım hazır kalır, tamlık düşer", () => {
    const r = computeF1Completeness(drop(MENU_FULL, "prices"));
    expect(r.designReady).toBe(true);
    expect(r.productionCompleteness).toBeLessThan(100);
    expect(r.missing.map((m) => m.id)).toEqual(["prices"]);
    expect(r.missing[0].layer).toBe("production_pre");
  });

  it("KATMAN AYRIMI: tasarım önkoşulu eksikse readiness FALSE (iş tasarıma giremez)", () => {
    const r = computeF1Completeness(drop(MENU_FULL, "content_skeleton"));
    expect(r.designReady).toBe(false);
    expect(r.missing.map((m) => m.id)).toContain("content_skeleton");
  });

  it("KOŞULLU TETİKLEME: QR-görseli seçilince payda büyür ve QR adresi eksik sayılır", () => {
    const base = computeF1Completeness(MENU_FULL);
    const withQr = computeF1Completeness({
      ...MENU_FULL,
      values: { ...MENU_FULL.values, requested_publications: ["digital_menu", "qr_image"] },
    });
    expect(withQr.denominator).toBe(base.denominator + 1);
    expect(withQr.missing.map((m) => m.id)).toEqual(["qr_target_url"]);
    expect(withQr.productionCompleteness).toBeLessThan(100);
  });

  it("KOŞULLU TETİKLEME: basılı çıktı seçilince adet+malzeme paydaya girer (2 kalem)", () => {
    const base = computeF1Completeness(MENU_FULL);
    const printed = computeF1Completeness({
      ...MENU_FULL,
      values: { ...MENU_FULL.values, requested_publications: ["a4_print"] },
    });
    expect(printed.denominator).toBe(base.denominator + 2);
    expect(printed.missing.map((m) => m.id).sort()).toEqual(["print_material", "print_quantity"]);
  });

  it("KOŞULLU TETİKLEME: Brand referansı YOKSA renk/font seçimi zorunlulaşır", () => {
    const noBrand = computeF1Completeness({
      ...MENU_FULL,
      context: { has_brand_ref: false },
    });
    expect(noBrand.missing.map((m) => m.id)).toEqual(["color_font_choice"]);
  });

  it("KOŞULLU TETİKLEME (design): serbest format seçiminde YÖN zorunlu ve REDDET sınıfı", () => {
    const free = computeF1Completeness({
      ...MENU_FULL,
      context: { has_brand_ref: true, format_free_choice: true },
    });
    expect(free.designReady).toBe(false);
    const orientation = free.missing.find((m) => m.id === "orientation");
    expect(orientation).toMatchObject({ layer: "design_pre", reject_class: true });
  });

  it("opsiyonel alanlar eksiksizliğe HİÇ girmez", () => {
    const withOptional = computeF1Completeness({
      ...MENU_FULL,
      values: { ...MENU_FULL.values, allergens: ["gluten"], notes: "acele" },
    });
    expect(withOptional.denominator).toBe(computeF1Completeness(MENU_FULL).denominator);
    expect(withOptional.productionCompleteness).toBe(100);
  });

  it("DOSYA: logo geçersizse (invalid) karşılanmış SAYILMAZ ve açık REDDET olur (F1.7 zemini)", () => {
    const r = computeF1Completeness({
      ...MENU_FULL,
      files: [{ role: "logo", status: "invalid", version: 2 }],
    });
    expect(r.missing.map((m) => m.id)).toEqual(["file:logo"]);
    expect(r.openRejects).toBe(1);
    expect(r.productionCompleteness).toBeLessThan(100);
  });
});

describe("GARMENT ailesi — eksiksizlik", () => {
  it("tam brief: design hazır, %100", () => {
    const r = computeF1Completeness(GARMENT_FULL);
    expect(r.designReady).toBe(true);
    expect(r.productionCompleteness).toBe(100);
    expect(r.missing).toEqual([]);
  });

  it("baskı yeri yoksa: design KAPALI (REDDET sınıfı) ve boyut/konum koşulu paydaya GİRMEZ", () => {
    const r = computeF1Completeness(drop(GARMENT_FULL, "placements", "print_size_position"));
    expect(r.designReady).toBe(false);
    expect(r.missing.map((m) => m.id)).toContain("placements");
    expect(r.missing.map((m) => m.id)).not.toContain("print_size_position");
    expect(r.denominator).toBe(computeF1Completeness(GARMENT_FULL).denominator - 1);
  });

  it("beden×adet eksikse üretim tamlığı düşer, tasarım etkilenmez", () => {
    const r = computeF1Completeness(drop(GARMENT_FULL, "size_distribution"));
    expect(r.designReady).toBe(true);
    expect(r.missing.map((m) => m.id)).toEqual(["size_distribution"]);
  });

  it("DTF seçimi REDDEDİLMEZ — YALNIZ BİLGİLENDİRİR (keşif düzeltmesi)", () => {
    const r = computeF1Completeness({
      ...GARMENT_FULL,
      values: { ...GARMENT_FULL.values, technique: "dtf" },
    });
    expect(r.productionCompleteness).toBe(100);
    expect(r.missing).toEqual([]);
    expect(r.notices).toEqual([
      { code: "technique_info:dtf", message_tr: "DTF-özel çıktı yok; alfa-PNG teslim edilir" },
    ]);
  });

  it("tasarım dosyası yoksa açık REDDET (istisna denenmez bile)", () => {
    const r = computeF1Completeness({ ...GARMENT_FULL, files: [] });
    expect(r.openRejectItems.map((m) => m.id)).toEqual(["file:tasarim"]);
  });
});

describe("KAYITLI İSTİSNA ve F1.5 sınırı", () => {
  it("istisna kalemi karşılanmış sayar ve çıktıda TAŞINIR (Pack kontrol listesine)", () => {
    const r = computeF1Completeness({
      ...drop(MENU_FULL, "prices"),
      exceptions: [
        {
          target: "prices",
          warning_code: "prices_pending",
          acknowledged_by: "operator:ayse",
          reason: "müşteri fiyatları sonra verecek — sözlü onay",
        },
      ],
    });
    expect(r.productionCompleteness).toBe(100);
    expect(r.missing).toEqual([]);
    expect(r.satisfiedByException.map((e) => e.target)).toEqual(["prices"]);
  });

  it("EKSİK istisna (sebep/kaydeden boş) kalemi karşılamaz", () => {
    const r = computeF1Completeness({
      ...drop(MENU_FULL, "prices"),
      exceptions: [
        { target: "prices", warning_code: "prices_pending", acknowledged_by: "  ", reason: "" },
      ],
    });
    expect(r.missing.map((m) => m.id)).toEqual(["prices"]);
  });

  it("F1.5: REDDET-sınıfı kalem (logo dosyası) istisnayla KARŞILANAMAZ", () => {
    const r = computeF1Completeness({
      ...MENU_FULL,
      files: [],
      exceptions: [
        {
          target: "file:logo",
          warning_code: "logo_missing",
          acknowledged_by: "operator:ayse",
          reason: "sonra gelecek",
        },
      ],
    });
    expect(r.missing.map((m) => m.id)).toEqual(["file:logo"]);
    expect(r.satisfiedByException).toEqual([]);
    expect(r.openRejects).toBe(1);
  });

  it("§4: TASARIM önkoşulu istisnayla waive EDİLEMEZ (iki-katman kuralı korunur)", () => {
    const r = computeF1Completeness({
      ...drop(MENU_FULL, "content_skeleton"),
      exceptions: [
        {
          target: "content_skeleton",
          warning_code: "content_pending",
          acknowledged_by: "operator:ayse",
          reason: "müşteri metni sonra verecek",
        },
      ],
    });
    expect(r.designReady).toBe(false);
    expect(r.satisfiedByException).toEqual([]);
  });
});

describe("%100 sınırı ve durum makinesi bağı", () => {
  it("yüzde AŞAĞI yuvarlanır: 'neredeyse tam' ASLA 100 okunmaz", () => {
    const r = computeF1Completeness(drop(MENU_FULL, "delivery_deadline"));
    expect(r.satisfied).toBe(r.denominator - 1);
    expect(r.productionCompleteness).toBeLessThan(100);
    expect(r.productionCompleteness).toBe(Math.floor((r.satisfied / r.denominator) * 100));
  });

  it("motor çıktısı doğrudan §7 kapısını besler: eksikken kapalı, tamken açık", () => {
    const eksik = toF1Readiness(computeF1Completeness(drop(MENU_FULL, "prices")));
    expect(
      canTransitionF1({ from: "DESIGN_IN_PROGRESS", to: "READY_FOR_PRODUCTION_REVIEW", readiness: eksik })
    ).toMatchObject({ ok: false, code: "production_incomplete" });

    const tam = toF1Readiness(computeF1Completeness(MENU_FULL));
    expect(
      canTransitionF1({ from: "DESIGN_IN_PROGRESS", to: "READY_FOR_PRODUCTION_REVIEW", readiness: tam })
    ).toMatchObject({ ok: true });
  });

  it("açık REDDET varken tamlık %100 olsa bile kapı KAPALI (motor + guard zinciri)", () => {
    const withException = computeF1Completeness({
      ...MENU_FULL,
      files: [{ role: "logo", status: "invalid" }],
      values: { ...MENU_FULL.values },
    });
    /* logo invalid → hem eksik hem REDDET; tamlık düşer ama asıl kapatan openRejects */
    const readiness = { ...toF1Readiness(withException), productionCompleteness: 100 };
    expect(
      canTransitionF1({ from: "DESIGN_IN_PROGRESS", to: "READY_FOR_PRODUCTION_REVIEW", readiness })
    ).toMatchObject({ ok: false, code: "open_rejects" });
  });

  it("motor girdiyi DEĞİŞTİRMEZ (saflık)", () => {
    const snapshot = JSON.stringify(MENU_FULL);
    computeF1Completeness(MENU_FULL);
    expect(JSON.stringify(MENU_FULL)).toBe(snapshot);
  });
});
