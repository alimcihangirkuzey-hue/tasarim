/* engine/params.ts — ilk doğrudan testler (journal 2026-07-27-param-gecerli-deger-ilani).
 *
 * NEDEN BU DOSYA PAKETİN ASIL ÜRÜNÜ: bu modülün BUGÜNE KADAR tek bir doğrudan
 * testi yoktu. 11 dosya `currentFormat` / `paramOptions` / `paramValue`
 * fonksiyonlarını import ediyor ama hiçbiri onları doğrudan sınamıyordu; dolaylı
 * kapsam yalnız choice ve toggle yollarından geçiyordu. number ve color yolları
 * ise HİÇ ölçülmemişti — dejenerasyonun yıllarca sessiz kalabilmesinin sebebi de
 * budur. Kod düzeltmesinin davranış yüzeyi sıfırdır (ölçüldü); kalıcı değeri olan
 * şey bu testlerdir.
 *
 * FİKSTÜR DESENİ — GERÇEK MANİFEST BİLEREK IMPORT EDİLMİYOR: burada sınanan şey
 * param ÇÖZÜM MOTORUDUR, kayıt defterinin bugünkü içeriği değil. Gerçek manifest
 * import edilseydi bu test başka bir paketin ürün kararlarına bağlanırdı: birileri
 * designSeed'in max'ını 9999'dan 4999'a çekince alakasız bir motor testi kırmızıya
 * dönerdi (ve daha kötüsü, test sınır değerlerini kendi ölçemez, manifest ne derse
 * onu tekrar ederdi — uygulamanın her dediğine "evet" diyen test). Manifest elle
 * kurulur; kayıt defterinin ilanlarını çivilemek nöbetçi testlerin işidir.
 */

import { describe, expect, it } from "vitest";
import { DocumentStateSchema, type DocumentState } from "@tezgah/shared";

import { currentFormat, paramOptions, paramValue } from "./params.js";
import type { ParamDef, TemplateManifest } from "../types.js";

/* ── Fikstürler ─────────────────────────────────────────────────────────── */

const kurManifest = (params: ParamDef[]): TemplateManifest => ({
  id: "test-sablon",
  type: "menu",
  profile_version: 1,
  name_tr: "Test Şablonu",
  bleed_mm: 3,
  safe_mm: 5,
  formats: {
    "a4-portrait": { w_mm: 210, h_mm: 297, label_tr: "A4 Dikey" },
    a3: { w_mm: 297, h_mm: 420, label_tr: "A3" },
  },
  defaultFormat: "a4-portrait",
  params,
  slots: [],
  themes: [],
  production_channels: ["print"],
  production_techniques: ["impression"],
  production_substrate: "kagit",
});

const belge = (params: Record<string, unknown> = {}): DocumentState =>
  DocumentStateSchema.parse({ template_id: "test-sablon", params });

/** Tek paramlı manifest + belge → çözülmüş değer (testlerin gürültüsünü alır) */
const coz = (param: ParamDef, params: Record<string, unknown> = {}) =>
  paramValue(kurManifest([param]), belge(params), param.id);

/* ── currentFormat ──────────────────────────────────────────────────────── */

describe("currentFormat — format kimliği manifestte KAYITLI olmalı", () => {
  const m = kurManifest([]);

  it("belgedeki format manifestte kayıtlıysa o format kullanılır", () => {
    expect(currentFormat(m, belge({ format: "a3" }))).toBe("a3");
    expect(currentFormat(m, belge({ format: "a4-portrait" }))).toBe("a4-portrait");
  });

  it("KAYITSIZ format defaultFormat'a düşer — belge yabancı bir formatı dayatamaz", () => {
    /* Bu, kayıtlı belgelerin şablon değişikliğine dayanma biçimidir: bir format
       manifestten kaldırılırsa eski belgeler kırılmaz, varsayılana döner. */
    expect(currentFormat(m, belge({ format: "a5" }))).toBe("a4-portrait");
  });

  it("format hiç yoksa defaultFormat", () => {
    expect(currentFormat(m, belge())).toBe("a4-portrait");
  });

  it("format string DEĞİLSE defaultFormat — tip kıyası atlanmıyor", () => {
    expect(currentFormat(m, belge({ format: 3 }))).toBe("a4-portrait");
    expect(currentFormat(m, belge({ format: null }))).toBe("a4-portrait");
    expect(currentFormat(m, belge({ format: true }))).toBe("a4-portrait");
  });
});

/* ── paramOptions ───────────────────────────────────────────────────────── */

describe("paramOptions — format'a bağlı seçenek kümesi", () => {
  it("optionsByFormat, options'ı EZER (format'a özgü ilan önceliklidir)", () => {
    const p: ParamDef = {
      id: "cols",
      type: "choice",
      options: [2, 3],
      optionsByFormat: { a3: [4, 5, 6] },
      default: 2,
      label_tr: "Sütun",
    };
    expect(paramOptions(p, "a3")).toEqual([4, 5, 6]);
  });

  it("optionsByFormat VAR ama o format için giriş YOKSA options'a düşer", () => {
    /* `?? ` zinciri anahtar bazında çalışır, sözlük bazında değil: a3 için ilan
       edilmiş olması a4'ü de kapsamaz. Bu davranış çivilenmezse ileride
       "optionsByFormat varsa options ölüdür" gibi yanlış bir sadeleştirme
       yapılabilir ve a4 sessizce boş kümeye düşerdi. */
    const p: ParamDef = {
      id: "cols",
      type: "choice",
      options: [2, 3],
      optionsByFormat: { a3: [4, 5, 6] },
      default: 2,
      label_tr: "Sütun",
    };
    expect(paramOptions(p, "a4-portrait")).toEqual([2, 3]);
  });

  it("yalnız options ilan edilmişse her format aynı kümeyi görür", () => {
    const p: ParamDef = { id: "x", type: "choice", options: ["a", "b"], default: "a", label_tr: "X" };
    expect(paramOptions(p, "a3")).toEqual(["a", "b"]);
    expect(paramOptions(p, "a4-portrait")).toEqual(["a", "b"]);
  });

  it("hiçbir seçenek ilanı yoksa BOŞ dizi (number/color paramların hâli)", () => {
    const p: ParamDef = { id: "designSeed", type: "number", default: 0, label_tr: "Tohum" };
    expect(paramOptions(p, "a4-portrait")).toEqual([]);
  });
});

/* ── paramValue: choice ─────────────────────────────────────────────────── */

describe("paramValue — choice (KAPALI değer kümesi)", () => {
  const p: ParamDef = {
    id: "priceStyle",
    type: "choice",
    options: ["arrow", "plain"],
    default: "arrow",
    label_tr: "Fiyat stili",
  };

  it("belge değeri kümedeyse aynen döner", () => {
    expect(coz(p, { priceStyle: "plain" })).toBe("plain");
  });

  it("küme dışı belge değeri varsayılana düşer", () => {
    expect(coz(p, { priceStyle: "kavisli" })).toBe("arrow");
  });

  it("değer hiç yoksa varsayılan", () => {
    expect(coz(p)).toBe("arrow");
  });

  it("VARSAYILAN da küme dışıysa opts[0] — determinizm son çare olarak korunur", () => {
    /* Bozuk manifest senaryosu: default kümede değil. Fonksiyon yine de kapalı
       kümenin İÇİNDEN deterministik bir değer döndürür; küme dışına asla çıkmaz. */
    const bozuk: ParamDef = { ...p, default: "yok-boyle-bir-sey" };
    expect(coz(bozuk, { priceStyle: "kavisli" })).toBe("arrow");
    expect(coz(bozuk)).toBe("arrow");
  });

  it("küme BOŞSA varsayılan döner (opts[0] yok) — choice yolu DEĞİŞMEDİ", () => {
    /* Bu paket choice davranışına DOKUNMADI. Seçeneksiz bir choice paramı hâlâ
       dejeneredir (belge değeri okunmaz) — çünkü choice'ın geçerlilik ilanı
       options'tır ve o yoksa okunacak ilan yoktur. Bunun cezası yükleme zamanı
       kapısının işidir; burada yalnız davranışın DEĞİŞMEDİĞİ çivilenir. */
    const seceneksiz: ParamDef = { id: "x", type: "choice", default: "a", label_tr: "X" };
    expect(coz(seceneksiz, { x: "b" })).toBe("a");
  });

  it("eşitlik TİP DUYARLIDIR: sayısal seçenek kümesine string değer giremez", () => {
    /* `opts.some((o) => o === raw)` katı eşitliktir. stampCount gibi sayısal
       seçenekli paramlarda bir form/JSON yolu "10" gönderirse değer kümede
       SAYILMAZ ve varsayılana düşer — bu bilinçli sıkılıktır, çivilenir. */
    const sayisal: ParamDef = {
      id: "stampCount",
      type: "choice",
      options: [8, 10, 12],
      default: 10,
      label_tr: "Damga",
    };
    expect(coz(sayisal, { stampCount: 12 })).toBe(12);
    expect(coz(sayisal, { stampCount: "12" })).toBe(10);
  });

  it("optionsByFormat yolu: geçerlilik FORMAT'a göre değişir", () => {
    const cols: ParamDef = {
      id: "cols",
      type: "choice",
      optionsByFormat: { "a4-portrait": [2, 3], a3: [4, 5, 6] },
      default: 2,
      label_tr: "Sütun",
    };
    /* 4 yalnız a3'te geçerlidir; a4'te küme dışıdır → varsayılana düşer */
    expect(coz(cols, { format: "a3", cols: 4 })).toBe(4);
    expect(coz(cols, { format: "a4-portrait", cols: 4 })).toBe(2);
    /* a3'te varsayılan (2) küme dışı kalır → opts[0] = 4 */
    expect(coz(cols, { format: "a3" })).toBe(4);
  });

  it("defaultByFormat yolu: varsayılan format'a göre seçilir", () => {
    const cols: ParamDef = {
      id: "cols",
      type: "choice",
      optionsByFormat: { "a4-portrait": [2, 3], a3: [4, 5, 6] },
      default: 2,
      defaultByFormat: { a3: 6 },
      label_tr: "Sütun",
    };
    expect(coz(cols, { format: "a3" })).toBe(6);
    expect(coz(cols, { format: "a4-portrait" })).toBe(2);
  });
});

/* ── paramValue: toggle ─────────────────────────────────────────────────── */

describe("paramValue — toggle (geçerlilik ilanı TİPİN KENDİSİDİR)", () => {
  const p: ParamDef = { id: "showDesc", type: "toggle", default: false, label_tr: "Açıklama" };

  it("boolean değer aynen döner (true ve false ayrı ayrı)", () => {
    expect(coz(p, { showDesc: true })).toBe(true);
    /* false, "yokluk" ile karıştırılmamalı: varsayılan true olsa bile false kalır */
    expect(coz({ ...p, default: true }, { showDesc: false })).toBe(false);
  });

  it("boolean OLMAYAN her değer varsayılana düşer", () => {
    expect(coz(p, { showDesc: "true" })).toBe(false);
    expect(coz(p, { showDesc: 1 })).toBe(false);
    expect(coz(p, { showDesc: null })).toBe(false);
    expect(coz(p)).toBe(false);
  });

  it("defaultByFormat toggle'da da okunur", () => {
    const q: ParamDef = { ...p, defaultByFormat: { a3: true } };
    expect(coz(q, { format: "a3" })).toBe(true);
    expect(coz(q, { format: "a4-portrait" })).toBe(false);
  });
});

/* ── paramValue: number ─────────────────────────────────────────────────── */

describe("paramValue — number (geçerlilik ilanı min/max/step)", () => {
  /* Kayıt defterindeki designSeed ilanının aynısı, ama ELLE kurulmuş */
  const tohum: ParamDef = {
    id: "designSeed",
    type: "number",
    default: 0,
    min: 0,
    max: 9999,
    step: 1,
    label_tr: "Tohum",
  };

  it("SINIR DEĞERLERİ: tam min ve tam max GEÇERLİDİR (aralık kapalıdır)", () => {
    expect(coz(tohum, { designSeed: 0 })).toBe(0);
    expect(coz(tohum, { designSeed: 9999 })).toBe(9999);
  });

  it("SINIR DIŞI: min-1 ve max+1 varsayılana düşer", () => {
    expect(coz(tohum, { designSeed: -1 })).toBe(0);
    expect(coz(tohum, { designSeed: 10000 })).toBe(0);
  });

  it("aralık içi ara değer aynen döner", () => {
    expect(coz(tohum, { designSeed: 42 })).toBe(42);
    expect(coz({ ...tohum, default: 7 }, { designSeed: 5000 })).toBe(5000);
  });

  it("ADIM UYUMSUZ (step 1 iken tamsayı olmayan) varsayılana düşer", () => {
    expect(coz(tohum, { designSeed: 42.5 })).toBe(0);
    expect(coz(tohum, { designSeed: 0.0001 })).toBe(0);
  });

  it("NaN ve ±Infinity varsayılana düşer — typeof 'number' testinden GEÇERLER", () => {
    /* Bu üçü `typeof x === "number"` için true'dur; ayrı sonluluk kıyası olmasa
       NaN hiçbir sınır kıyasına takılmaz (NaN<min ve NaN>max ikisi de false) ve
       "geçerli" sayılırdı. Sessiz NaN, çizim matematiğine sızan en pahalı değerdir. */
    expect(coz(tohum, { designSeed: Number.NaN })).toBe(0);
    expect(coz(tohum, { designSeed: Number.POSITIVE_INFINITY })).toBe(0);
    expect(coz(tohum, { designSeed: Number.NEGATIVE_INFINITY })).toBe(0);
  });

  it("STRING SAYI ('5') geçerli DEĞİLDİR — tip zorlaması yapılmaz", () => {
    /* Bilinçli: paramValue tip dönüştürmez, ilanı okur. "5" gönderen bir yol
       varsa hata orada düzeltilir; burada sessizce sayıya çevirmek, belgedeki
       gerçek içeriği gizlerdi. */
    expect(coz(tohum, { designSeed: "5" })).toBe(0);
    expect(coz(tohum, { designSeed: true })).toBe(0);
    expect(coz(tohum, { designSeed: null })).toBe(0);
    expect(coz(tohum)).toBe(0);
  });

  it("ADIM TABANI = min (HTML input[type=number] ile aynı kural)", () => {
    /* min=10, step=3 → geçerli ızgara 10,13,16,19… Taban 0 olsaydı 12 geçerli,
       13 geçersiz olurdu; yani editördeki ok tuşlarının ürettiği sayılar motor
       tarafından reddedilirdi. Bu test o ayrışmayı imkânsız kılar. */
    const p: ParamDef = { id: "n", type: "number", default: 10, min: 10, max: 25, step: 3, label_tr: "N" };
    expect(coz(p, { n: 13 })).toBe(13);
    expect(coz(p, { n: 19 })).toBe(19);
    expect(coz(p, { n: 12 })).toBe(10);
    expect(coz(p, { n: 14 })).toBe(10);
  });

  it("min İLANSIZ iken adım tabanı 0'dır", () => {
    const p: ParamDef = { id: "n", type: "number", default: 0, step: 0.5, label_tr: "N" };
    expect(coz(p, { n: 2.5 })).toBe(2.5);
    expect(coz(p, { n: -2.5 })).toBe(-2.5);
    expect(coz(p, { n: 2.3 })).toBe(0);
  });

  it("KAYAN NOKTA ARTIĞI geçerli değeri elemez (tolerans kanıtı)", () => {
    /* (0.3 - 0) / 0.1 = 2.9999999999999996 — çıplak `% step === 0` kıyası bu
       kusursuz değeri REDDEDERDİ. Tolerans yalnız bu artığı yutar: 0.35 (yarım
       adım) hâlâ elenir. */
    const p: ParamDef = { id: "n", type: "number", default: 0, min: 0, max: 1, step: 0.1, label_tr: "N" };
    expect(coz(p, { n: 0.3 })).toBe(0.3);
    expect(coz(p, { n: 0.7 })).toBe(0.7);
    expect(coz(p, { n: 0.35 })).toBe(0);
  });

  it("ÜRÜN KARARI ÇİVİSİ: min/max/step İLANSIZSA her SONLU sayı geçerlidir", () => {
    /* Yokluk = KISITSIZ (types.ts:297'deki SlotDef.kabul emsaliyle aynı doktrin).
       Ters karar — "doğrulanamaz → varsayılana düş" — bu paketin söktüğü hatanın
       ta kendisini geri kurardı: hiçbir kurala aykırı olmayan, kullanıcının bilerek
       girdiği bir değeri sessizce çöpe atmak. Sonluluk kısıtı ise ilandan bağımsızdır
       ve kalkmaz.
       ÖLÇÜM NOTU: bugün kayıt defterindeki 13 number paramın 13'ü de min+max+step
       ilan ediyor, yani bu dalın üretimde yüzeyi SIFIRDIR; karar gelecek manifestleri
       yönetir ve bu yüzden testle çivilenir. */
    const serbest: ParamDef = { id: "n", type: "number", default: 0, label_tr: "N" };
    expect(coz(serbest, { n: 123456 })).toBe(123456);
    expect(coz(serbest, { n: -99999.5 })).toBe(-99999.5);
    expect(coz(serbest, { n: 0 })).toBe(0);
    expect(coz(serbest, { n: Number.NaN })).toBe(0);
    expect(coz(serbest, { n: Number.POSITIVE_INFINITY })).toBe(0);
  });

  it("KISMİ ilan: yalnız min → üst sınır yok; yalnız max → alt sınır yok", () => {
    const altSinirli: ParamDef = { id: "n", type: "number", default: 5, min: 5, label_tr: "N" };
    expect(altSinirli.max).toBe(undefined);
    expect(coz(altSinirli, { n: 1e6 })).toBe(1e6);
    expect(coz(altSinirli, { n: 4 })).toBe(5);

    const ustSinirli: ParamDef = { id: "n", type: "number", default: 5, max: 5, label_tr: "N" };
    expect(coz(ustSinirli, { n: -1e6 })).toBe(-1e6);
    expect(coz(ustSinirli, { n: 6 })).toBe(5);
  });

  it("BOZUK step (0 / negatif / sonsuz) İLANSIZ sayılır — tuzağa dönüşmez", () => {
    /* step=0 ile bölme Infinity/NaN üretirdi ve tolerans kıyası HER değeri
       geçersiz ilan ederdi: bozuk tek bir ilan, o paramın bütün belge değerlerini
       sessizce yutan bir tuzağa dönüşürdü. Bozuk ilanın cezası belgeyi kesmek
       değildir — yeri yükleme zamanı kapısıdır. */
    for (const step of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const p: ParamDef = { id: "n", type: "number", default: 0, min: 0, max: 10, step, label_tr: "N" };
      expect(coz(p, { n: 3.7 }), `step=${String(step)}`).toBe(3.7);
      /* min/max hâlâ okunur — bozuk step diğer ilanları iptal etmez */
      expect(coz(p, { n: 11 }), `step=${String(step)}`).toBe(0);
    }
  });

  it("VARSAYILAN TERMİNALDİR: aralık dışı default aynen döner, doğrulanmaz", () => {
    /* choice'ta bir yedek vardır (opts[0]); number'da "ilk seçenek" diye bir şey
       yoktur, yani varsayılanı reddetmenin gidecek yeri olmazdı. Aralık dışı
       varsayılan bir MANİFEST hatasıdır; yeri yükleme kapısıdır. */
    const p: ParamDef = { id: "n", type: "number", default: 999, min: 10, max: 20, step: 1, label_tr: "N" };
    expect(coz(p, { n: 5 })).toBe(999);
    expect(coz(p)).toBe(999);
  });

  it("defaultByFormat number'da da okunur", () => {
    const p: ParamDef = {
      id: "w_cm",
      type: "number",
      default: 100,
      defaultByFormat: { a3: 300 },
      min: 10,
      max: 2000,
      step: 1,
      label_tr: "Genişlik",
    };
    expect(coz(p, { format: "a3", w_cm: 5 })).toBe(300);
    expect(coz(p, { format: "a4-portrait", w_cm: 5 })).toBe(100);
    /* geçerli değer format'tan bağımsız olarak KAZANIR */
    expect(coz(p, { format: "a3", w_cm: 50 })).toBe(50);
  });

  it("negatif aralık ilanı da okunur (aralık işaret varsaymaz)", () => {
    const p: ParamDef = { id: "n", type: "number", default: -5, min: -10, max: -1, step: 1, label_tr: "N" };
    expect(coz(p, { n: -10 })).toBe(-10);
    expect(coz(p, { n: -1 })).toBe(-1);
    expect(coz(p, { n: 0 })).toBe(-5);
  });
});

/* ── paramValue: color ──────────────────────────────────────────────────── */

describe("paramValue — color (geçerlilik ilanı KANONİK HexColor: #RRGGBB)", () => {
  const p: ParamDef = { id: "cut_color", type: "color", default: "#1A1A1A", label_tr: "Kesim rengi" };

  it("geçerli 6 haneli hex aynen döner (büyük/küçük/karışık harf)", () => {
    expect(coz(p, { cut_color: "#A1B2C3" })).toBe("#A1B2C3");
    expect(coz(p, { cut_color: "#abcdef" })).toBe("#abcdef");
    expect(coz(p, { cut_color: "#ABCDEF" })).toBe("#ABCDEF");
    expect(coz(p, { cut_color: "#AbCdEf" })).toBe("#AbCdEf");
    /* harf DÖNÜŞTÜRÜLMEZ: belge ne yazdıysa o döner (normalizasyon ayrı karardır) */
    expect(coz(p, { cut_color: "#ffffff" })).toBe("#ffffff");
  });

  it("'#' EKSİK olan değer varsayılana düşer", () => {
    expect(coz(p, { cut_color: "A1B2C3" })).toBe("#1A1A1A");
  });

  it("3 haneli kısa hex geçerli DEĞİLDİR (kanonik biçim tam 6 hane ister)", () => {
    expect(coz(p, { cut_color: "#ABC" })).toBe("#1A1A1A");
  });

  it("8 haneli (alfa'lı) hex geçerli DEĞİLDİR", () => {
    /* Kanonik tanım bugün alfa taşımıyor. Alfa'yı kabul etmek şu an bir ÜRÜN
       kararı değil, sessiz bir genişletme olurdu; genişleme kanonik tanımda
       yapılırsa buraya kendiliğinden yansır (yerinde regex kopyalanmadığı için). */
    expect(coz(p, { cut_color: "#AABBCCDD" })).toBe("#1A1A1A");
  });

  it("hex OLMAYAN metin varsayılana düşer (Türkçe/İngilizce renk adları dahil)", () => {
    expect(coz(p, { cut_color: "siyah" })).toBe("#1A1A1A");
    expect(coz(p, { cut_color: "red" })).toBe("#1A1A1A");
    expect(coz(p, { cut_color: "" })).toBe("#1A1A1A");
  });

  it("hex olmayan HANE ve boşluk elenir", () => {
    expect(coz(p, { cut_color: "#GGGGGG" })).toBe("#1A1A1A");
    expect(coz(p, { cut_color: "#12345G" })).toBe("#1A1A1A");
    expect(coz(p, { cut_color: " #A1B2C3" })).toBe("#1A1A1A");
    expect(coz(p, { cut_color: "#A1B2C3 " })).toBe("#1A1A1A");
  });

  it("string OLMAYAN değer ve yokluk varsayılana düşer", () => {
    expect(coz(p, { cut_color: 255 })).toBe("#1A1A1A");
    expect(coz(p, { cut_color: true })).toBe("#1A1A1A");
    expect(coz(p, { cut_color: null })).toBe("#1A1A1A");
    expect(coz(p)).toBe("#1A1A1A");
  });

  it("defaultByFormat color'da da okunur", () => {
    const q: ParamDef = { ...p, defaultByFormat: { a3: "#FFFFFF" } };
    expect(coz(q, { format: "a3", cut_color: "bozuk" })).toBe("#FFFFFF");
    expect(coz(q, { format: "a4-portrait", cut_color: "bozuk" })).toBe("#1A1A1A");
  });
});

/* ── Bilinmeyen param ───────────────────────────────────────────────────── */

describe("paramValue — bilinmeyen param kimliği", () => {
  it("manifestte olmayan id boş string döner (fırlatmaz)", () => {
    const m = kurManifest([{ id: "a", type: "choice", options: ["x"], default: "x", label_tr: "A" }]);
    expect(paramValue(m, belge({ b: "deger" }), "b")).toBe("");
    expect(paramValue(m, belge(), "yok")).toBe("");
  });
});

/* ── TARİH: sökülen dejenerasyon geri gelemez ───────────────────────────── */

describe("TARİH — number/color dejenerasyonu (sökülen hata geri kurulamaz)", () => {
  /* ESKİ KOD (bu paketten önce), toggle dışındaki HER tip için tek yoldan geçiyordu:
   *
   *     const opts = paramOptions(param, format);
   *     if (raw !== undefined && opts.some((o) => o === raw)) return raw as ParamValue;
   *     const d = defFor(param, format);
   *     return opts.some((o) => o === d) ? d : (opts[0] ?? d);
   *
   * choice paramlarında bu doğrudur — orada `options` gerçekten geçerlilik ilanıdır.
   * number ve color paramlarında ise `options` HİÇ ilan edilmez (ölçüldü: kayıt
   * defterinde options/optionsByFormat taşıyan number|color param sayısı = 0), yani
   * `paramOptions()` DAİMA [] dönüyordu. Boş dizide `opts.some(...)` hiçbir zaman
   * true olamaz; dolayısıyla belge değeri OKUNMADAN atlanıyor, `opts[0]` da undefined
   * kaldığı için akış her seferinde varsayılana çıkıyordu.
   *
   * Sonuç: fonksiyonun docstring'i "geçersiz/eksik değer varsayılana düşer" diyordu
   * ama bu iki tipte GEÇERLİ değer de düşüyordu — yani ilan edilen sözleşme yalandı.
   * Aşağıdaki testler o yolun geri gelmesini imkânsız kılar: her biri, seçenek kümesi
   * BOŞ olmasına RAĞMEN belge değerinin okunduğunu gösterir. */

  it("number: seçenek kümesi BOŞ olduğu hâlde geçerli belge değeri okunur", () => {
    const p: ParamDef = {
      id: "designSeed",
      type: "number",
      default: 0,
      min: 0,
      max: 9999,
      step: 1,
      label_tr: "Tohum",
    };
    /* Eski yolun girdisi burada ölçülür: küme gerçekten boştur */
    expect(paramOptions(p, "a4-portrait")).toEqual([]);
    /* Eski kod bu çağrıda 0 (varsayılan) dönerdi; yeni kod ilanı okur */
    expect(coz(p, { designSeed: 42 })).toBe(42);
    expect(coz(p, { designSeed: 42 })).not.toBe(p.default);
  });

  it("color: seçenek kümesi BOŞ olduğu hâlde geçerli belge değeri okunur", () => {
    const p: ParamDef = { id: "cut_color", type: "color", default: "#1A1A1A", label_tr: "Kesim" };
    expect(paramOptions(p, "a4-portrait")).toEqual([]);
    /* Eski kod "#A1B2C3" için de "#1A1A1A" dönerdi */
    expect(coz(p, { cut_color: "#A1B2C3" })).toBe("#A1B2C3");
    expect(coz(p, { cut_color: "#A1B2C3" })).not.toBe(p.default);
  });

  it("dejenerasyonun ASIL zararı: GEÇERSİZ değer zaten varsayılana düşüyordu, kayıp GEÇERLİ değerdeydi", () => {
    /* Eski davranışın iki yüzü vardı ve yalnız biri doğruydu: geçersiz değerde
       varsayılana düşmek (doğru sonuç, yanlış sebep — ilan okunduğu için değil,
       küme boş olduğu için) ve geçerli değerde de varsayılana düşmek (düpedüz
       kayıp). Yeni davranış ikisini AYIRIR; bu testin kırılması ayrımın
       çöktüğü anlamına gelir. */
    const p: ParamDef = { id: "w_cm", type: "number", default: 100, min: 10, max: 2000, step: 1, label_tr: "G" };
    expect(coz(p, { w_cm: 250 })).toBe(250); // geçerli → KORUNUR (eskiden kaybediliyordu)
    expect(coz(p, { w_cm: 5 })).toBe(100); // aralık altı → düşer
    expect(coz(p, { w_cm: 2001 })).toBe(100); // aralık üstü → düşer
    expect(coz(p, { w_cm: 250.5 })).toBe(100); // adım dışı → düşer
  });
});
