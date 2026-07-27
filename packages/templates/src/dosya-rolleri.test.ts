/* DOSYA ROLLERİ (kabul edilen varlık türü) İLANI — kayıt-defteri-geneli
   nöbetçi + türetim/red icraları (Canonical 7.2/502 "Dosya gereksinimleri ve
   ROLLERİ" maddesinin İKİNCİ yarısı — birinci yarısı gereklilik'ti; journal
   2026-07-26-dosya-rolleri-ilani).

   Bu dosya BEŞ şeyi sabitler:
   (1) TÜM kayıtlı image slotlarının rolü SLOT SLOT çivilenir (22 slot,
       repeater itemSlots DÂHİL) — rol eşlemesi ürün kararıdır; tablo iki
       yönlü tamdır.
   (2) ÖLÇÜM YAPISAL: 18/22 slotta rol BİND'DAN türetilir ve o slotlarda
       `kabul` alanı YAZILI DEĞİLDİR (çift kaynak yok); yalnız türetimin
       bittiği 4 slot ilan taşır.
   (3) Bozuk ya da İKİNCİ-KAYNAK ilan kayıt defterinden GEÇEMEZ (registry-core
       icra yolu: bind+kabul birlikte · bilinmeyen tür · boş liste · tekrar).
   (4) Kısıtsızlık AÇIK: null "rol yok" değil "KISITSIZ" demektir — image
       olmayan slot, tablosuz bind ve ilansız bind'sız slot null döner.
   (5) registry-core'un literal varlık sözlüğü AssetKindSchema ile EŞ kalır
       (runtime import bilinçli yok — çapraz doğrulama burada;
       MOCKUP_SAHNE_TURLERI emsali, mockup-tercihi.test.ts). */

import { describe, expect, it } from "vitest";
import { AssetKindSchema, type AssetKind } from "@tezgah/shared";

import {
  TEMPLATES,
  kabulEdilenTurler,
  kurVeDogrula,
  type SlotDef,
  type TemplateEntry,
  type TemplateManifest,
} from "./index.js";
import { VARLIK_TURLERI } from "./registry-core.js";

/* ── (a) NÖBETÇİ: 22 image slotunun rolü slot slot çivili ────────────────── */

/* Beklenen tablo SLOT SLOT elle yazılır; kayıt defterinden TÜRETİLMEZ
   (BEKLENEN_SUBSTRATLAR / BEKLENEN_ZORUNLU_SLOTLAR emsali — türetilseydi test
   uygulamanın her dediğine "evet" derdi). Anahtar: `${şablon}/${slotId}`. */
const BEKLENEN_ROLLER: Record<string, readonly AssetKind[]> = {
  /* — TÜRETİLEN: brand.logo_primary ×11 → ["logo"] — */
  "menu-grid-cells/logo": ["logo"],
  "menu-liste-premium/logo": ["logo"],
  "menu-trifold/logo": ["logo"],
  "kabul-fabrika/logo": ["logo"] /* GENERATED — fabrika da marka logosu taşır */,
  "flyer/logo": ["logo"],
  "carte-fidelite/logo": ["logo"],
  "vitro-bandeau/logo": ["logo"],
  "vitro-centre/logo": ["logo"],
  "vitro-colonne/logo": ["logo"],
  "enseigne-panneau/logo": ["logo"],
  "garment/logo": ["logo"],
  /* — TÜRETİLEN: brand.logo_mono ×4 → ["logo"] (mono da bir LOGODUR) — */
  "vitro-bandeau/logo_mono": ["logo"],
  "vitro-centre/logo_mono": ["logo"],
  "vitro-colonne/logo_mono": ["logo"],
  "garment/logo_mono": ["logo"],
  /* — TÜRETİLEN: item.photo ×3 → ["photo","other"] (repeater itemSlots) — */
  "menu-grid-cells/photo": ["photo", "other"],
  "flyer/photo": ["photo", "other"],
  "kabul-fabrika/photo": ["photo", "other"],
  /* — İLANLI (bind:null, rol TÜRETİLEMEZ; manifestlerde elle yazılı) ×4 — */
  "menu-liste-premium/deco1": ["photo", "other"],
  "menu-liste-premium/deco2": ["photo", "other"],
  "menu-liste-premium/deco3": ["photo", "other"],
  "menu-trifold/cover_photo": ["photo", "other"],
};

/** Kayıt defterindeki TÜM image slotları (top-level + repeater itemSlots) */
function kayitliImageSlotlari(): Array<{ anahtar: string; slot: SlotDef }> {
  const out: Array<{ anahtar: string; slot: SlotDef }> = [];
  for (const [id, entry] of Object.entries(TEMPLATES)) {
    const tum: readonly SlotDef[] = [
      ...entry.manifest.slots,
      ...(entry.manifest.repeater?.itemSlots ?? []),
    ];
    for (const slot of tum) {
      if (slot.kind === "image") out.push({ anahtar: `${id}/${slot.id}`, slot });
    }
  }
  return out;
}

/** Kayıt defterindeki TÜM slotlar (tür ayrımı yok; çift-kaynak taraması için) */
function kayitliTumSlotlar(): Array<{ anahtar: string; slot: SlotDef }> {
  const out: Array<{ anahtar: string; slot: SlotDef }> = [];
  for (const [id, entry] of Object.entries(TEMPLATES)) {
    for (const slot of entry.manifest.slots) out.push({ anahtar: `${id}/${slot.id}`, slot });
    for (const slot of entry.manifest.repeater?.itemSlots ?? []) {
      out.push({ anahtar: `${id}/items/${slot.id}`, slot });
    }
  }
  return out;
}

describe("NÖBETÇİ: dosya rolleri TAM olarak bunlar (22 image slotu)", () => {
  it("kayıt defteri beklenen rol tablosuyla BİREBİR eşleşir (iki yönlü tamlık)", () => {
    const hepsi = kayitliImageSlotlari();
    /* anahtar çakışması olsaydı fromEntries sessizce ezerdi — önce sayı çivili */
    expect(new Set(hepsi.map((s) => s.anahtar)).size, "anahtar çakışması").toBe(hepsi.length);

    const gercek = Object.fromEntries(
      hepsi.map(({ anahtar, slot }) => [anahtar, kabulEdilenTurler(slot)])
    );
    expect(
      gercek,
      "rol eşlemesi değişti: dosya rolü ÜRÜN KARARIDIR, journal ister — bu tablo " +
        "varlık seçicilerin filtresidir (önleyici katman); bir slotun kabul kümesini " +
        "genişletmek marka logosunun yerine keyfi fotoğraf bağlanabilmesi demektir, " +
        "daraltmak ise bugün bağlanabilen varlıkları seçilemez kılar"
    ).toEqual(BEKLENEN_ROLLER);
    /* iki yönlü tamlık AÇIKÇA: kayıtta tablosuz slot yok, tabloda kayıtsız slot yok */
    expect(Object.keys(gercek).sort()).toEqual(Object.keys(BEKLENEN_ROLLER).sort());
  });

  it("ÖLÇÜM çivili: 22 image slotu = 18 türetilen (11+4+3) + 4 ilanlı", () => {
    const hepsi = kayitliImageSlotlari();
    expect(hepsi.length, "kayıtlı image slotu sayısı").toBe(22);

    const turetilen = hepsi.filter(({ slot }) => slot.bind !== null);
    const ilanli = hepsi.filter(({ slot }) => slot.bind === null);
    expect(turetilen.length, "bind'dan türetilen").toBe(18);
    expect(ilanli.length, "bind'sız (ilan gerektiren)").toBe(4);

    const bindDagilimi: Record<string, number> = {};
    for (const { slot } of turetilen) {
      const b = slot.bind as string;
      bindDagilimi[b] = (bindDagilimi[b] ?? 0) + 1;
    }
    expect(
      bindDagilimi,
      "bind dağılımı değişti: türetim tablosu (BIND_ROLLERI) ölçümle birlikte gözden geçirilmeli"
    ).toEqual({ "brand.logo_primary": 11, "brand.logo_mono": 4, "item.photo": 3 });

    expect(ilanli.map((s) => s.anahtar).sort()).toEqual([
      "menu-liste-premium/deco1",
      "menu-liste-premium/deco2",
      "menu-liste-premium/deco3",
      "menu-trifold/cover_photo",
    ]);
  });
});

/* ── (b) Türetim BİRİNCİLDİR: bind'lı slotta el yazımı ilan YOK ──────────── */

describe("türetim birincil — bind'lı slotlarda `kabul` YAZILI DEĞİL (çift kaynak yok)", () => {
  it("kayıtlı HİÇBİR bind'lı slot (itemSlots dâhil) `kabul` alanı taşımaz", () => {
    const ihlal = kayitliTumSlotlar()
      .filter(({ slot }) => slot.bind !== null && slot.kabul !== undefined)
      .map((s) => s.anahtar);
    expect(
      ihlal,
      "bind'lı slota `kabul` yazılmış: rol bind'dan TÜRETİLİR — el yazımı alan " +
        "İKİNCİ KAYNAKTIR ve sürüklenir (ilan bir şey der, filtre başkasını uygular). " +
        "registry-core top-level slotlarda bunu yük zamanında reddeder; itemSlots'u " +
        "GEZMEDİĞİ için (şerh) o boşluğu bu pin kapatır"
    ).toEqual([]);
  });

  it("`kabul` alanı YALNIZ türetimin bittiği 4 slotta yazılıdır", () => {
    const ilanli = kayitliTumSlotlar()
      .filter(({ slot }) => slot.kabul !== undefined)
      .map((s) => s.anahtar)
      .sort();
    expect(ilanli).toEqual([
      "menu-liste-premium/deco1",
      "menu-liste-premium/deco2",
      "menu-liste-premium/deco3",
      "menu-trifold/cover_photo",
    ]);
  });

  it("ama SORGU o 18 slot için küme döner — rol ilandan değil TÜRETİMDEN okunur", () => {
    const turetilen = kayitliImageSlotlari().filter(({ slot }) => slot.bind !== null);
    expect(turetilen.length).toBe(18);
    for (const { anahtar, slot } of turetilen) {
      expect(slot.kabul, `${anahtar}: alan yazılı olmamalı`).toBeUndefined();
      expect(kabulEdilenTurler(slot), `${anahtar}: sorgu küme dönmeli`).not.toBeNull();
    }
  });

  it("birim: bind deseni → küme (logo/logo_mono tekil, item.photo photo+other)", () => {
    const im = (bind: string | null, kabul?: readonly AssetKind[]): SlotDef => ({
      id: "s",
      kind: "image",
      bind,
      ...(kabul ? { kabul } : {}),
    });
    expect(kabulEdilenTurler(im("brand.logo_primary"))).toEqual(["logo"]);
    expect(kabulEdilenTurler(im("brand.logo_mono"))).toEqual(["logo"]);
    expect(kabulEdilenTurler(im("item.photo"))).toEqual(["photo", "other"]);
    /* bind'sız → ilana düşer */
    expect(kabulEdilenTurler(im(null, ["logo"]))).toEqual(["logo"]);
  });
});

/* ── (c) Yük-zamanı RED yolları — ayrışan/ikinci-kaynak ilan yüklenemez ──── */

describe("bozuk rol ilanı kayıt defterinden geçemez", () => {
  const sahteGiris = (slots: SlotDef[]): TemplateEntry => ({
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
      slots,
      themes: [],
      production_channels: ["print", "preview"],
      production_techniques: ["impression"],
      production_substrate: "kagit",
    } satisfies TemplateManifest,
    Component: (() => null) as unknown as TemplateEntry["Component"],
  });
  const kur = (slots: SlotDef[]) => () => kurVeDogrula({}, [sahteGiris(slots)]);

  it("ÇİFT KAYNAK KAPISI: bind VARSA kabul yazılamaz (rol bind'dan türetilir)", () => {
    const hata = kur([
      { id: "logo", kind: "image", bind: "brand.logo_primary", kabul: ["logo"] },
    ]);
    expect(hata).toThrow(/kabul/);
    expect(hata).toThrow(/bind/);
    expect(hata).toThrow(/TÜRETİLİR/);
  });

  it("ÖLÜ İLAN KAPISI: kind!=='image' slota kabul yazılamaz (okuyucusu yok)", () => {
    /* Ana döngü eklemesi (hasım tur bulgusu): metin/qr/renk slotuna yazılan
       kabul kümesini hiçbir okuyucu tüketmez — kabulEdilenTurler null'a düşer,
       AssetPicker o slot için hiç açılmaz. Sessiz ölü ilan bu paketin kendi
       doktrinine aykırıdır; yük zamanında reddedilir. */
    const hata = kur([{ id: "phone", kind: "text", bind: null, kabul: ["logo"] }]);
    expect(hata).toThrow(/kabul/);
    expect(hata).toThrow(/ölü ilandır/);
  });

  it("BİLİNMEYEN varlık türü reddedilir (yazım hatası sessiz no-op olamaz)", () => {
    expect(
      kur([
        { id: "deco", kind: "image", bind: null, kabul: ["fotograf"] as unknown as AssetKind[] },
      ])
    ).toThrow(/bilinmeyen varlık türü/);
  });

  it("BOŞ liste reddedilir (türsüz kabul ilan değildir)", () => {
    expect(kur([{ id: "deco", kind: "image", bind: null, kabul: [] }])).toThrow(
      /kabul listesi boş olamaz/
    );
  });

  it("TEKRARLI tür reddedilir", () => {
    expect(
      kur([{ id: "deco", kind: "image", bind: null, kabul: ["photo", "photo"] }])
    ).toThrow(/tekrarlı tür/);
  });

  it("tutarlı ilan geçer (bind:null + photo/other — deco/cover_photo deseni)", () => {
    expect(kur([{ id: "deco", kind: "image", bind: null, kabul: ["photo", "other"] }])).not.toThrow();
  });

  it("ilansız slot geçer (yokluk = kısıtsız, mockup_tercihi emsali)", () => {
    expect(kur([{ id: "deco", kind: "image", bind: null }])).not.toThrow();
  });
});

/* ── (d) KISITSIZLIK: null "rol yok" değil "kısıtsız" demektir ───────────── */

describe("kabulEdilenTurler — null KISITSIZ demektir, 'rol yok' değil", () => {
  it("kind!=='image' slot → null (dosya rolü yalnız görsel slotların boyutudur)", () => {
    const metin: SlotDef = { id: "phone", kind: "text", bind: "brand.contact.phone" };
    expect(kabulEdilenTurler(metin)).toBeNull();
    for (const kind of ["price", "qr", "badge", "color"] as const) {
      expect(kabulEdilenTurler({ id: "x", kind, bind: null }), kind).toBeNull();
    }
  });

  it("kind!=='image' slotta `kabul` YAZILI olsa bile null (rol görsel boyuttur)", () => {
    /* SAF FONKSİYON sözleşmesi: sorgu böyle bir slotta null döner. Böyle bir
       MANİFEST ise kayıt defterinden geçemez (yukarıdaki ölü-ilan kapısı) —
       fonksiyonun savunması ile registry'nin reddi birbirini tamamlar. */
    const metin: SlotDef = { id: "x", kind: "text", bind: null, kabul: ["logo"] };
    expect(kabulEdilenTurler(metin)).toBeNull();
  });

  it("tabloda karşılığı olmayan bind → null (yeni desen sessizce kısıtsız kalır)", () => {
    expect(kabulEdilenTurler({ id: "x", kind: "image", bind: "brand.watermark" })).toBeNull();
  });

  it("ilansız bind'sız image slotu → null (bugünkü filtresiz davranış)", () => {
    expect(kabulEdilenTurler({ id: "x", kind: "image", bind: null })).toBeNull();
  });

  it("prototip zinciri rol DEĞİLDİR: bind 'toString'/'constructor' → null", () => {
    expect(kabulEdilenTurler({ id: "x", kind: "image", bind: "toString" })).toBeNull();
    expect(kabulEdilenTurler({ id: "x", kind: "image", bind: "constructor" })).toBeNull();
  });
});

/* ── (e) Sözlük eş-kümeliği: literal VARLIK_TURLERI ≡ AssetKindSchema ────── */

describe("registry-core literal sözlüğü shared ile EŞ küme kalır", () => {
  it("VARLIK_TURLERI ≡ AssetKindSchema.options (runtime import bilinçli yok)", () => {
    expect([...VARLIK_TURLERI].sort()).toEqual([...AssetKindSchema.options].sort());
  });

  it("ilan edilen her kabul kümesi sözlüğün alt kümesidir (tekrarsız, boş değil)", () => {
    for (const { anahtar, slot } of kayitliTumSlotlar()) {
      if (slot.kabul === undefined) continue;
      expect(slot.kabul.length, `${anahtar}: boş kabul`).toBeGreaterThan(0);
      expect(new Set(slot.kabul).size, `${anahtar}: tekrarlı tür`).toBe(slot.kabul.length);
      for (const tur of slot.kabul) {
        expect(VARLIK_TURLERI as readonly string[], `${anahtar}: "${tur}" sözlükte yok`).toContain(tur);
      }
    }
  });
});
