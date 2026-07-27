/* KOŞULLU GEREKLİLİK v2 — kayıt-defteri-geneli nöbetçi + iki modun icrası +
   yük-zamanı red yolları + v1 regresyonu (Canonical 7.2/496 "koşullu" alan
   sınıfı, 7.2/502 dosya gereksinimleri; 4.5 "bildirimsel, deterministik, test
   edilebilir"; journal 2026-07-26-kosullu-gereklilik-v2).

   Zorunluluk artık KOŞULLU olabilir: SlotDef.gereklilik = "zorunlu" (v1,
   koşulsuz) | { kosul } (koşul doğruyken zorunlu). Koşul dili KAPALI etiketli
   birleşimdir (SlotKosulu — bugün tek kind: param_esittir), F1Trigger emsali;
   jenerik ifade dili BİLEREK yazılmadı (gerekçe types.ts şerhinde: depoda
   serbest-ifade emsali sıfır, kanonik dil tarif etmez, spekülatif genişlik
   yazılmaz).

   Bu dosya DÖRT şeyi sabitler:
   (a) TÜM koşullu ilanlar aile aile çivilenir — koşullu zorunluluk BLOCKER
       üretir (empty-required çekirdek blocker'dır, export kapısını tutar);
       koşul eklemek/çıkarmak ürün kararıdır, journal kaydı ister.
   (b) İKİ MODUN İCRASI: koşul doğruyken uyarı VAR, yanlışken uyarı YOK —
       "ilan = davranış" bu iki dalda ölçülür.
   (c) Bozuk koşul kayıt defterinden GEÇEMEZ: olmayan param, seçeneksiz param
       ve küme dışı değer yük zamanında reddedilir (üçü de ÖLÜ İLAN kapısı).
   (d) v1 REGRESYONU: düz "zorunlu" ilanı olan slotlar BİREBİR eskisi gibi
       çalışır — genişleme additive'dir.

   ŞERH (ölçülmüş sınır — PARAM YOKSA KOŞUL YANLIŞTIR): değerlendirici paramı
   `doc.params` üzerinden HAM okur (gerekçe: eksikZorunluVarliklar imzası
   manifest almaz; imzayı genişletmek 6 çağrı yerini birden değiştirir, ayrı
   karar). DocumentStateSchema.params `z.record(z.unknown()).default({})`'tir —
   PARAM BAŞINA VARSAYILAN UYGULAMAZ; yeni belge `params: {}` ile doğar. Bu
   yüzden param belgede yazılı DEĞİLSE koşul YANLIŞ sayılır ve slot atlanır.
   Kural aşağıda açıkça çivilidir; manifest/şema varsayılanına dayanan belgede
   koşulun ateşlenmediği BİLİNEN ve ilanlı sınırdır. */

import { describe, expect, it } from "vitest";
import {
  CatalogSchema,
  DocumentStateSchema,
  defaultBrandKit,
  type ClientDTO,
} from "@tezgah/shared";
import {
  TEMPLATES,
  analyzeVitro,
  eksikZorunluVarliklar,
  kurVeDogrula,
  type SlotDef,
  type SlotKosulu,
  type TemplateEntry,
  type TemplateManifest,
} from "./index.js";

/* ── Müşteri kurma deseni (dosya-gereklilik.test.ts emsali): brandkit'e id
   yazmak YETMEZ, asset'i client.assets'e de kaydetmek gerekir — id yazıp kaydı
   unutmak "logo var sanılan logosuz müşteri" üretir (assetById null döner). ── */

const sahteVarlik = (id: string) => ({
  id,
  client_id: "cli_k",
  kind: "logo" as const,
  filename: `${id}.svg`,
  width_px: 4000,
  height_px: 4000,
  tags: "",
  created_at: "t",
  urls: { orig: "/o", master: `/m/${id}`, thumb: "/t" },
});

function musteri(opts: { logo?: boolean; mono?: boolean } = {}): ClientDTO {
  const kit = defaultBrandKit();
  const assets = [];
  if (opts.logo) {
    kit.logo_primary = "ast_p";
    assets.push(sahteVarlik("ast_p"));
  }
  if (opts.mono) {
    kit.logo_mono = "ast_m";
    assets.push(sahteVarlik("ast_m"));
  }
  return {
    id: "cli_k",
    name: "Koşul Test",
    slug: "kosul-test",
    notes: "",
    currency: "EUR",
    menu_language: "fr",
    brandkit: kit,
    catalog: CatalogSchema.parse({ categories: [] }),
    assets,
    created_at: "t",
    updated_at: "t",
  } as ClientDTO;
}

const doc = (params: Record<string, unknown> = {}) =>
  DocumentStateSchema.parse({ template_id: "vitro-bandeau", params });

/* ── (a) NÖBETÇİ: koşullu ilanlar TAM olarak bunlar ─────────────────────────
   Beklenen tablo AİLE AİLE elle yazılır; kayıt defterinden TÜRETİLMEZ
   (BEKLENEN_SUBSTRATLAR / BEKLENEN_ZORUNLU_SLOTLAR emsali).

   ÜÇ VİTRO × İKİ SLOT = 6 GİRİŞ ve BAŞKA AİLE YOK. Üç kompozisyon TEK
   SLOT_DEFS paylaşır (vitrophanie/manifest.ts) — tek ilan noktası üç manifesti
   birden kapatır, bu yüzden üçü de aynı tabloyu göstermek ZORUNDADIR.
   GARMENT bilerek YOK: koşullu ilanı hâlâ yazamaz (üç ön koşul borcu —
   areas paramı ilansız · area:*:logo slotları ilansız · paramValue()
   dejenerasyonu), elle if'leri aynen yaşar. */

const M = (p: string, d: string): SlotKosulu => ({ kind: "param_esittir", param: p, deger: d });

const VITRO_KOSULLARI: Record<string, SlotKosulu> = {
  logo: M("mode", "impression"),
  logo_mono: M("mode", "decoupe"),
};

const BEKLENEN_KOSULLU_SLOTLAR: Record<string, Record<string, SlotKosulu>> = {
  "vitro-bandeau": VITRO_KOSULLARI,
  "vitro-centre": VITRO_KOSULLARI,
  "vitro-colonne": VITRO_KOSULLARI,
};

describe("NÖBETÇİ: koşullu gereklilik ilanları TAM olarak bunlar (3 aile × 2 slot)", () => {
  it("kayıt defteri beklenen koşul tablosuyla BİREBİR eşleşir (iki yönlü tamlık)", () => {
    /* itemSlots DÂHİL gezilir: registry-core denetimi bugün yalnız
       manifest.slots üzerindedir (kabul kapısının birebir emsali ve aynı
       gerekçe) — repeater yüzeyindeki boşluk BU nöbetçiyle kapatılır. */
    const kosullulari = (m: TemplateManifest): Record<string, SlotKosulu> => {
      const tum: SlotDef[] = [...m.slots, ...(m.repeater?.itemSlots ?? [])];
      const out: Record<string, SlotKosulu> = {};
      for (const s of tum) {
        if (s.gereklilik !== undefined && s.gereklilik !== "zorunlu") out[s.id] = s.gereklilik.kosul;
      }
      return out;
    };
    const gercek: Record<string, Record<string, SlotKosulu>> = {};
    for (const [id, e] of Object.entries(TEMPLATES)) {
      const k = kosullulari(e.manifest);
      if (Object.keys(k).length > 0) gercek[id] = k;
    }
    expect(
      gercek,
      "Koşullu gereklilik tablosu değişmiş: koşullu zorunluluk BLOCKER üretir " +
        "(empty-required çekirdek blocker'dır, export kapısını tutar) — koşul " +
        "eklemek/çıkarmak ürün kararıdır ve journal kaydı ister; koşulun " +
        "parama ve seçenek kümesine bağı registry'de yük zamanında doğrulanır"
    ).toEqual(BEKLENEN_KOSULLU_SLOTLAR);
    /* iki yönlü tamlık AÇIKÇA: koşullu ilanı olan tablosuz aile yok */
    expect(Object.keys(gercek).sort()).toEqual(Object.keys(BEKLENEN_KOSULLU_SLOTLAR).sort());
  });

  it("GARMENT koşullu ilan ETMEZ (üç ön koşul borcu kapanmadan ifade edilemez)", () => {
    const isaretli = TEMPLATES["garment"].manifest.slots.filter(
      (s) => s.gereklilik !== undefined && s.gereklilik !== "zorunlu"
    );
    expect(
      isaretli.map((s) => s.id),
      "garment koşullu ilan ediyor: bu ailenin engeli koşul DİLİ değil ÜÇ ÖN " +
        "KOŞUL borcudur (areas paramı manifest.params'ta yok · area:*:logo " +
        "slotları manifest.slots'ta yok · paramValue() color/number'da dejenere) " +
        "— üçü kapanmadan koşul doğrulanamaz; ayrı paket + journal kararı ister"
    ).toEqual([]);
  });
});

/* ── (b) İKİ MODUN İCRASI — koşul doğruyken uyarı VAR, yanlışken YOK ──────── */

describe("eksikZorunluVarliklar — koşullu ilanın iki dalı da icra edilir", () => {
  const KOSULLU_LOGO: SlotDef = {
    id: "logo",
    kind: "image",
    bind: "brand.logo_primary",
    gereklilik: { kosul: M("mode", "impression") },
  };
  const KOSULLU_MONO: SlotDef = {
    id: "logo_mono",
    kind: "image",
    bind: "brand.logo_mono",
    gereklilik: { kosul: M("mode", "decoupe") },
  };
  const IKISI = [KOSULLU_LOGO, KOSULLU_MONO];

  it('mode="impression": logo eksikse uyarı VAR, logo_mono eksikse uyarı YOK', () => {
    expect(eksikZorunluVarliklar(IKISI, musteri(), doc({ mode: "impression" }))).toEqual([
      { type: "empty-required", slotId: "logo" },
    ]);
  });

  it('mode="decoupe": logo_mono eksikse uyarı VAR, logo eksikse uyarı YOK (TERSİ)', () => {
    expect(eksikZorunluVarliklar(IKISI, musteri(), doc({ mode: "decoupe" }))).toEqual([
      { type: "empty-required", slotId: "logo_mono" },
    ]);
  });

  it('mode="impression" + logo VARSA uyarı yok (koşul doğru ama varlık dolu)', () => {
    expect(eksikZorunluVarliklar(IKISI, musteri({ logo: true }), doc({ mode: "impression" }))).toEqual([]);
  });

  it('mode="decoupe" + mono VARSA uyarı yok', () => {
    expect(eksikZorunluVarliklar(IKISI, musteri({ mono: true }), doc({ mode: "decoupe" }))).toEqual([]);
  });

  it("koşulu tutan slot eksik varlıkla SLOT SIRASIYLA döner (deterministik çıktı)", () => {
    /* İki slotun koşulu AYNI dala bakarsa ikisi de düşer — sıra slot sırasıdır */
    const ikiziLogo: SlotDef = { ...KOSULLU_MONO, gereklilik: { kosul: M("mode", "impression") } };
    expect(eksikZorunluVarliklar([KOSULLU_LOGO, ikiziLogo], musteri(), doc({ mode: "impression" }))).toEqual([
      { type: "empty-required", slotId: "logo" },
      { type: "empty-required", slotId: "logo_mono" },
    ]);
  });

  it("ÖLÇÜLMÜŞ SINIR: param belgede YOKSA koşul YANLIŞTIR (hiçbir slot zorunlu değil)", () => {
    /* DocumentStateSchema.params = z.record(z.unknown()).default({}) — PARAM
       BAŞINA VARSAYILAN UYGULAMAZ; yeni belge params:{} ile doğar (create
       rotası yalnız yüzey ön-dolumuyla w_cm/h_cm yazar) ve kullanıcı ilgili
       denetimi ellemedikçe param belgede HİÇ BULUNMAZ. Değerlendirici ham
       okuduğu için (imza manifest almaz) varsayılan BURADA uygulanmaz.
       Bu, koşullu ilanın BİLİNEN ve ilanlı sınırıdır — çivilenmiştir ki
       sessizce değişmesin. */
    expect(doc().params["mode"], "belge params'ı param-başına varsayılan uygulamaz").toBeUndefined();
    expect(eksikZorunluVarliklar(IKISI, musteri(), doc())).toEqual([]);
  });

  it("param DOLU ama başka değerdeyse koşul yanlıştır (strict eşitlik)", () => {
    expect(eksikZorunluVarliklar(IKISI, musteri(), doc({ mode: "baska" }))).toEqual([]);
  });

  it("koşullu ama kind!=='image' slot → uyarı yok (v1 sınırı korunur: yalnız dosya)", () => {
    const metin: SlotDef = {
      id: "phone",
      kind: "text",
      bind: "brand.contact.phone",
      gereklilik: { kosul: M("mode", "impression") },
    };
    expect(eksikZorunluVarliklar([metin], musteri(), doc({ mode: "impression" }))).toEqual([]);
  });
});

/* ── (c) Yük-zamanı RED yolları — bozuk koşul kayıt defterinden geçemez ───── */

describe("bozuk koşul ilanı kayıt defterinden geçemez (üç ölü-ilan kapısı)", () => {
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
      params: [
        { id: "mode", type: "choice", options: ["impression"], default: "impression", label_tr: "Mod" },
        { id: "cut_color", type: "color", default: "#1A1A1A", label_tr: "Renk" },
        { id: "bleed_mm", type: "choice", options: [0, 3, 5], default: 0, label_tr: "Bleed" },
      ],
      slots,
      themes: [],
      production_channels: ["print", "preview"],
      production_techniques: ["impression"],
      production_substrate: "kagit",
    },
    Component: (() => null) as unknown as TemplateEntry["Component"],
  });
  const kur = (slots: SlotDef[]) => () => kurVeDogrula({}, [sahteGiris(slots)]);
  const slot = (g: SlotDef["gereklilik"]): SlotDef[] => [
    { id: "logo", kind: "image", bind: "brand.logo_primary", gereklilik: g },
  ];

  it("OLMAYAN PARAM reddedilir (olmayan parama bağlanan koşul ölü ilandır)", () => {
    expect(kur(slot({ kosul: M("yok_boyle_param", "impression") }))).toThrow(
      /manifest params listesinde yok.*ölü ilandır/s
    );
  });

  it("SEÇENEKSİZ PARAM reddedilir (color/number: koşul kurulamaz — paramValue dejenerasyonu)", () => {
    expect(kur(slot({ kosul: M("cut_color", "#1A1A1A") }))).toThrow(/seçenek kümesi.*taşımıyor/s);
  });

  it("KÜME DIŞI DEĞER reddedilir (asla doğru olamayacak koşul ölü ilandır)", () => {
    expect(kur(slot({ kosul: M("mode", "decoupe") }))).toThrow(
      /seçenekleri arasında yok.*ölü ilandır/s
    );
  });

  it("TİP UYUŞMAZLIĞI reddedilir (sayısal seçenekli parama string değer)", () => {
    /* Belge o paramda hiçbir zaman string tutmaz (editör TİPLİ yazar) —
       strict eşitlik bunu küme dışı değer olarak yakalar */
    expect(kur(slot({ kosul: M("bleed_mm", "0") }))).toThrow(/seçenekleri arasında yok/);
  });

  it("TUTARLI koşul geçer (mode == impression, seçenek kümesinde)", () => {
    expect(kur(slot({ kosul: M("mode", "impression") }))).not.toThrow();
  });

  it("v1 ilanları denetimsiz geçer: düz \"zorunlu\" ve ilansız slot", () => {
    expect(kur(slot("zorunlu"))).not.toThrow();
    expect(kur(slot(undefined))).not.toThrow();
  });
});

/* ── (d) v1 REGRESYONU — düz "zorunlu" BİREBİR eskisi gibi ───────────────── */

describe("v1 regresyonu: koşulsuz \"zorunlu\" ilanı davranışını DEĞİŞTİRMEZ", () => {
  const ZORUNLU_LOGO: SlotDef = {
    id: "logo",
    kind: "image",
    bind: "brand.logo_primary",
    gereklilik: "zorunlu",
  };

  it("logosuz müşteri + koşulsuz zorunlu logo → empty-required (param'dan BAĞIMSIZ)", () => {
    /* Koşulsuz ilan hiçbir parama bakmaz: mode ne olursa olsun uyarı düşer */
    for (const params of [{}, { mode: "impression" }, { mode: "decoupe" }]) {
      expect(eksikZorunluVarliklar([ZORUNLU_LOGO], musteri(), doc(params))).toEqual([
        { type: "empty-required", slotId: "logo" },
      ]);
    }
  });

  it("logolu müşteri → uyarı yok", () => {
    expect(eksikZorunluVarliklar([ZORUNLU_LOGO], musteri({ logo: true }), doc())).toEqual([]);
  });

  it("ilansız slot → uyarı yok (yokluk = boş kalabilir)", () => {
    const ilansiz: SlotDef = { id: "logo", kind: "image", bind: "brand.logo_primary" };
    expect(eksikZorunluVarliklar([ilansiz], musteri(), doc())).toEqual([]);
  });

  it("KAYITLI AİLELER: chrome logo ilanları aynen uyarı üretir (canlı defter)", () => {
    /* v1'in canlı tüketicileri — koşullu genişleme bunlara dokunmamalı */
    for (const id of ["menu-grid-cells", "menu-liste-premium", "menu-trifold", "flyer", "carte-fidelite", "enseigne-panneau"]) {
      const slots = TEMPLATES[id].manifest.slots;
      expect(
        eksikZorunluVarliklar(slots, musteri(), DocumentStateSchema.parse({ template_id: id })),
        `${id}: v1 zorunlu-slot davranışı değişmiş`
      ).toEqual([{ type: "empty-required", slotId: "logo" }]);
      expect(
        eksikZorunluVarliklar(slots, musteri({ logo: true }), DocumentStateSchema.parse({ template_id: id })),
        `${id}: logolu müşteride uyarı düşmemeli`
      ).toEqual([]);
    }
  });
});

/* ── TUZAK NÖBETÇİSİ (ana döngü eklemesi) ─────────────────────────────────────
   Motorun "param yoksa koşul yanlıştır" kuralı, VARSAYILANA dayanan belgede
   koşulu ateşlemez. Bugün tek koşullu aile (vitrophanie) bunu ÇAĞRI YERİNDE
   telafi ediyor: analyze, şemanın çözdüğü `mode`'u motora açıkça veriyor
   (vitrophanie/index.tsx). Telafi olmasaydı her YENİ DOĞAN belgede bir ÇEKİRDEK
   BLOCKER sessizce düşerdi — ölçüldü (journal: 36 hücrenin 6'sı).

   Tehlike ilerisi içindir: koşullu ilan ekleyip telafiyi UNUTAN bir sonraki
   aile, aynı sessiz kaybı yaşar. Bu nöbetçi tam da onu yakalar — kayıt
   defterindeki HER koşullu aileyi, paramı YAZILI OLMAYAN belgeyle analizden
   geçirir ve varsayılanın gerçekten uygulandığını ölçer. Motor imzası manifest
   alacak şekilde genişletilirse (ölçülmüş tek yapısal çözüm) bu test yeşil
   kalır; telafisi olmayan yeni bir aile eklenirse KIRMIZI olur. */
describe("TUZAK NÖBETÇİSİ: varsayılana dayanan belgede koşul ATEŞLENİR", () => {
  it("koşullu aile KÜMESİ tam olarak üç vitro — yeni üye telafi kontrolü ister", () => {
    const kosullu = Object.entries(TEMPLATES)
      .filter(([, e]) =>
        e.manifest.slots.some((s) => s.gereklilik !== undefined && s.gereklilik !== "zorunlu")
      )
      .map(([id]) => id)
      .sort();
    expect(
      kosullu,
      "koşullu aile kümesi değişti: YENİ ÜYE varsa çağrı yerinin çözülmüş paramı " +
        "motora verdiği DOĞRULANMALI (aşağıdaki vitro testi o telafinin icrasıdır); " +
        "küme boşaldıysa ilan kaybolmuş demektir"
    ).toEqual(["vitro-bandeau", "vitro-centre", "vitro-colonne"]);
  });

  it("vitrophanie: params:{} belgede logo blocker'ı DÜŞMEZ (telafinin icrası)", () => {
    /* ÖLÇÜM (kırmızıya düşerek öğrenildi): vitro TemplateEntry'sinde `warnings`
       köprüsü YOK — jenerik `entry.warnings?.()` yolu bu aileyi hiç ölçemez ve
       sessizce boş dizi döndürür. Bu yüzden telafi DOĞRUDAN analiz üzerinden
       icra edilir. (Köprünün yokluğu ayrı bir şerh: fabrika-motor paketinde
       kurulan `warnings` köprüsü vitro/enseigne/garment'a uzatılmamış.) */
    const bos = DocumentStateSchema.parse({ template_id: "vitro-bandeau" });
    expect(bos.params.mode, "ön koşul — param belgede YAZILI OLMAMALI").toBeUndefined();
    expect(
      analyzeVitro(musteri(), bos).warnings,
      "varsayılana dayanan belgede koşul ateşlenmedi — çağrı yeri çözülmüş paramı " +
        "motora vermiyor (ÇEKİRDEK BLOCKER sessizce düşer; journal: 36 hücrenin 6'sı)"
    ).toContainEqual({ type: "empty-required", slotId: "logo" });
    /* karşı dal: mode yazılıysa da aynı sonuç (telafi fazladan uyarı doğurmaz) */
    const yazili = DocumentStateSchema.parse({
      template_id: "vitro-bandeau",
      params: { mode: "impression" },
    });
    expect(analyzeVitro(musteri(), yazili).warnings).toContainEqual({
      type: "empty-required",
      slotId: "logo",
    });
  });
});
