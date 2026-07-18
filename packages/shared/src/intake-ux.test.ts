/* HF-TRIO-01 — FIX-1 (geri-al) + FIX-2 (ad-fallback gap) saf testleri.
   m.4 OTOMATİK REPRO-TESTİ burada: fr-menülü müşteriye TR-only özel ürün →
   gaps listesinde GÖRÜNMELİ (kutu şartı). */

import { describe, expect, it } from "vitest";
import {
  captureRemoval,
  intakeNameGaps,
  localizedNameGap,
  restoreRemoval,
} from "./intake-ux.js";

const L = (tr: string, fr = "", de = "") => ({ tr, fr, de });

describe("FIX-1 — captureRemoval / restoreRemoval (5sn Geri-al çekirdeği)", () => {
  const list = [{ uid: "a", v: 1 }, { uid: "b", v: 2 }, { uid: "c", v: 3 }];

  it("ortadan yakalar: removed+index doğru, next 2 elemanlı, girdi MUTATE edilmez", () => {
    const cap = captureRemoval(list, "b");
    expect(cap?.removed.uid).toBe("b");
    expect(cap?.index).toBe(1);
    expect(cap?.next.map((x) => x.uid)).toEqual(["a", "c"]);
    expect(list).toHaveLength(3);
  });

  it("olmayan uid → null (no-op sinyali)", () => {
    expect(captureRemoval(list, "yok")).toBeNull();
  });

  it("restore ESKİ sıraya geri koyar (yakala→geri-koy = başlangıç listesi)", () => {
    const cap = captureRemoval(list, "b");
    const back = restoreRemoval(cap!.next, cap!.removed, cap!.index);
    expect(back.map((x) => x.uid)).toEqual(["a", "b", "c"]);
  });

  it("index taşarsa sona kelepçelenir (liste bu arada kısalmışsa güvenli)", () => {
    const back = restoreRemoval([{ uid: "a" }], { uid: "z" }, 99);
    expect(back.map((x) => x.uid)).toEqual(["a", "z"]);
  });
});

describe("FIX-2 — localizedNameGap (pickML zinciriyle aynı sıra)", () => {
  it("istenen dil doluysa gap YOK", () => {
    expect(localizedNameGap(L("Pizza", "Pizza"), "fr")).toBeNull();
  });

  it("fr istenirken TR-only ad → gap {usedLang:tr}", () => {
    expect(localizedNameGap(L("Özel Pizza"), "fr")).toEqual({ usedLang: "tr", label: "Özel Pizza" });
  });

  it("de istenirken de boş, fr dolu → usedLang fr (de→fr→tr sırası)", () => {
    expect(localizedNameGap(L("Tavuk", "Poulet"), "de")).toEqual({ usedLang: "fr", label: "Poulet" });
  });

  it("tümü boş → null (basılacak şey yok; D1 refine zaten engeller)", () => {
    expect(localizedNameGap(L(""), "fr")).toBeNull();
  });
});

describe("FIX-2 — intakeNameGaps (m.4 OTOMATİK REPRO — kutu şartı)", () => {
  it("REPRO: fr-menülü müşteriye TR-only özel ürün → gaps listesinde GÖRÜNÜR", () => {
    const gaps = intakeNameGaps(
      [{ name: L("Özel Pizza"), category_name: L("Pizzalar", "Pizzas") }],
      "fr"
    );
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toEqual({
      category: "Pizzalar",
      item: "Özel Pizza",
      label: "Özel Pizza",
      missingLang: "fr",
      usedLang: "tr",
    });
  });

  it("fr adı dolu seed ürün → gap üretmez (yanlış-pozitif yok)", () => {
    expect(intakeNameGaps([{ name: L("Tavuk Tacos", "Tacos poulet"), category_name: L("Tacos", "Tacos") }], "fr")).toEqual([]);
  });

  it("kategori adı da fallback'liyse kategori-başına TEK kayıt (dedup) + '(kategori adı)' işareti", () => {
    const gaps = intakeNameGaps(
      [
        { name: L("Ürün 1", "Produit 1"), category_name: L("Yeni Kategori") },
        { name: L("Ürün 2", "Produit 2"), category_name: L("Yeni Kategori") },
      ],
      "fr"
    );
    expect(gaps).toHaveLength(1);
    expect(gaps[0].item).toBe("(kategori adı)");
    expect(gaps[0].usedLang).toBe("tr");
  });
});
