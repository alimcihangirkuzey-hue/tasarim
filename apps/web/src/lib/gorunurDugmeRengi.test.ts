/* NÖBETÇİ — SAYDAM ZEMİNLİ DÜĞME RENGİNİ İLAN ETMELİ.

   ÖLÇÜLEN YARA (2026-08-06, canlı turda gerçek tarayıcıda): "Bu iş ne?"
   rehberinin kartları `background: "transparent"` yazıyor ama `color`
   YAZMIYORDU. Global kural `button { background: var(--c-primary); color: #fff }`
   olduğu için kart BEYAZ ZEMİNDE BEYAZ YAZI kalıyordu.

   ÖLÇÜM (getComputedStyle, Chromium): başlık span'inin rengi
   `rgb(255, 255, 255)`, kart zemini `rgba(0, 0, 0, 0)`. Açıklama satırı
   görünüyordu çünkü onun kendi `.muted` rengi var — yani ekran YARI görünür
   haldeydi ve tam da bu yüzden kimse fark etmemişti.

   SONUCU: operatör belge açarken gördüğü İLK ekranda seçeneklerin
   BAŞLIKLARINI göremiyor, yalnız açıklamaları görüyordu; "hangisi flyer?"
   sorusunu ekrandan cevaplayamıyordu. (Bu tur bunu canlı olarak yaşadı:
   otomatik tık yanlış şablonu açtı.)

   NİYE JSDOM TESTLERİ YAKALAMADI: `DocumentsPanel.rehber.test.tsx` metnin
   DOM'da OLDUĞUNU ölçer (`findByText`) — ve metin DOM'daydı. Görünürlük bir
   CSS sorusudur ve jsdom stil hesaplamaz. Bu yüzden nöbetçi KAYNAK düzeyinde
   ölçer: saydam zemin ilan eden bir düğme, rengini de ilan etmelidir. */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEB_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function tumKaynaklar(): string[] {
  const out: string[] = [];
  const gez = (dir: string): void => {
    for (const e of readdirSync(dir)) {
      const p = path.join(dir, e);
      if (statSync(p).isDirectory()) gez(p);
      else if (/\.tsx$/.test(e) && !e.includes(".test.")) out.push(p);
    }
  };
  gez(WEB_SRC);
  return out;
}

/** `<button ...>` açılış etiketleri (özniteliklerin tamamı). */
function dugmeEtiketleri(kaynak: string): string[] {
  return [...kaynak.matchAll(/<button\b[\s\S]*?>/g)].map((m) => m[0]);
}

describe("saydam zeminli düğme", () => {
  it("ÖN-KOŞUL: global kural düğmeyi BEYAZ yazıyor — risk gerçek", () => {
    /* Bu satır olmadan aşağıdaki iddia, düğmelerin zaten koyu yazıldığı bir
       temada hiçbir şey ayırt etmeden yeşil kalırdı. */
    const css = readFileSync(path.join(WEB_SRC, "styles.css"), "utf8");
    expect(css).toMatch(/button\s*\{[^}]*color:\s*#fff/);
    /* Ve reponun hazır çözümü de gerçekten var. */
    expect(css).toMatch(/button\.ghost\s*\{[^}]*color:\s*var\(--c-ink\)/);
  });

  it("ÖN-KOŞUL: tarayıcı gerçekten düğme buluyor", () => {
    const toplam = tumKaynaklar().reduce((n, p) => n + dugmeEtiketleri(readFileSync(p, "utf8")).length, 0);
    expect(toplam).toBeGreaterThan(10);
  });

  it("SAYDAM zemin ilan eden düğme RENGİNİ de ilan eder", () => {
    const kacan: string[] = [];
    for (const p of tumKaynaklar()) {
      for (const etiket of dugmeEtiketleri(readFileSync(p, "utf8"))) {
        const saydam = /background:\s*["']?transparent/.test(etiket);
        if (!saydam) continue;
        /* Renk ya satır içinde ya da renk veren bir sınıfla gelir. */
        const renkVar = /\bcolor:/.test(etiket) || /className=["'][^"']*\b(ghost|danger|ghost-link)\b/.test(etiket);
        if (!renkVar) kacan.push(`${path.relative(WEB_SRC, p)}: ${etiket.replace(/\s+/g, " ").slice(0, 90)}`);
      }
    }
    expect(
      kacan,
      "Bu düğme(ler) saydam zemin ilan ediyor ama rengini ilan etmiyor: global " +
        "`button { color: #fff }` yüzünden BEYAZ ZEMİNDE BEYAZ YAZI olur. " +
        "`className=\"ghost\"` kullanın ya da rengi satır içinde yazın.",
    ).toEqual([]);
  });

  it("SINIRIN DÜRÜST KAYDI: bu tarama KAYNAĞI ölçer, PİKSELİ değil", () => {
    /* Renk bir sınıftan/temadan da gelebilir ve bu tarama onu doğru sayar;
       ama gerçek kontrastı ölçmez. Kontrast ölçümü canlı tarayıcı işidir
       (bu yara da orada bulundu). Nöbetçi yalnız BU sınıf hatanın tekrarını
       kapatır: "saydam dedim, rengi söylemedim". */
    expect(tumKaynaklar().length).toBeGreaterThan(5);
  });
});
