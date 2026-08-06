/* BULGUNUN SINIFI: "yönetişim kırıldı" ≠ "ölçemedik" (R-FLAKY-TEST-01).

   ÖLÇÜLEN YARA: `verifyAllJournals()` iki bambaşka şeyi aynı kutuya koyuyordu:
     · "append-only ihlali: … 3 satır SİLİNMİŞ"   → gerçek bir kırılma
     · "git denetimi koşulamadı: …"                → ölçümün kendisi başarısız
   İkisi de `JournalViolation` olarak dönüyor, ikisi de kapıyı kırmızıya
   çeviriyordu; ayırt etmek için MESAJI OKUMAK gerekiyordu.

   İKİ AYRI ZARAR, İKİSİ DE ÖLÇÜLDÜ:
   1. Teşhis edilemezlik — bu turun bir önceki paketinde kararsız kapı adıyla
      yakalandı (`verify.test.ts > gerçek depo journal'ı`) ama "geçici mi
      gerçek mi" sorusu ÇIKTIDAN cevaplanamıyordu.
   2. Daha tehlikelisi: ikisi aynı göründüğü için GERÇEK bir append-only
      ihlali "şu kararsız şey yine" diye harcanabilirdi. Kararsızlık yalnız
      gürültü değil, gerçek sinyali de bastırır.

   NE DEĞİŞMEDİ: "ölçülemedi" hâlâ KIRMIZIDIR. Bilinmezlik bir yönetişim
   kapısında geçer not olamaz; değişen tek şey kırmızının kendini
   açıklamasıdır. Bu paket kararsızlığı ÇÖZMEZ — bir dahaki kırmızıyı
   kendi kendini teşhis eder hâle getirir. */

import { describe, expect, it } from "vitest";
import { ihlalSinifi, type JournalViolation } from "./verify.js";

describe("sınıf türetme", () => {
  it("ÖN-KOŞUL: iki sınıf da üretilebiliyor", () => {
    /* Bu satır olmadan aşağıdaki iddialar, her şeye tek sınıf veren bozuk bir
       kuralla da kısmen yeşil kalabilirdi. */
    expect(new Set([ihlalSinifi("append-only ihlali: 3 satır SİLİNMİŞ"), ihlalSinifi("git denetimi koşulamadı: x")]).size).toBe(2);
  });

  it("GERÇEK KIRILMALAR 'ihlal' sayılır", () => {
    for (const m of [
      "append-only ihlali: 0a1b2c3d..4e5f6a7b arasında 3 satır SİLİNMİŞ (docs/journal/events/x.jsonl)",
      "append-only ihlali: journal dosyası SİLİNMİŞ (git biliyor, çalışma ağacında yok)",
      "hash zinciri kırık: seq=4",
    ]) {
      expect(ihlalSinifi(m), m.slice(0, 40)).toBe("ihlal");
    }
  });

  it("ÖLÇÜM BAŞARISIZLIKLARI 'olculemedi' sayılır", () => {
    for (const m of [
      "git denetimi koşulamadı: git log: fatal: unable to read tree",
      "git denetimi koşulamadı: journal dosyası depo ağacının dışında (x)",
      "yapı denetimi koşulamadı: EACCES",
      "zincir denetimi koşulamadı: boom",
      "kaynak katmanı koşulamadı: boom",
      "journal okunamadı: EIO",
      "git denetimi koşulamadı: numstat çözümlenemedi: \"bozuk\"",
    ]) {
      expect(ihlalSinifi(m), m.slice(0, 40)).toBe("olculemedi");
    }
  });

  it("BİLİNMEYEN metin 'ihlal'e düşer — ölçemedik demek FAIL-OPEN olurdu", () => {
    /* Sınıflandıramadığımız bir bulguyu "ölçüm sorunu" saymak, gerçek bir
       kırılmayı hafifletmek olurdu. Kuşkuda ağır olan taraf seçilir. */
    expect(ihlalSinifi("tanımadığım bir şey oldu")).toBe("ihlal");
  });
});

describe("sınıfın taşıdığı söz", () => {
  it("TİP ZORUNLU KILAR — sınıfsız bulgu derlenemez", () => {
    /* Derleme zamanı güvence; burada çalışma zamanında da görünür kılınıyor:
       bir bulgu üretmenin tek yolu sınıfını da söylemektir. */
    const b: JournalViolation = {
      package_id: "(depo)",
      layer: "git",
      message: "append-only ihlali: örnek",
      sinif: "ihlal",
    };
    expect(b.sinif).toBe("ihlal");
  });

  it("İKİ SINIF DA KIRMIZIDIR — 'ölçülemedi' yeşil DEĞİL", () => {
    /* Bu paketin en kolay yanlış anlaşılacak yeri. Ayrım TEŞHİS içindir,
       AF için değil: bilinmezlik bir yönetişim kapısında geçer not olamaz. */
    const bulgular: JournalViolation[] = [
      { package_id: "(depo)", layer: "git", message: "git denetimi koşulamadı: x", sinif: "olculemedi" },
    ];
    expect(bulgular.length).toBeGreaterThan(0);
    expect(bulgular.every((b) => b.sinif === "ihlal")).toBe(false);
  });
});
