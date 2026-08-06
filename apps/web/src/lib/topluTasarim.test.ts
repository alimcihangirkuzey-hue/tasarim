/* TOPLU TASARIM KÜTÜPHANESİ testleri (K-1/A).

   Gövde ProjectsPanel'den buraya taşındı çünkü ikinci tüketici doğdu (Açılış
   Takımı). Bileşen testleri (ProjectsPanel.toplu.test.tsx) DÜĞMEYİ ölçer;
   bu dosya GÖVDEYİ ölçer — DOM'suz, enjekte edilen soruyla.

   `sor` ENJEKTE EDİLDİĞİ İÇİN window.confirm'e gerek yok: turun kaç kez
   sorduğu doğrudan sayılabiliyor, "tür başına bir kez" sözleşmesi bir
   tarayıcı API'sine bağlı kalmıyor. */

import { afterEach, describe, expect, it, vi } from "vitest";
import type { OrderItemDTO, ProductType } from "@tezgah/shared";
import { siparisSablonlari } from "@tezgah/templates/identity";
import { api } from "../api";
import { belgeAc, topluBaslat, topluPlan } from "./topluTasarim";

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
/** Varsayılan soru: ilk seçeneği alır (window.confirm OK dalının karşılığı) */
const ilkiniSec = (_t: ProductType, secenekler: readonly string[]): string => secenekler[0]!;

afterEach(() => vi.clearAllMocks());

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

    await topluBaslat("cli_1", [kalem({ id: "a" }), kalem({ id: "b" })], ilkiniSec);
    /* Paralel olsaydı iki create arka arkaya gelir, aralarına link girmezdi. */
    expect(sira).toEqual(["create", "link", "create", "link"]);
  });

  it("DÜŞEN KALEM turu DURDURMAZ ama SAYILIR", async () => {
    vi.mocked(api.createDocument)
      .mockRejectedValueOnce(new Error("500"))
      .mockResolvedValueOnce(belge("doc_iyi"));
    vi.mocked(api.updateDocument).mockResolvedValue(belge("x"));
    vi.mocked(api.updateOrderItem).mockResolvedValue({} as never);

    const r = await topluBaslat("cli_1", [kalem({ id: "kotu" }), kalem({ id: "iyi" })], ilkiniSec);
    expect(r).toEqual({ acilan: 1, dusen: 1, atlanan: 0, zaten: 0 });
    expect(vi.mocked(api.updateOrderItem).mock.calls.map((c) => c[0])).toEqual(["iyi"]);
  });

  it("TASARLANAMAZ ve ZATEN kovaları çağrı ÜRETMEZ ama raporda görünür", async () => {
    const r = await topluBaslat(
      "cli_1",
      [kalem({ id: "c", product_type: "diger" }), kalem({ id: "d", document_id: "doc_var" })],
      ilkiniSec,
    );
    expect(api.createDocument).not.toHaveBeenCalled();
    expect(r).toEqual({ acilan: 0, dusen: 0, atlanan: 1, zaten: 1 });
  });

  it("SORULACAK TÜR YOKSA soru HİÇ sorulmaz", async () => {
    vi.mocked(api.createDocument).mockResolvedValue(belge("doc_x"));
    vi.mocked(api.updateDocument).mockResolvedValue(belge("x"));
    vi.mocked(api.updateOrderItem).mockResolvedValue({} as never);
    const sor = vi.fn(ilkiniSec);

    await topluBaslat("cli_1", [kalem({ id: "a", product_type: "flyer" })], sor);
    /* Tek seçenekli tür için kullanıcıyı rahatsız etmek gereksiz gürültüdür. */
    expect(sor).not.toHaveBeenCalled();
  });
});
