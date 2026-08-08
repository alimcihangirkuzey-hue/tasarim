/* HEAD İÇERİKLERİ TEK ALT SÜREÇTE — B2'nin girdisi (TODO borcu: denetim
   maliyeti paket sayısıyla doğrusal büyüyor).

   ÖLÇÜLEN YARA (tahmin değil, PATH'e sayaç `git` konarak sayıldı):
     verifyAllJournals → 308 git alt süreci, ~3,9 s
     115 diff · 96 log · 95 SHOW · 2 ön denetim
   Yani alt süreçlerin yaklaşık üçte biri, tek bir `cat-file --batch` ile
   alınabilecek blob okumasıydı. Ve bu denetim `npm test`in HER koşumunda
   çalışıyor — R-FLAKY-TEST-01'in kök nedeni de bu sürenin vitest'in 5000 ms
   varsayılanına dayanmasıydı.

   NEDEN YALNIZ `show` TOPLANDI: `log` ve `diff` git'in geçmiş sadeleştirmesine
   ve merge commit'lerinin nasıl raporlandığına bağlıdır; tek taramaya çevirmek
   HANGİ commit çiftlerinin karşılaştırıldığını değiştirebilir — o bir
   yönetişim güvencesidir. `show` ise saf içerik okumasıdır. Ölçülmemiş bir
   eşdeğerlik iddiasıyla append-only kapısını gevşetmektense kazancın küçüğü
   alındı; kalanı açık bulgu olarak yazıldı.

   BU DOSYANIN EN ÖNEMLİ TESTİ SONDA: gerçek depoda `cat-file --batch`
   sonucu ile `git show HEAD:<yol>` baytları KARŞILAŞTIRILIR. Değişimin
   tamamı o eşdeğerlik iddiasına dayanıyor; iddia ölçülmeden yazılmaz. */

import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { ROOT_DIR } from "./paths.js";
import { headIcerikleriCoz } from "./verify.js";
import { listPackageIds } from "./store.js";
import { journalFile } from "./paths.js";
import path from "node:path";

/** `cat-file --batch` çıktısı: `<oid> blob <boyut>\n<gövde>\n` */
function kayit(oid: string, govde: Buffer | string): Buffer {
  const b = Buffer.isBuffer(govde) ? govde : Buffer.from(govde, "utf8");
  return Buffer.concat([Buffer.from(`${oid} blob ${b.length}\n`, "utf8"), b, Buffer.from("\n", "utf8")]);
}

describe("çözümleyici — biçim", () => {
  it("İKİ kayıt sırayla eşlenir", () => {
    const cikti = Buffer.concat([kayit("aaa", "bir\n"), kayit("bbb", "iki\n")]);
    const r = headIcerikleriCoz(cikti, ["a.jsonl", "b.jsonl"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.icerik.get("a.jsonl")!.toString("utf8")).toBe("bir\n");
    expect(r.icerik.get("b.jsonl")!.toString("utf8")).toBe("iki\n");
  });

  it("BOYUT'a göre kesilir — gövdedeki satır sonları içeriği bölmez", () => {
    /* Journal dosyaları satır satırdır; gövdeyi satır sonuna göre ayırmak
       ilk kayıttan sonra HER ŞEYİ kaydırırdı. Bayt sayısı esastır. */
    const govde = "bir\niki\nuc\n";
    const cikti = Buffer.concat([kayit("aaa", govde), kayit("bbb", "son\n")]);
    const r = headIcerikleriCoz(cikti, ["a.jsonl", "b.jsonl"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.icerik.get("a.jsonl")!.toString("utf8")).toBe(govde);
    expect(r.icerik.get("b.jsonl")!.toString("utf8")).toBe("son\n");
  });

  it("BOŞ dosya da eşlenir — 0 bayt bir içeriktir", () => {
    const r = headIcerikleriCoz(Buffer.concat([kayit("aaa", "")]), ["a.jsonl"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.icerik.get("a.jsonl")!.length).toBe(0);
  });
});

describe("eksik nesne SESSİZ GEÇMEZ", () => {
  it("'missing' satırı haritaya GİRMEZ — çağıran 'koşulamadı' yazar", () => {
    /* Boş Buffer'a eşlemek, HEAD'de olmayan dosyayı "HEAD boş" gibi
       gösterirdi ve B2 sahte biçimde geçerdi (bayt öneki her zaman tutar).
       Bu, tam olarak bu deponun fail-open sınıfıdır. */
    const cikti = Buffer.concat([
      Buffer.from("HEAD:yok.jsonl missing\n", "utf8"),
      kayit("bbb", "var\n"),
    ]);
    const r = headIcerikleriCoz(cikti, ["yok.jsonl", "b.jsonl"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.icerik.has("yok.jsonl")).toBe(false);
    expect(r.icerik.get("b.jsonl")!.toString("utf8")).toBe("var\n");
  });
});

describe("bozuk çıktı PATLAR — sahte sessizlik yok", () => {
  it("GÖVDE EKSİKSE hata döner", () => {
    const bozuk = Buffer.from("aaa blob 100\nkisa\n", "utf8");
    const r = headIcerikleriCoz(bozuk, ["a.jsonl"]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/gövdesi eksik/);
  });

  it("BAŞLIK çözümlenemezse hata döner", () => {
    const r = headIcerikleriCoz(Buffer.from("saçma satır\n", "utf8"), ["a.jsonl"]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/başlığı çözümlenemedi/);
  });

  it("ÇIKTI BİTTİYSE hata döner — eksik kayıt sessizce atlanmaz", () => {
    const r = headIcerikleriCoz(kayit("aaa", "bir\n"), ["a.jsonl", "b.jsonl"]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/beklenenden kısa/);
  });
});

describe("GERÇEK DEPO — toplu okuma `git show` ile BİREBİR", () => {
  it("üç gerçek journal dosyasında baytlar AYNI", () => {
    /* Bu testin taşıdığı iddia, değişimin TAMAMIDIR: 95 ayrı `git show`
       yerine tek `cat-file --batch` koşuluyor ve sonucun aynı olduğu
       BURADA ölçülüyor. Sentetik çözümleyici testleri biçimi kapatır;
       eşdeğerliği yalnız bu satır kapatır. */
    const idler = listPackageIds().slice(0, 3);
    expect(idler.length, "gerçek depoda journal yok — iddia ölçülemezdi").toBe(3);

    const yollar = idler.map((id) =>
      path.relative(ROOT_DIR, journalFile(id)).split(path.sep).join("/"),
    );
    const toplu = execFileSync("git", ["cat-file", "--batch"], {
      cwd: ROOT_DIR,
      input: yollar.map((y) => `HEAD:${y}`).join("\n") + "\n",
      maxBuffer: 64 * 1024 * 1024,
    });
    const r = headIcerikleriCoz(Buffer.isBuffer(toplu) ? toplu : Buffer.from(String(toplu)), yollar);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    for (const y of yollar) {
      const tek = execFileSync("git", ["show", `HEAD:${y}`], {
        cwd: ROOT_DIR,
        maxBuffer: 64 * 1024 * 1024,
      });
      const tekBuf = Buffer.isBuffer(tek) ? tek : Buffer.from(String(tek));
      const topluBuf = r.icerik.get(y);
      expect(topluBuf, `${y}: toplu okumada yok`).toBeTruthy();
      expect(topluBuf!.equals(tekBuf), `${y}: baytlar ayrışıyor`).toBe(true);
    }
  });
});
