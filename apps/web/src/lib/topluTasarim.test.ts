/* TOPLU TASARIM KÜTÜPHANESİ testleri (K-1/A).

   Gövde ProjectsPanel'den buraya taşındı çünkü ikinci tüketici doğdu (Açılış
   Takımı). Bileşen testleri (ProjectsPanel.toplu.test.tsx) DÜĞMEYİ ölçer;
   bu dosya GÖVDEYİ ölçer — DOM'suz, enjekte edilen soruyla.

   `sor` ENJEKTE EDİLDİĞİ İÇİN tarayıcı diyaloğuna gerek yok: turun kaç kez
   sorduğu doğrudan sayılabiliyor, "tür başına bir kez" sözleşmesi bir
   tarayıcı API'sine bağlı kalmıyor.

   VAZGEÇME (2026-08-06, N-seçenekli seçici): `sor` artık `null` döndürebilir.
   O türün kalemleri AÇILMAZ, tur DURMAZ ve sayı `vazgecilen`de AYRI durur —
   `atlanan`la birleştirilseydi "sistem yapamaz" ile "operatör istemedi" tek
   sayıya düşerdi. Eski `window.confirm` yolunda vazgeçmek MÜMKÜN DEĞİLDİ:
   "İptal" ikinci şablonu seçiyordu. */

import { afterEach, describe, expect, it, vi } from "vitest";
import type { OrderItemDTO, ProductType } from "@tezgah/shared";
import { siparisSablonlari } from "@tezgah/templates/identity";
import { api } from "../api";
import {
  baslatmaSonucVerisi,
  belgeAc,
  topluBaslat,
  topluOzetMetni,
  topluPlan,
  type BaslatmaMetinleri,
} from "./topluTasarim";

vi.mock("../api", () => ({
  api: {
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    updateOrderItem: vi.fn(),
  },
}));

function kalem(p: Partial<OrderItemDTO> & { id: string }): OrderItemDTO {
  return {
    project_id: "proj_1",
    product_type: "flyer",
    qty: 1,
    width_cm: null,
    height_cm: null,
    details: { format: "a4" },
    notes: "",
    status: "olcu_bekliyor",
    document_id: null,
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    ...p,
  } as OrderItemDTO;
}

const belge = (id: string) => ({ id }) as never;
/** Varsayılan soru: ilk seçeneği alır */
const ilkiniSec = async (_t: ProductType, secenekler: readonly string[]): Promise<string | null> =>
  secenekler[0]!;
/** Vazgeçen soru: operatör "Vazgeç"e bastı */
const vazgec = async (): Promise<string | null> => null;

/* Gerekçe metinleri ENJEKTE (kütüphane i18n bilmez). Sabitler bilerek
   ayırt edilebilir: bir gerekçe yanlış kovadan gelirse test onu ADIYLA
   yakalasın. */
const METIN: BaslatmaMetinleri = {
  tasarlanamaz: "TASARLANAMAZ",
  vazgecildi: "VAZGECILDI",
  hata: (e) => `HATA:${(e as Error).message}`,
};

afterEach(() => vi.clearAllMocks());

/* Sayı iddiaları satır listesinden AYRI okunur: satırlar kendi testlerinde
   çivili, sayı testleri kova mantığını ölçüyor. İkisini tek `toEqual`'da
   birleştirmek, kova testini her satır değişikliğinde kırardı. */
const sayilariAl = (r: Awaited<ReturnType<typeof topluBaslat>>) => ({
  acilan: r.acilan,
  dusen: r.dusen,
  atlanan: r.atlanan,
  vazgecilen: r.vazgecilen,
  zaten: r.zaten,
});

describe("topluPlan — dört kova AYRIK ve TÜKETİCİ", () => {
  it("her kalem tam bir kovaya düşer; toplam korunur", () => {
    const items = [
      kalem({ id: "a", product_type: "flyer" }),
      kalem({ id: "b", product_type: "menu" }),
      kalem({ id: "c", product_type: "diger" }),
      kalem({ id: "d", document_id: "doc_var" }),
    ];
    const p = topluPlan(items);
    expect(p.hazir.map((i) => i.id)).toEqual(["a"]);
    expect(p.secimli.map((i) => i.id)).toEqual(["b"]);
    expect(p.tasarlanamaz.map((i) => i.id)).toEqual(["c"]);
    expect(p.zaten.map((i) => i.id)).toEqual(["d"]);
    expect(p.hazir.length + p.secimli.length + p.tasarlanamaz.length + p.zaten.length).toBe(
      items.length,
    );
  });
});

describe("belgeAc — yetim telafisi", () => {
  it("params 400'ünde belge GERİ SARILIR ve kalem BAĞLANMAZ", async () => {
    vi.mocked(api.createDocument).mockResolvedValue(belge("doc_1"));
    vi.mocked(api.updateDocument).mockRejectedValue(new Error("400"));
    vi.mocked(api.deleteDocument).mockResolvedValue({} as never);

    await expect(
      belgeAc("cli_1", kalem({ id: "a", product_type: "vitrophanie", width_cm: 5000, height_cm: 80, details: { side: "exterieur", mode: "impression" } }), "vitro-centre"),
    ).rejects.toThrow("400");

    expect(api.deleteDocument).toHaveBeenCalledWith("doc_1");
    /* Bağlansaydı operatör YANLIŞ ölçülü bir belgeyle tasarlardı. */
    expect(api.updateOrderItem).not.toHaveBeenCalled();
  });

  it("SİLME BAŞARISIZ olsa bile ASIL hata yükselir (telafi hatayı örtmez)", async () => {
    vi.mocked(api.createDocument).mockResolvedValue(belge("doc_1"));
    vi.mocked(api.updateDocument).mockRejectedValue(new Error("400 asıl"));
    vi.mocked(api.deleteDocument).mockRejectedValue(new Error("silinemedi"));

    await expect(
      belgeAc("cli_1", kalem({ id: "a", product_type: "vitrophanie", width_cm: 5000, height_cm: 80, details: { side: "exterieur", mode: "impression" } }), "vitro-centre"),
    ).rejects.toThrow("400 asıl");
  });
});

describe("topluBaslat — tur sözleşmeleri", () => {
  it("SORU TÜR BAŞINA BİR KEZ — aynı türden N kalem tek cevabı paylaşır", async () => {
    vi.mocked(api.createDocument).mockResolvedValue(belge("doc_x"));
    vi.mocked(api.updateDocument).mockResolvedValue(belge("x"));
    vi.mocked(api.updateOrderItem).mockResolvedValue({} as never);
    const sor = vi.fn(ilkiniSec);

    const r = await topluBaslat(
      "cli_1",
      [kalem({ id: "m1", product_type: "menu" }), kalem({ id: "m2", product_type: "menu" })],
      sor,
      METIN,
    );

    expect(sor).toHaveBeenCalledTimes(1); // kalem başına sorsaydı 2 olurdu
    expect(r.acilan).toBe(2);
    /* Tek cevap iki kaleme de uygulanır. */
    const secilen = siparisSablonlari("menu")[0];
    expect(vi.mocked(api.createDocument).mock.calls.map((c) => c[1])).toEqual([secilen, secilen]);
  });

  it("SIRAYLA koşar — paralel değil (eşzamanlı yazma ve karışan telafi yok)", async () => {
    const sira: string[] = [];
    vi.mocked(api.createDocument).mockImplementation(async () => {
      sira.push("create");
      return belge("doc_x");
    });
    vi.mocked(api.updateOrderItem).mockImplementation(async () => {
      sira.push("link");
      return {} as never;
    });
    vi.mocked(api.updateDocument).mockResolvedValue(belge("x"));

    await topluBaslat("cli_1", [kalem({ id: "a" }), kalem({ id: "b" })], ilkiniSec, METIN);
    /* Paralel olsaydı iki create arka arkaya gelir, aralarına link girmezdi. */
    expect(sira).toEqual(["create", "link", "create", "link"]);
  });

  it("DÜŞEN KALEM turu DURDURMAZ ama SAYILIR", async () => {
    vi.mocked(api.createDocument)
      .mockRejectedValueOnce(new Error("500"))
      .mockResolvedValueOnce(belge("doc_iyi"));
    vi.mocked(api.updateDocument).mockResolvedValue(belge("x"));
    vi.mocked(api.updateOrderItem).mockResolvedValue({} as never);

    const r = await topluBaslat("cli_1", [kalem({ id: "kotu" }), kalem({ id: "iyi" })], ilkiniSec, METIN);
    expect(sayilariAl(r)).toEqual({ acilan: 1, dusen: 1, atlanan: 0, vazgecilen: 0, zaten: 0 });
    expect(vi.mocked(api.updateOrderItem).mock.calls.map((c) => c[0])).toEqual(["iyi"]);
  });

  it("TASARLANAMAZ ve ZATEN kovaları çağrı ÜRETMEZ ama raporda görünür", async () => {
    const r = await topluBaslat(
      "cli_1",
      [kalem({ id: "c", product_type: "diger" }), kalem({ id: "d", document_id: "doc_var" })],
      ilkiniSec,
      METIN,
    );
    expect(api.createDocument).not.toHaveBeenCalled();
    expect(sayilariAl(r)).toEqual({ acilan: 0, dusen: 0, atlanan: 1, vazgecilen: 0, zaten: 1 });
  });

  it("VAZGEÇME o türü ATLAR — belge AÇILMAZ, tur DURMAZ, sayı AYRI durur", async () => {
    vi.mocked(api.createDocument).mockResolvedValue(belge("doc_x"));
    vi.mocked(api.updateDocument).mockResolvedValue(belge("x"));
    vi.mocked(api.updateOrderItem).mockResolvedValue({} as never);

    /* İki menü (vazgeçilir) + bir flyer (sorusuz koşar): vazgeçmenin turu
       DURDURMADIĞI ancak yanında koşan bir kalem varken ölçülebilir. */
    const r = await topluBaslat(
      "cli_1",
      [
        kalem({ id: "m1", product_type: "menu" }),
        kalem({ id: "m2", product_type: "menu" }),
        kalem({ id: "f", product_type: "flyer" }),
      ],
      vazgec,
      METIN,
    );

    expect(sayilariAl(r)).toEqual({ acilan: 1, dusen: 0, atlanan: 0, vazgecilen: 2, zaten: 0 });
    /* Yalnız flyer açıldı — vazgeçilen tür hiç createDocument görmedi. */
    expect(vi.mocked(api.updateOrderItem).mock.calls.map((c) => c[0])).toEqual(["f"]);
  });

  it("VAZGEÇME DE TÜR BAŞINA BİR KEZ sorulur — N kez tekrar sordurmaz", async () => {
    const sor = vi.fn(vazgec);
    await topluBaslat(
      "cli_1",
      [kalem({ id: "m1", product_type: "menu" }), kalem({ id: "m2", product_type: "menu" })],
      sor,
      METIN,
    );
    /* Önbellek DEĞERE değil VARLIĞA bakmasaydı (null "yok" gibi görünür),
       operatör vazgeçtiğini her kalem için tekrar söylemek zorunda kalırdı. */
    expect(sor).toHaveBeenCalledTimes(1);
  });

  it("SORULACAK TÜR YOKSA soru HİÇ sorulmaz", async () => {
    vi.mocked(api.createDocument).mockResolvedValue(belge("doc_x"));
    vi.mocked(api.updateDocument).mockResolvedValue(belge("x"));
    vi.mocked(api.updateOrderItem).mockResolvedValue({} as never);
    const sor = vi.fn(ilkiniSec);

    await topluBaslat("cli_1", [kalem({ id: "a", product_type: "flyer" })], sor, METIN);
    /* Tek seçenekli tür için kullanıcıyı rahatsız etmek gereksiz gürültüdür. */
    expect(sor).not.toHaveBeenCalled();
  });
});

describe("topluOzetMetni — vazgeçme YALNIZ olduğunda yazılır", () => {
  const bas = (o: { acilan: number; dusen: number; atlanan: number }) =>
    `${o.acilan} açıldı · ${o.dusen} düştü · ${o.atlanan} tasarlanamaz`;
  const vaz = (o: { vazgecilen: number }) => `${o.vazgecilen} vazgeçildi`;

  it("VAZGEÇME YOKSA satır BİREBİR eski hâlidir — '0 vazgeçildi' yazılmaz", () => {
    /* Her koşumda olmayan bir şeyi raporlamak gürültüdür ve gürültü bilgiyi
       bastırır (hata mesajı sınırı paketinin dersi). */
    const s = topluOzetMetni(
      { acilan: 3, dusen: 0, atlanan: 0, vazgecilen: 0, zaten: 0, satirlar: [] },
      bas,
      vaz,
    );
    expect(s).toBe("3 açıldı · 0 düştü · 0 tasarlanamaz");
    expect(s).not.toContain("vazgeç");
  });

  it("VAZGEÇME VARSA satıra EKLENİR — sessizce yutulmaz", () => {
    const s = topluOzetMetni(
      { acilan: 1, dusen: 0, atlanan: 0, vazgecilen: 2, zaten: 0, satirlar: [] },
      bas,
      vaz,
    );
    expect(s).toContain("2 vazgeçildi");
    /* Taban satır kaybolmaz: iki bilgi de aynı anda görünür. */
    expect(s).toContain("1 açıldı");
  });
});

describe("GEREKÇE ARTIK YUTULMUYOR — kalem başına sonuç", () => {
  /* ÖLÇÜLEN YARA: bu hatta `catch { dusen += 1 }` vardı ve operatör
     "2 düştü" görüp HANGİSİ/NİYE sorusunun cevabını hiçbir yerde
     bulamıyordu. Kardeşi `topluAktar`da kapatılan sınıfın aynısı, burada
     CANLI kalmıştı. */
  it("DÜŞEN kalemin GEREKÇESİ satırda durur", async () => {
    vi.mocked(api.createDocument)
      .mockRejectedValueOnce(new Error("500 sunucu"))
      .mockResolvedValueOnce(belge("doc_iyi"));
    vi.mocked(api.updateDocument).mockResolvedValue(belge("x"));
    vi.mocked(api.updateOrderItem).mockResolvedValue({} as never);

    const r = await topluBaslat("cli_1", [kalem({ id: "kotu" }), kalem({ id: "iyi" })], ilkiniSec, METIN);
    expect(r.satirlar.map((s) => [s.item.id, s.durum, s.gerekce])).toEqual([
      ["kotu", "dusen", "HATA:500 sunucu"],
      ["iyi", "acildi", null],
    ]);
  });

  it("HER KOVA kendi gerekçesini taşır — tasarlanamaz · vazgeçildi · zaten", async () => {
    const r = await topluBaslat(
      "cli_1",
      [
        kalem({ id: "c", product_type: "diger" }),
        kalem({ id: "m", product_type: "menu" }),
        kalem({ id: "d", document_id: "doc_var" }),
      ],
      vazgec,
      METIN,
    );
    expect(r.satirlar.map((s) => [s.item.id, s.durum, s.gerekce])).toEqual([
      ["c", "tasarlanamaz", "TASARLANAMAZ"],
      ["m", "vazgecildi", "VAZGECILDI"],
      ["d", "zaten", null],
    ]);
  });

  it("SIRA ÖZGÜN KALEM SIRASIDIR — turun iç sırası değil", async () => {
    /* Tur önce `hazir`i, sonra `secimli`yi koşar; operatör kalemleri ekranda
       PROJE sırasında görür. Sonuç başka sırada gelseydi yeniden
       eşleştirmek zorunda kalırdı. */
    vi.mocked(api.createDocument).mockResolvedValue(belge("doc_x"));
    vi.mocked(api.updateDocument).mockResolvedValue(belge("x"));
    vi.mocked(api.updateOrderItem).mockResolvedValue({} as never);

    const r = await topluBaslat(
      "cli_1",
      [kalem({ id: "menu1", product_type: "menu" }), kalem({ id: "flyer1", product_type: "flyer" })],
      ilkiniSec,
      METIN,
    );
    /* İç sıra flyer (hazır) → menu (seçimli) olurdu. */
    expect(r.satirlar.map((s) => s.item.id)).toEqual(["menu1", "flyer1"]);
  });

  it("SAYILAR SATIRLARDAN TÜRER — iki kaynak ayrışamaz", async () => {
    /* Eskiden sayılar plan uzunluklarından ve döngü sayaçlarından geliyordu;
       satırlar eklenince ikisi ayrı kaynak olur ve sessizce ayrışabilirdi. */
    vi.mocked(api.createDocument)
      .mockRejectedValueOnce(new Error("500"))
      .mockResolvedValue(belge("doc_x"));
    vi.mocked(api.updateDocument).mockResolvedValue(belge("x"));
    vi.mocked(api.updateOrderItem).mockResolvedValue({} as never);

    const r = await topluBaslat(
      "cli_1",
      [
        kalem({ id: "a" }),
        kalem({ id: "b" }),
        kalem({ id: "c", product_type: "diger" }),
        kalem({ id: "d", document_id: "doc_var" }),
      ],
      ilkiniSec,
      METIN,
    );
    const say = (d: string) => r.satirlar.filter((s) => s.durum === d).length;
    expect({ acilan: r.acilan, dusen: r.dusen, atlanan: r.atlanan, zaten: r.zaten }).toEqual({
      acilan: say("acildi"),
      dusen: say("dusen"),
      atlanan: say("tasarlanamaz"),
      zaten: say("zaten"),
    });
    expect(r.satirlar).toHaveLength(4);
  });
});

describe("baslatmaSonucVerisi — panel verisi", () => {
  const bas = (o: { acilan: number; dusen: number; atlanan: number }) =>
    `${o.acilan} açıldı · ${o.dusen} düştü · ${o.atlanan} tasarlanamaz`;
  const vaz = (o: { vazgecilen: number }) => `${o.vazgecilen} vazgeçildi`;
  const ad = (it: OrderItemDTO) => `Kalem ${it.id}`;

  it("DURUM ÇEVİRİSİ TAM — zaten 'atlandi'dır, sorun DEĞİL", async () => {
    vi.mocked(api.createDocument).mockRejectedValueOnce(new Error("500"));
    const r = await topluBaslat(
      "cli_1",
      [
        kalem({ id: "a" }),
        kalem({ id: "c", product_type: "diger" }),
        kalem({ id: "d", document_id: "doc_var" }),
      ],
      ilkiniSec,
      METIN,
    );
    expect(baslatmaSonucVerisi(r, bas, vaz, ad).satirlar).toEqual([
      { ad: "Kalem a", durum: "dusen", gerekce: "HATA:500" },
      { ad: "Kalem c", durum: "engelli", gerekce: "TASARLANAMAZ" },
      { ad: "Kalem d", durum: "atlandi", gerekce: null },
    ]);
  });

  it("BAŞLIK aynı kuralı taşır — vazgeçme yalnız olduğunda", async () => {
    const r = await topluBaslat("cli_1", [kalem({ id: "a" })], ilkiniSec, METIN);
    expect(baslatmaSonucVerisi(r, bas, vaz, ad).baslik).not.toContain("vazgeç");
  });
});
