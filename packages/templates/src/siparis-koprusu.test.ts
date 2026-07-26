/* SİPARİŞ→BELGE KÖPRÜSÜ testleri (7.2/4.5; journal 2026-07-26-siparis-belge-koprusu).

   Bu dosya DÖRT şeyi sabitler:
   (1) Köprü tabloları tür tür ELLE çivilenir — temsilci şablon değiştirmek
       (ör. vitro-centre yerine vitro-bandeau) ürün kararıdır, journal ister.
   (2) Yük-zamanı tutarlılık İCRA edilir: kayıtsız şablon / materyal
       uyuşmazlığı / tasarlanamaz türe seçenek — üçü de sahte tablolarla
       FIRLATIR (gerçek tabloların modül yüklemesinden geçmiş olması bu
       testlerin çalışmasıyla zaten kanıtlı).
   (3) Param akışı, ProjectsPanel'den sökülen switch'in REFERANS KOPYASIYLA
       tüm türler × doluluk varyantlarında birebir aynıdır.
   (4) Köprü ile kayıt defteri kimliği (C-P0) İLK KEZ bağlı: her seçenek
       kayıtlı VE materyali türün ilanıyla aynı — tarama testli. */

import { describe, expect, it } from "vitest";
import type { OrderItemLike } from "@tezgah/shared";
import { ProductTypeSchema, type ProductType } from "@tezgah/shared";
import type { MaterialType } from "./types.js";
import {
  SIPARIS_MATERYALI,
  SIPARIS_SABLONLARI,
  dogrulaSiparisKoprusu,
  materialTypeOfOrNull,
  siparisParamlari,
  siparisSablonlari,
} from "./identity/index.js";

describe("NÖBETÇİ: köprü tabloları TAM olarak bunlar", () => {
  it("şablon seçenekleri tür tür birebir (temsilci değişikliği ürün kararıdır)", () => {
    expect(SIPARIS_SABLONLARI).toEqual({
      menu: ["menu-grid-cells", "menu-liste-premium"],
      trifold: ["menu-trifold"],
      flyer: ["flyer"],
      fidelite: ["carte-fidelite"],
      vitrophanie: ["vitro-centre"],
      tabela: ["enseigne-panneau"],
      tisort: ["garment"],
      onluk: ["garment"],
      diger: [],
    });
  });

  it("materyal bağı tür tür birebir (ProductType ↔ MaterialType ilk makine bağı)", () => {
    expect(SIPARIS_MATERYALI).toEqual({
      menu: "menu",
      trifold: "menu",
      flyer: "flyer",
      fidelite: "kart",
      vitrophanie: "cam",
      tabela: "tabela",
      tisort: "tekstil",
      onluk: "tekstil",
      diger: null,
    });
  });

  it("tutarlılık taraması: her seçenek kayıtlı ve materyali ilanla aynı", () => {
    for (const t of ProductTypeSchema.options as readonly ProductType[]) {
      for (const id of siparisSablonlari(t)) {
        expect(materialTypeOfOrNull(id), `${t} → ${id}`).toBe(SIPARIS_MATERYALI[t]);
      }
    }
  });
});

describe("yük-zamanı tutarlılık İCRASI — bozuk köprü uygulamayı ayağa kaldırmaz", () => {
  const sablonlar = (patch: Partial<Record<ProductType, readonly string[]>>) =>
    ({ ...SIPARIS_SABLONLARI, ...patch }) as Record<ProductType, readonly string[]>;

  it("kayıtsız şablon reddedilir", () => {
    expect(() =>
      dogrulaSiparisKoprusu(sablonlar({ flyer: ["olmayan-sablon"] }), SIPARIS_MATERYALI)
    ).toThrow(/kayıt defterinde yok/);
  });

  it("materyal uyuşmazlığı reddedilir (tabela köprüsü flyer gösteremez)", () => {
    expect(() =>
      dogrulaSiparisKoprusu(sablonlar({ tabela: ["flyer"] }), SIPARIS_MATERYALI)
    ).toThrow(/"flyer" materyalinde, ilan "tabela" bekler/);
  });

  it("tasarlanamaz tür (diger) seçenek taşıyamaz", () => {
    expect(() =>
      dogrulaSiparisKoprusu(sablonlar({ diger: ["flyer"] }), SIPARIS_MATERYALI)
    ).toThrow(/tasarlanamaz tür/);
  });

  it("gerçek tablolar geçer (modül yüklemesinin yeniden icrası)", () => {
    expect(() => dogrulaSiparisKoprusu(SIPARIS_SABLONLARI, SIPARIS_MATERYALI)).not.toThrow();
  });
});

describe("DİFERANSİYEL: param akışı ≡ sökülen ProjectsPanel switch'i", () => {
  /* ProjectsPanel.paramsFromItem'ın REFERANS KOPYASI — sökülen hâl, birebir */
  function eskiParamsFromItem(item: OrderItemLike): Record<string, unknown> | null {
    switch (item.product_type) {
      case "vitrophanie":
        return {
          w_cm: item.width_cm ?? 100,
          h_cm: item.height_cm ?? 100,
          mode: item.details.mode ?? "impression",
          miroir: item.details.side === "interieur",
        };
      case "tabela":
        return { w_cm: item.width_cm ?? 300, h_cm: item.height_cm ?? 60 };
      case "tisort":
        return {
          garment_kind: "tshirt",
          technique: item.details.technique ?? "impression",
          areas: ["chest_left", "back_full"],
        };
      case "onluk":
        return {
          garment_kind: "apron_bavette",
          technique: item.details.technique ?? "impression",
          areas: ["chest"],
        };
      default:
        return null;
    }
  }

  it("9 tür × doluluk varyantlarında birebir aynı (null dahil)", () => {
    const olculer = [null, 180] as const;
    const detaylar = [
      {},
      { side: "interieur" as const },
      { side: "exterieur" as const, mode: "decoupe" as const },
      { technique: "broderie" as const },
      { mode: "impression" as const, technique: "impression" as const, format: "a3" },
    ];
    let sayac = 0;
    for (const product_type of ProductTypeSchema.options) {
      for (const width_cm of olculer)
        for (const height_cm of olculer)
          for (const details of detaylar) {
            const item: OrderItemLike = { product_type, qty: 1, width_cm, height_cm, details };
            expect(siparisParamlari(item), JSON.stringify(item)).toEqual(eskiParamsFromItem(item));
            sayac++;
          }
    }
    expect(sayac).toBe(9 * 2 * 2 * 5); /* 180 kombinasyon — tarama boş dönmedi */
  });
});

describe("siparisSablonlari — startDesign'ın okuyucusu", () => {
  it("kardinalite sözleşmesi: yalnız menu çoklu, yalnız diger boş", () => {
    for (const t of ProductTypeSchema.options as readonly ProductType[]) {
      const n = siparisSablonlari(t).length;
      expect(n > 1, t).toBe(t === "menu");
      expect(n === 0, t).toBe(t === "diger");
    }
  });

  it("materyal ilanı MaterialType sözlüğünden (yazım hatası sözlük dışına çıkamaz)", () => {
    const gecerli: ReadonlyArray<MaterialType | null> = ["menu", "flyer", "kart", "tabela", "tekstil", "cam", null];
    for (const t of ProductTypeSchema.options as readonly ProductType[]) {
      expect(gecerli, t).toContain(SIPARIS_MATERYALI[t]);
    }
  });
});
