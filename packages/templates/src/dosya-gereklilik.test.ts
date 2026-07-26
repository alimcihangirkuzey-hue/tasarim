/* DOSYA GEREKSİNİMLERİ (gereklilik) İLANI — kayıt-defteri-geneli nöbetçi +
   motor birim testleri + fabrika boşluk kapanışı (Canonical 7.2/502 "dosya
   gereksinimleri"; journal 2026-07-26-dosya-gereklilik-ilani).

   Zorunluluk artık İLANDADIR: SlotDef.gereklilik?:"zorunlu" — yokluk = slot
   boş kalabilir; ölü `optional` alanı KALKTI (0 tüketici). Motor
   (eksikZorunluVarliklar) empty-required uyarısını elle yazılmış if
   satırlarından değil bu ilandan üretir — ilan ile davranış ayrışamaz.

   İKİ BİLİNÇLİ SINIR (başlık şerhi):
   (1) vitrophanie ve garment İLAN ETMEZ: zorunlulukları KOŞULLUDUR
       (vitrophanie'de mode paramı, garment'ta kumaş+alan seçimi belirler) ve
       düz "zorunlu" ilanına sığmaz — koşullu gereklilik v2 ailesi (sipariş
       şeması 'koşullu' düzey emsali; TODO şerhi). Elle if'leri KALIR.
   (2) QR empty-required'ları bu ilanın DIŞINDADIR: QR bir DOSYA gereksinimi
       değil brandkit ALAN gereksinimidir (boş instagram/tel kaynağı) — dosya
       ilanına bağlanmaz, mevcut elle üretim aynen sürer. */

import { describe, expect, it } from "vitest";
import {
  CatalogSchema,
  DocumentStateSchema,
  defaultBrandKit,
  type ClientDTO,
} from "@tezgah/shared";
import {
  TEMPLATES,
  eksikZorunluVarliklar,
  type SlotDef,
} from "./index.js";

/* ── Müşteri kurma deseni (garment/analyze.test.ts + fabrika analyze.test.ts
   emsali): logolu varyant brandkit.logo_primary'ye sahte asset id yazar VE
   asset'i client.assets dizisine kaydeder — id yazıp kaydı unutmak "logo var
   sanılan logosuz müşteri" üretir (assetById null döner). ─────────────────── */

const sahteLogo = (id: string) => ({
  id,
  client_id: "cli_d",
  kind: "logo" as const,
  filename: `${id}.svg`,
  width_px: 4000,
  height_px: 4000,
  tags: "",
  created_at: "t",
  urls: { orig: "/o", master: `/m/${id}`, thumb: "/t" },
});

function musteri(logolu: boolean, urunSayisi = 0): ClientDTO {
  const kit = defaultBrandKit();
  if (logolu) kit.logo_primary = "ast_p";
  return {
    id: "cli_d",
    name: "Dosya Test",
    slug: "dosya-test",
    notes: "",
    currency: "EUR",
    menu_language: "fr",
    brandkit: kit,
    catalog: CatalogSchema.parse({
      categories:
        urunSayisi === 0
          ? []
          : [
              {
                id: "c0",
                name_fr: "Catégorie",
                order: 0,
                items: Array.from({ length: urunSayisi }, (_, i) => ({
                  id: `i${i}`,
                  name_fr: `Produit ${i + 1}`,
                  prices: [{ label: "seul", value: 9 + i }],
                  order: i,
                })),
              },
            ],
    }),
    assets: logolu ? [sahteLogo("ast_p")] : [],
    created_at: "t",
    updated_at: "t",
  } as ClientDTO;
}

const doc = (template_id: string) => DocumentStateSchema.parse({ template_id });

/* ── (a) NÖBETÇİ: zorunlu-slot ilanları aile aile çivili ─────────────────── */

/* Beklenen tablo AİLE AİLE elle yazılır; kayıt defterinden TÜRETİLMEZ
   (BEKLENEN_SUBSTRATLAR emsali — uretim-substrati.test.ts). */
const BEKLENEN_ZORUNLU_SLOTLAR: Record<string, string[]> = {
  "menu-grid-cells": ["logo"],
  "menu-liste-premium": ["logo"],
  "menu-trifold": ["logo"],
  "kabul-fabrika": ["logo"] /* GENERATED — boşluk kapandı, aşağıdaki (c) bloğu */,
  flyer: ["logo"],
  "carte-fidelite": ["logo"],
  "enseigne-panneau": ["logo"],
  /* Koşullu aileler v1'de İLAN ETMEZ (başlık şerhi 1): vitrophanie'de
     zorunluluğu mode paramı, garment'ta kumaş+alan belirler — koşullu
     gereklilik v2 şerhi. Boş liste "dosya gerekmez" değil "düz ilana
     sığmaz" demektir; elle if'leri yaşamaya devam eder. */
  "vitro-bandeau": [],
  "vitro-centre": [],
  "vitro-colonne": [],
  garment: [],
};

describe("NÖBETÇİ: gereklilik ilanları TAM olarak bunlar (11 aile)", () => {
  it("kayıt defteri beklenen zorunlu-slot tablosuyla BİREBİR eşleşir (iki yönlü tamlık)", () => {
    const gercek = Object.fromEntries(
      Object.entries(TEMPLATES).map(([id, e]) => [
        id,
        e.manifest.slots.filter((s) => s.gereklilik === "zorunlu").map((s) => s.id),
      ])
    );
    expect(
      gercek,
      "Zorunlu-slot tablosu değişmiş: bir ailenin dosya gereksinimini değiştirmek " +
        "ürün kararıdır — journal kaydı ister; empty-required ÇEKİRDEK BLOCKER'dır " +
        "(export kapısını tutar), ilana eklenen her slot o kapıyı sıkılaştırır"
    ).toEqual(BEKLENEN_ZORUNLU_SLOTLAR);
    /* iki yönlü tamlık AÇIKÇA: kayıtta tablosuz aile yok, tabloda kayıtsız aile yok */
    expect(Object.keys(gercek).sort()).toEqual(Object.keys(BEKLENEN_ZORUNLU_SLOTLAR).sort());
  });
});

/* ── (b) Motor birim testleri: eksikZorunluVarliklar (saf) ───────────────── */

describe("eksikZorunluVarliklar — ilan okuyan jenerik eksik-varlık üretici", () => {
  const ZORUNLU_LOGO: SlotDef = {
    id: "logo",
    kind: "image",
    bind: "brand.logo_primary",
    gereklilik: "zorunlu",
  };
  const ILANSIZ_LOGO: SlotDef = { id: "logo", kind: "image", bind: "brand.logo_primary" };
  const ZORUNLU_METIN: SlotDef = {
    id: "phone",
    kind: "text",
    bind: "brand.contact.phone",
    gereklilik: "zorunlu",
  };

  it("logosuz müşteri + zorunlu logo slotu → empty-required(logo)", () => {
    expect(eksikZorunluVarliklar([ZORUNLU_LOGO], musteri(false), doc("menu-grid-cells"))).toEqual([
      { type: "empty-required", slotId: "logo" },
    ]);
  });

  it("logolu müşteri (brandkit id + assets kaydı) → uyarı yok", () => {
    expect(eksikZorunluVarliklar([ZORUNLU_LOGO], musteri(true), doc("menu-grid-cells"))).toEqual([]);
  });

  it("gereklilik'siz image slot → uyarı yok (yokluk = boş kalabilir)", () => {
    expect(eksikZorunluVarliklar([ILANSIZ_LOGO], musteri(false), doc("menu-grid-cells"))).toEqual([]);
  });

  it("zorunlu ama kind!=='image' slot → uyarı yok (v1 yalnız image — dosya gereksinimi)", () => {
    expect(eksikZorunluVarliklar([ZORUNLU_METIN], musteri(false), doc("menu-grid-cells"))).toEqual([]);
  });

  it("birden çok eksik zorunlu slot SLOT SIRASIYLA döner (deterministik çıktı)", () => {
    const monoZorunlu: SlotDef = {
      id: "logo_mono",
      kind: "image",
      bind: "brand.logo_mono",
      gereklilik: "zorunlu",
    };
    expect(
      eksikZorunluVarliklar(
        [ZORUNLU_LOGO, ZORUNLU_METIN, monoZorunlu],
        musteri(false),
        doc("menu-grid-cells")
      )
    ).toEqual([
      { type: "empty-required", slotId: "logo" },
      { type: "empty-required", slotId: "logo_mono" },
    ]);
  });
});

/* ── (c) kabul-fabrika BOŞLUK KAPANDI — YENİ davranış ────────────────────── */

describe("kabul-fabrika — logo ilanı artık DAVRANIŞTIR (ilan!=davranış yarası kapandı)", () => {
  /* Eski hâl: manifest logo slotu İLAN ediyordu ama analyze'ı empty-required
     ÜRETMİYORDU — aynı ilan iki davranış. Artık fabrika analyze'ı da ilandan
     okur; logosuz müşteride fabrika belgesi BLOCKER görür (fabrika-motor
     sessiz-kırpma kapanışı emsali — bilinçli davranış değişikliği).
     Çağrı deseni: TemplateEntry.warnings köprüsü (fabrika şablonları adla
     import edilemez — generated/kabul-fabrika/analyze.test.ts emsali). */

  it("logosuz müşteride entry.warnings empty-required(logo) İÇERİR", () => {
    const entry = TEMPLATES["kabul-fabrika"];
    expect(entry.warnings).toBeDefined();
    expect(entry.warnings!(musteri(false, 2), doc("kabul-fabrika"))).toContainEqual({
      type: "empty-required",
      slotId: "logo",
    });
  });

  it("logolu müşteride İÇERMEZ", () => {
    const entry = TEMPLATES["kabul-fabrika"];
    expect(entry.warnings!(musteri(true, 2), doc("kabul-fabrika"))).not.toContainEqual({
      type: "empty-required",
      slotId: "logo",
    });
  });
});

/* ── (d) Koşullu aileler pin — v1 sınırı YAPISAL olarak görünür ──────────── */

describe("koşullu aileler (vitrophanie/garment) gereklilik İLAN ETMEZ", () => {
  it("vitro-centre ve garment manifest'lerinde gereklilik işaretli HİÇBİR slot yok", () => {
    for (const id of ["vitro-centre", "garment"]) {
      const isaretli = TEMPLATES[id].manifest.slots.filter((s) => s.gereklilik !== undefined);
      expect(
        isaretli.map((s) => s.id),
        `${id}: koşullu ailede düz gereklilik ilanı — bu aile zorunluluğunu ` +
          "parametreden türetir (vitrophanie: mode; garment: kumaş+alan); düz ilan " +
          "eklemek koşullu gereklilik v2 kararını ister (TODO şerhi + journal)"
      ).toEqual([]);
    }
  });
});
