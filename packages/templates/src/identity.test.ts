/* C-P0 KİLİT TAŞI TESTİ — Üretim Profili Kimlik Katmanı (Canonical 7.2 #1).

   Faz 0/1 dersi: kilit taşının testi paketle BİRLİKTE yazılır, sonraya
   bırakılmaz. Bu dosya üç şeyi sabitler:
   (1) her kayıtlı şablon GERÇEK türünü bildirir — tabela/tişört/cam artık
       "menu" DEMEZ (eski literal tip bunu ZORLUYORDU);
   (2) yük-zamanı invaryant bozuk kimliği SESSİZCE KABUL ETMEZ;
   (3) çekirdek (composition) golden testleri bu paketten ETKİLENMEZ —
       "profil eklemek çekirdek testlerini kırmaz" (7.2) burada kanıtlanır:
       o testler bu dosyada değil, kendi dosyalarında yeşil kalarak. */

import { describe, expect, it } from "vitest";

import {
  MATERIAL_TYPES,
  TEMPLATES,
  isMaterialType,
  kurVeDogrula,
  listTemplates,
  listTemplatesByType,
  materialTypeOf,
  registeredMaterialTypes,
  type MaterialType,
} from "./index.js";
import type { TemplateEntry, TemplateManifest } from "./types.js";

/* ── (1) Gerçek tür beyanı — aile aile, TAM eşitlik ───────────────────── */

describe("kimlik katmanı — her aile GERÇEK materyal türünü bildirir", () => {
  /* Beklenen tablo AİLE AİLE elle yazılır; TEMPLATES üzerinden türetilmez.
     Türetilseydi test, uygulamanın her dediğine "evet" derdi. */
  const BEKLENEN: Record<string, MaterialType> = {
    "menu-grid-cells": "menu",
    "menu-liste-premium": "menu",
    "menu-trifold": "menu",
    "kabul-fabrika": "menu",
    flyer: "flyer",
    "carte-fidelite": "kart",
    "vitro-bandeau": "cam",
    "vitro-centre": "cam",
    "vitro-colonne": "cam",
    "enseigne-panneau": "tabela",
    garment: "tekstil",
  };

  it("kayıt defteri beklenen kimlik tablosuyla BİREBİR eşleşir", () => {
    const gercek = Object.fromEntries(
      Object.entries(TEMPLATES).map(([id, e]) => [id, e.manifest.type])
    );
    expect(gercek).toEqual(BEKLENEN);
  });

  it("hiçbir tabela/tekstil/cam/kart/flyer ailesi artık 'menu' demez", () => {
    const menuOlmayanlar = Object.values(TEMPLATES).filter(
      (e) => e.manifest.type !== "menu"
    );
    /* flyer + kart + 3 cam + tabela + tekstil = 7 */
    expect(menuOlmayanlar.map((e) => e.manifest.id).sort()).toEqual([
      "carte-fidelite",
      "enseigne-panneau",
      "flyer",
      "garment",
      "vitro-bandeau",
      "vitro-centre",
      "vitro-colonne",
    ]);
  });

  it("her manifest pozitif tamsayı profile_version taşır (bugün hepsi 1)", () => {
    for (const e of listTemplates()) {
      expect(e.manifest.profile_version, e.manifest.id).toBe(1);
    }
  });
});

/* ── (2) Yük-zamanı invaryant — sessiz kabul YOK ──────────────────────── */

describe("yük-zamanı invaryant — bozuk kimlik kayıt defterinden geçemez", () => {
  /* İnvaryant TEMPLATES'i kuran yolun (kurVeDogrula) İÇİNDEDİR; bu testlerin
     çalışıyor olması gerçek kayıt defterinin geçtiğinin kanıtıdır. RED yolları
     AŞAĞIDA izole sahte Record'larla sınanır — gerçek kayıt defteri
     kirletilmeden, kurVeDogrula doğrudan çağrılarak (adversarial tur B2: eski
     hâlde invaryantın İCRASI hiç sınanmıyordu, yalnız isMaterialType saf
     guard'ı sınanıyordu; çağrıyı silmek 220 testi yeşil bırakıyordu). */

  /** Geçerli bir sahte giriş; yalnız sınanan alan patch'lenir */
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
      ...patch,
    },
    Component: (() => null) as unknown as TemplateEntry["Component"],
  });

  /* Sahte giriş `{ <key>: sahteGiris({ id: <key>, ...patch }) }` biçiminde tek
     el-yazımı olarak geçilir; kurVeDogrula onu doğrular ve fırlatır. */
  const kur = (key: string, patch: Partial<TemplateManifest>): (() => unknown) =>
    () => kurVeDogrula({}, [sahteGiris({ id: key, ...patch })]);

  it("BİLİNMEYEN TÜR reddedilir (invaryant İCRA edilir, sadece guard değil)", () => {
    expect(kur("t", { type: "sign" as MaterialType })).toThrow(/bilinmeyen materyal türü/);
    expect(kur("t", { type: "menü" as MaterialType })).toThrow(/bilinmeyen materyal türü/);
    /* geçerli tür geçer */
    expect(() => kurVeDogrula({}, [sahteGiris({ id: "t", type: "tabela" })])).not.toThrow();
  });

  it("GEÇERSİZ profile_version reddedilir — undefined/0/negatif/ondalık", () => {
    expect(kur("t", { profile_version: undefined as unknown as number })).toThrow(/pozitif tamsayı/);
    expect(kur("t", { profile_version: 0 })).toThrow(/pozitif tamsayı/);
    expect(kur("t", { profile_version: -1 })).toThrow(/pozitif tamsayı/);
    expect(kur("t", { profile_version: 1.5 })).toThrow(/pozitif tamsayı/);
    expect(kur("t", { profile_version: Number.NaN })).toThrow(/pozitif tamsayı/);
  });

  it("id ≠ harita anahtarı reddedilir (getTemplate yanlış manifest dönemez)", () => {
    /* GENERATED tarafından, anahtarı manifest.id'den FARKLI bir giriş */
    expect(() =>
      kurVeDogrula({ "yanlis-anahtar": sahteGiris({ id: "gercek-id" }) }, [])
    ).toThrow(/harita anahtarıyla uyuşmuyor/);
  });

  it("EL-YAZIMI ÇİFT-ID reddedilir (obje-literali sessizce ezerdi — B3)", () => {
    expect(() =>
      kurVeDogrula({}, [sahteGiris({ id: "cift" }), sahteGiris({ id: "cift" })])
    ).toThrow(/id çakışması/);
  });

  it("GENERATED'ı el-yazımı ezmesi çakışma DEĞİLDİR (yerleşik kimlik kazanır)", () => {
    const defter = kurVeDogrula({ "menu-liste-premium": sahteGiris({ id: "menu-liste-premium" }) }, [
      sahteGiris({ id: "menu-liste-premium", name_tr: "El yazımı" }),
    ]);
    expect(defter["menu-liste-premium"].manifest.name_tr).toBe("El yazımı");
  });

  it("isMaterialType kapalı listeyi uygular — 'sign'/'menü'/boş RED", () => {
    expect(isMaterialType("menu")).toBe(true);
    expect(isMaterialType("tabela")).toBe(true);
    expect(isMaterialType("sign")).toBe(false);
    expect(isMaterialType("menü")).toBe(false); /* aksanlı varyant ayrı tür DEĞİL, red */
    expect(isMaterialType("")).toBe(false);
    expect(isMaterialType("MENU")).toBe(false); /* büyük harf normalize EDİLMEZ, red */
  });

  it("MATERIAL_TYPES altı türü sabitler ve sırası kararlıdır", () => {
    expect(MATERIAL_TYPES).toEqual(["menu", "flyer", "kart", "tabela", "tekstil", "cam"]);
  });

  it("kayıt defterinde manifest.id daima harita anahtarına eşittir", () => {
    for (const [key, e] of Object.entries(TEMPLATES)) {
      expect(e.manifest.id, key).toBe(key);
    }
  });
});

/* ── (3) Saf sorgu API'si — tür OKUNUR bir boyut ──────────────────────── */

describe("sorgu API'si — tür artık manifest'ten okunur, id-sniff'ten değil", () => {
  it("listTemplatesByType('cam') üç vitro ailesini döner, başkasını değil", () => {
    expect(listTemplatesByType("cam").map((e) => e.manifest.id).sort()).toEqual([
      "vitro-bandeau",
      "vitro-centre",
      "vitro-colonne",
    ]);
  });

  it("listTemplatesByType('tekstil') yalnız garment döner", () => {
    expect(listTemplatesByType("tekstil").map((e) => e.manifest.id)).toEqual(["garment"]);
  });

  it("materialTypeOf gerçek türü döner; bilinmeyen id fırlatır", () => {
    expect(materialTypeOf("enseigne-panneau")).toBe("tabela");
    expect(materialTypeOf("flyer")).toBe("flyer");
    expect(() => materialTypeOf("olmayan-sablon")).toThrow(/Bilinmeyen şablon/);
  });

  it("registeredMaterialTypes kayıtlı 6 türün 6'sını MATERIAL_TYPES sırasıyla döner", () => {
    expect(registeredMaterialTypes()).toEqual(["menu", "flyer", "kart", "tabela", "tekstil", "cam"]);
  });

  it("türlerin birleşimi kayıt defterini TAM kapsar (kayıp şablon yok)", () => {
    const toplam = MATERIAL_TYPES.reduce((n, t) => n + listTemplatesByType(t).length, 0);
    expect(toplam).toBe(listTemplates().length);
  });
});
