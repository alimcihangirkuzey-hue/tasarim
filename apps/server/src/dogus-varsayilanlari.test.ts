/* KURULUMUN DOĞUŞ VARSAYILANLARI (K-1/D).

   ÖLÇÜLEN YARA: yeni müşteri iki alanını da Fransa/Avrupa varsayarak doğuyordu
   — `currency ?? "EUR"` ve `menu_language ?? "fr"`, üstelik İKİ ayrı rotada
   ayrı ayrı yazılı. Türk bir kurulumda operatör açtığı HER müşteride ikisini
   de elle çevirmek zorundaydı; çevirmeyi unuttuğu müşteri euro fiyatlı ve
   Fransızca çıktılı doğar ve bunu söyleyen hiçbir şey yoktu.

   BU DOSYA KURALI ÖLÇER; uç tarafı `routes/dogus-katalogu-uc.test.ts`'te. */

import { afterEach, describe, expect, it } from "vitest";
import { CurrencySchema, MenuLanguageSchema } from "@tezgah/shared";
import {
  CIKTI_DILI_ENV,
  PARA_BIRIMI_ENV,
  VARSAYILAN_CIKTI_DILI,
  VARSAYILAN_PARA_BIRIMI,
  dogusVarsayilanlari,
} from "./dogus-varsayilanlari.js";

afterEach(() => {
  delete process.env[PARA_BIRIMI_ENV];
  delete process.env[CIKTI_DILI_ENV];
});

describe("doğuş varsayılanları ilanı", () => {
  it("ÖN-KOŞUL: ortam temiz ve kümeler birden çok üye taşıyor", () => {
    /* Bu satır olmadan aşağıdaki "başka değer seçilebiliyor" iddiaları tek
       üyeli kümelerde hiçbir şey ayırt etmeden yeşil kalırdı. */
    expect(process.env[PARA_BIRIMI_ENV]).toBeUndefined();
    expect(process.env[CIKTI_DILI_ENV]).toBeUndefined();
    expect(CurrencySchema.options.length).toBeGreaterThan(1);
    expect(MenuLanguageSchema.removeDefault().options.length).toBeGreaterThan(1);
  });

  it("İLAN YOKSA bugünkü değerler BİREBİR (EUR/fr)", () => {
    expect(dogusVarsayilanlari()).toEqual({
      currency: "EUR",
      menu_language: "fr",
      kaynak: "varsayilan",
    });
    /* Sabitler de bugünküyle aynı olmalı — biri değişirse burası söyler. */
    expect(VARSAYILAN_PARA_BIRIMI).toBe("EUR");
    expect(VARSAYILAN_CIKTI_DILI).toBe("fr");
  });

  it("İLAN EDİLEN para birimi ve dil OKUNUR", () => {
    process.env[PARA_BIRIMI_ENV] = "TRY";
    process.env[CIKTI_DILI_ENV] = "tr";
    expect(dogusVarsayilanlari()).toEqual({
      currency: "TRY",
      menu_language: "tr",
      kaynak: "yapilandirma",
    });
  });

  it("TEK BAŞINA ilan edilebilir — diğeri bugünkü değerde kalır", () => {
    process.env[PARA_BIRIMI_ENV] = "TRY";
    const d = dogusVarsayilanlari();
    expect(d.currency).toBe("TRY");
    expect(d.menu_language).toBe("fr");
    expect(d.kaynak).toBe("yapilandirma");
  });

  it("TANINMAYAN para birimi: FIRLATIR — sessizce yok sayılmaz", () => {
    /* "TL" yazan kurulumcuya "oldu" demek, müşterilerin yine euro doğması
       demekti; bu reponun defalarca ölçtüğü sessiz-genişleme sınıfı. */
    process.env[PARA_BIRIMI_ENV] = "TL";
    expect(() => dogusVarsayilanlari()).toThrow(/tanınmayan değer "TL"/);
  });

  it("TANINMAYAN dil: FIRLATIR", () => {
    process.env[CIKTI_DILI_ENV] = "tr-TR";
    expect(() => dogusVarsayilanlari()).toThrow(/tanınmayan değer/);
  });

  it("HATA MESAJI geçerli değerleri SAYAR", () => {
    process.env[PARA_BIRIMI_ENV] = "USD";
    expect(() => dogusVarsayilanlari()).toThrow(new RegExp(CurrencySchema.options.join(", ")));
  });

  it("İLAN EDİLMİŞ AMA BOŞ: FIRLATIR — varsayılana sessizce DÜŞMEZ", () => {
    /* Kurulumcu bir şey İLAN ETTİ; boş bırakmak bir tercih değil, kazadır. */
    process.env[PARA_BIRIMI_ENV] = "";
    expect(() => dogusVarsayilanlari()).toThrow(/boş/);
    delete process.env[PARA_BIRIMI_ENV];
    process.env[CIKTI_DILI_ENV] = "   ";
    expect(() => dogusVarsayilanlari()).toThrow(/boş/);
  });

  it("DEĞER DONDURULMAZ — ortam her çağrıda yeniden okunur", () => {
    expect(dogusVarsayilanlari().currency).toBe("EUR");
    process.env[PARA_BIRIMI_ENV] = "TRY";
    expect(dogusVarsayilanlari().currency).toBe("TRY");
  });

  it("KÜMELER ŞEMADAN OKUNUR — elle yazılmış ikinci liste yok", () => {
    /* Şemaya yeni bir para birimi/dil eklenirse bu katman onu KENDİLİĞİNDEN
       kabul eder; ayrı bir listeyi güncellemeyi unutmak mümkün değildir. */
    for (const k of CurrencySchema.options) {
      process.env[PARA_BIRIMI_ENV] = k;
      expect(dogusVarsayilanlari().currency, k).toBe(k);
    }
    delete process.env[PARA_BIRIMI_ENV];
    for (const d of MenuLanguageSchema.removeDefault().options) {
      process.env[CIKTI_DILI_ENV] = d;
      expect(dogusVarsayilanlari().menu_language, d).toBe(d);
    }
  });
});
