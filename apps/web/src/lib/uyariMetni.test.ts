/* OPERATÖRE GÖRÜNEN UYARI METNİ — TEK KAYNAK NÖBETÇİSİ (K-1/B).

   ÖLÇÜLEN YARA: tablo `EditorPage.tsx` içinde dosya-yereldi. Toplu dışa
   aktarım engellenen kalemin gerekçesini söylemeye başlayınca ikinci bir
   etiketleme yazmak gerekiyordu — aynı uyarı kümesi iki yerde, iki ifadeyle.
   Bu repo o bedeli defalarca ödedi (yapıştır önizlemesi · sipariş türü
   seçicileri · para birimi listesi): ikinci kopya önce sessizce eskir, sonra
   iki ekran aynı belge için farklı şey söyler. */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { LayoutWarning } from "@tezgah/templates";
import { uyariMetni } from "./uyariMetni";

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

describe("uyarı metni", () => {
  it("ÖN-KOŞUL: metin gerçekten üretiliyor (tarayıcı boşa çalışmıyor)", () => {
    expect(uyariMetni({ type: "empty-required", slotId: "logo" } as LayoutWarning).length).toBeGreaterThan(0);
  });

  it("TÜR BAŞINA metin üretir — boş dize dönmez", () => {
    const ornekler: LayoutWarning[] = [
      { type: "overflow-items", count: 3 },
      { type: "empty-required", slotId: "logo" },
      { type: "qr-contrast" },
      { type: "min-font" },
    ] as unknown as LayoutWarning[];
    for (const w of ornekler) {
      expect(uyariMetni(w), w.type).not.toBe("");
    }
  });

  it("İKİNCİ BİR ETİKETLEME TABLOSU YOK — `switch (w.type)` tek yerde", () => {
    /* Nöbetçinin ölçtüğü şey: LayoutWarning türleri üzerinde dallanan başka
       bir switch, kütüphane dışında yaşamamalı. */
    const kacan = tumKaynaklar().filter((p) => {
      if (path.basename(p) === "uyariMetni.ts") return false;
      const s = readFileSync(p, "utf8");
      return /switch\s*\(\s*w\.type\s*\)/.test(s);
    });
    expect(
      kacan.map((p) => path.relative(WEB_SRC, p)),
      "Uyarı metni ikinci kez etiketleniyor: iki ekran aynı belge için farklı " +
        "şey söyleyebilir (K-1/B). lib/uyariMetni.ts'i kullanın.",
    ).toEqual([]);
  });

  it("İKİ TÜKETİCİ de kütüphaneyi OKUR — editör ve sipariş defteri", () => {
    const oku = (rel: string) => readFileSync(path.join(WEB_SRC, rel), "utf8");
    expect(oku("pages/EditorPage.tsx")).toContain("lib/uyariMetni");
    expect(oku("components/ProjectsPanel.tsx")).toContain("lib/uyariMetni");
  });
});
