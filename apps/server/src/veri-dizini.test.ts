/* VERİ DİZİNİ KURULUM İLANI (K-1/C).

   ÖLÇÜLEN YARA (index.ts'in gerçek sırasıyla koşturuldu — migrate() → buildApp):
   `TEZGAH_DATA_DIR=<bir harf yanlış>` ile boot BAŞARILI, /api/health 200,
   /api/clients 200 `[]`. Kurulum kusursuz sağlıklı görünüyor ve operatörün
   gördüğü tek şey bütün müşterilerinin yok olmuş olması.

   Bu dosya kuralların BİÇİM yarısını çivili tutar. Yaranın kapatılamayan
   yarısı (biçimi doğru ama yanlış yazılmış mutlak yol) aşağıda AÇIKÇA
   ölçülür ve "yakalanmıyor" olarak yazılır — sessizce geçilmez. */

import { afterEach, describe, expect, it } from "vitest";
import path from "node:path";
import { VERI_DIZINI_ENV, veriDiziniIlani } from "./veri-dizini.js";

const VARSAYILAN = path.join("/repo", "data");

afterEach(() => {
  delete process.env[VERI_DIZINI_ENV];
});

describe("veri dizini ilanı", () => {
  it("ÖN-KOŞUL: ortam gerçekten boş — varsayılan yol ölçülüyor", () => {
    /* Bu satır olmadan aşağıdaki "varsayılan döner" iddiası, ortamda kalmış
       bir değerle sessizce başka bir şeyi ölçebilirdi. */
    expect(process.env[VERI_DIZINI_ENV]).toBeUndefined();
  });

  it("İLAN EDİLMEMİŞSE bugünkü varsayılan BİREBİR döner", () => {
    expect(veriDiziniIlani(VARSAYILAN)).toBe(VARSAYILAN);
  });

  it("MUTLAK yol HAM haliyle döner — normalize EDİLMEZ", () => {
    /* Normalize etmek `path.join(DATA_DIR, …)` çıktılarını değiştirebilirdi;
       bu katman doğrular, dönüştürmez. */
    const yol = path.join("/srv", "tezgah", "kiraci-a");
    process.env[VERI_DIZINI_ENV] = yol;
    expect(veriDiziniIlani(VARSAYILAN)).toBe(yol);
  });

  it("BOŞ değer REDDEDİLİR — sessizce varsayılana DÜŞMEZ", () => {
    /* Bugünkü `?? varsayilan` boş dizeyi nullish saymaz: DATA_DIR="" olur ve
       path.join("", "app.db") = "app.db" — veritabanı çalışma dizinine düşer.
       Varsayılana düşürmek de yanlış olurdu: kurulumcu bir şey İLAN ETTİ. */
    process.env[VERI_DIZINI_ENV] = "";
    expect(() => veriDiziniIlani(VARSAYILAN)).toThrow(/boş/);
    process.env[VERI_DIZINI_ENV] = "   ";
    expect(() => veriDiziniIlani(VARSAYILAN)).toThrow(/boş/);
  });

  it("GÖRELİ yol REDDEDİLİR", () => {
    for (const yol of ["veri", "./veri", "../veri", "data/kiraci"]) {
      process.env[VERI_DIZINI_ENV] = yol;
      expect(() => veriDiziniIlani(VARSAYILAN), yol).toThrow(/mutlak yol/);
    }
  });

  it("SATIR SONU REDDEDİLİR (kopyala-yapıştır kazası)", () => {
    process.env[VERI_DIZINI_ENV] = "/srv/tezgah\n";
    expect(() => veriDiziniIlani(VARSAYILAN)).toThrow(/satır sonu/);
  });

  it("HATA MESAJI verilen değeri SÖYLER — kurulumcu neyi düzelteceğini bilir", () => {
    process.env[VERI_DIZINI_ENV] = "veri";
    expect(() => veriDiziniIlani(VARSAYILAN)).toThrow(/"veri"/);
  });

  it("DENETİM YOLUN TÜRETİLDİĞİ YERDE — bozuk yol DİZİN OLUŞTURAMADAN patlar", async () => {
    /* Sıra bir DAVRANIŞ iddiasıdır, yorum değil: `db.ts` `paths.js`'i import
       ederken `ensureDirs()` koşar. Denetim yalnız açılışa (buildApp) bırakılsaydı
       bozuk yol ÇOKTAN oluşturulmuş olurdu. Bunu ayrı bir süreçte ölçüyoruz —
       paths.js bu test sürecinde zaten yüklü ve modül gövdesi bir daha koşmaz. */
    const { execFileSync } = await import("node:child_process");
    const kok = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
    const cikti = execFileSync(
      process.execPath,
      ["--import", "tsx", "-e", 'import("./src/paths.js").then(()=>console.log("YUKLENDI"),(e)=>console.log("PATLADI:"+e.message))'],
      { cwd: kok, env: { ...process.env, [VERI_DIZINI_ENV]: "gecersiz-goreli-yol" }, encoding: "utf8" },
    );
    expect(cikti).toMatch(/PATLADI:.*mutlak yol/);
    expect(cikti, "modül yüklendi — bozuk yol ensureDirs'e ulaşırdı").not.toMatch(/YUKLENDI/);
  });

  it("KAPATILAMAYAN YARI: biçimi doğru ama YANLIŞ YAZILMIŞ yol GEÇER", () => {
    /* Bu test bir güvence değil, DÜRÜST BİR SINIR kaydıdır. Ölçülen asıl
       senaryo buydu ve bu katman onu yakalamaz: "boş veri dizini" ile "ilk
       açılış" ancak bir ÜRÜN KARARIYLA ayrılır (boş veriyle açılan kurulum
       durmalı mı, uyarmalı mı?). Karar geldiği gün bu test değişir ve o gün
       kimse sınırın var olduğunu hatırlamak zorunda kalmaz. */
    const yanlisYazilmis = path.join("/srv", "tezgah", "kiraci-aa");
    process.env[VERI_DIZINI_ENV] = yanlisYazilmis;
    expect(veriDiziniIlani(VARSAYILAN)).toBe(yanlisYazilmis);
  });
});
