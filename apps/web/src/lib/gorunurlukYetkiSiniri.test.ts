/* GÖRÜNÜRLÜK ≠ YETKİ — YAZILI SINIR ÖLÇÜME BAĞLANDI (K-1/C modül sınırı).

   NEREDEN GELDİ: `apps/server/src/is-kollari.ts` başlığında şu cümle duruyor —
   "GÖRÜNÜRLÜK ≠ YETKİ (kayıtlı sınır): bu katman yalnız MANUEL şablon
   seçicinin gördüğünü daraltır. Sipariş→belge köprüsü (`siparisSablonlari`)
   DOKUNULMADAN kalır — kapalı bir iş kolunun şablonu, sipariş kaleminden hâlâ
   üretilebilir. 7.1/481 'görünürlük' der, 'entitlement' demez."

   O CÜMLE HİÇBİR YERDE ÖLÇÜLMÜYORDU. Depoda 13 test daraltmanın YAPTIĞINI
   çiviliyor; YAPMADIĞINI çivileyen tek bir satır yoktu. Bir sınır yalnız bir
   dosya başlığında yaşıyorsa, sessizce iki yöne birden kayabilir:
     · biri "eksik" sanıp köprüye süzgeç yazar — daraltma sessizce YETKİ
       katmanına döner ve operatör mevcut bir işi yapamaz hâle gelir;
     · ya da köprü zaten kapalı sanılır ve kimse yetki katmanının hiç
       yazılmadığını fark etmez.

   BU DOSYA BİR ŞEY DEĞİŞTİRMEZ, İKİ YARIYI DA ÖLÇER — hem daraltmanın
   gerçekten kapattığını, hem köprünün gerçekten açık kaldığını. İkisi bir
   arada olmadan hiçbiri anlamlı değildir: yalnız ikincisi ölçülse "daraltma
   zaten çalışmıyor" ile "bilerek dokunulmuyor" ayırt edilemezdi.

   ÖLÇÜLEN ASİMETRİ (bu turda komutla): `tabelaci` kurulumunda YEDİ tür
   seçiciden düşer (menu · flyer · trifold · fidelite · vitrophanie · tisort ·
   onluk) ve YEDİSİNİN DE köprüsü sağlamdır. Yani kapalı bir kolun kalemi
   projede duruyorsa (eski proje, ya da uçtan yazılmış kalem) toplu tasarım
   onu HÂLÂ belgeye çevirir. Bu bir kusur değil, kayıtlı bir karardır —
   ve artık kayıtlı olduğu yer bir yorum değil, bir kapıdır. */

import { afterEach, describe, expect, it, vi } from "vitest";
import type { OrderItemDTO, ProductType } from "@tezgah/shared";
import { siparisSablonlari } from "@tezgah/templates/identity";
import { api } from "../api";
import { SIPARIS_TURLERI, gorunurSiparisTurleri } from "./gorunurTurler";
import { topluBaslat, type BaslatmaMetinleri } from "./topluTasarim";

vi.mock("../api", () => ({
  api: {
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    updateOrderItem: vi.fn(),
  },
}));

/** Ölçümün kurulumu: tek iş kolu ilan edilmiş bir kiracı. */
const DAR_KURULUM = ["tabelaci"] as const;

function gorunur(): ProductType[] {
  return gorunurSiparisTurleri(DAR_KURULUM as never);
}

function kapali(): ProductType[] {
  const g = gorunur();
  return SIPARIS_TURLERI.filter((t) => !g.includes(t));
}

function kalem(p: Partial<OrderItemDTO> & { id: string }): OrderItemDTO {
  return {
    project_id: "proj_1",
    product_type: "flyer",
    qty: 1,
    width_cm: null,
    height_cm: null,
    details: {},
    notes: "",
    status: "olcu_bekliyor",
    document_id: null,
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    ...p,
  } as OrderItemDTO;
}

const METIN: BaslatmaMetinleri = {
  tasarlanamaz: "TASARLANAMAZ",
  vazgecildi: "VAZGECILDI",
  hata: (e) => `HATA:${(e as Error).message}`,
};

afterEach(() => vi.clearAllMocks());

describe("SINIRIN BİRİNCİ YARISI — daraltma GERÇEKTEN kapatıyor", () => {
  it("ön koşul: dar kurulumda hem KAPALI hem AÇIK tür var", () => {
    /* Bu satır olmadan aşağıdaki her şey, hiçbir türü kapatmayan (ya da
       hepsini kapatan) bozuk bir süzgeçle de yeşil kalırdı. */
    expect(gorunur().length, "hiçbir tür görünmüyor — süzgeç yetki katmanına dönmüş").toBeGreaterThan(0);
    expect(kapali().length, "hiçbir tür kapanmıyor — süzgeç hiç çalışmıyor").toBeGreaterThan(0);
    expect(gorunur().length + kapali().length).toBe(SIPARIS_TURLERI.length);
  });

  it("KAPALI küme bugün YEDİ tür — ölçülen hâl çivili", () => {
    expect(kapali()).toEqual([
      "menu",
      "flyer",
      "trifold",
      "fidelite",
      "vitrophanie",
      "tisort",
      "onluk",
    ]);
    expect(gorunur(), "kaçış kapısı ve kendi işi kalır").toEqual(["tabela", "diger"]);
  });
});

describe("SINIRIN İKİNCİ YARISI — köprü DOKUNULMADAN kalıyor", () => {
  it("kapalı türlerin HEPSİNİN köprüsü sağlam (yetki katmanı YAZILMADI)", () => {
    /* Yazılı sınırın ölçüsü. Tek bir kapalı türün köprüsü boşalsaydı,
       daraltma sessizce yetki katmanına dönmüş olurdu. */
    const koprusuz = kapali().filter((t) => siparisSablonlari(t).length === 0);
    expect(koprusuz, "kapalı iş kolunun köprüsü kesilmiş — görünürlük yetkiye dönmüş").toEqual([]);
  });

  it("TOPLU TASARIM kapalı türün kalemini HÂLÂ belgeye çevirir", async () => {
    /* Sınırın davranışsal yarısı: gövde daraltmayı hiç BİLMEZ — `topluBaslat`
       imzasında iş kolu parametresi yoktur. Eski bir projede duran menü
       kalemi, tabelacı kurulumunda da tasarıma açılır.

       BU TESTİN İŞİ ONAYLAMAK DEĞİL, KAYDA GEÇİRMEK: gün gelip yetki katmanı
       yazılırsa burası kırmızıya döner ve karar (7.1/481'i "görünürlük"ten
       "entitlement"a çıkarmak) açıkça verilmek zorunda kalır. */
    const kapaliTur = kapali()[0]!;
    vi.mocked(api.createDocument).mockResolvedValue({ id: "doc_1" } as never);
    vi.mocked(api.updateOrderItem).mockResolvedValue({} as never);
    vi.mocked(api.updateDocument).mockResolvedValue({} as never);

    const r = await topluBaslat(
      "cli_1",
      [kalem({ id: "it_1", product_type: kapaliTur })],
      async (_t, secenekler) => secenekler[0]!,
      METIN,
    );

    expect(r.acilan, `${kapaliTur}: kapalı tür kaleminden belge AÇILMADI`).toBe(1);
    expect(api.createDocument).toHaveBeenCalledTimes(1);
    const [, templateId] = vi.mocked(api.createDocument).mock.calls[0]!;
    expect(siparisSablonlari(kapaliTur)).toContain(templateId);
  });

  it("AÇIK türde de aynı yol — köprü iş koluna göre AYRIMCILIK YAPMIYOR", async () => {
    /* Karşıt ölçüm: bir üstteki test, "gövde her kalemde çuvallıyor ama sayı
       yine 1 çıkıyor" gibi bir bozuklukla da yeşil kalabilirdi. Açık türün
       aynı yoldan aynı sonucu vermesi, ölçülen şeyin KÖPRÜNÜN AYRIMSIZLIĞI
       olduğunu gösterir. */
    const acikTur = gorunur().find((t) => siparisSablonlari(t).length > 0)!;
    vi.mocked(api.createDocument).mockResolvedValue({ id: "doc_2" } as never);
    vi.mocked(api.updateOrderItem).mockResolvedValue({} as never);
    vi.mocked(api.updateDocument).mockResolvedValue({} as never);

    const r = await topluBaslat(
      "cli_1",
      [kalem({ id: "it_2", product_type: acikTur })],
      async (_t, secenekler) => secenekler[0]!,
      METIN,
    );
    expect(r.acilan).toBe(1);
    expect(api.createDocument).toHaveBeenCalledTimes(1);
  });
});
