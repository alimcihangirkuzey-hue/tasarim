/* PROFİL ŞİDDET KATMANI — kayıt-defteri-geneli nöbetçi (Canonical 4.5/7.2).

   Bu dosya İKİ şeyi sabitler:
   (1) KAYITLI override tablolarının TAMAMI aile aile çivilenir — yeni bir
       profil override'ı eklemek bu tabloyu, journal kaydını ve (blocker-düzeyi
       ise) ürün sahibi kararını birlikte ister; sessizce giremez. Blocker-düzeyi
       override bugün YOKTUR — ilk aday (low-dpi@tekstil) ürün sahibi kapısında.
   (2) Katman UCA UCA çalışır: garment'ın gerçekten ürettiği mono-suggest
       uyarısı, garment profiliyle okununca warning'dir (çekirdekte info) —
       ilan = davranış, ölü mekanizma değil.

   "Profil eklemek çekirdek testlerini kırmamalıdır" (7.2): çekirdek severity
   testleri (engine/severity.test.ts) bu paketten bağımsız yeşil kalır. */

import { describe, expect, it } from "vitest";
import { DocumentStateSchema, defaultBrandKit, defaultCatalog, type ClientDTO } from "@tezgah/shared";
import { TEMPLATES, blockersOf, severityOf, type SeverityOverrides } from "./index.js";
import { MANIFESTS, severityOverridesOf } from "./identity/index.js";
import { analyzeGarment } from "./garment/index.js";

/* Beklenen tablo AİLE AİLE elle yazılır; kayıt defterinden TÜRETİLMEZ
   (türetilseydi test uygulamanın her dediğine "evet" derdi). Tabloda olmayan
   her aile override TAŞIMAZ demektir. */
const BEKLENEN_OVERRIDES: Record<string, SeverityOverrides> = {
  garment: { "mono-suggest": "warning" },
};

describe("NÖBETÇİ: kayıtlı override tabloları TAM olarak bunlar", () => {
  it("ana kayıt defteri (generated dahil) beklenen tablolarla BİREBİR eşleşir", () => {
    const gercek = Object.fromEntries(
      Object.entries(TEMPLATES)
        .filter(([, e]) => e.manifest.severity_overrides !== undefined)
        .map(([id, e]) => [id, e.manifest.severity_overrides])
    );
    expect(
      gercek,
      "Override tablosu değişmiş: yeni kalem journal kaydı ister; blocker-düzeyi " +
        "kalem ayrıca ÜRÜN SAHİBİ kararı ister (blocker-enforcement nöbetçisiyle " +
        "aynı disiplin — enforcement zaten profil-farkında, veri + bu pin yeter)"
    ).toEqual(BEKLENEN_OVERRIDES);
  });

  it("bugün hiçbir override BLOCKER-düzeyi değildir (ilk aday ürün sahibi kapısında)", () => {
    for (const [id, tablo] of Object.entries(BEKLENEN_OVERRIDES)) {
      expect(Object.values(tablo).every((s) => s !== "blocker"), id).toBe(true);
    }
  });

  it("identity alt-yolu AYNI tabloları görür (referans-eşitlik zinciri)", () => {
    for (const id of Object.keys(MANIFESTS)) {
      expect(severityOverridesOf(id), id).toBe(TEMPLATES[id].manifest.severity_overrides);
    }
    expect(severityOverridesOf("garment")).toEqual(BEKLENEN_OVERRIDES.garment);
  });

  it("kayıtsız/generated/prototip id'de severityOverridesOf undefined döner (çekirdek geçerli)", () => {
    expect(severityOverridesOf("olmayan-sablon")).toBe(undefined);
    expect(severityOverridesOf("kabul-fabrika")).toBe(undefined); /* fabrika identity'de yok — kayıtlı sınır */
    expect(severityOverridesOf("toString")).toBe(undefined);
    expect(severityOverridesOf("")).toBe(undefined);
  });
});

/* ── (2) Uca uca: gerçek analiz çıktısı + profil katmanı ─────────────────── */

function tekstilMusterisi(): ClientDTO {
  const kit = defaultBrandKit();
  kit.logo_primary = "ast_p"; /* mono YOK → koyu kumaşta primary kalır → mono-suggest */
  return {
    id: "cli_ps", name: "Profil Şiddet", slug: "profil-siddet", notes: "", currency: "EUR",
    menu_language: "fr", brandkit: kit, catalog: defaultCatalog(),
    assets: [{
      id: "ast_p", client_id: "cli_ps", kind: "logo", filename: "p.svg",
      width_px: 4000, height_px: 4000, tags: "", created_at: "t",
      urls: { orig: "/o", master: "/m/p", thumb: "/t" },
    }],
    created_at: "t", updated_at: "t",
  };
}

describe("uca uca — garment'ın ürettiği mono-suggest profilde warning okunur", () => {
  const a = analyzeGarment(
    tekstilMusterisi(),
    DocumentStateSchema.parse({
      template_id: "garment",
      params: { garment_kind: "tshirt", fabric_color: "blue", areas: ["chest_left"] },
    })
  );
  const mono = a.warnings.find((w) => w.type === "mono-suggest");
  const profil = TEMPLATES.garment.manifest.severity_overrides;

  it("koyu kumaş + yalnız renkli logo → analiz mono-suggest ÜRETİR (varsayım değil, ölçüm)", () => {
    expect(mono).toBeDefined();
  });

  it("aynı uyarı: çekirdekte info, garment profiliyle warning (katman canlı)", () => {
    expect(severityOf(mono!, undefined)).toBe("info");
    expect(severityOf(mono!, profil)).toBe("warning");
  });

  it("sıkılaştırma warning'e kadardır: export kapısı garment'ta da AÇIK kalır (gating değişmedi)", () => {
    expect(blockersOf(a.warnings, profil)).toEqual([]);
  });
});
