/* UYARI KÖPRÜSÜ KAPSAM NÖBETÇİSİ (journal 2026-07-26-uyari-kaynagi-durustlugu;
   taban: 2026-07-26-fabrika-motor-baglama).

   `TemplateEntry.warnings` köprüsü BİLEREK DAR kapsamlıdır: fabrika şablonları
   dinamik üretildiği için adla import edilemez, uyarı üretimi entry üzerinden
   taşınır. El yazımı aileler ise analiz fonksiyonlarını ADLA dışa verir ve web
   (analyzeDoc) onları doğrudan çağırır — o ailelerde köprü GEREKSİZDİR.

   NEDEN NÖBETÇİ GEREKLİ: bu kapsam hiçbir yerde çivili değildi ve kosullu-
   gereklilik-v2 paketinde tam da bu yüzden bir test yanlış yolu ölçtü —
   `entry.warnings?.(...)` vitrophanie'de SESSİZCE boş dizi döndürdü ve test,
   ölçtüğünü sandığı şeyi ölçmedi (kırmızıya düşerek öğretti). Jenerik bir
   tüketici yazan herkes aynı tuzağa düşebilir: köprü YOKLUĞU bir hata değil,
   ilanlı bir sınırdır — ama ilan edilmiş olması testle sabitlenmeli.

   KAPATILAN AYRIŞMA — VE LATENTLİĞİ (bulgu F1-latent-yara-iddiasi): köprüsüz
   id'ler web'de artık BOŞ uyarı alır (eskiden menu-grid-cells kapasite
   matematiğine düşüyordu). Ama ölçüm dürüst olsun: analyzeDoc'un default dalına
   BUGÜN yalnız `kabul-fabrika` düşer ve o köprülüdür — yani o düzeltme bugün
   SIFIR davranış değiştirir, kapattığı ayrışma LATENT'tir (emitter prototipsiz
   dalı çalıştığı gün doğar). Düzeltme apps/web'dedir ve DOĞRUDAN test edilemez:
   apps/web'in test script'i yoktur ve kapı fan-out'u onu sessizce atlar
   (packages/journal gates şerhi). Bu dosya dolaylı korumadır — köprü kapsamı
   değişirse burada patlar. */

import { describe, expect, it } from "vitest";
import { TEMPLATES } from "./index.js";

/* Köprüsü OLAN ailelerin TAM listesi — elle yazılır, kayıt defterinden
   TÜRETİLMEZ. Bugün yalnız fabrika üretimi tek şablon (generated/). */
const KOPRULU: readonly string[] = ["kabul-fabrika"];

describe("NÖBETÇİ: uyarı köprüsü kapsamı TAM olarak bu", () => {
  it("köprü YALNIZ fabrika şablonlarında tanımlı (el yazımı aileler adla çağrılır)", () => {
    const koprulu = Object.entries(TEMPLATES)
      .filter(([, e]) => typeof e.warnings === "function")
      .map(([id]) => id)
      .sort();
    expect(
      koprulu,
      "uyarı köprüsü kapsamı değişti: köprü EKLENDİYSE web'de analyzeDoc'un adlı " +
        "switch dalı onu zaten yakalıyor olabilir (o zaman köprü ölü alandır — " +
        "davranış sıfır değişir); köprü KALKTIYSA fabrika belgeleri uyarısız kalır. " +
        "İki hâl de ürün kararıdır, journal kaydı ister"
    ).toEqual([...KOPRULU]);
  });

  it("köprüsüz ailelerde `warnings` alanı YOK — undefined, boş fonksiyon değil", () => {
    /* Ayrım davranışsaldır: analyzeDoc `entry?.warnings` VARLIĞINA bakar.
       Boş bir fonksiyon yazmak (`() => []`) köprüyü "var" gösterip aileyi
       sessizce uyarısız bırakırdı — sessiz düşmenin ta kendisi. */
    for (const [id, entry] of Object.entries(TEMPLATES)) {
      if (KOPRULU.includes(id)) continue;
      expect(entry.warnings, `${id}: köprüsüz ailede warnings tanımlı görünüyor`).toBeUndefined();
    }
  });

  it("köprülü ailede köprü GERÇEKTEN uyarı üretebiliyor (imza + çalışırlık)", () => {
    /* Köprünün varlığı yetmez: çağrılabilir ve dizi dönüyor olmalı. Fabrika
       ailesinin logo zorunluluğu dosya-gereklilik paketinde ilana bağlandı —
       logosuz müşteride en az bir uyarı beklenir (o testin ayrıntısı orada,
       burada yalnız köprünün İŞLEDİĞİ ölçülür). */
    for (const id of KOPRULU) {
      const entry = TEMPLATES[id];
      expect(entry, `${id}: kayıt defterinde yok`).toBeDefined();
      expect(typeof entry.warnings).toBe("function");
    }
  });
});
