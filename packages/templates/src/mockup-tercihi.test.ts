/* MOCKUP SAHNE TERCİHİ İLANI — kayıt-defteri-geneli nöbetçi + eşdeğerlik
   kanıtları (Canonical 7.2 "Önizleme türleri"; journal
   2026-07-26-onizleme-turleri).

   Bu dosya DÖRT şeyi sabitler:
   (1) TÜM kayıtlı mockup_tercihi ilanları aile aile çivilenir — ilan
       eklemek/değiştirmek journal kaydı ister; editörün sahne sıralaması bu
       ilana güvenir, sessiz kayma olamaz.
   (2) sahneSkoru, sökülen EditorPage satır-içi skorlamasının referans
       kopyasıyla TEK BİLİNÇLİ FARK dışında birebir aynıdır: kumaş
       karşılaştırması artık ham === değil kumaş-rengi BİRLİĞİDİR (journal
       2026-07-27-kumas-rengi-birligi). Eski golden ham ==='i pinliyordu;
       ölçüm o pinin ÖLÜ bir yolu çivilediğini gösterdi (sahne İSİM yazar,
       belge küçük-harf HEX yazar — isim === hex hiç tutmaz). Yeni golden
       YENİ sözleşmeyi pinler; referans kopyadaki normalizasyon BAĞIMSIZ
       yazılmıştır — kumasRengiEsit'i çağırmak golden'ı totolojiye çevirirdi
       (aşağıdaki referans-kopya şerhi).
   (3) Bozuk ilan kayıt defterinden GEÇEMEZ (registry-core icra yolu).
   (4) registry-core'un literal sahne sözlüğü SceneKindSchema ile EŞ kalır
       (runtime import bilinçli yok — çapraz doğrulama burada). */

import { describe, expect, it } from "vitest";
import { SceneKindSchema } from "@tezgah/shared";

import {
  CEKIRDEK_TERCIH,
  TEMPLATES,
  kurVeDogrula,
  listTemplates,
  sahneSkoru,
  type MockupTercihi,
  type TemplateEntry,
  type TemplateManifest,
} from "./index.js";
import { MOCKUP_SAHNE_TURLERI } from "./registry-core.js";

/* ── (1) Nöbetçi: kayıtlı ilanlar TAM olarak bunlar ──────────────────────── */

/* Beklenen tablo AİLE AİLE elle yazılır; kayıt defterinden TÜRETİLMEZ
   (türetilseydi test uygulamanın her dediğine "evet" derdi). Tabloda olmayan
   her aile ilan TAŞIMAZ = çekirdek tercih (vitrine/facade) geçerli demektir. */
const BEKLENEN_TERCIHLER: Record<string, MockupTercihi> = {
  garment: { sahne_turleri: ["garment"], sahne_puani: 2, eslesme_parami: "fabric_color" },
};

describe("NÖBETÇİ: mockup_tercihi ilanları TAM olarak bunlar", () => {
  it("kayıt defteri (generated dahil) beklenen tercih tablosuyla BİREBİR eşleşir", () => {
    const gercek = Object.fromEntries(
      Object.entries(TEMPLATES)
        .filter(([, e]) => e.manifest.mockup_tercihi !== undefined)
        .map(([id, e]) => [id, e.manifest.mockup_tercihi])
    );
    expect(
      gercek,
      "Tercih tablosu değişmiş: sahne sıralaması ürün davranışıdır — yeni/değişen " +
        "ilan journal kaydı ister (kanal-ilanı nöbetçisiyle aynı disiplin)"
    ).toEqual(BEKLENEN_TERCIHLER);
  });

  it("çekirdek tercih çivili: vitrine/facade 1 puan, kumaş eşleşmesi YOK", () => {
    expect(CEKIRDEK_TERCIH).toEqual({ sahne_turleri: ["vitrine", "facade"], sahne_puani: 1 });
    expect(CEKIRDEK_TERCIH.eslesme_parami).toBe(undefined);
  });
});

/* ── (2) GOLDEN: sahneSkoru ≡ referans kopya (yeni sözleşme) ─────────────── */

describe("sahneSkoru — referans kopyayla birebir (kumaş ekseni birliğe bağlı)", () => {
  /* REFERANS-KOPYA KARARI (journal 2026-07-27-kumas-rengi-birligi): golden'ın
     değeri BAĞIMSIZLIKTIR — kumaş eşitliği için üretim kodunun çağırdığı
     kumasRengiEsit'i buradan da çağırmak testi totolojiye çevirirdi (birlik
     yanlış da olsa test "evet" derdi). O yüzden normalizasyon burada YERİNDE,
     bağımsız yeniden yazılır: 4 isimlik sözlük + 6 haneli hex → BÜYÜK harf
     kanonik, aksi null; null taraf eşleşmeyi düşürür. Birlik sürüklenirse
     (sözlüğe renk eklenir, 3 hane kabul edilir...) bu grid KIRILIR ve
     sürüklenme sessiz kalamaz — nöbetçi tablosuyla aynı disiplin. */
  const REFERANS_RENK_TABLOSU: Record<string, string> = {
    white: "#FFFFFF",
    black: "#1A1A1A",
    red: "#C8102E",
    blue: "#1D4ED8",
  };
  const referansKanonikHex = (v: string): string | null =>
    REFERANS_RENK_TABLOSU[v] ?? (/^#[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : null);

  /* EditorPage:791-803'ten SÖKÜLEN ifadenin referans kopyası (id-sniff'li
     hâl). Sökülenden TEK bilinçli fark kumaş eşitliğidir: ham
     `s.settings.fabric_color === fabric` yerine kanonik-hex eşitliği. Yapı
     (id-sniff dallanması, 2+1 puanlama, String(... ?? "") zorlaması) bilerek
     aynen korundu: differential böylece "yalnız eşitlik ekseni değişti,
     yönlendirme/puanlar değişmedi"yi de kanıtlar. */
  const referansSkor = (
    doc: { template_id: string; params: Record<string, unknown> },
    s: { kind: string; settings: { fabric_color?: string } }
  ): number => {
    const isGarment = doc.template_id === "garment";
    const fabric = String(doc.params["fabric_color"] ?? "");
    if (isGarment) {
      const sahneHex = s.settings.fabric_color ? referansKanonikHex(s.settings.fabric_color) : null;
      const belgeHex = referansKanonikHex(fabric);
      return (
        (s.kind === "garment" ? 2 : 0) +
        (sahneHex !== null && belgeHex !== null && sahneHex === belgeHex ? 1 : 0)
      );
    }
    return s.kind === "vitrine" || s.kind === "facade" ? 1 : 0;
  };

  it("kayıtlı TÜM aileler × sahne türleri × kumaş kombinasyonlarında aynı puan", () => {
    const SAHNE_TURLERI = ["vitrine", "facade", "garment", "generic"] as const;
    const DOC_PARAMLARI: Record<string, unknown>[] = [
      { fabric_color: "#8B0000" } /* eşleşme adayı (koyu kumaş) */,
      { fabric_color: "#ffffff" } /* <input type="color"> gerçek biçimi: küçük harf hex */,
      { fabric_color: "" } /* boş param */,
      {} /* param hiç yok — String(undefined ?? "") yolu */,
    ];
    const SAHNE_KUMASLARI: (string | undefined)[] = [
      "#8B0000" /* belge paramıyla eşleşen — iki dönemde de +1 (ölçüldü: pin değişmedi) */,
      "#FFFFFF" /* #ffffff paramıyla YENİ dönemde eşleşir (harf büyüklüğü canlandı) */,
      "white" /* ScenesPanel gerçek biçimi: İSİM — #ffffff paramıyla birlik üzerinden eşleşir */,
      "#111" /* 3 hane — birlikte çözülmez, HİÇBİR paramla eşleşmez (bilinçli daralma) */,
      "" /* boş dize — falsy, iki dönemde de puanlanmaz */,
      undefined /* sahne kumaş bildirmemiş */,
    ];
    let sayac = 0;
    for (const e of listTemplates()) {
      for (const kind of SAHNE_TURLERI) {
        for (const params of DOC_PARAMLARI) {
          for (const fabric of SAHNE_KUMASLARI) {
            sayac += 1;
            expect(
              sahneSkoru(e.manifest.mockup_tercihi, { kind, fabric_color: fabric }, params),
              `${e.manifest.id} kind=${kind} fabric=${String(fabric)} params=${JSON.stringify(params)}`
            ).toBe(
              referansSkor(
                { template_id: e.manifest.id, params },
                { kind, settings: { fabric_color: fabric } }
              )
            );
          }
        }
      }
    }
    /* 11 aile × 4 tür × 4 param × 6 kumaş = 1056 kombinasyon — hepsi tarandı */
    expect(sayac).toBe(listTemplates().length * 4 * 4 * 6);
  });

  it("ilansız profil çekirdek tercihle skorlanır (undefined = bilinçli çekirdek beyanı)", () => {
    expect(sahneSkoru(undefined, { kind: "vitrine" }, {})).toBe(1);
    expect(sahneSkoru(undefined, { kind: "facade" }, {})).toBe(1);
    expect(sahneSkoru(undefined, { kind: "garment" }, {})).toBe(0);
    expect(sahneSkoru(undefined, { kind: "generic" }, {})).toBe(0);
    /* çekirdekte eslesme_parami yok: kumaş "eşleşse" bile bonus YOK. Vaka
       artık İKİ katmandan düşer: (a) çekirdek ilan kumaş ekseni taşımaz,
       (b) "#111" 3 haneli — birlikte zaten çözülmez (aşağıdaki daralma
       testi). Pin 1'de KALDI (ölçüldü) — yalnız tür puanı. */
    expect(
      sahneSkoru(undefined, { kind: "vitrine", fabric_color: "#111" }, { fabric_color: "#111" })
    ).toBe(1);
  });
});

/* ── (2b) EŞLEŞME CANLANDI: ilanın kumaş ekseni artık UI biçimleriyle işler ─ */

describe("kumaş eşleşmesi birliğe bağlı — isim↔hex canlanması ve bilinçli daralmalar", () => {
  /* garment ailesinin ilanıyla aynı şekil; sahneSkoru'ya AÇIK geçirilir ki bu
     blok kayıt defterinden bağımsız, saf davranış pinlesin. `kind: "generic"`
     bilerek ilan dışı: tür puanı 0 kalır, skor = yalnız kumaş bonusu — vaka
     +1/+0 olarak doğrudan okunur. */
  const ILANLI: MockupTercihi = {
    sahne_turleri: ["garment"],
    sahne_puani: 2,
    eslesme_parami: "fabric_color",
  };
  const kumasBonusu = (sahneKumasi: string | undefined, params: Record<string, unknown>): number =>
    sahneSkoru(ILANLI, { kind: "generic", fabric_color: sahneKumasi }, params);

  it('CANLANMA: sahne "white" + belge "#ffffff" → +1 (eski ham === bu vakada 0 verirdi)', () => {
    /* ESKİ-YENİ FARKININ ÇİVİSİ: sahne tarafı isim yazar (ScenesPanel select),
       belge tarafı küçük harf hex yazar (<input type="color">). Eski ham ===
       için "white" === "#ffffff" → 0; yeni davranış birlik üzerinden +1. Bu
       fark bu paketin İLAN EDİLMİŞ ürün kararıdır (journal
       2026-07-27-kumas-rengi-birligi): eslesme_parami ilanı UI yolunda ilk
       kez gerçekten işliyor. */
    expect(kumasBonusu("white", { fabric_color: "#ffffff" })).toBe(1);
  });

  it('CANLANMA: sahne "white" + belge "#FFFFFF" → +1 (isim ↔ büyük harf hex)', () => {
    expect(kumasBonusu("white", { fabric_color: "#FFFFFF" })).toBe(1);
  });

  it('CANLANMA: sahne "red" + belge "#C8102E" → +1 (birlik sözlüğündeki kırmızı)', () => {
    expect(kumasBonusu("red", { fabric_color: "#C8102E" })).toBe(1);
  });

  it("CANLANMA: harf büyüklüğü artık eşleşmeyi düşürmez (#8B0000 ↔ #8b0000)", () => {
    /* Eski ham === büyük/küçük harfe takılırdı; kanonik BÜYÜK harf üzerinden
       artık eşit. Color input küçük harf yazdığı için UI'daki asıl kaçak buydu
       (isim vakasıyla birlikte). */
    expect(kumasBonusu("#8B0000", { fabric_color: "#8b0000" })).toBe(1);
  });

  it("tür puanı + kumaş bonusu bileşimi: garment sahnesi + white/#ffffff → 3", () => {
    /* UI'daki gerçek akış: garment ailesinde garment sahnesi 2 + kumaş 1. */
    expect(
      sahneSkoru(ILANLI, { kind: "garment", fabric_color: "white" }, { fabric_color: "#ffffff" })
    ).toBe(3);
  });

  it('farklı renkler eşleşmez: sahne "white" + belge "black" → +0', () => {
    /* İki taraf da çözülür (#FFFFFF vs #1A1A1A) ama renkler farklı — birlik
       yanlış pozitif üretmez. */
    expect(kumasBonusu("white", { fabric_color: "black" })).toBe(0);
  });

  it('boş sahne kumaşı ve eksik belge paramı puanlanmaz: "" → +0, param yok → +0', () => {
    expect(kumasBonusu("", { fabric_color: "#FFFFFF" })).toBe(0);
    expect(kumasBonusu(undefined, { fabric_color: "#FFFFFF" })).toBe(0);
    expect(kumasBonusu("white", {})).toBe(0);
  });

  it('DARALMA: "siyah" vs "siyah" → +0 (çözülemeyen taraf eşleşmeyi düşürür)', () => {
    /* Eski ham === burada 1 verirdi ("siyah" === "siyah"). Birlik bilerek
       reddeder: iki tarafın da AYNI tanınmayan çöpü taşıması renk eşitliği
       kanıtı değildir — sessiz yanlış pozitif yerine sessiz düşürme (birliğin
       ilan edilmiş kuralı, kumasRengiEsit sözleşmesi). */
    expect(kumasBonusu("siyah", { fabric_color: "siyah" })).toBe(0);
  });

  it('DARALMA: "#111" vs "#111" → +0 (3 haneli hex birlikte yok)', () => {
    /* Eski ham === burada 1 verirdi — bu dosyanın eski çekirdek testi bile
       "#111"i eşleşme örneği diye taşıyordu. Birlik yalnız #RRGGBB tanır;
       kısa hex kullanan sahne/belge artık eşleşme KAYBEDER. Bu bilinçli ve
       ilan edilmiş bir daralmadır (journal 2026-07-27-kumas-rengi-birligi);
       birliğe 3-hane genişletmesi AYRI bir ürün kararıdır, buradan sessizce
       açılamaz. */
    expect(kumasBonusu("#111", { fabric_color: "#111" })).toBe(0);
  });
});

/* ── (3) Yük-zamanı invaryant İCRASI (registry-core) ─────────────────────── */

describe("bozuk mockup_tercihi ilanı kayıt defterinden geçemez", () => {
  /** Geçerli bir sahte giriş; yalnız sınanan alan patch'lenir (identity.test.ts deseni) */
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

  const kur = (patch: Partial<TemplateManifest>): (() => unknown) =>
    () => kurVeDogrula({}, [sahteGiris({ id: "t", ...patch })]);

  it("BOŞ sahne_turleri reddedilir — türsüz tercih ilan değildir", () => {
    expect(kur({ mockup_tercihi: { sahne_turleri: [], sahne_puani: 1 } })).toThrow(
      /sahne_turleri boş olamaz/
    );
  });

  it("BİLİNMEYEN sahne türü reddedilir (yazım hatası sessiz no-op olamaz)", () => {
    expect(
      kur({
        mockup_tercihi: {
          sahne_turleri: ["banner"] as unknown as MockupTercihi["sahne_turleri"],
          sahne_puani: 1,
        },
      })
    ).toThrow(/bilinmeyen sahne türü "banner"/);
  });

  it("POZİTİF SONLU olmayan sahne_puani reddedilir — 0/negatif/NaN/Infinity", () => {
    expect(kur({ mockup_tercihi: { sahne_turleri: ["vitrine"], sahne_puani: 0 } })).toThrow(
      /pozitif sonlu sayı/
    );
    expect(kur({ mockup_tercihi: { sahne_turleri: ["vitrine"], sahne_puani: -1 } })).toThrow(
      /pozitif sonlu sayı/
    );
    expect(
      kur({ mockup_tercihi: { sahne_turleri: ["vitrine"], sahne_puani: Number.NaN } })
    ).toThrow(/pozitif sonlu sayı/);
    expect(
      kur({ mockup_tercihi: { sahne_turleri: ["vitrine"], sahne_puani: Number.POSITIVE_INFINITY } })
    ).toThrow(/pozitif sonlu sayı/);
  });

  it("params'ta karşılığı olmayan eslesme_parami reddedilir (GERÇEK bağ ister)", () => {
    expect(
      kur({
        mockup_tercihi: { sahne_turleri: ["garment"], sahne_puani: 2, eslesme_parami: "fabric_color" },
      })
    ).toThrow(/eslesme_parami "fabric_color" manifest params listesinde yok/);
  });

  it("GEÇERLİ ilan geçer — eslesme_parami params'taki gerçek parama bağlanınca", () => {
    expect(() =>
      kurVeDogrula({}, [
        sahteGiris({
          id: "t",
          params: [{ id: "fabric_color", type: "color", default: "#FFFFFF", label_tr: "Kumaş" }],
          mockup_tercihi: {
            sahne_turleri: ["garment"],
            sahne_puani: 2,
            eslesme_parami: "fabric_color",
          },
        }),
      ])
    ).not.toThrow();
    /* eslesme_parami'siz ilan da geçerlidir (alan opsiyonel) */
    expect(() =>
      kurVeDogrula({}, [
        sahteGiris({ id: "t", mockup_tercihi: { sahne_turleri: ["generic"], sahne_puani: 1 } }),
      ])
    ).not.toThrow();
  });

  /* ── (4) SceneKind çapraz doğrulama — literal sözlük şemayla EŞ kalır ──── */

  it("MOCKUP_SAHNE_TURLERI ≡ SceneKindSchema.options (bilinçli literal — sürüklenme sessiz kalamaz)", () => {
    expect([...MOCKUP_SAHNE_TURLERI].sort()).toEqual([...SceneKindSchema.options].sort());
  });

  it("şemanın HER sahne türü doğrulamadan geçer (kabul yönü de eş)", () => {
    for (const tur of SceneKindSchema.options) {
      expect(() =>
        kurVeDogrula({}, [
          sahteGiris({ id: "t", mockup_tercihi: { sahne_turleri: [tur], sahne_puani: 1 } }),
        ])
      ).not.toThrow();
    }
  });
});
