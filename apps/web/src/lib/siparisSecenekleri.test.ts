/* SİPARİŞ FORMU SEÇENEKLERİ ↔ ŞEMANIN KABULÜ (K-1/B — operatörün seçtiği şey
   sunucunun kabul ettiği şey olmalı).

   ÖLÇÜLEN DURUM: kalem formu üç seçenek sunar. `mode` ve `technique` İLANDAN
   türer (`siparisTeknikleri`), `side` ise elle yazılıdır ve türetecek ilanı
   YOKTUR (uygulama yönü bir üretim kanalı değildir — TODO'da kayıtlı, bilerek
   korunan sınır). Üçünün de doğrulayıcısı `OrderDetailsSchema`dır.

   NİYE NÖBETÇİ GEREKLİ: iki yön de yara üretir —
   · Form, şemanın REDDETTİĞİ bir değer sunarsa operatör onu seçer ve kayıt
     400 alır (bugün genel hata bandına düşer; eskiden sessizdi).
   · Şema kabul ettiği hâlde form SUNMUYORSA yetenek erişilemez kalır.
   Bu depo iki yarayı da tek tek kapattı; burada mekanikleşiyor.

   BUGÜN AYRIŞMA YOK (ölçüldü, bu turda komutla): vitrophanie `mode` için
   [impression, decoupe], tişört/önlük `technique` için [impression, broderie],
   `side` için [exterieur, interieur] — üçü de şemanın kabul kümesiyle birebir.
   Nöbetçi bu eşitliği KORUR, kurmaz. */

import { describe, expect, it } from "vitest";
import { OrderDetailsSchema, ProductTypeSchema, pricingInputsOf } from "@tezgah/shared";
import { siparisTeknikleri } from "@tezgah/templates/identity";
import { SIPARIS_YONLERI } from "./siparisSecenekleri";

/** Şema bu alan için bu değeri kabul ediyor mu? */
function kabul(alan: "side" | "mode" | "technique", deger: string): boolean {
  return OrderDetailsSchema.safeParse({ [alan]: deger }).success;
}

/** Alanın şemadaki kapalı sözlüğü (arayüzün SUNMASI gereken küme).

    `_def` KAZILMAZ: `OrderDetailsSchema` bir ZodObject'tir (`.passthrough()`
    yine ZodObject döner), alanlar `.optional()` sarmalıdır — ikisi de belgeli
    genel API (`.shape`, `.unwrap()`). İlk yazımda `_def.schema.shape`
    denenmişti ve `undefined` verdi: iç yapıya dayanan ölçüm, ölçtüğü şeyden
    daha kırılgandır. */
function semaKumesi(alan: "side" | "mode" | "technique"): readonly string[] {
  return OrderDetailsSchema.shape[alan].unwrap().options;
}

describe("form seçenekleri ↔ şema kabulü", () => {
  it("ÖN-KOŞUL: şema sözlükleri okunabildi", () => {
    /* Zod iç yapısı değişirse `semaKumesi` sessizce boş dönebilir ve aşağıdaki
       eş-kümelik testleri HİÇBİR ŞEY ölçmeden yeşil kalırdı. */
    expect(semaKumesi("side")).toContain("interieur");
    expect(semaKumesi("mode")).toContain("decoupe");
    expect(semaKumesi("technique")).toContain("broderie");
  });

  it("YÖN kümesi şemayla EŞ-KÜME (elle yazılı ama denetimsiz değil)", () => {
    expect([...SIPARIS_YONLERI].sort()).toEqual([...semaKumesi("side")].sort());
  });

  it("TÜRETİLEN teknik kümelerinin HEPSİ şemaca kabul edilir", () => {
    /* Ürün türü → hangi alanda sunulduğu `pricingInputsOf` ilanından okunur:
       vitrophanie'de `mode`, tişört/önlükte `technique`. */
    const reddedilen: string[] = [];
    for (const tur of ProductTypeSchema.options) {
      const alanlar = pricingInputsOf(tur).map((g) => g.alan);
      const hedef = alanlar.includes("technique")
        ? "technique"
        : alanlar.includes("mode")
          ? "mode"
          : null;
      if (hedef === null) continue;
      for (const teknik of siparisTeknikleri(tur)) {
        if (!kabul(hedef, teknik)) reddedilen.push(`${tur}.${hedef}=${teknik}`);
      }
    }
    expect(
      reddedilen,
      "Form, şemanın REDDETTİĞİ değer sunuyor: operatör seçer, kayıt 400 alır.",
    ).toEqual([]);
  });

  it("ÖN-KOŞUL: en az bir ürün türü gerçekten teknik seçeneği SUNUYOR", () => {
    /* Yukarıdaki döngü hiçbir türde `hedef` bulamazsa boş kümede döner ve
       hiçbir şey ölçmeden yeşil kalırdı. */
    const sunanlar = ProductTypeSchema.options.filter((tur) => {
      const alanlar = pricingInputsOf(tur).map((g) => g.alan);
      return alanlar.includes("technique") || alanlar.includes("mode");
    });
    expect(sunanlar).toContain("vitrophanie");
    expect(sunanlar).toContain("tisort");
  });

  it("ŞEMANIN KABUL ETTİĞİ her teknik BİR ürün türünde sunulur (erişilemez yetenek yok)", () => {
    const sunulan = new Set<string>();
    for (const tur of ProductTypeSchema.options) {
      const alanlar = pricingInputsOf(tur).map((g) => g.alan);
      if (alanlar.includes("technique") || alanlar.includes("mode")) {
        for (const teknik of siparisTeknikleri(tur)) sunulan.add(teknik);
      }
    }
    const erisilemez = [...semaKumesi("mode"), ...semaKumesi("technique")].filter(
      (v) => !sunulan.has(v),
    );
    expect(
      [...new Set(erisilemez)],
      "Şema kabul ediyor ama form HİÇBİR türde sunmuyor: yetenek erişilemez.",
    ).toEqual([]);
  });
});
