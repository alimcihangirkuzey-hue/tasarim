/* Dosya adlandırma sözleşmesi testleri (Canonical 8.5;
   journal 2026-07-26-dosya-adlandirma).

   ÜÇ kanıt: (1) referans-kopya eşdeğerlik — uçlardan sökülen satır-içi
   kalıplarla birebir; (2) CMYK ROUND-TRIP NÖBETÇİSİ — exportDosyaAdi ile
   cmykTuretilmisAd'ın birlikte çalıştığı çivilenir (önceden bu bağlaşım
   İLANSIZ ve TESTSİZDİ: exports adlandırmayı değiştirse cmyk çalışma
   anında 500'e düşerdi, hiçbir test kırılmazdı); (3) parse-back — üretilen
   ad sözleşmenin alanlarını geri okunabilir taşır (sürüm sayacı dahil).

   EK (journal 2026-07-26-onizleme-turleri): sunum kanalları da sözleşmeye
   girdi — mockup/mockup_hires/presentation/digital_menu için aynı
   referans-kopya kanıtı + üretim adlarıyla çakışmama nöbetçisi aşağıda. */

import { describe, expect, it } from "vitest";
import { slugify } from "@tezgah/shared";
import {
  cmykTuretilmisAd,
  dijitalMenuDosyaAdi,
  exportDosyaAdi,
  garmentDosyaTabani,
  mockupDosyaAdi,
  sunumDosyaAdi,
} from "./dosya-adi.js";

describe("referans-kopya eşdeğerlik — uçlardan sökülen kalıplarla birebir", () => {
  it("export/vector kalıbı: {gün}_{şablon}_{format}_v{N}_{tür}.{uzantı}", () => {
    const day = "2026-07-26";
    for (const [templateId, format, version, kind, uzanti] of [
      ["menu-liste-premium", "a3", 4, "print", "pdf"],
      ["menu-liste-premium", "a3", 4, "preview", "pdf"],
      ["vitro-centre", "100x120cm", 1, "decoupe", "svg"],
      ["garment", "xxcm", 2, "broderie", "svg"],
    ] as const) {
      const eski = `${day}_${templateId}_${format}_v${version}_${kind}.${uzanti}`;
      expect(exportDosyaAdi({ day, templateId, format, version, kind, uzanti })).toBe(eski);
    }
  });

  it("garment kalıbı: {gün}_garment-{ürün}_v{N} (+ alan/fiche ekleri uçta)", () => {
    expect(garmentDosyaTabani({ day: "2026-07-26", garmentKind: "tshirt", version: 3 })).toBe(
      "2026-07-26_garment-tshirt_v3"
    );
    expect(garmentDosyaTabani({ day: "2026-07-26", garmentKind: "apron_bavette", version: 1 })).toBe(
      "2026-07-26_garment-apron_bavette_v1"
    );
  });
});

describe("NÖBETÇİ: cmyk türevi ile print adı BİRLİKTE çalışır (bağlaşım ilanlı)", () => {
  it("round-trip: sözleşmenin print çıktısı → cmyk türevi üretir", () => {
    const printAd = exportDosyaAdi({
      day: "2026-07-26", templateId: "menu-grid-cells", format: "a4-portrait",
      version: 7, kind: "print", uzanti: "pdf",
    });
    expect(
      cmykTuretilmisAd(`/data/exports/chez-demo/${printAd}`),
      "Bu test KIRILDIYSA export adlandırması ile cmyk türetimi AYRIŞTI — " +
        "ikisini aynı pakette hizalamadan merge edilemez (8.5 sözleşme)"
    ).toBe("/data/exports/chez-demo/2026-07-26_menu-grid-cells_a4-portrait_v7_print-cmyk.pdf");
  });

  it("kalıba uymayan giriş null (uç 500 bad_filename — eski davranış birebir)", () => {
    expect(cmykTuretilmisAd("/x/rastgele.pdf")).toBe(null);
    expect(cmykTuretilmisAd("/x/a_preview.pdf")).toBe(null);
    expect(cmykTuretilmisAd("/x/a_print.svg")).toBe(null);
    /* preview PDF'inden türetilmez: yalnız print kanalı CMYK kaynağıdır */
  });
});

describe("sunum kanalları — sözleşmeye giriş (8.5; journal 2026-07-26-onizleme-turleri)", () => {
  it("mockup kalıbı (mockup.ts:96/172'den sökülen): {gün}_{şablon}_{format}_v{N}_{tür}.jpg", () => {
    const day = "2026-07-26";
    /* tek fonksiyon + kind paramı: iki uç aynı şablonu kuruyordu (bkz. dosya-adi.ts) */
    for (const [templateId, format, version, kind] of [
      ["menu-liste-premium", "a3", 4, "mockup"],
      ["vitro-centre", "100x120cm", 1, "mockup"],
      ["menu-grid-cells", "a4-portrait", 7, "mockup-hires"],
      ["flyer", "default", 2, "mockup-hires"],
    ] as const) {
      const eski = `${day}_${templateId}_${format}_v${version}_${kind}.jpg`;
      expect(mockupDosyaAdi({ day, templateId, format, version, kind })).toBe(eski);
    }
  });

  it("sunum kalıbı (present.ts:100'den sökülen): {gün}_{proje-slug}_a4_v{N}_presentation.pdf", () => {
    const day = "2026-07-26";
    for (const [projectName, version] of [
      ["Menu Été 2026", 3],
      ["Chez Demo Vitrine", 12],
    ] as const) {
      const eski = `${day}_${slugify(projectName)}_a4_v${version}_presentation.pdf`;
      expect(sunumDosyaAdi({ day, projeSlug: slugify(projectName), version })).toBe(eski);
    }
  });

  it("dijital menü kalıbı (digital-menu.ts:65'ten sökülen): {gün}_{müşteri-slug}_menu-digital_v{N}.html", () => {
    const day = "2026-07-26";
    for (const [clientName, version] of [
      ["Chez Demo", 1],
      ["L'Atelier Brasserie", 5],
    ] as const) {
      const eski = `${day}_${slugify(clientName)}_menu-digital_v${version}.html`;
      expect(dijitalMenuDosyaAdi({ day, musteriSlug: slugify(clientName), version })).toBe(eski);
    }
  });

  it("NÖBETÇİ: sunum adları üretim adlarıyla ÇAKIŞMAZ (aynı gün/şablon/format/sürüm)", () => {
    const ortak = { day: "2026-07-26", templateId: "menu-liste-premium", format: "a3", version: 4 };
    const print = exportDosyaAdi({ ...ortak, kind: "print", uzanti: "pdf" });
    const mockup = mockupDosyaAdi({ ...ortak, kind: "mockup" });
    const hires = mockupDosyaAdi({ ...ortak, kind: "mockup-hires" });
    expect(mockup).not.toBe(print);
    expect(hires).not.toBe(print);
    expect(hires).not.toBe(mockup);
    /* tür soneki + uzantı ayrıştırır: aynı klasörde üst üste yazma imkânsız */
    expect(new Set([print, mockup, hires]).size).toBe(3);
  });
});

describe("parse-back — ad, sözleşme alanlarını geri okunabilir taşır (8.5 sürüm sayacı)", () => {
  it("üretilen addan gün/şablon/format/sürüm/tür geri çözülür", () => {
    const ad = exportDosyaAdi({
      day: "2026-07-26", templateId: "flyer", format: "21x21", version: 12, kind: "preview", uzanti: "pdf",
    });
    const m = ad.match(/^(\d{4}-\d{2}-\d{2})_(.+)_([^_]+)_v(\d+)_([^_.]+)\.(pdf|svg)$/);
    expect(m).not.toBe(null);
    expect(m![1]).toBe("2026-07-26");
    expect(m![2]).toBe("flyer");
    expect(m![3]).toBe("21x21");
    expect(Number(m![4])).toBe(12);
    expect(m![5]).toBe("preview");
  });
});
