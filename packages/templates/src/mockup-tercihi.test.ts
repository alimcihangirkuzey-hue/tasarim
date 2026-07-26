/* MOCKUP SAHNE TERCİHİ İLANI — kayıt-defteri-geneli nöbetçi + eşdeğerlik
   kanıtları (Canonical 7.2 "Önizleme türleri"; journal
   2026-07-26-onizleme-turleri).

   Bu dosya DÖRT şeyi sabitler:
   (1) TÜM kayıtlı mockup_tercihi ilanları aile aile çivilenir — ilan
       eklemek/değiştirmek journal kaydı ister; editörün sahne sıralaması bu
       ilana güvenir, sessiz kayma olamaz.
   (2) sahneSkoru, sökülen EditorPage satır-içi skorlamasının REFERANS
       KOPYASIYLA birebir aynıdır (ilan değişikliği davranış değişikliği
       DEĞİLDİR — bu paket yalnız kararı tek kaynağa taşır; exportRouteOf
       emsali).
   (3) Bozuk ilan kayıt defterinden GEÇEMEZ (registry-core icra yolu).
   (4) registry-core'un literal sahne sözlüğü SceneKindSchema ile EŞ kalır
       (runtime import bilinçli yok — çapraz doğrulama burada). */

import { describe, expect, it } from "vitest";
import { SceneKindSchema } from "@tezgah/shared";

import {
  CEKIRDEK_TERCIH,
  TEMPLATES,
  kurVeDogrula,
  listTemplates,
  sahneSkoru,
  type MockupTercihi,
  type TemplateEntry,
  type TemplateManifest,
} from "./index.js";
import { MOCKUP_SAHNE_TURLERI } from "./registry-core.js";

/* ── (1) Nöbetçi: kayıtlı ilanlar TAM olarak bunlar ──────────────────────── */

/* Beklenen tablo AİLE AİLE elle yazılır; kayıt defterinden TÜRETİLMEZ
   (türetilseydi test uygulamanın her dediğine "evet" derdi). Tabloda olmayan
   her aile ilan TAŞIMAZ = çekirdek tercih (vitrine/facade) geçerli demektir. */
const BEKLENEN_TERCIHLER: Record<string, MockupTercihi> = {
  garment: { sahne_turleri: ["garment"], sahne_puani: 2, eslesme_parami: "fabric_color" },
};

describe("NÖBETÇİ: mockup_tercihi ilanları TAM olarak bunlar", () => {
  it("kayıt defteri (generated dahil) beklenen tercih tablosuyla BİREBİR eşleşir", () => {
    const gercek = Object.fromEntries(
      Object.entries(TEMPLATES)
        .filter(([, e]) => e.manifest.mockup_tercihi !== undefined)
        .map(([id, e]) => [id, e.manifest.mockup_tercihi])
    );
    expect(
      gercek,
      "Tercih tablosu değişmiş: sahne sıralaması ürün davranışıdır — yeni/değişen " +
        "ilan journal kaydı ister (kanal-ilanı nöbetçisiyle aynı disiplin)"
    ).toEqual(BEKLENEN_TERCIHLER);
  });

  it("çekirdek tercih çivili: vitrine/facade 1 puan, kumaş eşleşmesi YOK", () => {
    expect(CEKIRDEK_TERCIH).toEqual({ sahne_turleri: ["vitrine", "facade"], sahne_puani: 1 });
    expect(CEKIRDEK_TERCIH.eslesme_parami).toBe(undefined);
  });
});

/* ── (2) GOLDEN: sahneSkoru ≡ sökülen EditorPage satır-içi skorlaması ────── */

describe("sahneSkoru — eski EditorPage skorlamasının referans kopyasıyla birebir", () => {
  /* EditorPage:791-803'ten SÖKÜLEN ifadenin referans kopyası (id-sniff'li hâl) */
  const eskiSkor = (
    doc: { template_id: string; params: Record<string, unknown> },
    s: { kind: string; settings: { fabric_color?: string } }
  ): number => {
    const isGarment = doc.template_id === "garment";
    const fabric = String(doc.params["fabric_color"] ?? "");
    if (isGarment) {
      return (
        (s.kind === "garment" ? 2 : 0) +
        (s.settings.fabric_color && s.settings.fabric_color === fabric ? 1 : 0)
      );
    }
    return s.kind === "vitrine" || s.kind === "facade" ? 1 : 0;
  };

  it("kayıtlı TÜM aileler × sahne türleri × kumaş kombinasyonlarında aynı puan", () => {
    const SAHNE_TURLERI = ["vitrine", "facade", "garment", "generic"] as const;
    const DOC_PARAMLARI: Record<string, unknown>[] = [
      { fabric_color: "#8B0000" } /* eşleşme adayı (koyu kumaş) */,
      { fabric_color: "" } /* boş param */,
      {} /* param hiç yok — String(undefined ?? "") yolu */,
    ];
    const SAHNE_KUMASLARI: (string | undefined)[] = [
      "#8B0000" /* belge paramıyla eşleşen */,
      "#FFFFFF" /* eşleşmeyen */,
      "" /* boş dize — falsy, eski kod puanlamazdı */,
      undefined /* sahne kumaş bildirmemiş */,
    ];
    let sayac = 0;
    for (const e of listTemplates()) {
      for (const kind of SAHNE_TURLERI) {
        for (const params of DOC_PARAMLARI) {
          for (const fabric of SAHNE_KUMASLARI) {
            sayac += 1;
            expect(
              sahneSkoru(e.manifest.mockup_tercihi, { kind, fabric_color: fabric }, params),
              `${e.manifest.id} kind=${kind} fabric=${String(fabric)} params=${JSON.stringify(params)}`
            ).toBe(
              eskiSkor(
                { template_id: e.manifest.id, params },
                { kind, settings: { fabric_color: fabric } }
              )
            );
          }
        }
      }
    }
    /* 11 aile × 4 tür × 3 param × 4 kumaş = 528 kombinasyon — hepsi tarandı */
    expect(sayac).toBe(listTemplates().length * 4 * 3 * 4);
  });

  it("ilansız profil çekirdek tercihle skorlanır (undefined = bilinçli çekirdek beyanı)", () => {
    expect(sahneSkoru(undefined, { kind: "vitrine" }, {})).toBe(1);
    expect(sahneSkoru(undefined, { kind: "facade" }, {})).toBe(1);
    expect(sahneSkoru(undefined, { kind: "garment" }, {})).toBe(0);
    expect(sahneSkoru(undefined, { kind: "generic" }, {})).toBe(0);
    /* çekirdekte eslesme_parami yok: kumaş eşleşse bile bonus YOK */
    expect(
      sahneSkoru(undefined, { kind: "vitrine", fabric_color: "#111" }, { fabric_color: "#111" })
    ).toBe(1);
  });
});

/* ── (3) Yük-zamanı invaryant İCRASI (registry-core) ─────────────────────── */

describe("bozuk mockup_tercihi ilanı kayıt defterinden geçemez", () => {
  /** Geçerli bir sahte giriş; yalnız sınanan alan patch'lenir (identity.test.ts deseni) */
  const sahteGiris = (patch: Partial<TemplateManifest>): TemplateEntry => ({
    manifest: {
      id: "sahte",
      type: "menu",
      profile_version: 1,
      name_tr: "Sahte",
      bleed_mm: 3,
      safe_mm: 3,
      formats: { a: { w_mm: 10, h_mm: 10, label_tr: "A" } },
      defaultFormat: "a",
      params: [],
      slots: [],
      themes: [],
      production_channels: ["print", "preview"],
      production_techniques: ["impression"],
      production_substrate: "kagit",
      ...patch,
    },
    Component: (() => null) as unknown as TemplateEntry["Component"],
  });

  const kur = (patch: Partial<TemplateManifest>): (() => unknown) =>
    () => kurVeDogrula({}, [sahteGiris({ id: "t", ...patch })]);

  it("BOŞ sahne_turleri reddedilir — türsüz tercih ilan değildir", () => {
    expect(kur({ mockup_tercihi: { sahne_turleri: [], sahne_puani: 1 } })).toThrow(
      /sahne_turleri boş olamaz/
    );
  });

  it("BİLİNMEYEN sahne türü reddedilir (yazım hatası sessiz no-op olamaz)", () => {
    expect(
      kur({
        mockup_tercihi: {
          sahne_turleri: ["banner"] as unknown as MockupTercihi["sahne_turleri"],
          sahne_puani: 1,
        },
      })
    ).toThrow(/bilinmeyen sahne türü "banner"/);
  });

  it("POZİTİF SONLU olmayan sahne_puani reddedilir — 0/negatif/NaN/Infinity", () => {
    expect(kur({ mockup_tercihi: { sahne_turleri: ["vitrine"], sahne_puani: 0 } })).toThrow(
      /pozitif sonlu sayı/
    );
    expect(kur({ mockup_tercihi: { sahne_turleri: ["vitrine"], sahne_puani: -1 } })).toThrow(
      /pozitif sonlu sayı/
    );
    expect(
      kur({ mockup_tercihi: { sahne_turleri: ["vitrine"], sahne_puani: Number.NaN } })
    ).toThrow(/pozitif sonlu sayı/);
    expect(
      kur({ mockup_tercihi: { sahne_turleri: ["vitrine"], sahne_puani: Number.POSITIVE_INFINITY } })
    ).toThrow(/pozitif sonlu sayı/);
  });

  it("params'ta karşılığı olmayan eslesme_parami reddedilir (GERÇEK bağ ister)", () => {
    expect(
      kur({
        mockup_tercihi: { sahne_turleri: ["garment"], sahne_puani: 2, eslesme_parami: "fabric_color" },
      })
    ).toThrow(/eslesme_parami "fabric_color" manifest params listesinde yok/);
  });

  it("GEÇERLİ ilan geçer — eslesme_parami params'taki gerçek parama bağlanınca", () => {
    expect(() =>
      kurVeDogrula({}, [
        sahteGiris({
          id: "t",
          params: [{ id: "fabric_color", type: "color", default: "#FFFFFF", label_tr: "Kumaş" }],
          mockup_tercihi: {
            sahne_turleri: ["garment"],
            sahne_puani: 2,
            eslesme_parami: "fabric_color",
          },
        }),
      ])
    ).not.toThrow();
    /* eslesme_parami'siz ilan da geçerlidir (alan opsiyonel) */
    expect(() =>
      kurVeDogrula({}, [
        sahteGiris({ id: "t", mockup_tercihi: { sahne_turleri: ["generic"], sahne_puani: 1 } }),
      ])
    ).not.toThrow();
  });

  /* ── (4) SceneKind çapraz doğrulama — literal sözlük şemayla EŞ kalır ──── */

  it("MOCKUP_SAHNE_TURLERI ≡ SceneKindSchema.options (bilinçli literal — sürüklenme sessiz kalamaz)", () => {
    expect([...MOCKUP_SAHNE_TURLERI].sort()).toEqual([...SceneKindSchema.options].sort());
  });

  it("şemanın HER sahne türü doğrulamadan geçer (kabul yönü de eş)", () => {
    for (const tur of SceneKindSchema.options) {
      expect(() =>
        kurVeDogrula({}, [
          sahteGiris({ id: "t", mockup_tercihi: { sahne_turleri: [tur], sahne_puani: 1 } }),
        ])
      ).not.toThrow();
    }
  });
});
