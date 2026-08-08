/* ÖLÜ İSTEMCİ ÜYESİ NÖBETÇİSİ — "ölü sözleşme yasak" kuralının MEKANİK hâli.

   NEDEN VAR: bu kural repoda yazılıydı ama elle uygulanıyordu ve üç ayrı
   pakette aynı sınıf ihlal bulundu (2026-08-06): `projectExports` uç+istemci
   vardı ekran okumuyordu · `digitalMenuHistory` aynısı · `deleteAsset`/
   `deleteFont` ise ekranların api istemcisini ATLAYIP ham fetch yazması
   yüzünden ölüydü. Üçüncüsünde desen açıktı: tek seferlik temizlik yetmez,
   kural NÖBETÇİYE bağlanmalı.

   NE ÖLÇER: `api` nesnesinin her üyesinin, api.ts DIŞINDA ve TEST DIŞINDA en
   az bir çağıranı olduğunu. Test dosyalarındaki `vi.fn()` mock'ları çağıran
   SAYILMAZ — sayılsaydı nöbetçi, kendisini mock'layan bir testle susturulabilir
   ve tam da yakalaması gereken şeyi kaçırırdı.

   KAYNAK OKUMASI: bu test diskten okur (üretim kodu okumaz). Tercih bilinçli —
   "kim kimi çağırıyor" sorusunun cevabı çalışma zamanında değil kaynakta
   yaşar; runtime refleksiyonu ölü kodu ölü olduğu için zaten göremezdi. */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const API_DOSYA = path.join(SRC, "api.ts");

/** src altındaki tüm .ts/.tsx dosyaları (api.ts ve testler hariç) */
function uretimDosyalari(dizin = SRC): string[] {
  const cikti: string[] = [];
  for (const girdi of readdirSync(dizin, { withFileTypes: true })) {
    const tam = path.join(dizin, girdi.name);
    if (girdi.isDirectory()) {
      cikti.push(...uretimDosyalari(tam));
      continue;
    }
    if (!/\.tsx?$/.test(girdi.name)) continue;
    if (girdi.name.includes(".test.")) continue; // mock'lar çağıran değildir
    if (tam === API_DOSYA) continue; // tanımın kendisi
    cikti.push(tam);
  }
  return cikti;
}

/** api nesnesinin üye adları.

    `async` ÖNEKİ AYRICA KARŞILANIR ve bu bir düzeltmedir: ilk yazımda desen
    `ad:\s*[(<]` idi ve `uploadFont: async (…)` gibi üyeleri KAÇIRIYORDU —
    nöbetçi, ölü olan `uploadFont`'u göremeden yeşil verdi. Ölçüm aracının
    kendi kör noktası, ölçtüğü kusurdan daha tehlikelidir (sessiz güvence);
    aşağıdaki ön-koşul testi bu yüzden sayı değil BİLİNEN ÜYE arar. */
function apiUyeleri(): string[] {
  const metin = readFileSync(API_DOSYA, "utf8");
  const adlar = [...metin.matchAll(/^ {2}([a-zA-Z][a-zA-Z0-9_]*):\s*(?:async\s*)?[(<]/gm)].map(
    (m) => m[1]!,
  );
  return [...new Set(adlar)];
}

describe("api istemcisi — ölü üye yok", () => {
  const uyeler = apiUyeleri();
  const kaynak = uretimDosyalari()
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");

  it("nöbetçinin KENDİSİ çalışıyor (ön-koşul: üye ve kaynak bulundu)", () => {
    /* Regex bir gün tutmazsa uyeler boşalır ve aşağıdaki test HİÇBİR ŞEY
       ölçmeden yeşil kalırdı — sahte-yeşil bu satırla engellenir. */
    expect(uyeler.length).toBeGreaterThan(50);
    expect(kaynak.length).toBeGreaterThan(10_000);
    expect(uyeler).toContain("clients"); // düz ok-fonksiyon üyesi
    /* ASYNC üye — desenin kör noktası tam buradaydı, ön-koşul onu çivi ler. */
    expect(uyeler).toContain("uploadFont");
  });

  it("HER ÜYENİN üretimde en az bir çağıranı var", () => {
    const olu = uyeler.filter((u) => !new RegExp(`api\\.${u}\\b`).test(kaynak));
    expect(
      olu,
      `Ölü istemci üyesi: ${olu.join(", ")} — ya bir ekran onu OKUSUN ya da üye ` +
        "KALDIRILSIN. Üçüncü bir yol (ham fetch ile atlamak) bu nöbetçinin " +
        "doğuş sebebidir: atlanan üye ölü görünür, atlayan kod da http()'nin " +
        "hata gerekçesini kaybeder.",
    ).toEqual([]);
  });

  it("HAM FETCH ile /api çağrısı YOK — istemci atlanmaz", () => {
    /* Atlamanın ölçülmüş bedeli: ClientDetailPage'in ham asset silme çağrısı
       `res.ok` de 409 da olmayan her durumu SESSİZCE yutuyordu. */
    const atlamalar = uretimDosyalari().filter((f) =>
      /fetch\(\s*[`"']\/api\//.test(readFileSync(f, "utf8")),
    );
    expect(
      atlamalar.map((f) => path.relative(SRC, f)),
      "Bu dosyalar api istemcisini atlıyor; http() hata gerekçesini ve yapısal " +
        "gövdeyi (usages/missing) kaybederler.",
    ).toEqual([]);
  });
});
