/* ÜRETİM KANALI İLANI — kayıt-defteri-geneli nöbetçi + eşdeğerlik kanıtları
   (Canonical 7.2 "Üretim çıktıları ve teslim biçimleri" + 8.5 kanal
   taksonomisi; journal 2026-07-26-uretim-kanali-ilani).

   Bu dosya ÜÇ şeyi sabitler:
   (1) TÜM kayıtlı kanal tabloları aile aile çivilenir — kanal eklemek/çıkarmak
       journal kaydı ister; uçların bekçileri bu ilana güvenir, sessiz kayma
       olamaz.
   (2) exportRouteOf, sökülen tür-koşullu web yönlendirmesinin REFERANS
       KOPYASIYLA birebir aynıdır (ilan değişikliği davranış değişikliği
       DEĞİLDİR — bu paket yalnız kararı tek kaynağa taşır).
   (3) svgKindOf, eski tür→SVG türetimiyle (cam→decoupe, tekstil→broderie)
       kayıtlı her ailede birebir aynıdır. */

import { describe, expect, it } from "vitest";
import {
  PRODUCTION_CHANNELS,
  TEMPLATES,
  exportRouteOf,
  kurVeDogrula,
  listTemplates,
  svgKindOf,
  type ProductionChannel,
  type TemplateEntry,
  type TemplateManifest,
} from "./index.js";
import { MANIFESTS, productionChannelsOf } from "./identity/index.js";

/* Beklenen tablo AİLE AİLE elle yazılır; kayıt defterinden TÜRETİLMEZ. */
const BEKLENEN_KANALLAR: Record<string, readonly ProductionChannel[]> = {
  "menu-grid-cells": ["print", "preview"],
  "menu-liste-premium": ["print", "preview"],
  "menu-trifold": ["print", "preview"],
  "kabul-fabrika": ["print", "preview"],
  flyer: ["print", "preview"],
  "carte-fidelite": ["print", "preview"],
  "vitro-bandeau": ["print", "preview", "decoupe"],
  "vitro-centre": ["print", "preview", "decoupe"],
  "vitro-colonne": ["print", "preview", "decoupe"],
  "enseigne-panneau": ["print", "preview"],
  garment: ["png", "broderie"],
};

describe("NÖBETÇİ: kanal ilanları TAM olarak bunlar (11 aile)", () => {
  it("kayıt defteri beklenen kanal tablolarıyla BİREBİR eşleşir", () => {
    const gercek = Object.fromEntries(
      Object.entries(TEMPLATES).map(([id, e]) => [id, e.manifest.production_channels])
    );
    expect(
      gercek,
      "Kanal tablosu değişmiş: üretim çıktısı eklemek/çıkarmak ürün davranışıdır — " +
        "journal kaydı ve (yeni kanal türüyse) uç/bekçi değişikliği aynı pakette ister"
    ).toEqual(BEKLENEN_KANALLAR);
  });

  it("v1 kanal sözlüğü TAM {print, preview, decoupe, broderie, png}", () => {
    expect(PRODUCTION_CHANNELS).toEqual(["print", "preview", "decoupe", "broderie", "png"]);
  });

  it("hiçbir profil decoupe VE broderie'yi birlikte ilan etmez (svgKindOf önceliği fiilen devrede değil)", () => {
    for (const e of listTemplates()) {
      const k = e.manifest.production_channels;
      expect(k.includes("decoupe") && k.includes("broderie"), e.manifest.id).toBe(false);
    }
  });

  it("identity alt-yolu AYNI tabloları görür; kayıtsız/fabrika/prototip id null", () => {
    for (const id of Object.keys(MANIFESTS)) {
      expect(productionChannelsOf(id), id).toBe(TEMPLATES[id].manifest.production_channels);
    }
    expect(productionChannelsOf("kabul-fabrika")).toBe(null); /* fabrika identity'de yok — kayıtlı sınır */
    expect(productionChannelsOf("olmayan-sablon")).toBe(null);
    expect(productionChannelsOf("toString")).toBe(null);
    expect(productionChannelsOf("")).toBe(null);
  });
});

/* ── Yük-zamanı invaryant İCRASI (registry-core) ─────────────────────────── */

describe("bozuk kanal ilanı kayıt defterinden geçemez", () => {
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
      ...patch,
    },
    Component: (() => null) as unknown as TemplateEntry["Component"],
  });

  it("BOŞ liste reddedilir — çıktısız profil olmaz", () => {
    expect(() => kurVeDogrula({}, [sahteGiris({ production_channels: [] })])).toThrow(
      /boş olamaz/
    );
  });

  it("EKSİK alan reddedilir — kanal bildirmeyen profil, çıktısı bilinmeyen profildir", () => {
    expect(() =>
      kurVeDogrula({}, [
        sahteGiris({ production_channels: undefined as unknown as readonly ProductionChannel[] }),
      ])
    ).toThrow(/boş olamaz/);
  });

  it("BİLİNMEYEN kanal reddedilir (yazım hatası sessiz no-op olamaz)", () => {
    expect(() =>
      kurVeDogrula({}, [
        sahteGiris({ production_channels: ["print", "pdf"] as unknown as readonly ProductionChannel[] }),
      ])
    ).toThrow(/bilinmeyen üretim kanalı "pdf"/);
  });

  it("TEKRARLI kanal reddedilir", () => {
    expect(() =>
      kurVeDogrula({}, [sahteGiris({ production_channels: ["print", "print"] })])
    ).toThrow(/tekrarlı/);
  });
});

/* ── (2) exportRouteOf ≡ sökülen tür-koşullu yönlendirme ─────────────────── */

describe("exportRouteOf — eski web doExport mantığının referans kopyasıyla birebir", () => {
  /* EditorPage'den SÖKÜLEN ifadenin referans kopyası (tür-koşullu hâl) */
  const eskiRota = (m: TemplateManifest, mode: unknown): "garment" | "svg" | "pdf" =>
    m.type === "tekstil" ? "garment" : m.type === "cam" && mode === "decoupe" ? "svg" : "pdf";

  it("kayıtlı TÜM aileler × tüm modlarda aynı karar", () => {
    const modlar = ["impression", "decoupe", undefined, "", 42];
    for (const e of listTemplates()) {
      for (const mode of modlar) {
        expect(
          exportRouteOf(e.manifest.production_channels, mode),
          `${e.manifest.id} mode=${String(mode)}`
        ).toBe(eskiRota(e.manifest, mode));
      }
    }
  });
});

/* ── (3) svgKindOf ≡ eski tür→SVG türetimi ───────────────────────────────── */

describe("svgKindOf — eski cam→decoupe / tekstil→broderie türetimiyle birebir", () => {
  it("kayıtlı TÜM ailelerde aynı sonuç", () => {
    for (const e of listTemplates()) {
      const eski = e.manifest.type === "cam" ? "decoupe" : e.manifest.type === "tekstil" ? "broderie" : null;
      expect(svgKindOf(e.manifest.production_channels), e.manifest.id).toBe(eski);
    }
  });

  it("öncelik sözleşmesi: ikisi birden ilanlıysa kesim (decoupe) kazanır", () => {
    expect(svgKindOf(["decoupe", "broderie"])).toBe("decoupe");
    expect(svgKindOf(["print", "preview"])).toBe(null);
    expect(svgKindOf([])).toBe(null);
  });
});
