import { describe, expect, it } from "vitest";
import {
  OPENING_KIT, PRICING_INPUTS, canTransition, dueLevel, missingFields, needsMiroirWarning,
  pricingInputsOf } from "./orders.js";
import type { OrderItemLike } from "./orders.js";
import { ProductTypeSchema, type ProductType } from "./schemas.js";

const base = (p: Partial<OrderItemLike>): OrderItemLike => ({
  product_type: "diger",
  qty: 1,
  width_cm: null,
  height_cm: null,
  details: {},
  ...p,
});

describe("missingFields (FAZ2-GOREV §2.2 matrisi)", () => {
  it("vitrophanie: ölçü + yön + mod zorunlu", () => {
    expect(missingFields(base({ product_type: "vitrophanie" }))).toEqual([
      "width_cm", "height_cm", "side", "mode",
    ]);
    expect(
      missingFields(
        base({
          product_type: "vitrophanie",
          width_cm: 180,
          height_cm: 120,
          details: { side: "exterieur", mode: "impression" },
        })
      )
    ).toEqual([]);
  });

  it("tabela: yalnız ölçü zorunlu", () => {
    expect(missingFields(base({ product_type: "tabela" }))).toEqual(["width_cm", "height_cm"]);
    expect(missingFields(base({ product_type: "tabela", width_cm: 300, height_cm: 80 }))).toEqual([]);
  });

  it("tisort/onluk: adet + teknik", () => {
    expect(missingFields(base({ product_type: "tisort", qty: 0 }))).toEqual(["qty", "technique"]);
    expect(
      missingFields(base({ product_type: "onluk", qty: 5, details: { technique: "broderie" } }))
    ).toEqual([]);
  });

  it("menu/trifold/flyer/fidelite: format", () => {
    for (const t of ["menu", "trifold", "flyer", "fidelite"] as const) {
      expect(missingFields(base({ product_type: t }))).toEqual(["format"]);
      expect(missingFields(base({ product_type: t, details: { format: "a3" } }))).toEqual([]);
    }
  });

  it("diger: zorunlu alan yok", () => {
    expect(missingFields(base({}))).toEqual([]);
  });
});

/* ── Fiyatlandırma girdileri İLANI (7.2/4.5; journal 2026-07-26) ─────────── */

describe("NÖBETÇİ: girdi ilanı tablosu TAM olarak bu (tür tür, elle)", () => {
  it("PRICING_INPUTS beklenen tabloyla BİREBİR eşleşir", () => {
    expect(
      PRICING_INPUTS,
      "Girdi matrisi değişmiş: sipariş şeması/fiyat girdisi eklemek ürün kararıdır — " +
        "journal kaydı ister; form uygulanabilirliği ve durum kapısı bu ilandan okur"
    ).toEqual({
      menu: [{ alan: "format", zorunlu: true }, { alan: "print_qty", zorunlu: false }],
      flyer: [{ alan: "format", zorunlu: true }, { alan: "print_qty", zorunlu: false }],
      trifold: [{ alan: "format", zorunlu: true }, { alan: "print_qty", zorunlu: false }],
      fidelite: [{ alan: "format", zorunlu: true }, { alan: "print_qty", zorunlu: false }],
      vitrophanie: [
        { alan: "width_cm", zorunlu: true },
        { alan: "height_cm", zorunlu: true },
        { alan: "side", zorunlu: true },
        { alan: "mode", zorunlu: true },
      ],
      tabela: [
        { alan: "width_cm", zorunlu: true },
        { alan: "height_cm", zorunlu: true },
      ],
      tisort: [
        { alan: "qty", zorunlu: true },
        { alan: "technique", zorunlu: true },
        { alan: "sizes", zorunlu: false },
      ],
      onluk: [
        { alan: "qty", zorunlu: true },
        { alan: "technique", zorunlu: true },
        { alan: "sizes", zorunlu: false },
      ],
      diger: [],
    });
  });

  it("opsiyonel ilan (sizes) missingFields'a HİÇBİR doluluk durumunda girmez", () => {
    expect(missingFields(base({ product_type: "tisort", qty: 2, details: { technique: "impression" } }))).toEqual([]);
    expect(
      missingFields(base({ product_type: "tisort", qty: 2, details: { technique: "impression", sizes: "M:2" } }))
    ).toEqual([]);
  });

  it("opsiyonel print_qty (tiraj) da kapıya girmez: boşken eksik sayılmaz, doluyken listelenmez", () => {
    /* 2026-07-26 onayı: girdi TOPLANIR ama fiyat modeli gelmeden durum
       kapısına girmez — mevcut baskı kalemleri geriye dönük kırmızılaşmaz */
    expect(missingFields(base({ product_type: "flyer", details: { format: "21x21" } }))).toEqual([]);
    expect(
      missingFields(base({ product_type: "flyer", details: { format: "21x21", print_qty: 5000 } }))
    ).toEqual([]);
    expect(missingFields(base({ product_type: "menu", details: { print_qty: 500 } }))).toEqual(["format"]);
  });
});

describe("DİFERANSİYEL: jenerik okuyucu ≡ sökülen switch (tam kombinasyon taraması)", () => {
  /* FAZ2 §2.2 switch'inin REFERANS KOPYASI — orders.ts'ten sökülen hâl, birebir */
  function eskiMissingFields(item: OrderItemLike): string[] {
    const out: string[] = [];
    const d = item.details ?? {};
    switch (item.product_type) {
      case "vitrophanie":
        if (!item.width_cm) out.push("width_cm");
        if (!item.height_cm) out.push("height_cm");
        if (!d.side) out.push("side");
        if (!d.mode) out.push("mode");
        break;
      case "tabela":
        if (!item.width_cm) out.push("width_cm");
        if (!item.height_cm) out.push("height_cm");
        break;
      case "tisort":
      case "onluk":
        if (!item.qty || item.qty < 1) out.push("qty");
        if (!d.technique) out.push("technique");
        break;
      case "menu":
      case "trifold":
      case "flyer":
      case "fidelite":
        if (!d.format) out.push("format");
        break;
      case "diger":
        break;
    }
    return out;
  }

  it("9 tür × tüm doluluk kombinasyonlarında (sıra dahil) birebir aynı", () => {
    const qtyler = [0, 1, 5];
    const olculer = [null, 120] as const;
    const detayVaryantlari = [
      {},
      { side: "interieur" as const },
      { mode: "decoupe" as const },
      { technique: "broderie" as const },
      { format: "a3" },
      { sizes: "M:2, L:3" },
      { side: "exterieur" as const, mode: "impression" as const, technique: "impression" as const, format: "a4", sizes: "S:1" },
    ];
    let sayac = 0;
    for (const product_type of ProductTypeSchema.options) {
      for (const qty of qtyler)
        for (const width_cm of olculer)
          for (const height_cm of olculer)
            for (const details of detayVaryantlari) {
              const item = { product_type, qty, width_cm, height_cm, details };
              expect(missingFields(item), JSON.stringify(item)).toEqual(eskiMissingFields(item));
              sayac++;
            }
    }
    expect(sayac).toBe(9 * 3 * 2 * 2 * 7); /* 756 kombinasyon — tarama boş dönmedi */
  });
});

describe("pricingInputsOf — formun uygulanabilirlik kaynağı", () => {
  it("her tür için tabloyla aynı referansı döner (kopya değil)", () => {
    for (const t of ProductTypeSchema.options as readonly ProductType[]) {
      expect(pricingInputsOf(t)).toBe(PRICING_INPUTS[t]);
    }
  });

  it("eski form koşullarının küme karşılığı: vitro∪tabela=w/h · yalnız vitro=side/mode · tekstil=qty/technique/sizes · baskı dörtlüsü=format", () => {
    const iceren = (t: ProductType, alan: string): boolean =>
      pricingInputsOf(t).some((g) => g.alan === alan);
    for (const t of ProductTypeSchema.options as readonly ProductType[]) {
      expect(iceren(t, "width_cm"), t).toBe(t === "vitrophanie" || t === "tabela");
      expect(iceren(t, "side"), t).toBe(t === "vitrophanie");
      expect(iceren(t, "mode"), t).toBe(t === "vitrophanie");
      expect(iceren(t, "technique"), t).toBe(t === "tisort" || t === "onluk");
      expect(iceren(t, "sizes"), t).toBe(t === "tisort" || t === "onluk");
      expect(iceren(t, "format"), t).toBe(["menu", "trifold", "flyer", "fidelite"].includes(t));
      expect(iceren(t, "print_qty"), t).toBe(["menu", "trifold", "flyer", "fidelite"].includes(t));
    }
  });
});

describe("canTransition (durum kapısı)", () => {
  const eksikTabela = base({ product_type: "tabela" });
  const tamTabela = base({ product_type: "tabela", width_cm: 300, height_cm: 80 });

  it("eksik kalem olcu_bekliyor'dan çıkamaz (kabul §9/2)", () => {
    const r = canTransition(eksikTabela, "olcu_bekliyor", "tasarimda");
    expect(r.ok).toBe(false);
    expect(r.missing).toEqual(["width_cm", "height_cm"]);
  });

  it("alanlar dolunca çıkabilir", () => {
    expect(canTransition(tamTabela, "olcu_bekliyor", "tasarimda").ok).toBe(true);
  });

  it("iptal her durumdan serbest", () => {
    expect(canTransition(eksikTabela, "olcu_bekliyor", "iptal").ok).toBe(true);
  });

  it("ileri aşamalar arasında kapı yok", () => {
    expect(canTransition(eksikTabela, "tasarimda", "onayda").ok).toBe(true);
  });
});

describe("needsMiroirWarning", () => {
  it("intérieur vitrophanie miroir uyarısı ister", () => {
    expect(
      needsMiroirWarning(base({ product_type: "vitrophanie", details: { side: "interieur" } }))
    ).toBe(true);
    expect(
      needsMiroirWarning(base({ product_type: "vitrophanie", details: { side: "exterieur" } }))
    ).toBe(false);
  });
});

describe("dueLevel (termin vurgusu §2.3)", () => {
  const today = "2026-07-07";
  it("geçmiş kırmızı, ≤3 gün sarı, uzak none", () => {
    expect(dueLevel("2026-07-05", today)).toBe("red");
    expect(dueLevel("2026-07-09", today)).toBe("yellow");
    expect(dueLevel("2026-07-20", today)).toBe("none");
    expect(dueLevel(null, today)).toBe("none");
  });
});

describe("OPENING_KIT preseti (FAZ4 §11)", () => {
  it("4 kalem: menü a3 + flyer 21x21 + fidelite + ölçüsüz vitrophanie", () => {
    expect(OPENING_KIT.name_tr).toBe("Açılış Takımı");
    expect(OPENING_KIT.items.map((i) => i.product_type)).toEqual([
      "menu", "flyer", "fidelite", "vitrophanie",
    ]);
    expect(OPENING_KIT.items[0].details).toEqual({ format: "a3" });
    expect(OPENING_KIT.items[1].details).toEqual({ format: "21x21" });
    /* vitrophanie ölçüsüz gelir → olcu_bekliyor kırmızı rozet akışı */
    expect(OPENING_KIT.items[3].details).toBeUndefined();
  });
});
