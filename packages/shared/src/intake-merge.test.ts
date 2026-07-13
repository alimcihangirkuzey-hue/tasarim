/* T1b/FIX-3 — appendIntakeCategories: tekrar-intake'te aynı-etiket kategori
   MEVCUT kategoriye birleşir (mükerrer açılmaz); ŞERH-1/M5 korunur. */

import { describe, expect, it } from "vitest";
import { CategorySchema, type Category } from "./schemas.js";
import { appendIntakeCategories } from "./intake-merge.js";

const cat = (id: string, name_fr: string, itemNames: string[], note_fr?: string): Category =>
  CategorySchema.parse({
    id,
    name_fr,
    order: 0,
    ...(note_fr ? { note_fr } : {}),
    items: itemNames.map((n, i) => ({
      id: `${id}_i${i + 1}`,
      name_fr: n,
      prices: [{ label: "seul", value: 5 }],
      order: i + 1,
    })),
  });

describe("appendIntakeCategories (T1b/FIX-3)", () => {
  it("aynı foldTr etiketle ikinci commit → kategori SAYISI SABİT + ürünler MEVCUT kategoride (id kanıtı)", () => {
    const current = [cat("ord_A_c1", "Sandviçler", ["Kebap", "Köfte"])];
    const projected = [cat("ord_B_c1", "Sandviçler", ["Escalope"])];
    const r = appendIntakeCategories(current, projected);

    expect(r.categories).toHaveLength(1); // mükerrer AÇILMADI
    expect(r.addedCategories).toBe(0);
    expect(r.categories[0].id).toBe("ord_A_c1"); // MEVCUT kategori (id kanıtı)
    expect(r.categories[0].items.map((i) => i.name_fr)).toEqual(["Kebap", "Köfte", "Escalope"]);
    expect(r.categories[0].items[2].order).toBe(3); // devam eden order
    expect(r.mergedInto).toEqual([{ category_id: "ord_A_c1", label: "Sandviçler", items: 1 }]);
  });

  it("foldTr eşleşmesi büyük/küçük + TR harf duyarsız (SANDVİÇLER ≡ sandviçler)", () => {
    const current = [cat("c1", "SANDVİÇLER", ["Kebap"])];
    const r = appendIntakeCategories(current, [cat("p1", "sandviçler", ["Köfte"])]);
    expect(r.categories).toHaveLength(1);
    expect(r.categories[0].id).toBe("c1");
    expect(r.categories[0].items).toHaveLength(2);
  });

  it("eşleşme yoksa YENİ kategori (eski davranış aynen) + addedCategories", () => {
    const current = [cat("c1", "Sandviçler", ["Kebap"])];
    const r = appendIntakeCategories(current, [cat("p1", "Pizzalar", ["Margherita"])]);
    expect(r.categories).toHaveLength(2);
    expect(r.addedCategories).toBe(1);
    expect(r.mergedInto).toEqual([]);
    expect(r.categories.map((c) => c.order)).toEqual([1, 2]); // renumber
  });

  it("ŞERH-1/M5: mevcut ürün satırları ve kategori kimliği/notu AYNEN (derin eşitlik)", () => {
    const current = [cat("c1", "Sandviçler", ["Kebap", "Köfte"], "Mevcut not")];
    const beforeItems = JSON.stringify(current[0].items);
    const r = appendIntakeCategories(current, [cat("p1", "Sandviçler", ["Escalope"])]);

    const target = r.categories[0];
    expect(JSON.stringify(target.items.slice(0, 2))).toBe(beforeItems); // mevcut ürünler birebir
    expect(target.name_fr).toBe("Sandviçler");
    expect(target.note_fr).toBe("Mevcut not"); // not dokunulmadı
    /* girdi dizileri mutasyonlanmadı (saf fn) */
    expect(current[0].items).toHaveLength(2);
  });

  it("projeksiyon-İÇİ aynı-fold iki kategori tek hedefe birleşir (yeni açılan da haritada)", () => {
    const r = appendIntakeCategories(
      [],
      [cat("p1", "Pizzalar", ["Margherita"]), cat("p2", "PİZZALAR", ["Sucuklu"])]
    );
    expect(r.categories).toHaveLength(1);
    expect(r.addedCategories).toBe(1);
    expect(r.categories[0].items.map((i) => i.name_fr)).toEqual(["Margherita", "Sucuklu"]);
    expect(r.mergedInto).toEqual([{ category_id: "p1", label: "Pizzalar", items: 1 }]);
  });

  it("birleşen kategorinin farklı notu hedefe YAZILMAZ — raporda note_dropped (M8)", () => {
    const current = [cat("c1", "Sandviçler", ["Kebap"], "Eski not")];
    const r = appendIntakeCategories(current, [cat("p1", "Sandviçler", ["Köfte"], "Yeni not")]);
    expect(r.categories[0].note_fr).toBe("Eski not"); // mutasyon yok
    expect(r.mergedInto[0].note_dropped).toBe("Yeni not"); // sessiz düşmedi
  });

  it("boş projeksiyon → kategoriler aynen (yalnız order renumber)", () => {
    const current = [cat("c1", "A", ["x"]), cat("c2", "B", ["y"])];
    const r = appendIntakeCategories(current, []);
    expect(r.categories.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(r.mergedInto).toEqual([]);
    expect(r.addedCategories).toBe(0);
  });

  it("çıktı CatalogSchema-uyumlu (DB'ye yazılabilir)", () => {
    const r = appendIntakeCategories(
      [cat("c1", "Sandviçler", ["Kebap"])],
      [cat("p1", "Sandviçler", ["Köfte"]), cat("p2", "Pizzalar", ["Margherita"])]
    );
    for (const c of r.categories) expect(() => CategorySchema.parse(c)).not.toThrow();
  });
});
