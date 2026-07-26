/* Kimlik-yalnız alt-yol testleri (C-P2). Bu dosya BİLEREK ana registry'yi
   (../index.js) ve GENERATED'ı (../generated/index.js, react-bağımlı) da
   import eder — kısıt yalnız identity/index.ts'in (ÜRETİM modülü, apps/server
   bunu import eder) react'siz KALMASIDIR; test dosyasının kendisi vitest
   altında koşar, react'e erişimi serbesttir. */

import { describe, expect, it } from "vitest";
import { GENERATED } from "../generated/index.js";
import { TEMPLATES, materialTypeOf, listTemplates } from "../index.js";
import { MANIFESTS, materialTypeOfOrNull } from "./index.js";

describe("kimlik-yalnız alt-yol — ana registry ile eşdeğerlik", () => {
  it("10 el-yazımı ailenin tümünde identity == ana registry (tür)", () => {
    for (const id of Object.keys(MANIFESTS)) {
      expect(materialTypeOfOrNull(id), id).toBe(materialTypeOf(id));
    }
  });

  it("tam 10 el-yazımı aile kayıtlı, ne eksik ne fazla", () => {
    expect(Object.keys(MANIFESTS).sort()).toEqual(
      [
        "menu-grid-cells",
        "menu-liste-premium",
        "menu-trifold",
        "flyer",
        "carte-fidelite",
        "vitro-bandeau",
        "vitro-centre",
        "vitro-colonne",
        "enseigne-panneau",
        "garment",
      ].sort()
    );
  });

  it("REFERANS-EŞİTLİĞİ: aynı manifest objesi (kopya değil) — tek kaynak modül önbelleğinden gelir", () => {
    for (const id of Object.keys(MANIFESTS)) {
      expect(MANIFESTS[id]).toBe(TEMPLATES[id].manifest);
    }
  });

  it("kayıtsız id → null, FIRLAMAZ (ana registry'nin materialTypeOfOrNull'uyla aynı sözleşme)", () => {
    expect(materialTypeOfOrNull("olmayan-sablon")).toBe(null);
    expect(materialTypeOfOrNull("")).toBe(null);
  });

  it("prototip-zinciri id'leri null döner, .manifest okumaya kalkışmaz", () => {
    expect(materialTypeOfOrNull("toString")).toBe(null);
    expect(materialTypeOfOrNull("constructor")).toBe(null);
    expect(materialTypeOfOrNull("hasOwnProperty")).toBe(null);
  });
});

describe("kapsam sınırı — YÜKSEK SESLİ nöbetçi (fabrika/generated bilerek dışarıda)", () => {
  it("GENERATED'ın HER girdisi bugün type:'menu' — identity'nin dışarıda bırakma varsayımının dayanağı", () => {
    const yabanci = Object.values(GENERATED).filter((e) => e.manifest.type !== "menu");
    expect(
      yabanci.map((e) => `${e.manifest.id}:${e.manifest.type}`),
      "Fabrika artık 'menu' dışı tür yayıyor: identity/index.ts'in generated-hariç " +
        "kapsam kararı (C-P0 C-B-1 varsayımına dayanır) YENİDEN DEĞERLENDİRİLMELİ — " +
        "bu tür artık svgExportKind/surfacePrefillKind'de null'a çözülmeyebilir"
    ).toEqual([]);
  });

  it("generated id'ler identity'de YOK ama ana registry'de VAR (kapsam farkı ölçülü, gizli değil)", () => {
    const generatedIds = Object.keys(GENERATED);
    expect(generatedIds.length).toBeGreaterThan(0);
    for (const id of generatedIds) {
      expect(materialTypeOfOrNull(id), id).toBe(null);
      expect(listTemplates().some((e) => e.manifest.id === id), id).toBe(true);
    }
  });
});
