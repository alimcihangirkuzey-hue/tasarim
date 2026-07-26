/* ÜRETİM SUBSTRATI (malzeme cinsi) İLANI — kayıt-defteri-geneli nöbetçi +
   substrat↔teknik çapraz bağ icraları (Canonical 7.2 + 4.5 "hangi teknik
   hangi malzemede"; journal 2026-07-26-malzeme-cinsi-ilani).

   Bu dosya DÖRT şeyi sabitler:
   (1) TÜM kayıtlı substrat ilanları aile aile çivilenir — substrat değiştirmek
       ürün kararıdır, journal kaydı ister; tablo iki yönlü tamdır.
   (2) SUBSTRAT_TEKNIKLERI sözlüğü tutarlıdır (boş değil, tekrarsız,
       PRODUCTION_TECHNIQUES alt kümesi; anahtar kümesi TAM).
   (3) Bozuk ilan kayıt defterinden GEÇEMEZ: bilinmeyen substrat ve
       substrata uygulanamayan teknik yük zamanında reddedilir.
   (4) identity alt-yolu sorgusu (productionSubstrateOf) kayıtsız id'de
       null döner, FIRLATMAZ (productionChannelsOf emsali). */

import { describe, expect, it } from "vitest";
import {
  PRODUCTION_SUBSTRATES,
  PRODUCTION_TECHNIQUES,
  SUBSTRAT_TEKNIKLERI,
  TEMPLATES,
  kurVeDogrula,
  type ProductionChannel,
  type ProductionSubstrate,
  type TemplateEntry,
  type TemplateManifest,
} from "./index.js";
import { productionSubstrateOf } from "./identity/index.js";

/* Beklenen tablo AİLE AİLE elle yazılır; kayıt defterinden TÜRETİLMEZ
   (BEKLENEN_KANALLAR emsali — uretim-kanallari.test.ts). */
const BEKLENEN_SUBSTRATLAR: Record<string, ProductionSubstrate> = {
  "menu-grid-cells": "kagit",
  "menu-liste-premium": "kagit",
  "menu-trifold": "kagit",
  "kabul-fabrika": "kagit" /* GENERATED — fabrika da kâğıda basar */,
  flyer: "kagit",
  "carte-fidelite": "karton",
  "vitro-bandeau": "vinil",
  "vitro-centre": "vinil",
  "vitro-colonne": "vinil",
  "enseigne-panneau": "panel",
  garment: "kumas",
};

describe("NÖBETÇİ: substrat ilanları TAM olarak bunlar (11 aile)", () => {
  it("kayıt defteri beklenen substrat tablosuyla BİREBİR eşleşir (iki yönlü tamlık)", () => {
    const gercek = Object.fromEntries(
      Object.entries(TEMPLATES).map(([id, e]) => [id, e.manifest.production_substrate])
    );
    expect(
      gercek,
      "Substrat tablosu değişmiş: bir ailenin malzeme cinsini değiştirmek ürün " +
        "kararıdır — journal kaydı ister; substrat↔teknik bağı registry'de yük " +
        "zamanında doğrulanır"
    ).toEqual(BEKLENEN_SUBSTRATLAR);
    /* iki yönlü tamlık AÇIKÇA: kayıtta tablosuz aile yok, tabloda kayıtsız aile yok */
    expect(Object.keys(gercek).sort()).toEqual(Object.keys(BEKLENEN_SUBSTRATLAR).sort());
  });

  it("SUBSTRAT_TEKNIKLERI tutarlı: her liste boş değil, tekrarsız, PRODUCTION_TECHNIQUES alt kümesi", () => {
    for (const s of PRODUCTION_SUBSTRATES) {
      const teknikler = SUBSTRAT_TEKNIKLERI[s];
      expect(teknikler.length, `${s}: teknik listesi boş olamaz`).toBeGreaterThan(0);
      expect(new Set(teknikler).size, `${s}: tekrarlı teknik`).toBe(teknikler.length);
      for (const t of teknikler) {
        expect(PRODUCTION_TECHNIQUES as readonly string[], `${s}: "${t}" sözlükte yok`).toContain(t);
      }
    }
  });

  it("sözlük kapsamı TAM: Object.keys(SUBSTRAT_TEKNIKLERI) = PRODUCTION_SUBSTRATES kümesi", () => {
    expect(Object.keys(SUBSTRAT_TEKNIKLERI).sort()).toEqual([...PRODUCTION_SUBSTRATES].sort());
  });
});

/* ── Yük-zamanı bağ İCRASI — ayrışan ilan yüklenemez ─────────────────────── */

describe("bozuk substrat ilanı kayıt defterinden geçemez", () => {
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
  const kur = (patch: Partial<TemplateManifest>) => () => kurVeDogrula({}, [sahteGiris(patch)]);

  it("BİLİNMEYEN substrat reddedilir (yazım hatası sessiz no-op olamaz)", () => {
    expect(
      kur({ production_substrate: "cam" as unknown as ProductionSubstrate })
    ).toThrow(/bilinmeyen substrat/);
  });

  it("ÇAPRAZ BAĞ İCRASI: kagit üstüne broderie ilanı reddedilir (teknik substrata uygulanamaz)", () => {
    /* Kanal ilanı garment desenine (png+broderie) çekilir ki teknik↔kanal bağı
       TUTARLI olsun — sahtedeki TEK ihlal substrat↔teknik bağı kalır; test,
       registry'nin denetim SIRASINA bağımlı değildir. */
    expect(
      kur({
        production_channels: ["png", "broderie"] as readonly ProductionChannel[],
        production_techniques: ["impression", "broderie"],
      })
    ).toThrow(/uygulanamaz/);
  });

  it("tutarlı ilan geçer (kumas + impression/broderie — garment deseni)", () => {
    expect(() =>
      kurVeDogrula({}, [
        sahteGiris({
          production_substrate: "kumas",
          production_channels: ["png", "broderie"] as readonly ProductionChannel[],
          production_techniques: ["impression", "broderie"],
        }),
      ])
    ).not.toThrow();
  });
});

/* ── identity alt-yolu sorgusu (Object.hasOwn — productionChannelsOf emsali) ─ */

describe("productionSubstrateOf — kayıtsız id null döner, FIRLATMAZ", () => {
  it("kayıtlı aileler ilanlarını döner", () => {
    expect(productionSubstrateOf("garment")).toBe("kumas");
    expect(productionSubstrateOf("flyer")).toBe("kagit");
  });

  it("kayıtsız / fabrika / prototip / boş id null", () => {
    expect(productionSubstrateOf("yok-boyle-sablon")).toBe(null);
    expect(productionSubstrateOf("kabul-fabrika")).toBe(null); /* fabrika identity'de yok — kayıtlı sınır */
    expect(productionSubstrateOf("toString")).toBe(null); /* prototip zinciri kimlik değildir */
    expect(productionSubstrateOf("")).toBe(null);
  });
});
