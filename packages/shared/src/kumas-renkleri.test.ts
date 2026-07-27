/* KUMAŞ RENGİ BİRLİĞİ testi (journal 2026-07-27-kumas-rengi-birligi).

   Birlik ilanının üç tüketicisi var (sahneSkoru karşılaştırması, garment
   fabricToHex, ScenesPanel select listesi) — buradaki testler İLANIN KENDİSİNİ
   çiviler; tüketici bağları kendi paketlerinin testlerinde ölçülür
   (mockup-tercihi.test.ts eşleşme-canlandı vakaları, garment/analyze.test.ts
   BİLİNEN SINIR bloğu). */

import { describe, expect, it } from "vitest";
import { KUMAS_RENKLERI, kumasRengiEsit, kumasRengiHex } from "./schemas.js";

describe("kumasRengiHex — birlik çözücüsü", () => {
  it("adlandırılmış dört renk hex'e çözülür (küme ve değerler ÇİVİLİ)", () => {
    /* Değerler garment'ın eski yerel FABRIC_HEX kopyasından TAŞINDI — kopya
       silinirken renklerin değişmediğinin kanıtı bu pin. Küme değişirse bu
       bilinçli bir ürün kararıdır ve sahne select'i ile brief metinleri de
       birlikte düşünülmelidir. */
    expect(KUMAS_RENKLERI).toEqual({
      white: "#FFFFFF",
      black: "#1A1A1A",
      red: "#C8102E",
      blue: "#1D4ED8",
    });
    for (const [ad, hex] of Object.entries(KUMAS_RENKLERI)) {
      expect(kumasRengiHex(ad)).toBe(hex);
    }
  });

  it("geçerli hex KANONİK (büyük harf) biçime çevrilir — kaynağı ne olursa olsun", () => {
    /* <input type="color"> tarayıcıda HEP küçük harf üretir; FABRIC_HEX ve
       manifest varsayılanı büyük harf yazar. Eşleşme yarası tam bu çatlaktan
       doğmuştu — kanonik biçim o çatlağı kapatır. */
    expect(kumasRengiHex("#ffffff")).toBe("#FFFFFF");
    expect(kumasRengiHex("#FFFFFF")).toBe("#FFFFFF");
    expect(kumasRengiHex("#c8102e")).toBe("#C8102E");
  });

  it("tanınmayan değer null — TAHMİN YOK", () => {
    /* "siyah" (BriefPage placeholder'ının davet ettiği Türkçe biçim) burada
       null'dur: çözücü beyaz VARSAYMAZ — o karar çizicinin (fabricToHex) açık
       kararıdır. Prototip anahtarları da Object.hasOwn sayesinde null. */
    for (const v of ["siyah", "beyaz", "", "#zzz", "#abc", "#12345678", "constructor", "toString"]) {
      expect(kumasRengiHex(v), v).toBeNull();
    }
  });
});

describe("kumasRengiEsit — sahne↔belge eşleşmesinin çevirmeni", () => {
  it("İSİM ile HEX artık eşleşir (ölü eşleşme yarasının kapanışı)", () => {
    /* Eski davranış: sahneSkoru ham === kullanıyordu; sahne "white" ile belge
       "#ffffff" HİÇ eşleşmiyordu — manifest'in eslesme_parami ilanı UI yolunda
       ölüydü. Bu üç vaka o yaranın birebir kendisi. */
    expect(kumasRengiEsit("white", "#ffffff")).toBe(true);
    expect(kumasRengiEsit("white", "#FFFFFF")).toBe(true);
    expect(kumasRengiEsit("#c8102e", "red")).toBe(true);
  });

  it("farklı renkler ve çözülemeyen taraflar eşleşmez", () => {
    expect(kumasRengiEsit("white", "black")).toBe(false);
    expect(kumasRengiEsit("white", "")).toBe(false);
    /* İKİ taraf da çözülemiyorsa bile eşit SAYILMAZ: "tanımadığım iki değer
       birbirine eşittir" sessiz yanlış pozitif olurdu. */
    expect(kumasRengiEsit("siyah", "siyah")).toBe(false);
  });
});
