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
