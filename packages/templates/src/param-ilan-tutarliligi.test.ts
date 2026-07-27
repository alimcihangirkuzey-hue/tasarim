/* PARAM İLANI ⊆ ZOD ŞEMASI — nöbetçi + yük-zamanı ilan-tutarlılığı kapısının
   red yolları (Canonical 4.5 "bildirimsel, deterministik, test edilebilir";
   7.2/496 param ilanı; journal 2026-07-27-param-gecerli-deger-ilani).

   ────────────────────────────────────────────────────────────────────────────
   BU DOSYANIN ÖLÇTÜĞÜ AYRIŞMA (keşif bulgusu, ÖLÇÜM 3)

   Bir sayı paramının "geçerli değer"i bugün İKİ AYRI YERDE tanımlıdır:

     (1) MANİFEST İLANI  — ParamDef.min/max/step. Bu ilan ÖLÜ DEĞİLDİR:
         EditorPage sayı denetimini HTML min/max/step özniteliği olarak
         DOĞRUDAN buradan kurar. Yani ilan, KULLANICIYA GÖSTERİLEN sınırdır.
     (2) ZOD ŞEMASI      — VitroParamsSchema / TabelaParamsSchema
         (packages/shared/src/schemas.ts). Bu şema UYGULANIR: analiz ve render
         yolları `.parse()` çağırır (vitrophanie/index.tsx:53,319 ·
         enseigne/index.tsx:37,144 · garment/index.tsx:103 ·
         apps/server/src/routes/garment.ts:37) — safeParse DEĞİL, FIRLATAN parse.

   Bu ikisi bugün AYRIŞIKTIR (ölçüldü, aşağıda test ediliyor):

     param            | manifest İLANI    | uygulayan ZOD
     -----------------+-------------------+-------------------------
     enseigne h_cm    | min 20,  max 500  | 0 < x ≤ 2000
     enseigne w_cm    | min 50,  max 2000 | 0 < x ≤ 2000
     vitro w_cm/h_cm  | min 10,  max 2000 | 0 < x ≤ 2000

   Yani `h_cm: 1800` İLANI İHLAL EDER ama Zod'dan geçer ve çizilir; `w_cm: 1`
   de öyle. Bu, ilanın ŞEMADAN SIKI olduğu yöndür.

   ────────────────────────────────────────────────────────────────────────────
   NÖBETÇİNİN ÖLÇTÜĞÜ DEĞİŞMEZ: İLAN ⊆ ŞEMA (ilan şemadan GEVŞEK OLAMAZ)

   İki yön simetrik DEĞİLDİR ve nöbetçi bilerek TEK yönü kapatır:

   • İLAN DAHA SIKI (bugünkü hâl, GÜVENLİ): ilan 20–500, şema 0<x≤2000.
     İlanın vaat ettiği her değeri şema kabul eder. Kullanıcı ilanın izin
     verdiği bir şey girer, sistem onu kaydeder ve çizer. Şemanın fazladan
     kabul ettiği aralık (500–2000) yalnız ULAŞILMAYAN bir gevşekliktir —
     yanlış bir SÖZ değildir. Nöbetçi bugün YEŞİL olmalıdır.

   • İLAN DAHA GEVŞEK (TEHLİKELİ): biri manifeste `max: 3000` yazarsa ilan,
     şemanın REDDEDECEĞİ bir değeri VAAT EDER. Editör kullanıcıya "3000
     girebilirsin" der (HTML max=3000), kullanıcı girer, sonra `.parse()`
     FIRLATIR — analiz/render/sunucu yolunda. Yani ilan, tutamayacağı bir söz
     vermiş olur. Nöbetçi TAM OLARAK bunu yakalar.

   Şemayı sıkılaştırmak (params: z.record(z.unknown()) → tipli doğrulama) bu
   paketin KAPSAMI DIŞINDADIR (journal scope_out: davranış daraltmasıdır,
   kayıtlı belgeler üzerindeki etkisi ölçülmeden dokunulmaz). Nöbetçi ayrışmayı
   ÇÖZMEZ; ayrışmanın TEHLİKELİ yöne dönmesini engeller.

   ────────────────────────────────────────────────────────────────────────────
   ZOD SINIRLARINI NASIL ÇIKARDIM VE NEDEN İKİ YOLU BİRDEN KULLANDIM

   İki yol denendi, İKİSİ DE tutuldu ve aralarındaki tutarlılık ayrıca ölçüldü:

   (A) YAPISAL ÇIKARIM — `_def.checks` (zod 3.25.76'da ÖLÇÜLDÜ: ZodDefault
       sarmalayıcısının `innerType`ı ZodNumber, `_def.checks` =
       [{kind:"min",value:0,inclusive:false},{kind:"max",value:2000,
       inclusive:true}]). AVANTAJI: gerçek sayıları verir, hata mesajı
       "ilan 3000 > şema 2000" diyebilir. RİSKİ: `_def` Zod'un İÇ yüzeyidir,
       sürüm sözleşmesi değildir — Zod 4'te bu yapı tamamen değişir ve
       çıkarım SESSİZCE null dönerse nöbetçi hiçbir şey ölçmeden yeşil kalır.

   (B) DAVRANIŞSAL SONDA — `safeParse`. AVANTAJI: sürümden BAĞIMSIZ ve
       şemanın GERÇEKTE ne kabul ettiğini ölçer; `.int()`, `.multipleOf()`,
       `.refine()` gibi aralık-dışı kısıtları da kapsar (yapısal çıkarım
       bunları min/max'e indirgeyemez). Bu yüzden davranışsal sonda
       OTORİTEDİR: ilan ⊆ şema iddiası (B) ile kurulur.

   (A) yalnız iki iş yapar: (i) hata mesajını sayısal ve öğretici kılar,
   (ii) `_def` sessizce eskirse KENDİSİ kırmızıya düşer — aşağıdaki
   "yapısal çıkarım ile davranış AYNI sınırı gösterir" testi tam olarak
   budur. Yani (A) kırıldığında nöbetçi sessizce körleşmez, GÜRÜLTÜLÜ patlar.

   SINIRIN DÜRÜST İLANI: (B) sonlu sayıda noktayı sonda eder (uçlar + ara
   örnekler), aralığın HER noktasını değil — bu, matematiksel bir alt-küme
   İSPATI değil, ölçümdür. Aralık-biçimli kısıtlarda (bugünkü tüm hâller) uç
   noktalar yeterlidir, ara örnekler ise aralık-dışı "delikleri" (multipleOf
   gibi) kabaca tarar. (A) ile birlikte kapsama pratik olarak tamdır. */

import { describe, expect, it } from "vitest";
import {
  GarmentParamsSchema,
  HexColor,
  TabelaParamsSchema,
  VitroParamsSchema,
} from "@tezgah/shared";
import { z } from "zod";
import { TEMPLATES, kurVeDogrula, type ParamDef, type TemplateEntry } from "./index.js";
import { HEX_BICIMI } from "./registry-core.js";

/* ══════════════════════════════════════════════════════════════════════════
   (0) EŞLEME TABLOSU — hangi manifest hangi Zod şemasına akıyor
   ══════════════════════════════════════════════════════════════════════════

   Tablo ELLE yazılır çünkü bağ TİP DÜZEYİNDEDİR, runtime'da türetilemez:
   `vitrophanie/index.tsx` `params: VitroParams` beyan eder ve `.parse()`ı
   VitroParamsSchema ile çağırır — bu bağı okuyabilen bir runtime değeri YOK.
   BEKLENEN_SUBSTRATLAR / BEKLENEN_KOSULLU_SLOTLAR emsali: elle yazılan tablo,
   iki yönlü TAMLIK testiyle kilitlenir (aşağıda) — yeni bir aile eklendiğinde
   test PATLAR ve ekleyeni karar vermeye zorlar. */

type ParamSemasi = z.ZodObject<z.ZodRawShape>;

const SEMALI: Record<string, ParamSemasi> = {
  "vitro-bandeau": VitroParamsSchema as unknown as ParamSemasi,
  "vitro-centre": VitroParamsSchema as unknown as ParamSemasi,
  "vitro-colonne": VitroParamsSchema as unknown as ParamSemasi,
  "enseigne-panneau": TabelaParamsSchema as unknown as ParamSemasi,
  garment: GarmentParamsSchema as unknown as ParamSemasi,
};

/* Zod params şeması OLMAYAN aileler. GEREKÇE (ölçüldü): menü/flyer/carte
   ailelerinin paramları hiçbir yerde tipli bir şemayla parse EDİLMEZ —
   DocumentStateSchema.params `z.record(z.unknown())`tir ve o aileler doğrudan
   `doc.params`ı ham okur. Dolayısıyla o ailelerde "ilan ⊆ şema" karşılaştırması
   YAPILAMAZ: karşılaştırılacak ikinci taraf YOKTUR. Bu, ilanın uygulanmadığı
   AYRI bir borçtur (şemayı sıkılaştırmak journal scope_out'tadır) — burada
   sessizce atlanmaz, AÇIKÇA listelenir ki eksiklik görünür kalsın. */
const SEMASIZ = [
  "carte-fidelite",
  "flyer",
  "kabul-fabrika",
  "menu-grid-cells",
  "menu-liste-premium",
  "menu-trifold",
] as const;

describe("EŞLEME TAMLIĞI: her kayıtlı aile ya şemalı ya açıkça şemasız", () => {
  it("SEMALI ∪ SEMASIZ = kayıt defteri (yeni aile karar vermeye ZORLAR)", () => {
    const kapsanan = [...Object.keys(SEMALI), ...SEMASIZ].sort();
    expect(
      kapsanan,
      "Kayıt defteri değişti: yeni şablon ya bir Zod params şemasına bağlıdır " +
        "(SEMALI'ya yazılır ve ilan ⊆ şema nöbetçisine girer) ya da paramları " +
        "hiçbir şemayla parse edilmez (SEMASIZ'a yazılır — o zaman ilanın " +
        "UYGULANMADIĞI açıkça kabul edilmiş olur). Sessizce atlanan aile, " +
        "nöbetçinin körleştiği ailedir."
    ).toEqual(Object.keys(TEMPLATES).sort());
    /* İki küme ayrık olmalı — bir aile hem şemalı hem şemasız olamaz */
    expect(Object.keys(SEMALI).filter((k) => (SEMASIZ as readonly string[]).includes(k))).toEqual([]);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   (1) ZOD SINIRI — yapısal çıkarım (A) ve davranışsal sonda (B)
   ══════════════════════════════════════════════════════════════════════════ */

interface SemaSiniri {
  alt: number | null;
  altKapsayici: boolean;
  ust: number | null;
  ustKapsayici: boolean;
}

/* (A) YAPISAL ÇIKARIM. `_def` Zod'un iç yüzeyidir; tipi yoktur, bu yüzden
   dar bir yapısal okuma yapılır ve çıkarılamayan her hâlde null döner
   (sessiz yanlış sayı üretmektense hiç sayı üretme). Çıkarımın YAŞADIĞI
   aşağıdaki testle ayrıca ölçülür — null'a düşerse test kırmızıdır. */
function semaSiniri(sema: ParamSemasi, alan: string): SemaSiniri | null {
  interface Kontrol {
    kind: string;
    value?: unknown;
    inclusive?: boolean;
  }
  interface Def {
    typeName?: string;
    innerType?: { _def?: Def };
    checks?: Kontrol[];
  }
  const alanSemasi = sema.shape[alan] as unknown as { _def?: Def } | undefined;
  if (!alanSemasi?._def) return null;
  /* ZodDefault sarmalayıcısını soy: manifest paramlarının tamamı `.default()`
     taşır, kontroller sarmalayıcının değil iç tipin üzerindedir. */
  const ic = alanSemasi._def.innerType?._def ?? alanSemasi._def;
  if (ic.typeName !== "ZodNumber" || !Array.isArray(ic.checks)) return null;
  const out: SemaSiniri = { alt: null, altKapsayici: false, ust: null, ustKapsayici: false };
  for (const c of ic.checks) {
    if (c.kind === "min" && typeof c.value === "number") {
      out.alt = c.value;
      out.altKapsayici = c.inclusive === true;
    }
    if (c.kind === "max" && typeof c.value === "number") {
      out.ust = c.value;
      out.ustKapsayici = c.inclusive === true;
    }
  }
  return out.alt === null && out.ust === null ? null : out;
}

/* (B) DAVRANIŞSAL SONDA — OTORİTE. Yalnız ilgilenilen alan verilir; diğer
   alanlar şemanın kendi `.default()`larıyla dolar, bu yüzden sonuç TAM OLARAK
   o alanın kabul edilip edilmediğini ölçer. */
function semaKabulEder(sema: ParamSemasi, alan: string, deger: unknown): boolean {
  return sema.safeParse({ [alan]: deger }).success;
}

describe("ZOD SINIRI: yapısal çıkarım (_def) ile davranış (safeParse) AYNI sınırı gösterir", () => {
  /* Bu test (A)'nın körleşme sigortasıdır: Zod sürümü `_def`i değiştirirse
     ya da bir kontrol biçimi değişirse burası PATLAR — nöbetçi sessizce
     "sınır çıkaramadım, geçtim" diyemez. */
  /* Şema NESNESİ test başlığına GİRMEZ (yalnız adı girer): vitest `it.each`
     başlığı `%s` ile biçimlerken Zod nesnesinin tamamını serileştirir ve
     başlık binlerce karakterlik bir çöpe döner — kırmızı okunamaz hâle gelir
     (ölçüldü). Nesne ada göre aşağıda çözülür. */
  const SEMA_ADLARI: Record<string, ParamSemasi> = {
    VitroParamsSchema: VitroParamsSchema as unknown as ParamSemasi,
    TabelaParamsSchema: TabelaParamsSchema as unknown as ParamSemasi,
  };
  const HEDEFLER: Array<[string, string]> = [
    ["VitroParamsSchema", "w_cm"],
    ["VitroParamsSchema", "h_cm"],
    ["TabelaParamsSchema", "w_cm"],
    ["TabelaParamsSchema", "h_cm"],
  ];

  it.each(HEDEFLER)("%s.%s: sınır ÇIKARILABİLİR (çıkarım null'a düşerse nöbetçi körleşir)", (ad, alan) => {
    expect(
      semaSiniri(SEMA_ADLARI[ad], alan),
      `${ad}.${alan}: _def üzerinden sayısal sınır çıkarılamadı — Zod'un iç yapısı ` +
        "değişmiş olabilir (zod 3.25.76'da ZodDefault→innerType→ZodNumber._def.checks " +
        "ölçüldü). Çıkarım null dönerse aşağıdaki nöbetçi yalnız davranışsal sondaya " +
        "kalır; bu testin amacı o körleşmeyi GÜRÜLTÜLÜ yapmaktır"
    ).not.toBeNull();
  });

  it.each(HEDEFLER)("%s.%s: çıkarılan sınır davranışla BİREBİR uyuşur", (ad, alan) => {
    const sema = SEMA_ADLARI[ad];
    const s = semaSiniri(sema, alan);
    expect(s).not.toBeNull();
    if (!s) return;
    if (s.ust !== null) {
      expect(semaKabulEder(sema, alan, s.ust), `${ad}.${alan}: üst sınır ${s.ust} kapsayıcı ilan edildi ama şema reddetti`).toBe(
        s.ustKapsayici
      );
      /* Sınırın hemen ÖTESİ kesinlikle reddedilmeli — "max var" iddiasının icrası */
      expect(semaKabulEder(sema, alan, s.ust + 1), `${ad}.${alan}: üst sınırın ötesi (${s.ust + 1}) kabul edildi — çıkarılan max GERÇEK max değil`).toBe(
        false
      );
    }
    if (s.alt !== null) {
      expect(semaKabulEder(sema, alan, s.alt), `${ad}.${alan}: alt sınır ${s.alt} kapsayıcılığı davranışla uyuşmuyor`).toBe(
        s.altKapsayici
      );
      expect(semaKabulEder(sema, alan, s.alt - 1), `${ad}.${alan}: alt sınırın altı (${s.alt - 1}) kabul edildi — çıkarılan min GERÇEK min değil`).toBe(
        false
      );
    }
  });

  it("ÖLÇÜLMÜŞ DEĞERLER çivilenir (ayrışma tablosunun şema yarısı)", () => {
    /* Sayılar burada AÇIKÇA yazılıdır ki dosya başındaki ayrışma tablosu
       belgeleme değil ÖLÇÜM olsun. Şema sınırı değişirse (sıkılaşırsa da,
       gevşerse de) burası patlar ve tablo güncellenmeye zorlanır. */
    for (const [ad, sema] of [
      ["VitroParamsSchema", VitroParamsSchema as unknown as ParamSemasi],
      ["TabelaParamsSchema", TabelaParamsSchema as unknown as ParamSemasi],
    ] as const) {
      for (const alan of ["w_cm", "h_cm"]) {
        expect(semaSiniri(sema, alan), `${ad}.${alan}`).toEqual({
          alt: 0,
          altKapsayici: false, // .positive() → 0 DIŞARIDA
          ust: 2000,
          ustKapsayici: true, // .max(2000) → 2000 İÇERİDE
        });
      }
    }
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   (2) NÖBETÇİ — İLAN ⊆ ŞEMA (bu dosyanın ASIL ÜRÜNÜ)
   ══════════════════════════════════════════════════════════════════════════ */

/* Karşılaştırılan çift sayısı AÇIKÇA sayılır ve çivilenir. GEREKÇE: bu
   nöbetçinin en gerçek arıza biçimi kırmızıya düşmek DEĞİL, BOŞ KÜMEYE
   DÜŞMEKTİR — eşleme tablosu bozulur, alan adı değişir, param id'si yeniden
   adlandırılır ve döngü hiçbir çift üretmeden "yeşil" der. Sayaç olmadan bu
   sessizdir; sayaçla GÜRÜLTÜLÜDÜR. */
const BEKLENEN_SAYI_CIFTI = 8; // 3 vitro × (w_cm,h_cm) + 1 enseigne × (w_cm,h_cm)
const BEKLENEN_RENK_CIFTI = 4; // 3 vitro cut_color + 1 garment fabric_color

interface Cift {
  sablon: string;
  param: ParamDef;
}

function ciftler(tip: ParamDef["type"]): Cift[] {
  const out: Cift[] = [];
  for (const [sablon, sema] of Object.entries(SEMALI)) {
    /* Kayıtsız anahtar SESSİZCE ATLANIR — fırlatmaz. GEREKÇE (ölçüldü):
       `ciftler()` modül gövdesinde çağrılır; burada fırlatmak vitest'i
       TOPLAMA aşamasında düşürür ve çıktı "Tests: no tests" + çıplak bir
       TypeError olur — hiçbir test adı görünmez, öğretici mesaj hiç okunmaz.
       Atlanınca yukarıdaki EŞLEME TAMLIĞI testi ve aşağıdaki BOŞ KÜME
       nöbetçisi ikisi birden gerekçeli kırmızı verir (ölçüldü: yazım hatalı
       anahtar o iki testi kırmızıya düşürür). */
    if (!Object.hasOwn(TEMPLATES, sablon)) continue;
    for (const param of TEMPLATES[sablon].manifest.params) {
      /* Yalnız şemada KARŞILIĞI OLAN paramlar karşılaştırılır: manifest'te
         olup şemada olmayan param (ör. garment'ın hiçbiri sayısal değil)
         karşılaştırılamaz — ikinci taraf yok. */
      if (param.type === tip && sema.shape[param.id] !== undefined) out.push({ sablon, param });
    }
  }
  return out;
}

const SAYI_CIFTLERI = ciftler("number");
const RENK_CIFTLERI = ciftler("color");

/* Öğretici hata mesajı — kırmızıya düşen kişiye HANGİ YÖNÜN tehlikeli
   olduğunu ve NEDEN olduğunu anlatır (yalnız "beklenen X, bulunan Y" demez). */
function tehlikeMesaji(sablon: string, paramId: string, ayrinti: string): string {
  return (
    `İLAN ⊆ ŞEMA İHLALİ — ${sablon}.${paramId}: ${ayrinti}\n\n` +
    "NE OLDU: manifest ilanı (ParamDef.min/max), Zod şemasının KABUL ETMEDİĞİ " +
    "bir değeri VAAT EDİYOR. İlan şemadan GEVŞEK olamaz.\n\n" +
    "NEDEN TEHLİKELİ: manifest ilanı EditorPage'de HTML min/max/step " +
    "özniteliğine dönüşür — yani kullanıcıya GÖSTERİLEN sınırdır. Şema ise " +
    "analiz/render/sunucu yolunda `.parse()` ile UYGULANIR (safeParse değil, " +
    "FIRLATAN parse: vitrophanie/index.tsx:53,319 · enseigne/index.tsx:37,144 · " +
    "apps/server/src/routes/garment.ts:37). İlan şemadan gevşek olduğunda " +
    "editör kullanıcıya 'bu değeri girebilirsin' der, kullanıcı girer, sonra " +
    "kaydetme/çizim anında Zod FIRLATIR. İlan tutamayacağı bir söz vermiş olur.\n\n" +
    "GÜVENLİ YÖN: ilanın şemadan SIKI olması serbesttir (bugünkü hâl — ör. " +
    "enseigne h_cm ilanı 20–500 iken şema 0<x≤2000 kabul eder). Sıkı ilan " +
    "yalnız kullanılmayan bir gevşekliği örter, YANLIŞ SÖZ vermez.\n\n" +
    "DÜZELTME: ya manifest ilanını şemanın içine çek, ya da şemayı " +
    "(packages/shared/src/schemas.ts) genişlet — ama şema genişletmek kayıtlı " +
    "belgeler üzerinde davranış değişikliğidir ve ayrı bir karardır."
  );
}

describe("NÖBETÇİ: manifest param ilanı Zod şemasının ALT KÜMESİ olmalı", () => {
  it(`BOŞ KÜME NÖBETÇİSİ: karşılaştırılan çift sayısı ölçülür (${BEKLENEN_SAYI_CIFTI} sayı + ${BEKLENEN_RENK_CIFTI} renk)`, () => {
    expect(
      SAYI_CIFTLERI.map((c) => `${c.sablon}.${c.param.id}`).sort(),
      "Karşılaştırılan SAYI çifti kümesi değişti. Sayı DÜŞTÜYSE nöbetçi " +
        "körleşmiştir (eşleme tablosu bozuldu · param yeniden adlandırıldı · " +
        "şema alanı kalktı) ve bu test olmasa SESSİZCE yeşil kalırdı. Sayı " +
        "ARTTIYSA yeni bir ilan⊆şema bağı doğmuştur — beklenen sayıyı güncelle."
    ).toEqual([
      "enseigne-panneau.h_cm",
      "enseigne-panneau.w_cm",
      "vitro-bandeau.h_cm",
      "vitro-bandeau.w_cm",
      "vitro-centre.h_cm",
      "vitro-centre.w_cm",
      "vitro-colonne.h_cm",
      "vitro-colonne.w_cm",
    ]);
    expect(SAYI_CIFTLERI).toHaveLength(BEKLENEN_SAYI_CIFTI);
    expect(RENK_CIFTLERI.map((c) => `${c.sablon}.${c.param.id}`).sort()).toEqual([
      "garment.fabric_color",
      "vitro-bandeau.cut_color",
      "vitro-centre.cut_color",
      "vitro-colonne.cut_color",
    ]);
    expect(RENK_CIFTLERI).toHaveLength(BEKLENEN_RENK_CIFTI);
  });

  it.each(SAYI_CIFTLERI.map((c) => [c.sablon, c.param.id, c] as const))(
    "%s.%s — ilan edilen ARALIĞIN UÇLARI şemadan geçer (davranışsal sonda, OTORİTE)",
    (sablon, _id, cift) => {
      const sema = SEMALI[sablon];
      const { id, min, max } = cift.param;
      /* Uçlar: ilanın vaat ettiği EN UÇ değerler. Bir aralık kısıtı ihlal
         edilecekse önce burada kırılır. */
      if (min !== undefined) {
        expect(
          semaKabulEder(sema, id, min),
          tehlikeMesaji(sablon, id, `ilan edilen min=${min} şemadan GEÇMİYOR`)
        ).toBe(true);
      }
      if (max !== undefined) {
        expect(
          semaKabulEder(sema, id, max),
          tehlikeMesaji(sablon, id, `ilan edilen max=${max} şemadan GEÇMİYOR`)
        ).toBe(true);
      }
      /* Varsayılan da ilanın bir parçasıdır: paramValue() geri-düşüşünde
         belgeye bu değer yazılır ve aynı şemadan geçmek zorundadır. */
      expect(
        semaKabulEder(sema, id, cift.param.default),
        tehlikeMesaji(sablon, id, `varsayılan ${String(cift.param.default)} şemadan GEÇMİYOR`)
      ).toBe(true);
    }
  );

  it.each(SAYI_CIFTLERI.map((c) => [c.sablon, c.param.id, c] as const))(
    "%s.%s — ilan edilen aralığın İÇ ÖRNEKLERİ de şemadan geçer (aralık-dışı delik taraması)",
    (sablon, _id, cift) => {
      const sema = SEMALI[sablon];
      const { id, min, max, step } = cift.param;
      if (min === undefined || max === undefined) return;
      /* Uç sondası aralık-BİÇİMLİ kısıtları yakalar; `.int()` / `.multipleOf()`
         gibi aralık-DIŞI kısıtlar aralığın ORTASINDA delik açar ve uçlardan
         görünmez. Deterministik bir ızgara taranır (rastgelelik YOK: kırmızı
         tekrar üretilebilir olmalı). Adım ilanı varsa ızgara ona hizalanır —
         ilan edilmemiş bir ara değer sonda etmenin anlamı yok. */
      const adim = step !== undefined && step > 0 ? step : 1;
      const hizala = (x: number) => min + Math.round((x - min) / adim) * adim;
      const ornekler = [0.25, 0.5, 0.75].map((t) => hizala(min + (max - min) * t));
      for (const v of ornekler) {
        expect(
          semaKabulEder(sema, id, v),
          tehlikeMesaji(sablon, id, `ilan edilen aralığın İÇİNDEKİ ${v} değeri şemadan GEÇMİYOR (aralık-dışı bir kısıt aralığın ortasında delik açıyor)`)
        ).toBe(true);
      }
    }
  );

  it.each(SAYI_CIFTLERI.map((c) => [c.sablon, c.param.id, c] as const))(
    "%s.%s — çıkarılan şema sınırı ilanı KAPSAR (yapısal çıkarım, sayısal mesaj)",
    (sablon, _id, cift) => {
      const sema = SEMALI[sablon];
      const { id, min, max } = cift.param;
      const s = semaSiniri(sema, id);
      expect(s, `${sablon}.${id}: şema sınırı çıkarılamadı — davranışsal sonda hâlâ geçerli ama sayısal karşılaştırma yapılamıyor`).not.toBeNull();
      if (!s) return;
      if (min !== undefined && s.alt !== null) {
        const gecerli = s.altKapsayici ? min >= s.alt : min > s.alt;
        expect(
          gecerli,
          tehlikeMesaji(sablon, id, `ilan min=${min}, şema alt sınırı ${s.alt} (${s.altKapsayici ? "dâhil" : "hariç"}) — ilan şemanın ALTINA taşıyor`)
        ).toBe(true);
      }
      if (max !== undefined && s.ust !== null) {
        const gecerli = s.ustKapsayici ? max <= s.ust : max < s.ust;
        expect(
          gecerli,
          tehlikeMesaji(sablon, id, `ilan max=${max}, şema üst sınırı ${s.ust} (${s.ustKapsayici ? "dâhil" : "hariç"}) — ilan şemanın ÜSTÜNE taşıyor`)
        ).toBe(true);
      }
    }
  );

  it.each(RENK_CIFTLERI.map((c) => [c.sablon, c.param.id, c] as const))(
    "%s.%s — renk varsayılanı şemadan geçer (ilan ⊆ şema, renk hâli)",
    (sablon, _id, cift) => {
      /* Renk paramında ilan bir ARALIK değil bir BİÇİMDİR (kanonik hex).
         Alt-küme ilişkisinin ölçülebilir hâli: ilanın ürettiği tek somut
         değer — varsayılan — şemadan geçmelidir. cut_color'da şema HexColor'a
         bağlıdır (biçimsiz varsayılan `.parse()`ta FIRLARDI); fabric_color'da
         şema düz `z.string()`tir, yani orada ilan şemadan SIKI'dır (güvenli
         yön) ve bu test yalnız varsayılanın geçtiğini teyit eder. */
      expect(
        semaKabulEder(SEMALI[sablon], cift.param.id, cift.param.default),
        tehlikeMesaji(sablon, cift.param.id, `renk varsayılanı ${JSON.stringify(cift.param.default)} şemadan GEÇMİYOR`)
      ).toBe(true);
    }
  );

  it("AYRIŞMA BUGÜN GÜVENLİ YÖNDEDİR — ilanın şemadan SIKI olduğu ölçülür", () => {
    /* Nöbetçi "ilan gevşek olamaz" der; bu test ayrışmanın BUGÜNKÜ yönünü
       ölçer ki tablo bir belgeleme cümlesi değil ÖLÇÜM olsun. Şema kabul eder
       ama ilan REDDEDER — yani ilan gerçekten daha sıkıdır. */
      const enseigne = TEMPLATES["enseigne-panneau"].manifest.params.find((p) => p.id === "h_cm");
    expect(enseigne?.max, "enseigne h_cm ilanı değişmiş — dosya başındaki ayrışma tablosu eskidi").toBe(500);
    expect(
      semaKabulEder(TabelaParamsSchema as unknown as ParamSemasi, "h_cm", 1800),
      "ŞEMA h_cm=1800'ü artık kabul etmiyor: ayrışma kapanmış olabilir (şema sıkılaştıysa " +
        "bu iyi haberdir, ama tabloyu ve bu testi güncelle)"
    ).toBe(true);
    expect(1800 > (enseigne?.max ?? Infinity), "ilan 1800'ü kapsıyor — ayrışma kaybolmuş").toBe(true);

    const vitro = TEMPLATES["vitro-bandeau"].manifest.params.find((p) => p.id === "w_cm");
    expect(vitro?.min).toBe(10);
    expect(
      semaKabulEder(VitroParamsSchema as unknown as ParamSemasi, "w_cm", 1),
      "ŞEMA w_cm=1'i artık kabul etmiyor: ayrışmanın alt ucu kapanmış olabilir"
    ).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   (3) KIRMIZI-KANIT: nöbetçinin TEHLİKELİ yönü gerçekten yakaladığı
   ══════════════════════════════════════════════════════════════════════════

   Yukarıdaki testler bugün YEŞİLDİR. Yeşil bir nöbetçi, hiçbir şey ölçmeyen
   bir nöbetçiden AYIRT EDİLEMEZ — bu blok tam da o ayrımı yapar: aynı
   karşılaştırma mantığı, ilanı TEHLİKELİ yöne çevrilmiş SENTETİK bir param
   üzerinde koşturulur ve KIRMIZI verdiği ölçülür. Gerçek manifest dosyalarına
   DOKUNULMAZ (sentetik ParamDef nesneleri kullanılır). */

describe("KIRMIZI-KANIT: tehlikeli yön (ilan > şema) gerçekten yakalanır", () => {
  const sema = TabelaParamsSchema as unknown as ParamSemasi;

  it("max: 3000 ilanı — davranışsal sonda REDDEDER (şema 2000'de kesiyor)", () => {
    /* Senaryonun tamamı: biri manifeste `max: 3000` yazar. EditorPage HTML
       max=3000 gösterir, kullanıcı 2500 girer, `.parse()` FIRLATIR. */
    expect(semaKabulEder(sema, "h_cm", 3000)).toBe(false);
    expect(semaKabulEder(sema, "h_cm", 2500)).toBe(false);
    /* ve bugünkü gerçek ilan aynı sondadan GEÇER (karşı dal) */
    expect(semaKabulEder(sema, "h_cm", 500)).toBe(true);
  });

  it("max: 3000 ilanı — yapısal karşılaştırma da REDDEDER (sayısal yol)", () => {
    const s = semaSiniri(sema, "h_cm");
    expect(s).not.toBeNull();
    if (!s || s.ust === null) return;
    const tehlikeli: ParamDef = { id: "h_cm", type: "number", default: 60, min: 20, max: 3000, label_tr: "T" };
    const guvenli: ParamDef = { id: "h_cm", type: "number", default: 60, min: 20, max: 500, label_tr: "G" };
    const kapsar = (p: ParamDef) => (s.ustKapsayici ? (p.max ?? 0) <= s.ust! : (p.max ?? 0) < s.ust!);
    expect(kapsar(tehlikeli), "ilan max=3000 şema max=2000'i aşıyor ama karşılaştırma yakalamadı").toBe(false);
    expect(kapsar(guvenli)).toBe(true);
  });

  it("min: 0 ilanı — şemanın DIŞLADIĞI alt uç yakalanır (.positive() → 0 hariç)", () => {
    /* Alt uç kapsayıcılığı sinsi: şema `positive()` yazar, 0 HARİÇTİR. `min: 0`
       ilan eden bir param sıfırı vaat eder ve tam sıfırda FIRLAR. */
    expect(semaKabulEder(sema, "w_cm", 0)).toBe(false);
    expect(semaKabulEder(sema, "w_cm", 1)).toBe(true);
    const s = semaSiniri(sema, "w_cm")!;
    const altGecerli = (min: number) => (s.altKapsayici ? min >= s.alt! : min > s.alt!);
    expect(altGecerli(0), "min=0 ilanı şemanın hariç tuttuğu değeri vaat ediyor ama yakalanmadı").toBe(false);
    expect(altGecerli(50)).toBe(true);
  });

  it("renk: hex olmayan varsayılan HexColor'a bağlı şemadan GEÇEMEZ", () => {
    expect(semaKabulEder(VitroParamsSchema as unknown as ParamSemasi, "cut_color", "siyah")).toBe(false);
    expect(semaKabulEder(VitroParamsSchema as unknown as ParamSemasi, "cut_color", "#1A1A1A")).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   (4) YÜK-ZAMANI KAPISI — bozuk param ilanı kayıt defterinden GEÇEMEZ
   ══════════════════════════════════════════════════════════════════════════

   registry-core.ts'e eklenen `paramIlanHatasi()` kapısının red yolları.
   kosullu-gereklilik.test.ts'teki `sahteGiris` deseninin BİREBİR emsali:
   SENTETİK bir manifest kurulur ve `kurVeDogrula` üzerinden yüklenmeye
   çalışılır — gerçek manifest dosyalarına DOKUNULMAZ. */

describe("bozuk param ilanı kayıt defterinden geçemez (yük-zamanı tutarlılık kapısı)", () => {
  const sahteGiris = (params: ParamDef[]): TemplateEntry => ({
    manifest: {
      id: "sahte-param",
      type: "menu",
      profile_version: 1,
      name_tr: "Sahte",
      bleed_mm: 3,
      safe_mm: 3,
      formats: { a: { w_mm: 10, h_mm: 10, label_tr: "A" } },
      defaultFormat: "a",
      params,
      slots: [],
      themes: [],
      production_channels: ["print", "preview"],
      production_techniques: ["impression"],
      production_substrate: "kagit",
    },
    Component: (() => null) as unknown as TemplateEntry["Component"],
  });
  const kur = (params: ParamDef[]) => () => kurVeDogrula({}, [sahteGiris(params)]);
  const sayi = (o: Partial<ParamDef>): ParamDef[] => [
    { id: "olcu", type: "number", default: 5, label_tr: "Ölçü", ...o },
  ];

  it("min > max REDDEDİLİR (boş aralık — hiçbir değer sağlayamaz)", () => {
    expect(kur(sayi({ min: 100, max: 10, default: 50 }))).toThrow(/boş aralık ilan ediyor/);
  });

  it("min === max GEÇER (tek noktalık aralık boş değildir)", () => {
    expect(kur(sayi({ min: 7, max: 7, default: 7 }))).not.toThrow();
  });

  it("varsayılan min ALTINDA reddedilir (geri-düşüş kendi ilanının dışına düşer)", () => {
    expect(kur(sayi({ min: 10, max: 100, default: 5 }))).toThrow(/min=10 altında/);
  });

  it("varsayılan max ÜSTÜNDE reddedilir", () => {
    expect(kur(sayi({ min: 0, max: 100, default: 101 }))).toThrow(/max=100 üstünde/);
  });

  it("sayı OLMAYAN varsayılan reddedilir (tüketici NaN üretir)", () => {
    expect(kur(sayi({ default: "5" }))).toThrow(/sonlu bir sayı değil/);
    expect(kur(sayi({ default: true }))).toThrow(/sonlu bir sayı değil/);
    expect(kur(sayi({ default: NaN }))).toThrow(/sonlu bir sayı değil/);
    expect(kur(sayi({ default: Infinity }))).toThrow(/sonlu bir sayı değil/);
  });

  it("step ≤ 0 reddedilir (ızgarasız ızgara ilanı)", () => {
    expect(kur(sayi({ min: 0, max: 10, step: 0 }))).toThrow(/pozitif sonlu sayı değil/);
    expect(kur(sayi({ min: 0, max: 10, step: -1 }))).toThrow(/pozitif sonlu sayı değil/);
  });

  it("renk varsayılanı kanonik hex DEĞİLSE reddedilir", () => {
    const renk = (d: unknown): ParamDef[] => [
      { id: "renk", type: "color", default: d as ParamDef["default"], label_tr: "Renk" },
    ];
    expect(kur(renk("siyah"))).toThrow(/kanonik hex biçiminde değil/);
    expect(kur(renk("#FFF"))).toThrow(/kanonik hex biçiminde değil/); // 3 hane KABUL EDİLMEZ
    expect(kur(renk("#GGGGGG"))).toThrow(/kanonik hex biçiminde değil/);
    expect(kur(renk("1A1A1A"))).toThrow(/kanonik hex biçiminde değil/); // # zorunlu
    expect(kur(renk("#1A1A1A00"))).toThrow(/kanonik hex biçiminde değil/); // alfa KABUL EDİLMEZ
    expect(kur(renk(0))).toThrow(/kanonik hex biçiminde değil/);
    expect(kur(renk("#1A1A1A"))).not.toThrow();
    expect(kur(renk("#1a1a1a"))).not.toThrow(); // küçük harf serbest (kanonik regex)
  });

  it("TUTARLI ilanlar geçer (bugünkü gerçek ilanların birebir kopyaları)", () => {
    expect(
      kur([
        { id: "w_cm", type: "number", default: 300, min: 50, max: 2000, step: 1, label_tr: "Genişlik" },
        { id: "h_cm", type: "number", default: 60, min: 20, max: 500, step: 1, label_tr: "Yükseklik" },
        { id: "designSeed", type: "number", default: 0, min: 0, max: 9999, step: 1, label_tr: "Tohum" },
        { id: "cut_color", type: "color", default: "#1A1A1A", label_tr: "Kesim rengi" },
      ])
    ).not.toThrow();
  });

  it("min/max/step ilan ETMEYEN sayı paramı geçer (alanlar opsiyoneldir)", () => {
    expect(kur(sayi({}))).not.toThrow();
    expect(kur(sayi({ min: 3 }))).not.toThrow();
    expect(kur(sayi({ max: 9 }))).not.toThrow();
  });

  it("choice/toggle DENETİMSİZ geçer (kapı bilerek yalnız number+color)", () => {
    /* Bu bir eksiklik DEĞİL bir sınır ilanıdır ve registry-core şerhinde
       gerekçelidir: choice'ın doğru kapısı optionsByFormat/defaultByFormat
       ile birlikte kurulmalıdır (menu-grid-cells `cols` ve
       menu-liste-premium `columns` yalnız optionsByFormat taşır) — AYRI karar.
       Sınır burada ÇİVİLİDİR ki sessizce "kapsandı" sanılmasın. */
    expect(
      kur([
        { id: "mod", type: "choice", options: ["a", "b"], default: "kumede-yok", label_tr: "Mod" },
        { id: "acik", type: "toggle", default: "bool-degil", label_tr: "Açık" },
      ])
    ).not.toThrow();
  });

  it("KAYITLI 11 AİLENİN HEPSİ kapıdan geçer (kapı hiçbir mevcut ilanı kırmaz)", () => {
    /* TEMPLATES zaten yüklendiği için bu ölçüm dolaylıdır; burada AÇIKÇA
       yeniden kurulur ve gezilen param sayısı sayılır — kapı boş kümede
       gezinip "geçti" diyemez. */
    expect(Object.keys(TEMPLATES)).toHaveLength(11);
    const sayilar = Object.values(TEMPLATES).flatMap((e) =>
      e.manifest.params.filter((p) => p.type === "number" || p.type === "color")
    );
    expect(
      sayilar,
      "kapının GEZDİĞİ param sayısı değişti (journal ÖLÇÜM 2: 13 number + 4 color)"
    ).toHaveLength(17);
    expect(sayilar.filter((p) => p.type === "number")).toHaveLength(13);
    expect(sayilar.filter((p) => p.type === "color")).toHaveLength(4);
    expect(() => kurVeDogrula({}, Object.values(TEMPLATES))).not.toThrow();
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   (5) SÖZLÜK EŞ-KÜMELİĞİ: HEX_BICIMI ≡ HexColor
   ══════════════════════════════════════════════════════════════════════════

   registry-core.ts @tezgah/shared'a runtime bağ TAŞIMAZ (identity alt-yolunun
   react'sız bağımlılık grafiği büyümesin diye) ve hex biçimini BİLEREK LİTERAL
   yazar — MOCKUP_SAHNE_TURLERI ≡ SceneKindSchema.options ve VARLIK_TURLERI ≡
   AssetKindSchema.options emsallerinin birebir aynısı. Literal ile kanonik
   tanımın ayrışması burada DAVRANIŞLA yakalanır: regex metnini karşılaştırmak
   kırılgandır (eşdeğer ama farklı yazılmış iki regex yanlış kırmızı verir),
   bu yüzden bir SONDA KÜMESİ üzerinde iki tarafın kararı karşılaştırılır. */

describe("HEX_BICIMI ≡ HexColor (bilinçli literal — sürüklenme sessiz kalamaz)", () => {
  const SONDALAR = [
    "#1A1A1A",
    "#1a1a1a",
    "#FFFFFF",
    "#000000",
    "#abcdef",
    "#ABCDEF",
    "#123456",
    "#FFF", // 3 haneli kısaltma
    "#FFFFFFF", // 7 hane
    "#FFFFFFFF", // alfa kanallı
    "FFFFFF", // # yok
    "#GGGGGG", // hex olmayan harf
    "#12345", // 5 hane
    "",
    "siyah",
    "rgb(0,0,0)",
    " #FFFFFF",
    "#FFFFFF ",
    "#FFFFFF\n",
  ];

  it.each(SONDALAR)("%j: literal regex ile HexColor AYNI kararı verir", (s) => {
    expect(
      HEX_BICIMI.test(s),
      `HEX_BICIMI (registry-core.ts) ile HexColor (packages/shared/src/schemas.ts:10) ` +
        `"${s}" üzerinde AYRIŞTI — registry-core bilerek runtime bağ taşımaz ve regexi ` +
        "literal yazar; iki tanım ayrışırsa yük-zamanı kapısı şemanın kabul etmediği " +
        "bir varsayılanı geçirir (ya da tersi)"
    ).toBe(HexColor.safeParse(s).success);
  });

  it("regex GLOBAL bayrağı taşımaz (lastIndex tuzağı — ardışık test() çağrıları)", () => {
    /* /g bayraklı bir regex `test()` çağrıları arasında lastIndex taşır ve
       AYNI girdi için sırayla true/false döner. Kapı her param için ayrı
       çağrı yaptığından bu sessiz bir yanlış-red kaynağı olurdu. */
    expect(HEX_BICIMI.global).toBe(false);
    expect(HEX_BICIMI.test("#FFFFFF")).toBe(true);
    expect(HEX_BICIMI.test("#FFFFFF")).toBe(true);
    expect(HEX_BICIMI.test("#FFFFFF")).toBe(true);
  });
});
