/* İLAN ↔ ARAYÜZ METNİ KAPSAMI (K-1/D — sektörsüz dil).

   ÖLÇÜLEN MEKANİZMA: `t()` bir anahtar bulunamadığında ANAHTARIN KENDİSİNİ
   döndürür (`i18n.ts`: `typeof val === "string" ? val : key`). Yani eksik
   bir çeviri hata vermez — operatörün ekranına `sektor_ozalitci` gibi ham
   bir anahtar basılır ve kimse bir şeyin kırıldığını fark etmez. Bu, bu
   deponun tekrar tekrar kapattığı SESSİZ BAŞARISIZLIK sınıfıdır.

   NİYE ŞİMDİ, NİYE D BAŞLIĞI: D'nin işi tam olarak bu sözlüğü BÜYÜTMEK —
   ozalitçi/baskıcı/matbaa için yeni iş kolları, yeni ürün türleri. Bugün
   sözlük tam; büyüdüğü gün sessizce eksilecek. Nöbetçi o günü kırmızı yapar.

   BU TURDA ÖLÇÜLDÜ (paket açılmadan önce, kapsamın gerçekten tam olduğu):
     orders.type_ 9/9 · orders.st_ 6/6 · scenes.kind_ 4/4 · sektor_ 5/5
     orders.teknik_ 3/3 · orders.substrat_ 5/5 · orders.side_ 2/2
   Yani CANLI bir yara YOK; bu paket ÖNLEYİCİDİR ve öyle olduğu yazılıdır.
   Ölçüm de bir sonuçtur: "eksik yok" cümlesi ancak sayılarak yazılabilir.

   TERS YÖN DE ÖLÇÜLÜR (ölü metin): ilan küçüldüğünde geride kalan çeviri,
   `aktarimOzetMetni` emsalindeki ölü sözleşmenin metin karşılığıdır. İlk
   taramada `orders.teknik_q` "ölü" göründü — ÖLÇÜM ARTEFAKTI çıktı: o
   anahtar elle yazılmış bir YER TUTUCUDUR ("teknik?", boş seçenek etiketi)
   ve aynı önek altında yaşıyor. Bu yüzden ters yön İLANLI İSTİSNA TABLOSU
   ile koşar — gerekçesi yazılı olmayan istisna eklenemez. */

import { describe, expect, it } from "vitest";
import {
  BrandKitSchema,
  OrderStatusSchema,
  ProductTypeSchema,
  SceneKindSchema,
  SurfaceKindSchema,
} from "@tezgah/shared";
import {
  SEKTORLER,
  URETIM_ROTALARI,
  siparisSubstratlari,
  siparisTeknikleri,
} from "@tezgah/templates/identity";
import * as shared from "@tezgah/shared";
import * as identity from "@tezgah/templates/identity";
import tr from "./i18n/tr.json";
import { t } from "./i18n";
import { SIPARIS_YONLERI } from "./lib/siparisSecenekleri";

const KOK = tr as unknown as Record<string, unknown>;

/** `dal` boşsa kök nesne — `sektor_*` anahtarları köktedir. */
function dalNesnesi(dal: string): Record<string, unknown> {
  const d = dal === "" ? KOK : (KOK[dal] as Record<string, unknown> | undefined);
  if (!d || typeof d !== "object") throw new Error(`i18n dalı yok: ${dal || "(kök)"}`);
  return d;
}

interface Aile {
  ad: string;
  /** tr.json'daki dal ("" = kök) */
  dal: string;
  /** dal içindeki anahtar öneki */
  onek: string;
  /** İLAN — tek kaynak; bu listeyi elle yazmak ikinci kopya olurdu. */
  ilan: readonly string[];
  /** Aynı önek altında yaşayan ELLE YAZILI anahtarlar + GEREKÇESİ. */
  istisna?: Readonly<Record<string, string>>;
}

/** Marka kiti renk ROLLERİ — şemadan türer, elle yazılmaz.
    `.default({})` sarmalayıcısı `removeDefault()` ile açılır (aynı desen
    `MenuLanguageSchema.removeDefault().options`'ta da kullanıldı). */
function markaRenkRolleri(): readonly string[] {
  return Object.keys(BrandKitSchema.shape.colors.removeDefault().shape);
}

const tekilKume = (f: (t: (typeof ProductTypeSchema.options)[number]) => readonly string[]) => [
  ...new Set(ProductTypeSchema.options.flatMap((x) => f(x))),
];

const AILELER: readonly Aile[] = [
  { ad: "ürün türü", dal: "orders", onek: "type_", ilan: ProductTypeSchema.options },
  { ad: "sipariş durumu", dal: "orders", onek: "st_", ilan: OrderStatusSchema.options },
  { ad: "sahne türü", dal: "scenes", onek: "kind_", ilan: SceneKindSchema.options },
  { ad: "iş kolu", dal: "", onek: "sektor_", ilan: SEKTORLER },
  {
    ad: "teknik",
    dal: "orders",
    onek: "teknik_",
    ilan: tekilKume(siparisTeknikleri),
    istisna: {
      /* Boş seçeneğin etiketi ("teknik?") — bir teknik DEĞİL, seçicinin
         "henüz seçilmedi" satırı. İlanla aynı öneki paylaşıyor. */
      q: "boş seçenek yer tutucusu (ProjectsPanel select)",
    },
  },
  { ad: "substrat", dal: "orders", onek: "substrat_", ilan: tekilKume(siparisSubstratlari) },
  {
    ad: "uygulama yönü",
    dal: "orders",
    onek: "side_",
    ilan: SIPARIS_YONLERI,
    istisna: {
      /* İKİNCİ `_q` — desen ölçümle görüldü: seçicilerin "henüz seçilmedi"
         satırı aynı önek altında `_q` ile yaşıyor (`side_q` "yön?",
         `mode_q` "mod?", `teknik_q` "teknik?"). Elle yazılı bir yer
         tutucudur, ilan edilen bir değer DEĞİL. */
      q: "boş seçenek yer tutucusu (ProjectsPanel select)",
    },
  },
  /* AŞAĞIDAKİ ÜÇÜ 2026-08-07'de EKLENDİ ve gerekçesi bir ÖLÇÜMDÜR: defter
     bunları "ilanı olmayan aileler" diye listeliyordu (TODO, K-1/D). Ölçüldü —
     üçünün de ilanı VARDI ya da yapılabilirdi:
       intake.sk_       → SurfaceKindSchema (Zod enum, hazırdı)
       brandkit.color_  → BrandKitSchema.colors (şema alanları, hazırdı)
       editor.honesty_  → exportRouteOf'un dönüş kümesi; TİP-DÜZEYİ bir
                          birleşimdi ve derlemeden sonra okunamıyordu, bu turda
                          runtime ilana çevrildi (URETIM_ROTALARI).
     Defterin "ilanı yok" cümlesi yalnız üçüncüsü için doğruydu; o da
     kapatılabilir çıktı. */
  { ad: "yüzey türü", dal: "intake", onek: "sk_", ilan: SurfaceKindSchema.options },
  { ad: "marka rengi", dal: "brandkit", onek: "color_", ilan: markaRenkRolleri() },
  { ad: "üretim rotası", dal: "editor", onek: "honesty_", ilan: URETIM_ROTALARI },
];

describe("ön-koşul — nöbetçi GERÇEKTEN bir şey ölçüyor", () => {
  it("t() eksik anahtarda ANAHTARIN KENDİSİNİ döndürür — sessiz başarısızlık", () => {
    /* Bu satır, bu dosyanın var olma sebebidir. Mekanizma değişip `t()` bir
       gün fırlatmaya başlarsa, aşağıdaki testlerin gerekçesi de değişmeli. */
    expect(t("boyle.bir.anahtar.yok")).toBe("boyle.bir.anahtar.yok");
  });

  it("HER AİLE dolu — boş ilan hiçbir şey ölçmez", () => {
    for (const a of AILELER) {
      expect(a.ilan.length, `${a.ad}: ilan boş`).toBeGreaterThan(0);
    }
  });

  it("HER AİLENİN DALI tr.json'da VAR", () => {
    /* Yanlış dal adı yazılsaydı `dalNesnesi` patlar; burada açıkça ölçülür ki
       "hiçbir anahtar bulunamadı" sessizce "hepsi eksik" ya da "hiç
       taranmadı" diye okunmasın. */
    for (const a of AILELER) {
      expect(Object.keys(dalNesnesi(a.dal)).length, `${a.ad}`).toBeGreaterThan(0);
    }
  });
});

describe("İLERİ yön — ilan edilen her değerin METNİ var", () => {
  it.each(AILELER.map((a) => [a.ad, a] as const))("%s", (_ad, a) => {
    /* Eksik olsaydı operatör ham anahtarı görürdü (`sektor_ozalitci` gibi). */
    const eksik = a.ilan.filter((v) => typeof dalNesnesi(a.dal)[`${a.onek}${v}`] !== "string");
    expect(
      eksik,
      `${a.ad}: bu değer(ler) ilan edilmiş ama arayüz metni YOK — ` +
        `operatör ham anahtarı görür (t() eksik anahtarda anahtarı döndürür)`,
    ).toEqual([]);
  });
});

describe("TERS yön — metni olup İLANI olmayan (ölü metin)", () => {
  it.each(AILELER.map((a) => [a.ad, a] as const))("%s", (_ad, a) => {
    /* Ölü sözleşmenin metin karşılığı: ilan küçüldüğünde çeviri geride
       kalır ve hangi değerin hâlâ geçerli olduğu okunamaz hâle gelir. */
    const d = dalNesnesi(a.dal);
    const olu = Object.keys(d)
      .filter((k) => k.startsWith(a.onek) && typeof d[k] === "string")
      .map((k) => k.slice(a.onek.length))
      .filter((v) => !a.ilan.includes(v) && !(a.istisna && v in a.istisna));
    expect(olu, `${a.ad}: bu metin(ler)in ilanda karşılığı YOK — ölü metin`).toEqual([]);
  });
});

describe("istisna tablosu — gerekçesiz istisna olamaz", () => {
  it("HER İSTİSNA bir gerekçe taşır VE gerçekten var", () => {
    /* Gerekçesiz istisna, ters yön nöbetçisini sessizce gevşetmenin en kolay
       yolu olurdu. Ayrıca istisna GERÇEKTEN i18n'de bulunmalı: kalmamış bir
       istisna, kimsenin okumadığı bir muafiyet olarak birikirdi. */
    for (const a of AILELER) {
      for (const [anahtar, gerekce] of Object.entries(a.istisna ?? {})) {
        expect(gerekce.length, `${a.ad}.${anahtar}: gerekçe boş`).toBeGreaterThan(10);
        expect(
          typeof dalNesnesi(a.dal)[`${a.onek}${anahtar}`],
          `${a.ad}.${anahtar}: istisna yazılı ama i18n'de YOK — artık gereksiz`,
        ).toBe("string");
      }
    }
  });
});


describe("KAPSAM NÖBETÇİSİ — ilanı olan bir aile tablodan DÜŞEMEZ", () => {
  /* NİYE VAR (önceki paketin açık bulgusu `K1D-AILE-1`): nöbetçinin kapsamı
     KENDİ TABLOSUDUR. Bir negatif kontrolde üç aile `AILELER`'den çıkarıldı ve
     takım YEŞİL kaldı — testler kırılmadı, YOK OLDU. Yani "kapsam büyüdü"
     kazanımı kalıcı değildi; kimse geri almayı fark etmezdi.

     ARAÇ SEÇİMİ ÖLÇÜMLE YAPILDI, İKİ KEZ: önce "her önek ailesi ya tabloda ya
     gerekçeli istisnada" denendi ve REDDEDİLDİ — `tr.json`'da 2+ üyeli 79 önek
     ailesi var, ilan destekli olan 10; istisna tablosu ~70 satır "bu yalnızca
     bir adlandırma alışkanlığı" olur ve gerçek olanları gömerdi. İkinci araç
     ölçüldü ve KESKİN çıktı: `@tezgah/shared` + `identity`'den okunan 47 aday
     ilan × 79 aile karşılaştırıldığında ÜYE KÜMESİ BİREBİR ÖRTÜŞEN yalnızca
     7 aile var — ve yedisi de bugün tabloda. Yani kural gürültüsüz.

     KURAL: bir ilanın üye kümesiyle BİREBİR aynı anahtar kümesine sahip bir
     metin ailesi varsa, o aile `AILELER`'de OLMAK ZORUNDADIR. Örtüşme
     tesadüf değildir: sözlük o ilanı gölgeliyor demektir. */

  interface AdayIlan {
    kaynak: string;
    ad: string;
    uyeler: readonly string[];
  }

  /** Zod enum (`.options`) ya da düz dize dizisi olan her dışa aktarım. */
  function adayIlanlar(): AdayIlan[] {
    const bulunan: AdayIlan[] = [];
    const topla = (kaynak: string, mod: Record<string, unknown>): void => {
      for (const [ad, v] of Object.entries(mod)) {
        const opts = (v as { options?: unknown } | null)?.options;
        if (Array.isArray(opts) && opts.every((x) => typeof x === "string")) {
          bulunan.push({ kaynak, ad, uyeler: opts as string[] });
        } else if (Array.isArray(v) && v.length > 1 && v.every((x) => typeof x === "string")) {
          bulunan.push({ kaynak, ad, uyeler: v as string[] });
        }
      }
    };
    topla("shared", shared as unknown as Record<string, unknown>);
    topla("identity", identity as unknown as Record<string, unknown>);
    return bulunan;
  }

  /** tr.json'daki her `onek_` ailesi: yol ("orders.st_") + üye adları. */
  function onekAileleri(): Array<{ yol: string; uyeler: string[] }> {
    const cikan: Array<{ yol: string; uyeler: string[] }> = [];
    const bak = (dal: string, nesne: Record<string, unknown>): void => {
      const grup = new Map<string, string[]>();
      for (const [k, v] of Object.entries(nesne)) {
        if (v && typeof v === "object") {
          bak(dal ? `${dal}.${k}` : k, v as Record<string, unknown>);
          continue;
        }
        const m = /^([a-z]+_)(.+)$/.exec(k);
        if (m) grup.set(m[1]!, [...(grup.get(m[1]!) ?? []), m[2]!]);
      }
      for (const [onek, uyeler] of grup) cikan.push({ yol: `${dal}.${onek}`, uyeler });
    };
    bak("", KOK);
    return cikan;
  }

  const ayniKume = (a: readonly string[], b: readonly string[]): boolean =>
    a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

  /** İlanı bir metin ailesiyle birebir örtüşen çiftler. */
  function ortusenler(): Array<{ yol: string; ilan: string }> {
    const aileler = onekAileleri();
    return adayIlanlar().flatMap((i) =>
      aileler
        .filter((a) => ayniKume(a.uyeler, i.uyeler))
        .map((a) => ({ yol: a.yol, ilan: `${i.kaynak}.${i.ad}` })),
    );
  }

  it("ÖN-KOŞUL: tarama GERÇEKTEN ilan ve aile buluyor", () => {
    /* İkisi de olmadan "kaçak yok" iddiası, hiçbir şey bulamayan bozuk bir
       tarayıcıyla da yeşil kalırdı — bu deponun defalarca ödediği kör nokta. */
    expect(adayIlanlar().length, "hiç aday ilan bulunamadı").toBeGreaterThan(10);
    expect(onekAileleri().length, "hiç önek ailesi bulunamadı").toBeGreaterThan(10);
  });

  it("ÖN-KOŞUL: BİREBİR ÖRTÜŞEN en az bir çift var", () => {
    /* Örtüşme hiç olmasaydı aşağıdaki kural KONUSUZ olurdu ve sessizce
       "kaçak yok" derdi. */
    expect(ortusenler().length, "hiçbir ilan bir aileyle örtüşmüyor").toBeGreaterThan(0);
  });

  it("örtüşen HER aile AILELER tablosunda", () => {
    const tablodaki = new Set(AILELER.map((a) => `${a.dal}.${a.onek}`));
    const kacan = [...new Set(ortusenler().filter((o) => !tablodaki.has(o.yol)).map((o) => `${o.yol} (${o.ilan})`))];
    expect(
      kacan,
      "Bu metin ailesi bir İLANIN üye kümesiyle BİREBİR örtüşüyor ama nöbetçi " +
        "tablosunda YOK: ilan büyüdüğü gün eksik anahtar sessizce ham anahtar " +
        "olarak basılır (`t()` bulunamayanı aynen döndürür). AILELER'e ekleyin.",
    ).toEqual([]);
  });
});
