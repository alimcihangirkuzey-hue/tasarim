/* ÇIKTI TÜRÜ ETİKETLERİ — ilan × sözlük eşleşmesi.

   ÖLÇÜLEN YARA: editör geçmişi çıktıları `r.kind === "print" ? "print" :
   "preview"` diye etiketliyordu — yani print DIŞINDAKİ HER TÜR "preview"
   görünüyordu: nakış, kesim, PNG, CMYK, dijital menü ve (bu turda doğan) nakış
   fişi. Oysa `orders.out_*` sözlüğü on iki türün TAMAMINI taşıyor ve Projeler
   sekmesi zaten onu okuyor. İki liste aynı çıktıya iki farklı ad veriyordu.

   BU DOSYA SÖZLÜĞÜ İLANA BAĞLAR: yeni bir çıktı türü ilan edildiği gün etiketi
   yoksa `t()` ham anahtarı basar ("orders.out_xyz") — operatöre teknik bir
   anahtar göstermek, sessizce yanlış ad göstermekten yalnız biraz iyidir. */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import tr from "../i18n/tr.json";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** ExportRecordDTO["kind"] ilanı — şemadan okunur, elle yazılmaz. */
function ilanEdilenTurler(): string[] {
  const semalar = readFileSync(
    path.resolve(SRC, "../../../packages/shared/src/schemas.ts"),
    "utf8",
  );
  const m = /kind: ("[a-z_]+"(?: \| "[a-z_]+")+);/.exec(semalar);
  if (!m) throw new Error("kind ilanı bulunamadı — desen bayatlamış");
  return [...m[1]!.matchAll(/"([a-z_]+)"/g)].map((x) => x[1]!);
}

const cikti = tr.orders as Record<string, string>;

describe("çıktı türü etiketleri", () => {
  it("ÖN-KOŞUL: ilan okundu ve sözlük dolu", () => {
    /* Biri boşalırsa aşağıdaki iddia hiçbir şey ölçmeden yeşil kalırdı. */
    expect(ilanEdilenTurler().length).toBeGreaterThanOrEqual(12);
    expect(Object.keys(cikti).filter((k) => k.startsWith("out_")).length).toBeGreaterThanOrEqual(12);
  });

  it("HER ilan edilen türün ETİKETİ var", () => {
    const etiketsiz = ilanEdilenTurler().filter((t) => !cikti[`out_${t}`]);
    expect(
      etiketsiz,
      `Etiketsiz çıktı türü: ${etiketsiz.join(", ")} — operatöre ham anahtar ` +
        '("orders.out_…") gösterilir. tr.json orders.out_* sözlüğüne ekleyin.',
    ).toEqual([]);
  });

  it("SÖZLÜKTE İLANSIZ etiket YOK (ölü etiket)", () => {
    /* Ters yön: kaldırılan bir tür etiketi geride bırakırsa sözlük, olmayan bir
       çıktıyı varmış gibi tarif eder. */
    const ilan = new Set(ilanEdilenTurler());
    const olu = Object.keys(cikti)
      .filter((k) => k.startsWith("out_"))
      .map((k) => k.slice(4))
      .filter((t) => !ilan.has(t));
    expect(olu, `Ölü etiket: ${olu.join(", ")} — karşılığı olan tür ilan edilmiyor.`).toEqual([]);
  });

  it("NAKIŞ ve NAKIŞ FİŞİ ayrı adlar taşır (bu turda doğan tür)", () => {
    expect(cikti["out_broderie"]).toBeTruthy();
    expect(cikti["out_broderie_fiche"]).toBeTruthy();
    expect(cikti["out_broderie"]).not.toBe(cikti["out_broderie_fiche"]);
  });
});
