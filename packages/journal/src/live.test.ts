/* CANLI OKUMA testleri (Canonical 11.3 canlı okuma istisnası).

   Ağırlık SAF ÇÖZÜCÜLERDEDİR: ham git çıktısı → değer dönüşümü sabit girdiyle
   sınanır. Canlı depoya karşı koşan iki test vardır ve ikisi de SALT-OKUNURDUR
   (rev-parse · status --porcelain); depoyu kirletmezler.

   İDDİANIN YÖNÜ ÖNEMLİ: her olumlu iddianın yanında bir NEGATİF kontrol var.
   "Geçerli çıktı değer üretir" tek başına, çözücü hiçbir şey doğrulamasa da
   yeşil kalırdı; asıl kilit "bozuk çıktı null üretir"dir — 11.3'ün uydurma
   yasağı ancak orada ölçülür. */

import { describe, expect, it } from "vitest";

import {
  AYRIK_HEAD,
  GIT_DURUM_KOMUTU,
  dalAdi,
  gitCalistir,
  gitDurumu,
  gitDurumuCoz,
  headSha,
  porcelainSayisi,
} from "./live.js";

const SHA = "d46b877bcce542a7442ddc2b0dfae2415a7989bc";
const ISO_UTC_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/* ── dalAdi ───────────────────────────────────────────────────────────── */

describe("dalAdi", () => {
  it("dal adını satır sonundan arındırarak döner", () => {
    expect(dalAdi("main\n")).toBe("main");
    expect(dalAdi("feature/cockpit-p1-readonly\n")).toBe("feature/cockpit-p1-readonly");
  });

  it("ayrık HEAD dal adı GİBİ gösterilmez", () => {
    /* Ham çıktı "HEAD"tir; olduğu gibi taşınsaydı ekranda HEAD adlı bir dal
       varmış gibi okunurdu. Git böyle bir dal açtırmaz, yani iddia yalan olurdu. */
    expect(dalAdi("HEAD\n")).toBe(AYRIK_HEAD);
    expect(AYRIK_HEAD).not.toBe("HEAD");
  });

  it("boş çıktı null — uydurma dal adı yok", () => {
    expect(dalAdi("")).toBeNull();
    expect(dalAdi("   \n")).toBeNull();
  });
});

/* ── headSha ──────────────────────────────────────────────────────────── */

describe("headSha", () => {
  it("40 hanelik sha'yı geçirir", () => {
    expect(headSha(`${SHA}\n`)).toBe(SHA);
  });

  it("KISALTILMIŞ sha null — commit gibi duran yarım dizge ekrana çıkmaz", () => {
    expect(headSha("d46b877\n")).toBeNull();
    expect(headSha(`${SHA}a\n`)).toBeNull();
  });

  it("hex olmayan ya da büyük harfli çıktı null", () => {
    expect(headSha("zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz\n")).toBeNull();
    expect(headSha(`${SHA.toUpperCase()}\n`)).toBeNull();
    expect(headSha("fatal: bad revision\n")).toBeNull();
  });
});

/* ── porcelainSayisi ──────────────────────────────────────────────────── */

describe("porcelainSayisi", () => {
  it("boş çıktı 0'dır — temiz çalışma ağacı", () => {
    expect(porcelainSayisi("")).toBe(0);
    expect(porcelainSayisi("\n")).toBe(0);
  });

  it("satırları sayar, sondaki newline fazladan satır saydırmaz", () => {
    expect(porcelainSayisi("?? a.ts\n?? b.ts\n")).toBe(2);
  });

  it("BOŞLUKLA BAŞLAYAN satır sayılır (` M dosya` porcelain'in normal biçimidir)", () => {
    /* En sık görülen sınıf budur: indekslenmemiş değişiklik. Satır kırpılıp
       elenirse çalışma ağacı temiz görünürdü. */
    const cikti = " M packages/journal/src/plan.ts\nA  packages/journal/src/live.ts\n?? not.txt\n";
    expect(porcelainSayisi(cikti)).toBe(3);
  });

  it("CRLF satır sonları satır sayısını ikiye katlamaz", () => {
    expect(porcelainSayisi("?? a.ts\r\n?? b.ts\r\n")).toBe(2);
  });
});

/* ── gitDurumuCoz ─────────────────────────────────────────────────────── */

describe("gitDurumuCoz", () => {
  it("üç geçerli çıktıdan durum üretir; temiz=degisen===0", () => {
    const d = gitDurumuCoz("main\n", `${SHA}\n`, "");
    expect(d).toEqual({ dal: "main", head: SHA, temiz: true, degisen: 0 });
  });

  it("değişen dosya varsa temiz FALSE olur", () => {
    const d = gitDurumuCoz("main\n", `${SHA}\n`, " M a.ts\n?? b.ts\n");
    expect(d?.degisen).toBe(2);
    expect(d?.temiz).toBe(false);
  });

  it("head çözülemezse TÜM okuma null — kısmi/uydurma değer yok", () => {
    expect(gitDurumuCoz("main\n", "fatal: bad object\n", "")).toBeNull();
  });

  it("dal çözülemezse TÜM okuma null", () => {
    expect(gitDurumuCoz("", `${SHA}\n`, "")).toBeNull();
  });
});

/* ── gitCalistir (canlı, salt-okunur) ─────────────────────────────────── */

describe("gitCalistir — başarısızlık DEĞER olarak döner", () => {
  it("var olmayan ref'te ok:false ve git'in kendi mesajı", () => {
    const r = gitCalistir(["rev-parse", "--verify", "refs/heads/yok-boyle-bir-dal-9x"]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message.length).toBeGreaterThan(0);
  });

  it("geçerli komutta ok:true ve çıktı", () => {
    const r = gitCalistir(["rev-parse", "HEAD"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.out.trim()).toMatch(/^[0-9a-f]{40}$/);
  });
});

/* ── gitDurumu (canlı, salt-okunur) ───────────────────────────────────── */

describe("gitDurumu — canlı okuma sözleşmesi", () => {
  /* TEK okuma, çok iddia: her `it` kendi turunu koşsaydı üç git süreci
     çarpılırdı. Ölçüldü — bu iki dosya birlikte ~38 süreç açıyordu ve tüm
     paket koşumunda vitest işçi RPC'si "Timeout calling onTaskUpdate" ile
     düşüyor, testler geçtiği hâlde koşum exit 1 dönüyordu. */
  const once = new Date().toISOString();
  const c = gitDurumu();
  const sonra = new Date().toISOString();

  it("sınıf canli'dir; okundu ve komut ZORUNLU alanları doludur", () => {
    /* Bu depoda git vardır; null dönerse sözleşme değil ortam bozuktur. */
    expect(c).not.toBeNull();
    if (c === null) return;

    expect(c.sinif).toBe("canli");
    expect(c.okundu).toMatch(ISO_UTC_MS);
    expect(c.komut).toBe(GIT_DURUM_KOMUTU);
    expect(c.komut).toContain("git status --porcelain");

    /* Damga okumadan ÖNCE alınır: gösterilen an veriden taze olamaz. */
    expect(c.okundu >= once).toBe(true);
    expect(c.okundu <= sonra).toBe(true);
  });

  it("değer gerçek depodan gelir ve kendi içinde tutarlıdır", () => {
    expect(c).not.toBeNull();
    if (c === null) return;

    expect(c.deger.head).toMatch(/^[0-9a-f]{40}$/);
    expect(c.deger.dal.length).toBeGreaterThan(0);
    expect(c.deger.degisen).toBeGreaterThanOrEqual(0);
    expect(c.deger.temiz).toBe(c.deger.degisen === 0);
  });

  it("git ÇAĞRILAMAZSA null döner — yer tutucu değer üretilmez", () => {
    /* PATH boşaltılınca execFileSync("git") ENOENT verir (ölçüldü). Bu, dış
       sistemin yokluğunun tek gerçekçi simülasyonudur; mock'lanan bir git
       sarmalayıcısı, sarmalayıcının kendi hata yolunu sınamazdı. */
    const eski = process.env.PATH;
    try {
      process.env.PATH = "";
      expect(gitDurumu()).toBeNull();
    } finally {
      process.env.PATH = eski;
    }
    /* Ortam geri geldi mi? Gelmediyse sonraki testler yanlış sebeple kırılır. */
    expect(gitDurumu()).not.toBeNull();
  });
});
