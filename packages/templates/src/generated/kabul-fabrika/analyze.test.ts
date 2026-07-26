/* kabul-fabrika motor bağlaması — EŞDEĞERLİK + görünürlük testleri (CE).
   Eski davranışın kapasite formülü buraya REFERANS KOPYA olarak alınmıştır
   (sniff-referansı deseni): canlı koddan silinen eski matematik, karşılaştırma
   tabanı olarak testte yaşar. */

import { describe, expect, it } from "vitest";
import {
  BrandKitSchema,
  CatalogSchema,
  DocumentStateSchema,
  type ClientDTO,
} from "@tezgah/shared";
import { TEMPLATES } from "../../index.js";
import { H, K, PROTO, analyzeGenerated } from "./analyze.js";
import { manifest } from "./manifest.js";

function client(n: number): ClientDTO {
  return {
    id: "cli_f",
    name: "Fabrika",
    slug: "fabrika",
    notes: "",
    currency: "EUR",
    menu_language: "fr",
    brandkit: BrandKitSchema.parse({}),
    catalog: CatalogSchema.parse({
      categories: [
        {
          id: "c0",
          name_fr: "Catégorie",
          order: 0,
          items: Array.from({ length: n }, (_, i) => ({
            id: `i${i}`,
            name_fr: `Produit ${i + 1}`,
            prices: [{ label: "seul", value: 9 + i }],
            order: i,
          })),
        },
      ],
    }),
    assets: [],
    created_at: "t",
    updated_at: "t",
  } as ClientDTO;
}

const doc = () => DocumentStateSchema.parse({ template_id: "kabul-fabrika" });

/* ESKİ kapasite matematiği — Template.tsx'ten sökülen ifadenin birebir kopyası */
const eskiKapasite = (): number =>
  PROTO.cols * Math.max(1, Math.floor((H / K - PROTO.y) / PROTO.rowH));

describe("kabul-fabrika — motor bağlaması eşdeğerliği", () => {
  it("kapasite ESKİ formülle birebir aynı ve sayısal çivi 10 (2 kolon × 5 satır)", () => {
    const a = analyzeGenerated(client(30), doc());
    expect(a.capacity).toBe(eskiKapasite());
    expect(a.capacity).toBe(10);
  });

  it("shown, ESKİ items.slice(0, capacity) ile birebir aynı (sıra dahil) — n taraması", () => {
    for (const n of [0, 1, 5, 9, 10, 11, 15, 30]) {
      const a = analyzeGenerated(client(n), doc());
      const eskiIds = Array.from({ length: n }, (_, i) => `i${i}`).slice(0, eskiKapasite());
      expect(a.shown.map((it) => it.id), `n=${n}`).toEqual(eskiIds);
      expect(a.overflowCount, `n=${n}`).toBe(Math.max(0, n - eskiKapasite()));
    }
  });

  it("kapasite üstü artık SESSİZ değil: görünür overflow-items uyarısı (eskiden uyarı HİÇ üretilmiyordu)", () => {
    const a = analyzeGenerated(client(30), doc());
    expect(a.warnings).toEqual([{ type: "overflow-items", count: 20 }]);
    /* kapasite altı: uyarı yok */
    expect(analyzeGenerated(client(4), doc()).warnings).toEqual([]);
  });

  it("manifest ilanı bugün 'shrink-then-warn' — düşürme izinli, ihlal DEĞİL düz taşma", () => {
    expect(manifest.repeater?.overflow).toBe("shrink-then-warn");
  });

  it("entry.warnings köprüsü bağlı: editör paneli şablonun KENDİ analizini okur", () => {
    const entry = TEMPLATES["kabul-fabrika"];
    expect(entry.warnings).toBeDefined();
    expect(entry.warnings!(client(30), doc())).toEqual([{ type: "overflow-items", count: 20 }]);
    expect(entry.warnings!(client(2), doc())).toEqual([]);
  });
});
