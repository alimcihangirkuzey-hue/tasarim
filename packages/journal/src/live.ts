/* Cockpit modül fazı 1 — CANLI OKUMA (Canonical 11.3 canlı okuma istisnası).

   11.3'ün kuralı: gösterilen her ÖLÇÜM Journal'dan gelir. İstisnası: dış
   sistemin ANLIK durumu. Kod deposunun o andaki dalı, HEAD'i ve çalışma
   ağacının temizliği Journal'da geçmiş kayıt olarak YAŞAMAZ — git'e sorularak
   öğrenilir ve sorulduğu an eskimeye başlar.

   Bu modülün taşıdığı üç kilit, üçü de 11.3'ün lafzından doğar:

   · `okundu` ZORUNLUDUR. Canli<T> sarmalayıcısı onsuz kurulamaz (view.ts),
     bu yüzden "canlı okumayı geçmiş ölçüm gibi sunma" yasağı üslup değil tip
     kısıtıdır. Damga okumadan ÖNCE alınır: sonra alınsaydı, veriden birkaç
     milisaniye TAZE görünen bir damga üretirdi. Yanlış yönde yanılmak
     serbest değil.
   · `komut` ZORUNLUDUR — 11.3 kaynak dürüstlüğü: her değer üretildiği komutla
     birlikte gösterilir.
   · KISMİ SONUÇ YOKTUR. Üç okumadan biri patlarsa ya da çıktısı beklenen
     biçimde değilse tüm okuma `null` döner; çağıran "canlı okuma yapılamadı"
     gösterir. Eksik alanı yer tutucuyla doldurmak (dal:"?", head:"") tam olarak
     11.3'ün mahkûm ettiği şeydir: ölçülemeyen değer ölçülmüş gibi görünür.

   BU BİR ÖLÇÜM DEĞİLDİR VE JOURNAL'A YAZILMAZ. Buradan dönen hiçbir değer
   appendEvent'e girmez; yalnız görünüm için okunur. (Aynı git'ten gelse bile
   bir OLAY — dağıtım oldu, kapı koşuldu — olay kaydına yazılır ve Journal
   rejimine tabidir; 11.3'ün istisna sınırı budur.)

   git çağrı deseni verify.ts'teki git()'ten alınmıştır: execFileSync, argüman
   dizisi, shell YOK. Kabuk açılsaydı yol/argüman kabuk ayrıştırmasından
   geçerdi; bu modülün argümanları sabit olsa da desen sabit tutulur. */

import { execFileSync } from "node:child_process";

import { ROOT_DIR } from "./paths.js";
import { canli, type Canli } from "./view.js";

/* ── git süreç sarmalayıcısı ──────────────────────────────────────────── */

export type GitCagri = { ok: true; out: string } | { ok: false; message: string };

/**
 * Salt-okunur git çağrısı. Fırlatmaz; başarısızlığı DEĞER olarak döner —
 * çağıranın "ölçemedim" ile "şu değer" arasında ayrım yapması zorunlu olsun.
 *
 * plan.ts de bunu kullanır. Sebep: git'i çağıran TEK bir süreç sarmalayıcısı
 * olsun. Sarmalayıcı sınıf taşımaz (Canli/Plan ayrımı bu fonksiyonun üstünde
 * yapılır); ortak olan yalnız "dışarıdaki git'i güvenli çağırma" işidir.
 */
export function gitCalistir(args: readonly string[]): GitCagri {
  try {
    const raw = execFileSync("git", [...args], {
      cwd: ROOT_DIR,
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, out: Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw) };
  } catch (e) {
    return { ok: false, message: gitHatasi(e) };
  }
}

/** git'in kendi stderr'i, Node'un jenerik "Command failed" metninden yeğdir. */
function gitHatasi(e: unknown): string {
  if (typeof e === "object" && e !== null) {
    const o = e as { stderr?: unknown; message?: unknown };
    if (o.stderr !== undefined && o.stderr !== null) {
      const s = Buffer.isBuffer(o.stderr) ? o.stderr.toString("utf8") : String(o.stderr);
      if (s.trim().length > 0) return s.trim();
    }
  }
  return e instanceof Error ? e.message : String(e);
}

/* ── SAF çözücüler (asıl değer burada) ────────────────────────────────── */

export interface GitDurum {
  dal: string;
  head: string;
  temiz: boolean;
  degisen: number;
}

/** Ayrık HEAD'in ekrandaki karşılığı. Git `HEAD` adında dal AÇTIRMAZ
    (`git branch HEAD` reddedilir), bu yüzden eşleşme ikircikli değildir:
    ham "HEAD" bir dal adı gibi gösterilseydi var olmayan bir dal iddia edilirdi. */
export const AYRIK_HEAD = "(HEAD ayrık)";

/** Üç komutun tamamı — 11.3 kaynak dürüstlüğü için `komut` alanına yazılır. */
export const GIT_DURUM_KOMUTU =
  "git rev-parse --abbrev-ref HEAD · git rev-parse HEAD · git status --porcelain";

/** `git rev-parse --abbrev-ref HEAD` çıktısı → dal adı; boşsa null. */
export function dalAdi(out: string): string | null {
  const s = out.trim();
  if (s.length === 0) return null;
  return s === "HEAD" ? AYRIK_HEAD : s;
}

/** `git rev-parse HEAD` çıktısı → 40 hanelik sha; başka her şey null.
    Kısaltılmış ya da bozuk bir çıktıyı geçirmek, ekranda commit gibi duran
    ama commit olmayan bir dizge üretirdi. */
export function headSha(out: string): string | null {
  const s = out.trim();
  return /^[0-9a-f]{40}$/.test(s) ? s : null;
}

/**
 * `git status --porcelain` çıktısındaki satır sayısı.
 *
 * Boşlukla BAŞLAYAN satırlar (` M dosya` — çalışma ağacında değişmiş ama
 * indekslenmemiş) porcelain'in normal biçimidir; boşluk kırpması yalnız
 * SATIRIN BOŞ OLUP OLMADIĞINI sınamak için kullanılır, satırı elemek için
 * değil. Aksi hâlde en sık görülen değişiklik sınıfı sayılmadan düşerdi.
 */
export function porcelainSayisi(out: string): number {
  return out.split(/\r?\n/).filter((satir) => satir.trim().length > 0).length;
}

/**
 * Üç ham çıktı → tek durum. Herhangi biri çözülemezse null: kısmi sonuç
 * dönmez. `temiz` türetilir, ayrıca sorulmaz — iki bağımsız kaynak birbirini
 * yalanlayabilirdi.
 */
export function gitDurumuCoz(dalOut: string, headOut: string, statusOut: string): GitDurum | null {
  const dal = dalAdi(dalOut);
  if (dal === null) return null;
  const head = headSha(headOut);
  if (head === null) return null;
  const degisen = porcelainSayisi(statusOut);
  return { dal, head, temiz: degisen === 0, degisen };
}

/* ── Giriş noktası ────────────────────────────────────────────────────── */

/**
 * Deponun ANLIK durumu. git yoksa, patlarsa ya da çıktı beklenen biçimde
 * değilse `null` — çağıran "canlı okuma yapılamadı" gösterir, uydurma değer
 * ASLA üretilmez.
 */
export function gitDurumu(): Canli<GitDurum> | null {
  /* Damga okumalardan ÖNCE: gösterilen an, veriden asla TAZE olmasın. */
  const okundu = new Date().toISOString();

  const dal = gitCalistir(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (!dal.ok) return null;

  const head = gitCalistir(["rev-parse", "HEAD"]);
  if (!head.ok) return null;

  const durum = gitCalistir(["status", "--porcelain"]);
  if (!durum.ok) return null;

  const deger = gitDurumuCoz(dal.out, head.out, durum.out);
  if (deger === null) return null;

  return canli(deger, okundu, GIT_DURUM_KOMUTU);
}
