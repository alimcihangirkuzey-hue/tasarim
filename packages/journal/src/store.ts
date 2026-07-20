/* Cockpit modül fazı 0 — JOURNAL YAZMA KATMANI (Canonical 11.3/11.5/11.7).

   TEK YAZMA KAPISI appendEvent'tir. Başka bir yazma yolu bırakılmadığı için
   "doğrulamayı atlayan kayıt" mümkün değildir; kural üslup değil YAPIDIR.

   fs kullanımı BİLİNÇLİ OLARAK DARDIR: existsSync · readFileSync ·
   appendFileSync · mkdirSync · readdirSync · openSync/closeSync/unlinkSync
   (yalnız .lock). Var olan satırların ÜZERİNE yazabilen uçlar — write/truncate/
   rm aileleri ve akış yazıcıları — burada YOKTUR; her biri append-only'yi kod
   düzeyinde delerdi.

   Bu kısıt store.test.ts'te KAYNAK TARAMASIYLA denetlenir. Tarama ham metne
   bakar, yorum ile kodu AYIRMAZ — bilerek: ayrıştıran bir tarama biçimlendirme
   ile kandırılabilirdi. Bedeli, yasak adların bu dosyada yorumda bile tam
   hâliyle yazılamaması; ödenir. */

import fs from "node:fs";
import path from "node:path";
import {
  JOURNAL_SCHEMA_VERSION,
  checkGateHonesty,
  journalHashInput,
  validateJournalLine,
  verifyJournalStructure,
  type JournalActor,
  type JournalEvent,
  type JournalLine,
} from "@tezgah/shared";
import { authorizeJournalWrite } from "./authorize.js";
import { sha256 } from "./hash.js";
import { journalDir, journalFile, lockDir } from "./paths.js";

/* validateJournalLine hash'in 64 hex olmasını şart koşar; şeklin denetimi
   hash HESAPLANMADAN ÖNCE koştuğu için sınama sırasında yer tutucu kullanılır.
   Kayıp yok: o denetim hash'in DOĞRULUĞUNA bakmaz (o verifyJournalChain'in
   işidir), yalnız biçimine bakar — gerçek digest de bu biçimdedir. */
const HASH_PROBE = "0".repeat(64);

const JSONL_EXT = ".jsonl";

/* ── Okuma ────────────────────────────────────────────────────────────── */

/** Ham metin → satırlar. BOZUK SATIR SESSİZCE ATLANMAZ: atlamak, hasarlı bir
    dosyayı sağlıklı gibi gösterip seq/zincir denetimini de yanıltırdı. */
function parseJournal(text: string, file: string): JournalLine[] {
  const out: JournalLine[] = [];
  const rows = text.split("\n");
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.trim().length === 0) {
      /* Dosya sonundaki newline'ın ardından gelen boş parça normaldir */
      if (i === rows.length - 1) continue;
      throw new Error(`${file}:${i + 1}: boş satır — JSONL'de boş satıra yer yok`);
    }
    try {
      out.push(JSON.parse(row) as JournalLine);
    } catch (e) {
      throw new Error(`${file}:${i + 1}: bozuk JSON satırı — ${(e as Error).message}`);
    }
  }
  return out;
}

/**
 * Paketin olay akışı. Dosya yoksa []. ŞEMA DENETİMİ YAPMAZ (yalnız ayrıştırır):
 * bozulmuş bir dosya da okunabilmelidir, yoksa teşhis aracı teşhis edilecek
 * dosyayı açamaz. Şema/zincir denetimi yazmada (appendEvent) ve verify'da.
 */
export function readJournal(packageId: string): JournalLine[] {
  const file = journalFile(packageId);
  if (!fs.existsSync(file)) return [];
  return parseJournal(fs.readFileSync(file, "utf8"), file);
}

/** journalDir'deki .jsonl dosyalarından türetilen paket kimlikleri (sıralı) */
export function listPackageIds(): string[] {
  const dir = journalDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(JSONL_EXT))
    .map((e) => e.name.slice(0, -JSONL_EXT.length))
    .sort();
}

/* ── Kilit ────────────────────────────────────────────────────────────── */

/**
 * O_EXCL kilidi: aynı paket dosyasına iki süreç aynı anda append ederse
 * seq/prev yarışı iki satıra aynı seq'i verir ve zincir çatallanır.
 * SESSİZ BEKLEME YOK — bekleme, çökmüş bir turun bıraktığı kilidi sonsuz
 * gecikmeye çevirirdi; açık hata operatörü kilide bakmaya gönderir.
 */
function acquireLock(packageId: string): () => void {
  const file = path.join(lockDir(), `${packageId}.lock`);
  let fd: number;
  try {
    fd = fs.openSync(file, "wx");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(
        `journal kilidi meşgul: ${file} — başka bir yazma sürüyor ya da çökmüş bir tur kilidi bıraktı (dosyayı elle silin)`
      );
    }
    throw e;
  }
  return () => {
    try {
      fs.closeSync(fd);
    } catch {
      /* fd zaten kapalıysa kilidin KALDIRILMASI yine de denenmeli */
    }
    if (fs.existsSync(file)) fs.unlinkSync(file);
  };
}

/* ── Yazma ────────────────────────────────────────────────────────────── */

/**
 * Journal'a olay ekler ve yazılan satırı döner. Sıra kesindir:
 *   (a) yetki  (b) seq/prev  (c) ts  (d) doğrulama  (e) yırtık-yazma
 *   (f) hash   (g) append
 * (d) ve (e) yazmadan ÖNCE fırlatır: reddedilen olay dosyayı BÜYÜTMEZ.
 */
export function appendEvent(
  packageId: string,
  ev: JournalEvent,
  actor: JournalActor
): JournalLine {
  /* (a) 11.7 tek yetki kontrol noktası — diskle temas etmeden önce */
  const auth = authorizeJournalWrite(actor, ev.type);
  if (!auth.allow) {
    throw new Error(`journal yazma reddedildi (${String(ev.type)}): ${auth.reason ?? "gerekçe yok"}`);
  }

  const file = journalFile(packageId);
  fs.mkdirSync(journalDir(), { recursive: true });
  fs.mkdirSync(lockDir(), { recursive: true });

  const release = acquireLock(packageId);
  try {
    /* (b) seq/prev DOSYADAN okunur — bellekte tutulan sayaç, süreç yeniden
       başladığında ya da dosya elle düzenlendiğinde kayardı */
    const raw = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
    const lines = raw === null ? [] : parseJournal(raw, file);
    const last = lines.length > 0 ? lines[lines.length - 1] : null;
    const seq = last === null ? 1 : last.seq + 1;
    const prev = last === null ? null : last.hash;

    /* (c) kayıt anı — ölçüm anı DEĞİL (gate_run.measured_at ayrı alandır) */
    const ts = new Date().toISOString();

    /* Anahtar sırası zarf tipiyle birebir: v, package_id, seq, ts, actor,
       type, payload, prev, hash. canonicalJson zaten sıralar; bu sıra diff'i
       insan gözüne okunur tutmak içindir. */
    const draft: Omit<JournalLine, "hash"> = {
      v: JOURNAL_SCHEMA_VERSION,
      package_id: packageId,
      seq,
      ts,
      actor,
      type: ev.type,
      payload: ev.payload,
      prev,
    };

    /* (d) üç denetim; herhangi biri geçersizse HİÇBİR ŞEY yazılmaz */
    const probe = { ...draft, hash: HASH_PROBE } as JournalLine;

    const shape = validateJournalLine(probe);
    if (!shape.ok) throw new Error(`geçersiz journal satırı: ${shape.issues.join(" · ")}`);

    if (probe.type === "gate_run") {
      /* validateJournalLine bunu zaten çağırır; ölçüm dürüstlüğü (11.3) yazma
         kapısının kendi şartı olduğu için burada AÇIKÇA tekrarlanır — satır
         doğrulayıcısı ileride değişse bile kapı düşmez. */
      const gate = checkGateHonesty(probe.payload);
      if (!gate.ok) throw new Error(`ölçüm dürüstlüğü ihlali: ${gate.issues.join(" · ")}`);
    }

    /* Yeni satır DAHİL dosya bütünlüğü: ilk satırın package_declared olması,
       seq bitişikliği, aşama akışının uyumu ancak akışın tamamıyla görülür. */
    const structure = verifyJournalStructure([...lines, probe], packageId);
    if (!structure.ok) {
      throw new Error(`journal yapısı bozulurdu: ${structure.issues.join(" · ")}`);
    }

    /* (e) YIRTIK-YAZMA KORUMASI: önceki append yarıda kaldıysa dosya '\n' ile
       bitmez; append edilen kayıt öncekinin kuyruğuna yapışır ve iki olay tek
       satır olurdu — hem JSON hem seq bitişikliği sessizce bozulur. */
    if (raw !== null && raw.length > 0 && !raw.endsWith("\n")) {
      throw new Error(
        `${file}: dosya satır sonu ile bitmiyor (yarım yazma) — append yapılmadı; son satır elle onarılmalı`
      );
    }

    /* (f) hash: gövde `hash` HARİÇ, `prev` DAHİL kanonikleştirilir */
    /* probe geçilir (draft değil): journalHashInput `hash` alanını zaten siler,
       dolayısıyla HASH_PROBE sonuca karışmaz — ama tip korelasyonu korunur. */
    const hash = sha256(journalHashInput(probe));
    const written = { ...draft, hash } as JournalLine;

    /* (g) tek yazma çağrısı — append-only */
    fs.appendFileSync(file, `${JSON.stringify(written)}\n`, "utf8");
    return written;
  } finally {
    release();
  }
}
