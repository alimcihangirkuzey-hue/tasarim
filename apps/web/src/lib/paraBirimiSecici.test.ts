/* NÖBETÇİ — PARA BİRİMİ SEÇİCİLERİ İLANDAN TÜRER (K-1/D).

   ÖLÇÜLEN YARA: para birimi kümesi ÜÇ YERDE tekrarlıydı — `CurrencySchema`,
   iki ekranın elle yazılmış `<option>` listesi ve web'in kendi
   `export type Currency = "EUR" | "CHF"` tipi. Shared enum'a bir üye eklemek
   (bu paket tam da onu yapıyor: TRY) diğer üçünü SESSİZCE eskitirdi:
   operatör listede TL'yi göremez, üstelik hiçbir kapı kırmızıya dönmezdi.

   NE ÖLÇER: müşteri para birimi seçen hiçbir ekran, para birimi kodunu ELLE
   yazmaz. Bu bir kaynak taramasıdır — sınırı aşağıda ayrıca yazılıdır. */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CurrencySchema } from "@tezgah/shared";

const WEB_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function tumKaynaklar(): string[] {
  const out: string[] = [];
  const gez = (dir: string): void => {
    for (const e of readdirSync(dir)) {
      const p = path.join(dir, e);
      if (statSync(p).isDirectory()) gez(p);
      else if (/\.tsx?$/.test(e) && !e.includes(".test.")) out.push(p);
    }
  };
  gez(WEB_SRC);
  return out;
}

/* TARAYICININ KENDİ KÖR NOKTASI — ilk yazımda ölçüldü ve düzeltildi:
   ölçüt "dosyada `currency` geçiyor VE `<option` var" idi. Bu, para birimini
   yalnız BİÇİMLENDİRMEK için okuyan `BulkPriceModal.tsx`'i de yakaladı —
   onun `<option>`ları kapsam/işlem/yuvarlama içindir, para birimi için değil.
   Yanlış pozitif, yanlış negatif kadar zararlıdır: nöbetçiyi gürültüye
   boğar ve bir gün "zaten hep kırmızı" diye susturulur. Ölçüt artık OLAYA
   bakar: `value=` ifadesi `currency` içeren bir `<select>`. */

/** Para birimi SEÇEN dosyalar: value'su currency'e bağlı bir <select> taşıyanlar. */
function paraBirimiSecenler(): string[] {
  return tumKaynaklar().filter((p) => {
    const s = readFileSync(p, "utf8");
    return [...s.matchAll(/<select\b[^>]*>/g)].some((m) => /value=\{[^}]*currency/i.test(m[0]));
  });
}

describe("para birimi seçicileri", () => {
  it("ÖN-KOŞUL: seçici gerçekten VAR (tarayıcı boşa çalışmıyor)", () => {
    /* Bu satır olmadan aşağıdaki "elle liste yok" iddiası, hiçbir dosya
       bulamayan bozuk bir tarayıcıyla da yeşil kalırdı. */
    const secenler = paraBirimiSecenler().map((p) => path.basename(p));
    expect(secenler).toContain("ClientDetailPage.tsx");
    expect(secenler).toContain("SiparisPage.tsx");
  });

  it("HİÇBİR seçici para birimi kodunu ELLE <option> olarak yazmaz", () => {
    const kacan: string[] = [];
    for (const p of paraBirimiSecenler()) {
      const s = readFileSync(p, "utf8");
      for (const kod of CurrencySchema.options) {
        if (new RegExp(`<option[^>]*value=["']${kod}["']`).test(s)) {
          kacan.push(`${path.basename(p)} → ${kod}`);
        }
      }
    }
    expect(
      kacan,
      "Bu ekran(lar) para birimi kümesini ELLE tekrar ediyor: shared enum'a " +
        "eklenen bir üye burada görünmez ve hiçbir kapı kırmızıya dönmez " +
        "(K-1/D, TL bu yüzden yoktu). PARA_BIRIMI_SECENEKLERI'ni map'leyin.",
    ).toEqual([]);
  });

  it("HER seçici ilanı OKUR", () => {
    for (const p of paraBirimiSecenler()) {
      expect(readFileSync(p, "utf8"), path.basename(p)).toContain("PARA_BIRIMI_SECENEKLERI");
    }
  });

  it("WEB'İN KENDİ para birimi kümesi YOK — tek kaynak shared", () => {
    /* Ölçülen üçüncü kopya: `export type Currency = "EUR" | "CHF"`. */
    const kacan = tumKaynaklar().filter((p) =>
      /type\s+Currency\s*=\s*["'][A-Z]{3}["']\s*\|/.test(readFileSync(p, "utf8")),
    );
    expect(kacan.map((p) => path.basename(p))).toEqual([]);
  });

  it("SINIRIN DÜRÜST KAYDI: tarama METNİ görür, ÇALIŞAN listeyi değil", () => {
    /* Kaynak taraması `PARA_BIRIMI_SECENEKLERI`'nin yazılı olduğunu kanıtlar,
       doğru map'lendiğini değil. Çalışan listeyi çakan şey bileşen testleridir;
       bu satır nöbetçinin ne kadar söz verdiğini yazılı tutar. */
    expect(paraBirimiSecenler().length).toBeGreaterThan(0);
  });
});
