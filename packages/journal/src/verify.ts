/* Cockpit modül fazı 0 — DÖRT KATMANLI DOĞRULAYICI (Canonical 11.3 değişmezlik).

   Journal'ın append-only olduğu bir DİLEK değil, ÖLÇÜLEN bir şeydir. Dört
   bağımsız katman ölçer; hiçbiri tek başına yetmez ve her biri diğerinin
   körlüğünü kapatır:

     kaynak — yazma yüzeyi tek kapıda mı? Kaynak koda üzerine-yazan bir çağrı
              sızmışsa, sonraki üç katman geçmişi doğru bulur ama gelecek
              kayıp olur. Yalnız bu katman ileriye bakar.
     git    — dosyanın TARİHÇESİ append-only mi? Satır silen bir commit'i
              yalnız bu katman görür (çalışma ağacındaki dosya tutarlı olabilir).
     yapi   — seq boşluksuz mu, ilk satır bildirim mi, aşama akışı tutarlı mı?
              Temiz bir "satırı çıkar ve zinciri yeniden hesapla" saldırısını
              YALNIZ boşluksuz seq yakalar; zincir o dosyayı sağlam bulur.
     zincir — satır içeriği düzenlenmiş mi? Bir satırın tek baytını değiştirmek
              seq'i bozmaz, git diff'e `1 1` görünür; yalnız hash zinciri kırılır.

   Katmanlar BİRBİRİNDEN YALITILMIŞTIR: biri patlarsa diğerleri koşar, ve
   patlayan katman SESSİZCE ATLANMAZ — kendi katmanında ihlal olarak raporlanır.
   Koşulmadığı belli olmayan bütünlük denetimi, 11.3'ün mahkûm ettiği
   "ölçülmemiş ama geçmiş görünen kapı"nın ta kendisidir.

   Kaçış bayrağı (--skip/--force) BİLEREK YOKTUR. */

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { verifyJournalChain, verifyJournalStructure, type JournalLine } from "@tezgah/shared";

import { sha256 } from "./hash.js";
import { ROOT_DIR, journalDir, journalFile } from "./paths.js";
import { listPackageIds, readJournal } from "./store.js";

export interface JournalViolation {
  package_id: string;
  layer: "kaynak" | "git" | "yapi" | "zincir";
  message: string;
}

/** Pakete değil DEPOYA ait ihlallerin sahibi (kaynak taraması, git yokluğu) */
export const JOURNAL_VIOLATION_REPO = "(depo)";

/* ── Katman A: kaynak taraması ────────────────────────────────────────── */

/* Aranan şey ADIN GEÇMESİ değil, ÇAĞRILMASIDIR: `\bad\s*\(`.
   Sebep ölçüldü — ilk sürüm düz ad araması yapıyordu ve gates.ts'in
   "fs.writeFileSync bilinçli KULLANILMAZ" diyen AÇIKLAMA SATIRINI ihlal
   sandı. Bir kuralı anlatan cümleyi kuralın ihlali saymak, doğrulayıcıyı
   kalıcı kırmızıda tutar; kırmızıda duran doğrulayıcı ise okunmaz olur.
   Aynı incelik bu dosyayı da kurtarır: aşağıdaki adlar burada birer STRING'dir,
   arkalarından `(` gelmez, bu yüzden verify.ts kendini ihlal olarak bildirmez
   ve yine de KENDİSİ de taranır (muafiyet verilmedi).

   KAPSAM ŞERHİ (kapı tanımlarındaki `scope` ile aynı dürüstlük): bu tarama
   ÇAĞRI BİÇİMİNİ görür. Takma ad üzerinden dolaşan bir yazma çağrısını
   (`const y = writeFileSync; y(...)`) GÖRMEZ; onu AST denetimi yakalardı.
   Kasıtlı gizlemeye karşı değil, kazara sızmaya karşı bir kapıdır. */
const YASAK_YAZMA: readonly { readonly ad: string; readonly izinliDosya: string | null }[] = [
  { ad: "writeFileSync", izinliDosya: null },
  { ad: "truncateSync", izinliDosya: null },
  { ad: "ftruncateSync", izinliDosya: null },
  { ad: "rmSync", izinliDosya: null },
  { ad: "createWriteStream", izinliDosya: null },
  /* .lock temizliği için TEK dosyada serbest; başka yerde ihlal */
  { ad: "unlinkSync", izinliDosya: "store.ts" },
];

/** Bu dosyanın kendi dizini = packages/journal/src (taranan yüzey) */
const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));

function tsDosyalari(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const tam = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...tsDosyalari(tam));
      continue;
    }
    if (!e.name.endsWith(".ts")) continue;
    /* Testler tarama dışı: fixture kurmak için yazma çağırırlar ve bu
       üretim yazma yüzeyi değildir. */
    if (e.name.endsWith(".test.ts")) continue;
    out.push(tam);
  }
  return out;
}

/**
 * SAF tarayıcı: bir dosyanın içeriğinde üzerine-yazan ÇAĞRI arar.
 *
 * DIŞARI AÇIK olmasının sebebi test edilebilirliktir ve bu bir konfor değil,
 * zorunluluktur: "kaynak ihlali yok" diyen bir test, tarama tümüyle ölmüş
 * olsa da (yanlış dizin, sessizce yutulan hata) yeşil kalırdı. Boş sonucun
 * bir anlamı olması için taramanın DOLU sonuç da üretebildiği ayrıca
 * sınanmalıdır — verify.test.ts bunu bu uçtan yapar.
 */
export function kaynakIcerigiTara(dosyaAdi: string, icerik: string): string[] {
  const bulgular: string[] = [];
  const satirlar = icerik.split(/\r?\n/);
  for (const { ad: desen, izinliDosya } of YASAK_YAZMA) {
    if (izinliDosya !== null && dosyaAdi === izinliDosya) continue;
    /* Sözcük sınırı ÖNDE: `truncateSync` deseni `ftruncateSync` çağrısıyla
       eşleşmesin — ikisi ayrı ayrı raporlanır. Sonda `\s*\(`: ad değil
       ÇAĞRI aranır (bkz. yukarıdaki kapsam şerhi). */
    const re = new RegExp(`\\b${desen}\\s*\\(`);
    satirlar.forEach((satir, i) => {
      if (re.test(satir)) {
        bulgular.push(
          `${dosyaAdi}:${i + 1} üzerine-yazan çağrı: ${desen} — journal append-only'dir` +
            (izinliDosya === null ? "" : ` (yalnız ${izinliDosya} içinde serbest)`)
        );
      }
    });
  }
  return bulgular;
}

function kaynakKatmani(ihlaller: JournalViolation[]): void {
  const ekle = (message: string): void => {
    ihlaller.push({ package_id: JOURNAL_VIOLATION_REPO, layer: "kaynak", message });
  };

  let dosyalar: string[];
  try {
    dosyalar = tsDosyalari(SRC_DIR);
  } catch (e) {
    ekle(`kaynak taraması koşulamadı: ${mesaj(e)}`);
    return;
  }
  /* Dizin bulunuyor ama hiç .ts yoksa tarama sessizce "temiz" demiş olurdu;
     bu, yanlış yola bakan bir taramanın tam olarak vereceği cevaptır. */
  if (dosyalar.length === 0) {
    ekle(`kaynak taraması koşulamadı: taranacak .ts dosyası bulunamadı (${SRC_DIR})`);
    return;
  }

  for (const dosya of dosyalar) {
    const ad = path.basename(dosya);
    let icerik: string;
    try {
      icerik = readFileSync(dosya, "utf8");
    } catch (e) {
      ekle(`${ad} okunamadı: ${mesaj(e)}`);
      continue;
    }
    for (const bulgu of kaynakIcerigiTara(ad, icerik)) ekle(bulgu);
  }
}

/* ── Katman B: git tarihçesi ──────────────────────────────────────────── */

type GitSonuc = { ok: true; out: Buffer } | { ok: false; message: string };

function git(args: readonly string[]): GitSonuc {
  try {
    const raw = execFileSync("git", [...args], {
      cwd: ROOT_DIR,
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, out: Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw), "utf8") };
  } catch (e) {
    return { ok: false, message: gitHatasi(e) };
  }
}

function gitHatasi(e: unknown): string {
  if (typeof e === "object" && e !== null) {
    const o = e as { stderr?: unknown; message?: unknown };
    if (o.stderr !== undefined && o.stderr !== null) {
      const s = Buffer.isBuffer(o.stderr) ? o.stderr.toString("utf8") : String(o.stderr);
      if (s.trim().length > 0) return s.trim();
    }
  }
  return mesaj(e);
}

/** HEAD sürümü çalışma ağacının bayt öneki mi? (append-only'nin B2 yargısı) */
export function baytOneki(onek: Buffer, tam: Buffer): boolean {
  if (onek.length > tam.length) return false;
  return tam.subarray(0, onek.length).equals(onek);
}

/**
 * `git diff --numstat` satırından SİLİNEN sütununu çözer.
 * Biçim: `<eklenen>\t<silinen>\t<yol>`; ikili dosyada iki sütun da `-`.
 *
 * Saf ve dışa açık: bu, append-only'nin B1 yargısını taşıyan karardır ve
 * uçtan uca git harness'ı olmadan pozitif olarak sınanabilmelidir.
 */
export function numstatSilinen(satir: string): number | { hata: string } {
  const alan = satir.split("\t");
  if (alan.length < 2) return { hata: `numstat çözümlenemedi: "${satir}"` };
  const silinen = alan[1];
  if (silinen === "-") return { hata: "numstat ikili dosya bildirdi" };
  const n = Number.parseInt(silinen, 10);
  if (!Number.isFinite(n) || !/^\d+$/.test(silinen.trim())) {
    return { hata: `numstat silinen sütunu sayı değil: "${silinen}"` };
  }
  return n;
}

/** Journal dizininin depo köküne göre git yolu; depo dışındaysa null. */
function journalGitOneki(): string | null {
  const rel = path.relative(ROOT_DIR, journalDir());
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join("/");
}

/**
 * GIT'İN BİLDİĞİ paket id'leri — çalışma ağacının DEĞİL.
 *
 * Bu numaralandırma olmadan bir journal dosyasını tamamen silmek dört katmanın
 * hiçbirine görünmüyordu: denetlenecek id listesi `listPackageIds()` ile
 * çalışma ağacından türetildiği için, dosya yoksa id listeye hiç girmiyor ve
 * git katmanı o paketi hiç sormuyordu. Ölçüldü: `git rm <journal>` + commit
 * sonrası `verify` "dört katman temiz" diyip exit 0 dönüyordu — üstelik
 * bütünlüğü main'e bağlayan `npm test` kapısı da yeşil kalıyordu (fail-open).
 * Kayıt düzenlemek anında yakalanırken SİLMEK görünmezdi; yani saldırganın
 * rasyonel hamlesi tam da savunmasız olanıydı.
 *
 * İKİ kaynak gerekir, biri yetmez:
 * · `ls-files`  — çalışma ağacından silinmiş ama HÂLÂ izlenen dosyayı görür
 *                 (`rm` / `mv`, henüz commit'lenmemiş).
 * · `--diff-filter=D` — `git rm` + commit sonrası dosya artık izlenmediği için
 *                 `ls-files` onu listelemez; silme TARİHÇESİ tek tanıktır.
 */
function gitIzlenenIdler(): { ok: true; ids: string[] } | { ok: false; message: string } {
  const onek = journalGitOneki();
  if (onek === null) return { ok: true, ids: [] }; // depo dışı: git ölçemez

  const idler = new Set<string>();
  const topla = (out: Buffer): void => {
    for (const satir of out.toString("utf8").split(/\r?\n/)) {
      const yol = satir.trim();
      if (yol.length === 0 || !yol.startsWith(`${onek}/`)) continue;
      const ad = yol.slice(onek.length + 1);
      if (ad.endsWith(".jsonl") && !ad.includes("/")) idler.add(ad.slice(0, -".jsonl".length));
    }
  };

  const izlenen = git(["ls-files", "--", `${onek}/*.jsonl`]);
  if (!izlenen.ok) return { ok: false, message: `git ls-files: ${izlenen.message}` };
  topla(izlenen.out);

  const silinen = git(["log", "--diff-filter=D", "--format=", "--name-only", "--", onek]);
  if (!silinen.ok) return { ok: false, message: `git log --diff-filter=D: ${silinen.message}` };
  topla(silinen.out);

  return { ok: true, ids: [...idler] };
}

function gitKatmani(ids: readonly string[], ihlaller: JournalViolation[]): void {
  const ekle = (pkg: string, message: string): void => {
    ihlaller.push({ package_id: pkg, layer: "git", message });
  };

  /* Ön denetim: git hiç yoksa N paket için N aynı satır üretmek yerine TEK
     ihlal. Sessiz değil — yalnız tekrarsız. */
  const on = git(["rev-parse", "--git-dir"]);
  if (!on.ok) {
    ekle(JOURNAL_VIOLATION_REPO, `git denetimi koşulamadı: ${on.message}`);
    return;
  }

  /* SİLME DENETİMİ — çalışma ağacı numaralandırmasının kör noktası.
     Kural TEK YÖNLÜDÜR: git-izlenen ⊆ çalışma-ağacı. Tersi ihlal DEĞİLDİR;
     çalışma ağacında olup git'te olmayan dosya, henüz commit edilmemiş YENİ
     PAKETTİR ve bu, aşağıdaki döngünün de tek meşru atlama durumudur. */
  const izlenen = gitIzlenenIdler();
  if (!izlenen.ok) {
    ekle(JOURNAL_VIOLATION_REPO, `git denetimi koşulamadı: ${izlenen.message}`);
  } else {
    const mevcut = new Set(ids);
    for (const id of izlenen.ids) {
      if (!mevcut.has(id)) {
        ekle(id, `append-only ihlali: journal dosyası SİLİNMİŞ (git biliyor, çalışma ağacında yok)`);
      }
    }
  }

  for (const id of ids) {
    let dosya: string;
    try {
      dosya = journalFile(id);
    } catch (e) {
      ekle(id, `git denetimi koşulamadı: dosya yolu çözülemedi: ${mesaj(e)}`);
      continue;
    }

    const rel = path.relative(ROOT_DIR, dosya);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      /* TEZGAH_JOURNAL_DIR depo dışını gösteriyor (ör. geçici dizin). Git
         bütünlüğü bu yapılandırmada ÖLÇÜLEMEZ; sessizce geçmek yerine
         ölçülemediğini söyler — 11.3'ün "olculemedi" ilkesi. */
      ekle(id, `git denetimi koşulamadı: journal dosyası depo ağacının dışında (${dosya})`);
      continue;
    }
    const gitYol = rel.split(path.sep).join("/");

    const log = git(["log", "--format=%H", "--reverse", "--", gitYol]);
    if (!log.ok) {
      ekle(id, `git denetimi koşulamadı: git log: ${log.message}`);
      continue;
    }
    const commitler = log.out
      .toString("utf8")
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter((x) => x.length > 0);

    /* Hiç commit edilmemiş dosya YENİ PAKETTİR — ihlal değil. Bu, tek
       meşru atlama durumudur ve kapsamı bilerek dardır. */
    if (commitler.length === 0) continue;

    /* B1 — ardışık commit çiftlerinde SİLİNEN satır sayısı 0 olmalı */
    for (let i = 0; i + 1 < commitler.length; i++) {
      const a = commitler[i];
      const b = commitler[i + 1];
      const d = git(["diff", "--numstat", a, b, "--", gitYol]);
      if (!d.ok) {
        ekle(id, `git denetimi koşulamadı: git diff ${a.slice(0, 8)}..${b.slice(0, 8)}: ${d.message}`);
        continue;
      }
      const govde = d.out.toString("utf8").trim();
      if (govde.length === 0) continue; // bu çiftte dosya değişmemiş
      for (const satir of govde.split(/\r?\n/)) {
        const n = numstatSilinen(satir);
        if (typeof n !== "number") {
          ekle(id, `git denetimi koşulamadı: ${n.hata} (${a.slice(0, 8)}..${b.slice(0, 8)})`);
          continue;
        }
        if (n !== 0) {
          ekle(
            id,
            `append-only ihlali: ${a.slice(0, 8)}..${b.slice(0, 8)} arasında ${n} satır SİLİNMİŞ (${gitYol})`
          );
        }
      }
    }

    /* B2 — HEAD sürümü çalışma ağacının BAYT ÖNEKİ olmalı. Geçmiş yeniden
       yazılmış veya satır başı düzenlenmişse önek tutmaz.
       (.gitattributes'taki `-text` bu karşılaştırmayı Windows'ta da geçerli
       kılar: checkout CRLF'e çevirseydi önek sahte biçimde kırılırdı.) */
    const show = git(["show", `HEAD:${gitYol}`]);
    if (!show.ok) {
      ekle(id, `git denetimi koşulamadı: git show HEAD:${gitYol}: ${show.message}`);
      continue;
    }
    let calisma: Buffer;
    try {
      calisma = readFileSync(dosya);
    } catch (e) {
      ekle(id, `git denetimi koşulamadı: çalışma ağacındaki dosya okunamadı: ${mesaj(e)}`);
      continue;
    }
    if (!baytOneki(show.out, calisma)) {
      ekle(
        id,
        `append-only ihlali: HEAD sürümü çalışma ağacının bayt öneki DEĞİL — geçmiş yeniden yazılmış veya satır düzenlenmiş (${gitYol})`
      );
    }
  }
}

/* ── Katman C + D: yapı ve zincir ─────────────────────────────────────── */

function yapiVeZincirKatmani(ids: readonly string[], ihlaller: JournalViolation[]): void {
  for (const id of ids) {
    let lines: JournalLine[];
    try {
      lines = readJournal(id);
    } catch (e) {
      /* Okunamayan dosya bir YAPI sorunudur; aynı sebebi zincir katmanında
         tekrarlamak rapora bilgi eklemez. */
      ihlaller.push({ package_id: id, layer: "yapi", message: `journal okunamadı: ${mesaj(e)}` });
      continue;
    }

    try {
      const yapi = verifyJournalStructure(lines, id);
      if (!yapi.ok) {
        for (const konu of yapi.issues) ihlaller.push({ package_id: id, layer: "yapi", message: konu });
      }
    } catch (e) {
      ihlaller.push({ package_id: id, layer: "yapi", message: `yapı denetimi koşulamadı: ${mesaj(e)}` });
    }

    try {
      const zincir = verifyJournalChain(lines, sha256);
      if (!zincir.ok) {
        for (const konu of zincir.issues) ihlaller.push({ package_id: id, layer: "zincir", message: konu });
      }
    } catch (e) {
      ihlaller.push({ package_id: id, layer: "zincir", message: `zincir denetimi koşulamadı: ${mesaj(e)}` });
    }
  }
}

/* ── Giriş noktası ────────────────────────────────────────────────────── */

export function verifyAllJournals(): JournalViolation[] {
  const ihlaller: JournalViolation[] = [];

  /* Katman A paket listesinden BAĞIMSIZDIR: hiç journal yokken bile koşar */
  try {
    kaynakKatmani(ihlaller);
  } catch (e) {
    ihlaller.push({
      package_id: JOURNAL_VIOLATION_REPO,
      layer: "kaynak",
      message: `kaynak katmanı koşulamadı: ${mesaj(e)}`,
    });
  }

  let ids: string[] = [];
  try {
    ids = listPackageIds();
  } catch (e) {
    /* Dizin henüz yoksa "hiç paket yok" DOĞRU cevaptır (ilk kurulum).
       Başka her hata gerçek bir arızadır ve raporlanır. */
    if (enoent(e)) ids = [];
    else {
      ihlaller.push({
        package_id: JOURNAL_VIOLATION_REPO,
        layer: "yapi",
        message: `paket listesi okunamadı: ${mesaj(e)}`,
      });
      return ihlaller;
    }
  }

  try {
    gitKatmani(ids, ihlaller);
  } catch (e) {
    ihlaller.push({
      package_id: JOURNAL_VIOLATION_REPO,
      layer: "git",
      message: `git katmanı koşulamadı: ${mesaj(e)}`,
    });
  }

  try {
    yapiVeZincirKatmani(ids, ihlaller);
  } catch (e) {
    ihlaller.push({
      package_id: JOURNAL_VIOLATION_REPO,
      layer: "yapi",
      message: `yapı/zincir katmanı koşulamadı: ${mesaj(e)}`,
    });
  }

  return ihlaller;
}

/* ── Yardımcılar ──────────────────────────────────────────────────────── */

function mesaj(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function enoent(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: unknown }).code === "ENOENT";
}
