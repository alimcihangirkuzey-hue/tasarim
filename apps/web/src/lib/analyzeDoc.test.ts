/* analyzeDoc — İLK DOĞRUDAN TESTİ (journal 2026-07-27-web-test-altyapisi).

   NEDEN BU DOSYA VAR: bir önceki paket (journal 2026-07-26-uyari-kaynagi-
   durustlugu) apps/web/src/lib/analyzeDoc.ts'te iki düzeltme yaptı ve kendi
   yorumunda düzeltmeyi DOĞRUDAN test edemediğini açıkça yazdı — apps/web'in
   `test` script'i yoktu, kapı fan-out'u bu workspace'i sessizce atlıyordu
   (packages/templates/src/uyari-kopru-kapsami.test.ts:19-24 şerhi). O paket
   korumayı packages/templates'e DOLAYLI bir nöbetçi olarak koyabildi: köprü
   kapsamı değişirse orada patlar, ama analyzeDoc'un KENDİ dallarının ne
   döndürdüğü ölçülmemiş kalıyordu. Bu dosya o boşluğu kapatır: aşağıdaki her
   assert analyzeDoc'un gerçek çıktısını okur, ilanı değil.

   FİKSTÜR DESENİ ödünç alınmıştır (packages/templates/src/menu-grid-cells/
   analyze.test.ts:11-48 ve flyer/analyze.test.ts:10-30): DocumentState ELLE
   kurulmaz, DocumentStateSchema.parse'tan geçer. Gerekçe bu depoda ölçülmüştür —
   şemanın default'ları (params/{}, theme_id/"brand", selection/{}, cd_version/1)
   elle kurulan bir nesnede eksik kalır ve test, ÜRETİMDE hiç oluşmayan bir belge
   şekliyle yeşil olur. @tezgah/templates barrel'ı testte GERÇEK kullanılır
   (workspace symlink); mock YOK — mock, tam da ölçmek istediğimiz kayıt defteri
   bağını taklide çevirirdi. */

import { describe, expect, it } from "vitest";
import {
  CatalogSchema,
  DocumentStateSchema,
  defaultBrandKit,
  type ClientDTO,
} from "@tezgah/shared";
import { TEMPLATES, analyzeGrid, analyzeList } from "@tezgah/templates";
import { analyzeDoc } from "./analyzeDoc.js";

/** n ürünlü, LOGOSUZ müşteri — logosuzluk kasıtlı: zorunlu-varlık uyarısının
 *  köprüden akıp akmadığını (d) ölçebilmek için tek elverişli kaldıraç. */
function makeClient(n: number): ClientDTO {
  return {
    id: "cli_web",
    name: "Web Test",
    slug: "web-test",
    notes: "",
    currency: "EUR",
    menu_language: "fr",
    brandkit: defaultBrandKit(),
    catalog: CatalogSchema.parse({
      categories: [
        {
          id: "c0",
          name_fr: "Catégorie",
          order: 0,
          items: Array.from({ length: n }, (_, i) => ({
            id: `i${i}`,
            name_fr: `Produit ${i + 1}`,
            desc_fr: "",
            order: i,
            prices: [{ label: "seul", value: 7.5 }],
          })),
        },
      ],
    }),
    assets: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

/* analyzeDoc'un switch'inde ADLA yakalanan id'lerin TAM listesi — elle yazılır,
   kayıt defterinden TÜRETİLMEZ (uyari-kopru-kapsami.test.ts'teki KOPRULU
   listesinin aynı gerekçesi: türetilen liste kendini doğrular, elle yazılan
   liste ayrışmayı yakalar). Bu liste analyzeDoc.ts:23-62 ile senkron tutulur;
   kayıt defterine yeni id girip buraya girmezse (b) testi kırmızıya döner. */
const ADLI_DALLAR: readonly string[] = [
  "menu-grid-cells",
  "menu-liste-premium",
  "menu-trifold",
  "flyer",
  "carte-fidelite",
  "vitro-bandeau",
  "vitro-centre",
  "vitro-colonne",
  "enseigne-panneau",
  "garment",
];

describe("analyzeDoc — köprüsüz id: kaynak yoksa uyarı da yok", () => {
  it("kayıtta OLMAYAN template_id → warnings BOŞ (kaldırılan analyzeGrid fallback'inin nöbetçisi)", () => {
    /* ESKİ DAVRANIŞ ŞUYDU: default dal `analyzeGrid(client, doc)` çağırırdı, yani
       ANALİZİ OLMAYAN bir şablona menu-grid-cells KAPASİTE MATEMATİĞİNİN uyarıları
       gösterilirdi. Operatör, düzeltemeyeceği bir uyarıyı düzeltmeye çalışırdı ve
       gerçek uyarılara olan güveni aşınırdı. Artık kaynak yoksa uyarı da yoktur.

       TESTİN SESSİZ GEÇMESİNE KARŞI SİGORTA — ve bu maddenin asıl değeri:
       `toEqual([])` tek başına ZAYIF bir asserttır, çünkü "boş çünkü zaten hiç
       uyarı üretilecek durum yoktu" hâlinde de yeşil kalır. Bu yüzden fikstür
       BİLEREK taşacak şekilde kurulur (40 ürün) ve AYNI client+doc ikilisi
       eski fallback ifadesinin birebir kendisinden — `analyzeGrid(client, doc)` —
       geçirilip uyarı ÜRETTİĞİ ayrıca ölçülür. İki assert yan yana durunca test
       "boş" ile "susturulmuş" arasındaki farkı gerçekten ayırt eder: eski kod
       bugün geri gelseydi bu belge KESİNLİKLE overflow-items görürdü. */
    const client = makeClient(40);
    const doc = DocumentStateSchema.parse({ template_id: "yok-boyle-sablon" });

    expect(TEMPLATES["yok-boyle-sablon"], "fikstür id'si kayıt defterine girmiş").toBeUndefined();
    expect(analyzeDoc(client, doc).warnings).toEqual([]);

    /* KIRMIZI-KANIT KOLU: eski fallback ifadesinin aynısı, aynı girdilerle */
    const eskiFallback = analyzeGrid(client, doc).warnings;
    expect(
      eskiFallback.some((w) => w.type === "overflow-items"),
      "fikstür artık taşmıyor: (a) maddesi sessizce zayıfladı, ürün sayısını artır"
    ).toBe(true);
    /* Sayısal çivi BİLEREK yok: taşan ürün adedi grid kapasite matematiğinin
       malıdır ve kendi paketinde çivilidir (menu-grid-cells/analyze.test.ts).
       Buradaki soru "kaç taştı" değil, "eski yol bağırır mıydı" — evet. */
  });

  it("köprüsüz id'de pages 1'e düşer (entry yok → optional chain kısa devre)", () => {
    const doc = DocumentStateSchema.parse({ template_id: "yok-boyle-sablon" });
    expect(analyzeDoc(makeClient(40), doc).pages).toBe(1);
  });
});

describe("analyzeDoc — default dalında pages: bugün ölçülebilen yalnız `?? 1`", () => {
  it("default dala bugün YALNIZ kabul-fabrika düşer ve o pageCount İLAN ETMEZ", () => {
    /* DÜRÜSTLÜK ŞERHİ — bu testin NE ölçmediği, ölçtüğü kadar önemli:
       analyzeDoc.ts:95 artık `entry?.pageCount?.(client, doc) ?? 1` yazıyor.
       Okuma yolunun GERÇEKTEN çalıştığını bugünkü kayıt defteriyle KANITLAYAMAM.
       Ölçüm şu: TEMPLATES 11 id taşır, 10'u yukarıdaki ADLI_DALLAR ile switch'te
       yakalanır, default dala yalnız `kabul-fabrika` düşer — ve kabul-fabrika
       (fabrika emitter'ının ürettiği tek şablon) pageCount ilan ETMEZ. Yani
       canlıda koşan tek yol `?? 1` yoludur; `pageCount` çağrısı bugün ÖLÜ YOLdur.

       Bu testi uydurma bir entry ENJEKTE EDEREK canlandırmayı reddediyorum:
       TEMPLATES'i mutasyona uğratmak, ölçtüğüm şeyi "kendi kurduğum sahne"ye
       çevirir ve kayıt defterini test uğruna kirletir — bu, testsizlikten kötüdür.
       Onun yerine ÖN KOŞULU çiviliyorum: emitter bir gün pageCount emit ederse
       (ya da default dala pageCount ilan eden bir id düşerse) bu test kırmızıya
       döner ve okuma yolunu GERÇEKTEN ölçen testi yazmak zorunlu hâle gelir. */
    const defaultDal = Object.keys(TEMPLATES)
      .filter((id) => !ADLI_DALLAR.includes(id))
      .sort();
    expect(
      defaultDal,
      "analyzeDoc default dalının kapsamı değişti: ADLI_DALLAR listesini analyzeDoc.ts " +
        "switch'iyle senkronla, sonra pageCount okuma yolunun hâlâ ölü olup olmadığını yeniden ölç"
    ).toEqual(["kabul-fabrika"]);

    for (const id of defaultDal) {
      expect(
        TEMPLATES[id].pageCount,
        `${id}: default dala düşen bir id artık pageCount İLAN EDİYOR — ` +
          "okuma yolu canlandı, onu doğrudan ölçen test bu dosyaya eklenmeli"
      ).toBeUndefined();
    }
  });

  it("kabul-fabrika pages === 1 — bu `?? 1` yolunu ölçer, pageCount OKUMASINI değil", () => {
    const doc = DocumentStateSchema.parse({ template_id: "kabul-fabrika" });
    expect(analyzeDoc(makeClient(40), doc).pages).toBe(1);
  });
});

describe("analyzeDoc — adlı dallar ilgili analiz fonksiyonuyla aynı sonucu verir", () => {
  it("menu-grid-cells: uyarılar analyzeGrid ile birebir; pages MUTABAKATA bağlı", () => {
    const client = makeClient(40);
    const doc = DocumentStateSchema.parse({ template_id: "menu-grid-cells" });
    const r = analyzeDoc(client, doc);
    const a = analyzeGrid(client, doc);

    expect(r.warnings).toEqual(a.warnings);
    /* uyarı dizisinin BOŞ olmadığını da ölç: aksi hâlde `[] toEqual []`
       karşılaştırması bağı ölçmeden yeşil kalırdı (aynı sessiz-geçiş tuzağı) */
    expect(r.warnings.length).toBeGreaterThan(0);

    /* Çivi bir SABİTE değil, MUTABAKATA bağlanır: sabit yazmak (eskiden `1`)
       tam da aşağıdaki multipage testinin ortaya çıkardığı hatayı SÖZLEŞMEYE
       çevirirdi — yanlış davranışı pinleyen test, hatayı korumaya alır. */
    expect(r.pages).toBe(a.pages);
  });

  it("menu-grid-cells @ multipage: pages analizden okunur (CANLI kusurun nöbetçisi)", () => {
    /* BU TESTİN DOĞUŞU: apps/web'i ilk kez ölçebilen kapı, ilk koşumda canlı bir
       kusur buldu. Eskiden bu dal `pages: 1` SABİTİ döndürüyordu; ölçüm (80 ürün,
       flow="multipage"): analyzeGrid 9, entry.pageCount 9, analyzeDoc 1.
       Kullanıcıya etkisi kozmetik değildi — EditorPage sayfa seçicisini
       `pages > 1` koşuluyla gösterir (EditorPage.tsx), yani 9 sayfalık menüde
       operatör 2–9. sayfalara hiç geçemiyordu; oysa aynı belgede baskı 9 sayfa
       basıyordu (PrintPage entry.pageCount'u jenerik okur).

       Bir önceki paket (uyari-kaynagi-durustlugu) bu ayrışmayı DEFAULT dalda
       kapatmış ve "latent" diye şerh etmişti — doğruydu, ama ADLI dallara
       bakmamıştı. Ders: bir sınıf hatayı bir dalda kapatmak, kardeş dalların
       ölçüldüğü anlamına gelmez. */
    const client = makeClient(80);
    const doc = DocumentStateSchema.parse({
      template_id: "menu-grid-cells",
      params: { flow: "multipage" },
    });
    const a = analyzeGrid(client, doc);

    /* Fikstürün gerçekten çok sayfalı olduğunu ÖNCE ölç: `a.pages` 1 olsaydı
       aşağıdaki mutabakat asserti `?? 1` yolundan ayırt edilemezdi (1 == 1). */
    expect(a.pages, "fikstür artık çok sayfalı değil: ürün sayısını artır").toBeGreaterThan(1);
    expect(analyzeDoc(client, doc).pages).toBe(a.pages);

    /* İlanla da bağla: entry.pageCount aynı sayıyı verir. Editör ile baskının
       AYNI ilandan beslendiği burada çivilenir (entry şerhi: "PDF sayfa sayısı
       = editör" — ihlal edilen tam da o cümleydi). */
    expect(TEMPLATES["menu-grid-cells"].pageCount!(client, doc)).toBe(a.pages);
  });

  it("menu-liste-premium: uyarılar analyzeList ile birebir; pages === a.pages.length", () => {
    const client = makeClient(40);
    const doc = DocumentStateSchema.parse({ template_id: "menu-liste-premium" });
    const r = analyzeDoc(client, doc);
    const a = analyzeList(client, doc);

    expect(r.warnings).toEqual(a.warnings);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.pages).toBe(a.pages.length);
    /* çok-sayfalı olduğunu da ölç: `pages.length` 1 olsaydı bu assert
       `?? 1` yolundan ayırt edilemezdi (1 == 1 tesadüfü) */
    expect(r.pages).toBeGreaterThan(1);
  });
});

describe("NÖBETÇİ: analyzeDoc'un pages'i İLANLA mutabık (kayıt defteri geneli)", () => {
  /* NEDEN DAL-DAL DEĞİL KAYIT GENELİ: yukarıdaki multipage testi tek bir dalın
     kusurunu kapatır; bu nöbetçi SINIFI kapatır. Kusur zaten şöyle doğmuştu —
     bir dal ilanı okumayı unuttu ve bunu kimse ölçmedi. Dal başına test yazmak
     aynı unutmanın 11. kez tekrarlanmasına engel olmaz; ilanla mutabakatı
     kayıt defteri üzerinden taramak olur.

     ÖLÇÜM (bu nöbetçi yazılırken, 11 id × 2 param kümesi = 22 kombinasyon):
     ayrışan dal sayısı 0. Düzeltme öncesi 1'di (menu-grid-cells@multipage:
     analyzeDoc 1, ilan 9). journal 2026-07-27-web-test-altyapisi */
  const client = makeClient(80);

  it("pageCount İLAN EDEN her id için analyzeDoc aynı sayıyı verir", () => {
    for (const id of Object.keys(TEMPLATES)) {
      const entry = TEMPLATES[id];
      if (!entry.pageCount) continue; /* ilan yoksa mutabakat da yok — (b) ölçer */
      for (const params of [{}, { flow: "multipage" }]) {
        const doc = DocumentStateSchema.parse({ template_id: id, params });
        expect(
          analyzeDoc(client, doc).pages,
          `${id} (params=${JSON.stringify(params)}): editör paneli ile ilan AYRIŞTI. ` +
            "Bu ayrışma kullanıcıya doğrudan yansır — EditorPage sayfa seçicisini " +
            "`pages > 1` ile gösterir, PrintPage/PresentPage ise entry.pageCount'u " +
            "jenerik okur; yani aynı belgede editör ile baskı farklı sayfa sayısı söyler"
        ).toBe(entry.pageCount(client, doc));
      }
    }
  });

  it("nöbetçi gerçekten tarıyor: ilanlı id sayısı ölçülür (boş döngü yeşil kalmasın)", () => {
    /* Döngü tabanlı nöbetçilerin sinsi arızası: filtre her şeyi eler, döngü hiç
       dönmez, test yeşil kalır ve hiçbir şey ölçmemiş olur. Sayıyı çivilemek
       yerine ALT SINIR ölçülür — yeni aile eklemek nöbetçiyi kırmamalı, ama
       ilanların topluca kaybolması kırmalı. */
    const ilanli = Object.values(TEMPLATES).filter((e) => typeof e.pageCount === "function");
    expect(ilanli.length).toBeGreaterThanOrEqual(10);
  });
});

describe("analyzeDoc — kabul-fabrika: uyarılar entry.warnings KÖPRÜSÜNDEN gelir", () => {
  it("çıktı TEMPLATES['kabul-fabrika'].warnings(...) ile birebir aynı", () => {
    /* (d): default dalda köprü VARSA `entry.warnings(client, doc)` çağrılır.
       kabul-fabrika bugün köprülü TEK ailedir (packages/templates/src/
       uyari-kopru-kapsami.test.ts nöbetçisi bunu kayıt tarafında çivili tutar);
       burada ölçülen, WEB TARAFININ o köprüyü gerçekten çağırdığıdır. Referans
       değer önce köprüden alınır, sonra analyzeDoc çıktısıyla karşılaştırılır —
       böylece uyarı metinleri değişse bile test bağı ölçmeye devam eder. */
    const client = makeClient(40);
    const doc = DocumentStateSchema.parse({ template_id: "kabul-fabrika" });

    const entry = TEMPLATES["kabul-fabrika"];
    expect(entry.warnings, "kabul-fabrika köprüsü kalkmış — fabrika belgeleri uyarısız kalır").toBeDefined();
    const koprudenGelen = entry.warnings!(client, doc);

    /* logosuz müşteride köprünün ürettiği zorunlu-varlık uyarısı gerçekten var:
       referans dizinin kendisi boş olsaydı aşağıdaki toEqual bağı ölçmezdi */
    expect(koprudenGelen.some((w) => w.type === "empty-required")).toBe(true);
    expect(analyzeDoc(client, doc).warnings).toEqual(koprudenGelen);
  });
});
