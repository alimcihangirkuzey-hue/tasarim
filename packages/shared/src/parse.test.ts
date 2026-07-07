import { describe, expect, it } from "vitest";
import {
  matchClient,
  matchProductType,
  parseDueDate,
  parseOrderText,
  parseSize,
} from "./parse.js";

const TODAY = "2026-07-07";

/* FAZ2-GOREV §2.4'teki örnek metin — birebir */
const SAMPLE = `=== SIPARIS ===
Isletme: Antalya Kebab
Sehir: Lyon / Tel: 06 12 34 56 78
Termin: 20 Temmuz
--- Kalem ---
Urun: cam giydirme
Olcu: 180 x 120 cm
Detay: distan uygulama, baskili folyo
--- Kalem ---
Urun: menu / Format: A3 / Adet: 2`;

describe("parseOrderText — tam örnek (kabul §9/1)", () => {
  const p = parseOrderText(SAMPLE, { today: TODAY });

  it("başlık alanları", () => {
    expect(p.isletme).toBe("Antalya Kebab");
    expect(p.sehir).toBe("Lyon");
    expect(p.tel).toBe("06 12 34 56 78");
    expect(p.termin_raw).toBe("20 Temmuz");
    expect(p.due_date).toBe("2026-07-20");
  });

  it("vitrophanie kalemi: ölçü + mode/side çıkarımı + ham detay notta", () => {
    const v = p.items[0];
    expect(v.product_type).toBe("vitrophanie");
    expect(v.width_cm).toBe(180);
    expect(v.height_cm).toBe(120);
    expect(v.details.side).toBe("exterieur");
    expect(v.details.mode).toBe("impression");
    expect(v.notes).toContain("distan uygulama, baskili folyo");
  });

  it("menü kalemi: / ile çok alan tek satırda", () => {
    const m = p.items[1];
    expect(m.product_type).toBe("menu");
    expect(m.details.format).toBe("a3");
    expect(m.qty).toBe(2);
  });
});

describe("tolerans senaryoları", () => {
  it("Türkçe karakterli anahtarlar ve satır sırası serbest", () => {
    const p = parseOrderText(
      `Ürün: Menü\nÖlçü: yok\nİşletme: Şiş Palace\nAdet: 3`,
      { today: TODAY }
    );
    expect(p.isletme).toBe("Şiş Palace");
    expect(p.items[0].product_type).toBe("menu");
    expect(p.items[0].qty).toBe(3);
    expect(p.items[0].notes).toContain("Ölçü: yok"); // parse edilemeyen ölçü nota düşer
  });

  it("tanınmayan satırlar kaybolmaz: kalem öncesi başlığa, sonrası kaleme", () => {
    const p = parseOrderText(
      `merhaba bunu da yaz\n--- Kalem ---\nUrun: tabela\nacilis 15 agustos onemli`,
      { today: TODAY }
    );
    expect(p.header_notes).toBe("merhaba bunu da yaz");
    expect(p.items[0].notes).toContain("acilis 15 agustos onemli");
  });

  it("bozuk/boş metin çökmez", () => {
    expect(parseOrderText("", { today: TODAY }).items).toEqual([]);
    expect(parseOrderText(":::///:::\n\n\n", { today: TODAY }).items).toEqual([]);
  });

  it("Kalem işareti olmadan Urun satırı kalem başlatır", () => {
    const p = parseOrderText(`Urun: flyer\nFormat: 21x21`, { today: TODAY });
    expect(p.items).toHaveLength(1);
    expect(p.items[0].details.format).toBe("21x21");
  });

  it("değer içindeki / bölünmez (yalnız yeni anahtar ayraçtır)", () => {
    const p = parseOrderText(`Detay: 7j/7 acik / Tel: 04 78`, { today: TODAY });
    expect(p.items[0].notes).toContain("7j/7 acik");
    expect(p.tel).toBe("04 78");
  });
});

describe("ürün eş anlamlı sözlüğü (§2.4)", () => {
  const cases: Array<[string, string]> = [
    ["cam giydirme", "vitrophanie"],
    ["CAM", "vitrophanie"],
    ["folyo kesim", "vitrophanie"],
    ["enseigne", "tabela"],
    ["katlamalı menü", "trifold"],
    ["el ilanı", "flyer"],
    ["broşür", "flyer"],
    ["sadakat kartı", "fidelite"],
    ["tişört", "tisort"],
    ["tablier", "onluk"],
    ["önlük", "onluk"],
    ["menü", "menu"],
    ["heykel", "diger"],
  ];
  for (const [input, expected] of cases) {
    it(`${input} → ${expected}`, () => expect(matchProductType(input)).toBe(expected));
  }
});

describe("ölçü biçimleri", () => {
  it("x / * / bitişik / ondalık", () => {
    expect(parseSize("180 x 120 cm")).toEqual({ w: 180, h: 120 });
    expect(parseSize("180x120")).toEqual({ w: 180, h: 120 });
    expect(parseSize("180*120")).toEqual({ w: 180, h: 120 });
    expect(parseSize("95,5 x 60")).toEqual({ w: 95.5, h: 60 });
    expect(parseSize("genis")).toBeNull();
  });
});

describe("termin biçimleri", () => {
  it("TR ay adı / nokta / slash / ISO", () => {
    expect(parseDueDate("20 Temmuz", TODAY)).toBe("2026-07-20");
    expect(parseDueDate("5 agustos 2027", TODAY)).toBe("2027-08-05");
    expect(parseDueDate("20.07", TODAY)).toBe("2026-07-20");
    expect(parseDueDate("01/08/2026", TODAY)).toBe("2026-08-01");
    expect(parseDueDate("2026-09-15", TODAY)).toBe("2026-09-15");
    expect(parseDueDate("yarin aksam", TODAY)).toBeNull();
  });
});

describe("matchClient (yaklaşık eşleşme)", () => {
  const clients = [
    { id: "1", name: "ARAS Grill Lyon", slug: "aras-grill-lyon" },
    { id: "2", name: "Basel Kebap Haus", slug: "basel-kebap-haus" },
  ];
  it("tam slug eşleşmesi", () => {
    expect(matchClient("Aras Grill Lyon", clients)?.id).toBe("1");
  });
  it("kapsama eşleşmesi (kısmi ad)", () => {
    expect(matchClient("aras grill", clients)?.id).toBe("1");
  });
  it("eşleşmezse null → UI 'yeni müşteri?' sorar", () => {
    expect(matchClient("Yeni Dönerci", clients)).toBeNull();
  });
});
