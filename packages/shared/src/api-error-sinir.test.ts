/* OPERATÖRE GİDEN HATA MESAJININ SINIRI (K-1/B — hata bandı okunabilir kalmalı).

   ÖLÇÜLEN YARA (bu turda, GERÇEK bir 500 icra edilerek): açılış takımı zinciri
   uçtan uca koşturuldu; export adımında Chromium başlatılamadı ve sunucu
   `{error:"internal", message:"Failed to launch the browser process: …"}`
   döndürdü. Ölçüm: `apiErrorMessage` bu gövdeden **247 karakter, 5 satırlık**
   bir dize üretiyordu ve o dize kırpılmadan hata bandına gidiyordu — bant
   `position: fixed` ve kaydırılamaz. Operatör, C++ günlük satırları görüyordu:
   "[5290:5290:…:ERROR:content/browser/zygote_host/zygote_host_impl_linux.cc:101]".

   İKİ ŞEY BİRLİKTE ÖLÇÜLÜR ve ikisi de şart:
   · Uzun/çok satırlı mesaj SIĞDIRILIR ve kırpma GÖRÜNÜR olur (sessiz kesme,
     "gerekçenin tamamı bu" dedirtir).
   · Bugünkü kısa gerekçeler BİREBİR geçer — sınır, gerekçeyi yemez.

   TAM METİN KAYBOLMAZ: sunucu onu `app.log.error(err)` ile günlüğe yazar;
   burada kırpılan yalnız EKRANA gidendir. */

import { describe, expect, it } from "vitest";
import { MESAJ_AZAMI, apiErrorMessage } from "./api-error.js";

/** Ölçümde gerçekten dönen gövde (kısaltılmadan). */
const CHROMIUM_GOVDESI = {
  error: "internal",
  message:
    "Failed to launch the browser process:  Code: 1\n\nstderr:\n" +
    "[5290:5290:0806/114333.849581:ERROR:content/browser/zygote_host/zygote_host_impl_linux.cc:101] " +
    "Running as root without --no-sandbox is not supported. See https://crbug.com/638180.\n",
};

describe("hata mesajı sınırı", () => {
  it("ÖN-KOŞUL: ölçülen gövde gerçekten UZUN ve ÇOK SATIRLI", () => {
    /* Bu satır olmadan aşağıdaki iddialar zaten kısa bir dizeyi ölçer ve
       hiçbir şey ayırt etmeden yeşil kalırdı. */
    expect(CHROMIUM_GOVDESI.message.length).toBeGreaterThan(200);
    expect(CHROMIUM_GOVDESI.message.split("\n").length).toBeGreaterThan(3);
  });

  it("ÇOK SATIRLI süreç çıktısı TEK SATIRA iner", () => {
    const m = apiErrorMessage(CHROMIUM_GOVDESI, 500);
    expect(m).not.toContain("\n");
    expect(m.length).toBeLessThanOrEqual(MESAJ_AZAMI + 10); // "…" ve başlık payı
  });

  it("ANLAM KORUNUR — ilk satır taşınır, C++ günlüğü DÜŞER", () => {
    const m = apiErrorMessage(CHROMIUM_GOVDESI, 500);
    expect(m).toContain("Failed to launch the browser process");
    expect(m, "yığın/günlük satırı ekrana sızdı").not.toContain("zygote_host");
  });

  it("KIRPMA GÖRÜNÜR (…) — sessiz kesme yok", () => {
    expect(apiErrorMessage(CHROMIUM_GOVDESI, 500)).toContain("…");
  });

  it("TEK SATIRLIK UZUN mesaj tavandan kesilir ve kırpma görünür", () => {
    const m = apiErrorMessage({ detail: "x".repeat(MESAJ_AZAMI + 50) }, 400);
    expect(m.length).toBeLessThanOrEqual(MESAJ_AZAMI + 2);
    expect(m.endsWith("…")).toBe(true);
  });

  it("KISA GEREKÇELER BİREBİR geçer — sınır gerekçeyi YEMEZ", () => {
    /* Bugünkü gerçek gövdeler: hepsi tavanın çok altında ve DEĞİŞMEMELİ. */
    expect(apiErrorMessage({ error: "validation", issues: [{ message: "Zorunlu alan" }] }, 400)).toBe(
      "Geçersiz veri — Zorunlu alan",
    );
    expect(apiErrorMessage({ error: "policy_reject", rejects: [{ detail_tr: "Dosya açılamadı" }] }, 400)).toBe(
      "Dosya reddedildi — Dosya açılamadı",
    );
    expect(apiErrorMessage({ error: "client_not_found" }, 404)).toBe("Müşteri bulunamadı");
  });

  it("GÖVDESİZ hata bugünkü metni korur (kırpma devreye girmez)", () => {
    expect(apiErrorMessage({}, 500)).toBe("Sunucu hatası (500)");
    expect(apiErrorMessage(null)).toBe("Sunucu hatası");
  });

  it("BAŞTAKİ BOŞ SATIRLAR anlamı gizlemez", () => {
    /* Süreç çıktıları sık sık boş satırla başlar; ilk DOLU satır alınır. */
    expect(apiErrorMessage({ detail: "\n\n  Gerçek gerekçe  \nayrıntı" }, 400)).toBe(
      "Gerçek gerekçe …",
    );
  });
});
