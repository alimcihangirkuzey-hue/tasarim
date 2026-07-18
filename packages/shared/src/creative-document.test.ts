/* P1 CAP-CD-01 — Creative Document v1 uyum testleri (CD1-1).
   Çekirdek iddia: CD v1 = bugünkü belge modeli + cd_version damgası; eski
   belgeler/snapshot'lar MİGRATIONSIZ uyumlu (Zod default), yanlış sürüm 400
   yoluna düşer (ZodError → global işleyici), restore-partial sürümü ezemez. */

import { describe, expect, it } from "vitest";
import {
  CD_VERSION,
  DocumentStateSchema,
  DocumentUpdateSchema,
} from "./schemas.js";

describe("CD_VERSION sabiti (D-34/D-35)", () => {
  it("v1 = 1", () => {
    expect(CD_VERSION).toBe(1);
  });
});

describe("cd_version default dolumu (eski belge/DB satırı — migrationsız uyum)", () => {
  it("cd_version'suz eski belge parse'ta 1 ile dolar (rowToDocument yolu)", () => {
    const state = DocumentStateSchema.parse({ template_id: "menu-liste-premium" });
    expect(state.cd_version).toBe(1);
  });

  it("diğer default'lar cd_version'dan etkilenmedi (mevcut davranış aynen)", () => {
    const state = DocumentStateSchema.parse({ template_id: "x" });
    expect(state.theme_id).toBe("brand");
    expect(state.status).toBe("draft");
    expect(state.params).toEqual({});
    expect(state.selection.mode).toBe("include");
    expect(state.overrides).toEqual({});
  });
});

describe("cd_version literal koruması (yanlış sürüm → ZodError → 400 yolu)", () => {
  it("cd_version: 2 reddedilir", () => {
    expect(() => DocumentStateSchema.parse({ template_id: "x", cd_version: 2 })).toThrow();
  });

  it("cd_version: '1' (dize) reddedilir — tip de sözleşmenin parçası", () => {
    expect(() => DocumentStateSchema.parse({ template_id: "x", cd_version: "1" })).toThrow();
  });

  it("cd_version: 1 (doğru sürüm) aynen geçer", () => {
    expect(DocumentStateSchema.parse({ template_id: "x", cd_version: 1 }).cd_version).toBe(1);
  });
});

describe("ESKİ snapshot uyumu (export_records.snapshot_json state'i, CD-öncesi)", () => {
  /* exports.ts snapshot biçimi: {state: docDTO, warnings[]} — CD-öncesi state'te
     cd_version YOKTUR; restore yolu bu state'i parse'tan geçirir. */
  const eskiSnapshotState = {
    template_id: "menu-liste-premium",
    params: { format: "a4-portrait" },
    theme_id: "brand",
    selection: { mode: "include", category_order: [], excluded_items: [], item_order: {} },
    overrides: { "slot.x": { value: "Y", detached: true } },
    status: "sent",
  };

  it("cd_version'suz snapshot state'i default'la açılır, alanlar aynen korunur", () => {
    const state = DocumentStateSchema.parse(eskiSnapshotState);
    expect(state.cd_version).toBe(1);
    expect(state.status).toBe("sent");
    expect(state.params).toEqual({ format: "a4-portrait" });
    expect(state.overrides["slot.x"]).toEqual({ value: "Y", detached: true });
  });
});

describe("restore-partial koruması (DocumentUpdateSchema = partial)", () => {
  it("restore patch'i cd_version taşımaz → alan undefined kalır (belgedeki değer EZİLMEZ)", () => {
    /* documents.ts restore'u patch'i 5 alandan açıkça kurar; cd_version geçmez.
       Partial'da yokluk = dokunma — default BURADA uygulanmaz. */
    const patch = DocumentUpdateSchema.parse({ template_id: "x", status: "approved" });
    expect("cd_version" in patch && patch.cd_version !== undefined).toBe(false);
  });

  it("partial'da cd_version: 1 kabul, farklı sürüm RED", () => {
    expect(DocumentUpdateSchema.parse({ cd_version: 1 }).cd_version).toBe(1);
    expect(() => DocumentUpdateSchema.parse({ cd_version: 2 })).toThrow();
  });
});

describe("additive tolerans (Zod strip — yarının alanları bugünü kırmaz)", () => {
  it("bilinmeyen alan (ör. gelecekteki layers) THROW ETMEZ, çıktıdan atılır", () => {
    const state = DocumentStateSchema.parse({
      template_id: "x",
      layers: [{ id: "l1" }],
    } as Record<string, unknown>);
    expect(state.cd_version).toBe(1);
    expect("layers" in state).toBe(false);
  });
});

describe("LY2 — CD `canvas` alanı (İLK additive-opsiyonel alan; D-35(c) kapısı)", () => {
  it("yokluk = eski davranış: alan hiç yoksa çıktıda da YOK (default üretilmez)", () => {
    const state = DocumentStateSchema.parse({ template_id: "x" });
    expect("canvas" in state && state.canvas !== undefined).toBe(false);
  });

  it("cd_version 1 KALIR — canvas'lı belge de literal-1 ile geçer (v2 gerekmedi)", () => {
    const state = DocumentStateSchema.parse({
      template_id: "x",
      canvas: { v: 1, layers: [{ id: "ly_1", name: "Katman 1" }] },
    });
    expect(state.cd_version).toBe(1);
    expect(state.canvas?.layers[0]).toMatchObject({ locked: false, visible: true, shapes: [] });
  });

  it("DocumentUpdateSchema (partial) canvas'ı TAŞIR — kaydet köprüsü MEVCUT PUT'la (yeni uç yok)", () => {
    const patch = DocumentUpdateSchema.parse({ canvas: { v: 1, layers: [] } });
    expect(patch.canvas).toEqual({ v: 1, layers: [] });
  });

  it("restore-partial canvas TAŞIMAZ → geri-yüklemede canvas KORUNUR (belgelenen davranış)", () => {
    /* documents.ts restore'u patch'i 5 içerik alanından kurar (canvas dahil değil);
       partial'da yokluk = dokunma. */
    const patch = DocumentUpdateSchema.parse({ template_id: "x", params: {} });
    expect("canvas" in patch && patch.canvas !== undefined).toBe(false);
  });
});

describe("DTO yüzeyi (CD v1 = DocumentDTO + damga)", () => {
  it("tam parse çıktısı CD v1 alan setini taşır — yeni zorunlu içerik alanı YOK", () => {
    const state = DocumentStateSchema.parse({ template_id: "x" });
    expect(Object.keys(state).sort()).toEqual(
      ["cd_version", "overrides", "params", "selection", "status", "template_id", "theme_id"].sort()
    );
  });
});
