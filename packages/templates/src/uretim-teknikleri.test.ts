/* İZİNLİ ÜRETİM TEKNİKLERİ — kayıt-defteri-geneli nöbetçi + çift yönlü bağ
   icraları (Canonical 7.2 "İzinli üretim teknikleri" + 4.5 "hangi teknik
   hangi malzemede"; journal 2026-07-26-uretim-teknikleri). */

import { describe, expect, it } from "vitest";
import { OrderDetailsSchema } from "@tezgah/shared";
import {
  KANAL_GEREKTIRIR,
  PRODUCTION_CHANNELS,
  PRODUCTION_TECHNIQUES,
  TEMPLATES,
  kurVeDogrula,
  listTemplates,
  type ProductionChannel,
  type ProductionTechnique,
  type TemplateEntry,
  type TemplateManifest,
} from "./index.js";

describe("NÖBETÇİ: teknik ilanları TAM olarak bunlar (11 aile)", () => {
  it("kayıt defteri beklenen teknik tablolarıyla BİREBİR eşleşir", () => {
    const gercek = Object.fromEntries(
      Object.entries(TEMPLATES).map(([id, e]) => [id, e.manifest.production_techniques])
    );
    expect(
      gercek,
      "Teknik tablosu değişmiş: izinli teknik eklemek/çıkarmak ürün kararıdır — " +
        "journal kaydı ister; teknik↔kanal bağı registry'de yük zamanında doğrulanır"
    ).toEqual({
      "menu-grid-cells": ["impression"],
      "menu-liste-premium": ["impression"],
      "menu-trifold": ["impression"],
      "kabul-fabrika": ["impression"],
      flyer: ["impression"],
      "carte-fidelite": ["impression"],
      "vitro-bandeau": ["impression", "decoupe"],
      "vitro-centre": ["impression", "decoupe"],
      "vitro-colonne": ["impression", "decoupe"],
      "enseigne-panneau": ["impression"],
      garment: ["impression", "broderie"],
    });
  });

  it("sözlük TAM {impression, broderie, decoupe}; KANAL_GEREKTIRIR tüm kanalları kapsar", () => {
    expect(PRODUCTION_TECHNIQUES).toEqual(["impression", "broderie", "decoupe"]);
    expect(Object.keys(KANAL_GEREKTIRIR).sort()).toEqual([...PRODUCTION_CHANNELS].sort());
  });

  it("çift yönlü bağ kayıtlı HER ailede tutar (registry'den geçmiş olmanın açık kanıtı)", () => {
    for (const e of listTemplates()) {
      const m = e.manifest;
      for (const k of m.production_channels) {
        expect(m.production_techniques, `${m.id}: ${k} kanalı`).toContain(KANAL_GEREKTIRIR[k]);
      }
      for (const t of m.production_techniques) {
        expect(
          m.production_channels.some((k) => KANAL_GEREKTIRIR[k] === t),
          `${m.id}: ${t} tekniği kanalsız`
        ).toBe(true);
      }
    }
  });

  it("SİPARİŞ SÖZLÜK BAĞI: OrderDetailsSchema.technique değerleri teknik sözlüğünde", () => {
    expect(() => OrderDetailsSchema.parse({ technique: "impression" })).not.toThrow();
    expect(() => OrderDetailsSchema.parse({ technique: "broderie" })).not.toThrow();
    /* sipariş şeması yeni teknik tanırsa bu test onu sözlüğe taşımaya zorlar */
    for (const t of ["impression", "broderie"]) {
      expect(PRODUCTION_TECHNIQUES as readonly string[]).toContain(t);
    }
  });
});

describe("yük-zamanı bağ İCRASI — ayrışan ilan yüklenemez", () => {
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
      ...patch,
    },
    Component: (() => null) as unknown as TemplateEntry["Component"],
  });
  const kur = (patch: Partial<TemplateManifest>) => () => kurVeDogrula({}, [sahteGiris(patch)]);

  it("BOŞ / bilinmeyen / tekrarlı teknik reddedilir", () => {
    expect(kur({ production_techniques: [] })).toThrow(/boş olamaz/);
    expect(
      kur({ production_techniques: ["serigrafi"] as unknown as readonly ProductionTechnique[] })
    ).toThrow(/bilinmeyen üretim tekniği "serigrafi"/);
    expect(kur({ production_techniques: ["impression", "impression"] })).toThrow(/tekrarlı/);
  });

  it("KANAL TEKNİKSİZ ÜRETİLEMEZ: broderie kanalı ilan edip tekniğini ilan etmeyen yüklenemez", () => {
    expect(
      kur({
        production_channels: ["png", "broderie"] as readonly ProductionChannel[],
        production_techniques: ["impression"],
      })
    ).toThrow(/"broderie" kanalı "broderie" tekniğini gerektirir/);
  });

  it("KANALSIZ TEKNİK ÖLÜ İLANDIR: decoupe tekniği ilan edip decoupe kanalı olmayan yüklenemez", () => {
    expect(
      kur({ production_techniques: ["impression", "decoupe"] })
    ).toThrow(/"decoupe" tekniği ilanlı ama onu üreten hiçbir kanal ilanlı değil/);
  });

  it("technique/mode paramı izinli kümenin dışına seçenek koyamaz", () => {
    expect(
      kur({
        params: [
          { id: "technique", type: "choice", options: ["impression", "broderie"], default: "impression", label_tr: "T" },
        ] as TemplateManifest["params"],
      })
    ).toThrow(/"technique" paramı "broderie" seçeneği izinli teknikler dışında/);
  });

  it("tutarlı ilan geçer (vitro deseni: iki teknik + üç kanal + mode paramı)", () => {
    expect(() =>
      kurVeDogrula({}, [
        sahteGiris({
          production_channels: ["print", "preview", "decoupe"] as readonly ProductionChannel[],
          production_techniques: ["impression", "decoupe"],
          params: [
            { id: "mode", type: "choice", options: ["impression", "decoupe"], default: "impression", label_tr: "Mod" },
          ] as TemplateManifest["params"],
        }),
      ])
    ).not.toThrow();
  });
});
