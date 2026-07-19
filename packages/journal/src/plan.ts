/* Cockpit modül fazı 1 — PLAN KATMANI (Canonical 11.4 plan sınıfı).

   11.4: yol haritası ve hedef kuyruğu ÖLÇÜM DEĞİLDİR. Kaynağı programın kendi
   planlama kayıtlarıdır, Journal değildir; plan olarak işaretlenir ve hiçbir
   koşulda ölçüm gibi sunulmaz. Sınıf tipte taşınır (view.ts Plan<T>), bu yüzden
   bu modülden çıkan hiçbir değer ölçüm alanına giremez.

   ASIL DEĞER "plan" ETİKETİ DEĞİL, BAYATLIK ÖLÇÜSÜDÜR. Etiket tek başına
   yalnızca "bu ölçüm değil" der; planın GÜVENİLİR olup olmadığını söylemez.
   Bu depoda ölçüldü (2026-07-20):

     docs/ROADMAP.md   → son commit f2bbaeb, 2026-07-14T03:32:59+03:00
                         ana dal o commit'ten sonra 42 commit ilerledi
     docs/GOAL_QUEUE.md → aynı commit, aynı 42

   ROADMAP hâlâ "T3 PART-B ◀ şimdi" diyor; main iki paket ötede. Etiketli ama
   ölçüsüz gösterilen bir plan, altı gün önce doğru olan bir cümleyi bugünkü
   niyet gibi okutur. `guncellendi` + `geride_commit` bu yanılgıyı ekranda
   kapatır — ve ölçülemediklerinde UYDURULMAZ, null kalırlar.

   O İKİ SAYI TEK BAŞINA DA YETMEZ; yanlarında iki alan daha gider:
   · `olcum_notu` — sayı NEYE GÖRE ("taban refs/heads/main"), ölçülemediyse
     NEDEN ("son commit sha çözülemedi, sayım yapılmadı"). null "ölçemedim"
     demez, hiçbir şey demez; bu yüzden bu modül onu ASLA null bırakmaz.
   · `okundu` — bayatlığın ölçüldüğü an. İçerik plan sınıfıdır ama BAYATLIK
     CANLI OKUMADIR: git'e her çağrıda yeniden sorulur. Damga olmasaydı
     "42 commit geride" JSON'a serileştirildiği yerde sessizce eskirdi.
   Damga git'e SORULMADAN ÖNCE alınır (live.ts ile aynı kural): sonra
   alınsaydı gösterilen an veriden taze görünürdü.

   ÖLÇÜLEN TUZAK: `git rev-list --count <sha>..main` çağrısında <sha> BOŞ
   dizgeyse git bunu `HEAD..main` diye okur ve sessizce `0` döner — yani "plan
   güncel". Bu, bir ölçüm hatasının en iyimser cevaba dönüşmesidir. Bu yüzden
   sayım, sha 40 hane hex olarak DOĞRULANMADAN hiç çağrılmaz.

   İÇERİK AYRIŞTIRMASI BİLİNÇLİ OLARAK DAR: markdown yeniden yorumlanmaz.
   Yalnız üst düzey liste satırları, başlıklar ve tablo satırları alınır; ham
   satır olduğu gibi taşınır. Amaç yol haritasını GÖSTERMEKTİR.

   ŞERH (kutu dışı, bilinçli): görev tanımı "üst düzey liste satırları ve
   başlıklar" diyordu; tablo satırları da alındı. Sebep ölçüldü —
   docs/GOAL_QUEUE.md bir markdown TABLOSUDUR, listesi yoktur: liste+başlık
   ayrıştırması o dosyanın 21 satırından yalnız 1'ini (H1) üretiyordu. Kuyruk
   ekranda BOŞ görünürdü; yani dosya duruyorken içeriği sessizce kaybolurdu —
   11.3'ün mahkûm ettiği kalıbın tam kendisi. */

import { readFileSync } from "node:fs";
import path from "node:path";

import { gitCalistir } from "./live.js";
import { ROOT_DIR } from "./paths.js";
import { plan, type Plan } from "./view.js";

/** Repo-göreli plan kaynakları. Sıra ekrandaki sıradır. */
export const PLAN_KAYNAKLARI: readonly string[] = ["docs/ROADMAP.md", "docs/GOAL_QUEUE.md"];

export interface PlanGovdesi {
  baslik: string;
  satirlar: string[];
}

/* ── SAF: markdown → satırlar ─────────────────────────────────────────── */

/* Üç satır sınıfı; her biri tek satırlık bir yargı. Girintili (alt) liste
   satırları DIŞARIDADIR: "üst düzey" ölçütü ham satırın ilk karakteridir. */
const BASLIK = /^#{1,6}\s+\S/;
const UST_DUZEY_MADDE = /^(?:[-*+]|\d+[.)])\s+\S/;
const CIT = /^(?:```|~~~)/;

/** `|a|b|` → ["a","b"]. Baştaki `|` öncesi daima boştur; sondaki boş parça
    kapanış `|`'ından doğar ve varsa düşer (kapanışsız tablolar da vardır). */
function tabloHucreleri(satir: string): string[] {
  const parcalar = satir.split("|");
  parcalar.shift();
  if (parcalar.length > 0 && parcalar[parcalar.length - 1].trim() === "") parcalar.pop();
  return parcalar;
}

/** `|---|:--:|` gibi hizalama satırı mı? Bunlar tablonun İÇERİĞİ değildir. */
export function tabloAyraciMi(satir: string): boolean {
  const hucreler = tabloHucreleri(satir);
  return hucreler.length > 0 && hucreler.every((h) => /^\s*:?-+:?\s*$/.test(h));
}

function tabloSatiriMi(satir: string): boolean {
  return satir.startsWith("|") && satir.indexOf("|", 1) !== -1 && !tabloAyraciMi(satir);
}

/**
 * Markdown → gösterilecek satırlar. Yeniden yorum YOK: seçilen satır sağdan
 * kırpılmış hâliyle, işaretleriyle birlikte taşınır.
 *
 * Çitli kod blokları ATLANIR. Sebep dar ama gerçek: kod bloğundaki bir `- `
 * satırı yol haritası maddesi değildir ve plan panosunda madde gibi görünürdü.
 */
export function planSatirlari(md: string): string[] {
  const out: string[] = [];
  let citIcinde = false;
  for (const ham of md.split(/\r?\n/)) {
    const satir = ham.replace(/\s+$/, "");
    if (CIT.test(satir.trimStart())) {
      citIcinde = !citIcinde;
      continue;
    }
    if (citIcinde) continue;
    if (BASLIK.test(satir) || UST_DUZEY_MADDE.test(satir) || tabloSatiriMi(satir)) {
      out.push(satir);
    }
  }
  return out;
}

/* ── SAF: Plan sarmalayıcısı ──────────────────────────────────────────── */

/** Boş plan gövdesinin ekrandaki karşılığı — sessiz boşluk bırakılmaz. */
export const BOS_KAYNAK_SATIRI =
  "(bu kaynaktan üst düzey satır çıkmadı — dosya okundu ama başlık/madde/tablo satırı yok)";

/**
 * Bayatlık ölçümünün tamamı — view.ts'in plan() kurucusunun beklediği nesne.
 *
 * DÖRDÜ BİRLİKTE TAŞINIR ve tek nesnedir: `guncellendi`/`geride_commit` ne
 * olduğunu, `olcum_notu` neye göre (ya da neden olmadığını), `okundu` ne zaman
 * ölçüldüğünü söyler. Konumsal parametre olsalardı ikisi sessizce yer
 * değiştirebilirdi.
 */
export interface Bayatlik {
  guncellendi: string | null;
  geride_commit: number | null;
  olcum_notu: string | null;
  okundu: string;
}

/** Notsuz gelen ölçümün karşılığı — `olcum_notu` SESSİZCE null bırakılmaz. */
const NOT_VERILMEDI = "ölçüm notu verilmedi — bayatlığın tabanı bildirilmedi";
/** Kaynak hiç okunamadıysa bayatlık ölçümüne girilmemiştir. */
const NOT_KAYNAK_OKUNAMADI = "kaynak okunamadı, bayatlık ölçülmedi";
/** git geçmişi yok ya da çıktı bozuk: sayım ÖN KOŞULU sağlanmadı. */
const NOT_SHA_COZULEMEDI = "son commit sha çözülemedi, sayım yapılmadı";

/* Sarmalama bu TEK noktadan yapılır ki alan adları tek yerde eşlensin; view.ts'in
   plan() kurucusu da "elle nesne kurulmaz" der. İki giriş yolu (okunan kaynak ·
   okunamayan kaynak) buradan geçer, böylece bayatlık alanlarını atlayan bir yol
   yok — ve `olcum_notu` null gelirse burada GÖRÜNÜR bir metne çevrilir:
   "not yok" bilgisinin kendisi de ekranda bir cümledir. */
function planSar(govde: PlanGovdesi, kaynak: string, bayat: Bayatlik): Plan<PlanGovdesi> {
  return plan(govde, kaynak, { ...bayat, olcum_notu: bayat.olcum_notu ?? NOT_VERILMEDI });
}

/**
 * Markdown gövdesini plan sınıfına sarar. SAF: I/O yapmaz, bayatlık
 * değerlerini ÜRETMEZ — verildiği gibi taşır (null dâhil; null "ölçülemedi"
 * demektir ve öyle kalır). Tek istisna `olcum_notu`'dur: sessiz null yerine
 * "not verilmedi" cümlesi konur.
 */
export function planBasliklari(
  md: string,
  baslik: string,
  kaynak: string,
  bayatlik: Bayatlik
): Plan<PlanGovdesi> {
  const satirlar = planSatirlari(md);
  return planSar(
    { baslik, satirlar: satirlar.length > 0 ? satirlar : [BOS_KAYNAK_SATIRI] },
    kaynak,
    bayatlik
  );
}

/**
 * Okunamayan kaynağın planı. SESSİZCE ATLANMAZ: atlansaydı ekranda "böyle bir
 * plan yok" ile "plan var ama okuyamadım" aynı görünürdü (11.3'ün "ölçülemedi"
 * ilkesinin plan sınıfındaki karşılığı).
 *
 * `okundu` burada da ZORUNLUDUR ve DENEME anını taşır: ölçüm yapılamadı ama
 * denemenin kendisi bir andır ve o an eskir. Damga çağrı anında alınır.
 */
export function okunamadiPlani(baslik: string, kaynak: string, sebep: string): Plan<PlanGovdesi> {
  return planSar({ baslik, satirlar: [`(okunamadı) ${kaynak} — ${sebep}`] }, kaynak, {
    guncellendi: null,
    geride_commit: null,
    olcum_notu: `${NOT_KAYNAK_OKUNAMADI}: ${sebep}`,
    okundu: new Date().toISOString(),
  });
}

/** "docs/ROADMAP.md" → "ROADMAP". Başlık kaynaktan türer, uydurulmaz. */
export function kaynakBasligi(kaynak: string): string {
  const ad = kaynak.split("/").pop() ?? kaynak;
  return ad.replace(/\.md$/i, "");
}

/* ── SAF: git çıktısı → sayı/an ───────────────────────────────────────── */

const SHA40 = /^[0-9a-f]{40}$/;
/* %cI: 2026-07-14T03:32:59+03:00 (ya da ...Z) */
const ISO_OFSETLI = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/;

export interface SonCommit {
  sha: string;
  iso: string;
}

/**
 * `git log -1 --format=%H%x09%cI -- <yol>` çıktısını çözer.
 *
 * BOŞ ÇIKTI HATA DEĞİLDİR: git, hiç commit edilmemiş bir yol için exit 0 ve
 * boş gövde döner (ölçüldü). Bu durumda null — "bayatlık ölçülemedi" demektir,
 * "plan güncel" değil. Bozuk biçim de null: yarım okunmuş bir sha'yı ekrana
 * taşımak, ölçülmemiş bir değeri ölçülmüş göstermektir.
 */
export function sonCommitCoz(out: string): SonCommit | null {
  const satir = out.split(/\r?\n/)[0]?.trim() ?? "";
  if (satir.length === 0) return null;
  const [sha, iso] = satir.split("\t");
  if (sha === undefined || iso === undefined) return null;
  if (!SHA40.test(sha) || !ISO_OFSETLI.test(iso.trim())) return null;
  return { sha, iso: iso.trim() };
}

/** `git rev-list --count` çıktısı → negatif olmayan tamsayı; başka her şey null. */
export function sayiCoz(out: string): number | null {
  const s = out.trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number.parseInt(s, 10);
  return Number.isSafeInteger(n) ? n : null;
}

/**
 * Geride sayımının tabanı ve o tabanın CÜMLESİ.
 *
 * `not` olağan durumda da doludur ("taban refs/heads/main"): sayının neye göre
 * olduğu, ancak sapma olduğunda söylenirse okuyan olağan durumu VARSAYMAK
 * zorunda kalır — varsayılan bilgi, ölçülmüş bilgi değildir.
 */
export function tabanRef(mainVar: boolean): { ref: string; not: string } {
  return mainVar
    ? { ref: "refs/heads/main", not: "taban refs/heads/main" }
    : { ref: "HEAD", not: "main dalı yok, HEAD tabanı kullanıldı" };
}

/* ── I/O: bayatlık ölçümü ─────────────────────────────────────────────── */

/**
 * Kaynağın bayatlığını git'ten ölçer.
 *
 * `okundu` git'e SORULMADAN ÖNCE damgalanır (live.ts ile aynı kural):
 * sonra damgalansaydı, gösterilen an veriden birkaç milisaniye taze görünürdü.
 * Her çağrıda yeniden alınır — bu ölçüm önbelleklenmez.
 *
 * HER ÇIKIŞ YOLU BİR CÜMLE TAŞIR. Sessiz null yok: "42" ile "ölçemedim"
 * arasındaki fark ancak gerekçe görünürken okunabilir.
 */
function bayatlikOlc(gitYol: string): Bayatlik {
  const okundu = new Date().toISOString();

  const log = gitCalistir(["log", "-1", "--format=%H%x09%cI", "--", gitYol]);
  if (!log.ok) {
    return {
      guncellendi: null,
      geride_commit: null,
      olcum_notu: `git log koşulamadı (${log.message}), sayım yapılmadı`,
      okundu,
    };
  }
  const son = sonCommitCoz(log.out);
  if (son === null) {
    return { guncellendi: null, geride_commit: null, olcum_notu: NOT_SHA_COZULEMEDI, okundu };
  }

  const taban = tabanRef(gitCalistir(["rev-parse", "--verify", "--quiet", "refs/heads/main"]).ok);

  /* sha DOĞRULANMIŞ 40 hex (sonCommitCoz) — boş ref tuzağı burada kapanır. */
  const sayim = gitCalistir(["rev-list", "--count", `${son.sha}..${taban.ref}`, "--", "."]);
  if (!sayim.ok) {
    return {
      guncellendi: son.iso,
      geride_commit: null,
      olcum_notu: `${taban.not}; git rev-list koşulamadı (${sayim.message}), sayım yapılmadı`,
      okundu,
    };
  }

  const geride = sayiCoz(sayim.out);
  return {
    guncellendi: son.iso,
    geride_commit: geride,
    olcum_notu:
      geride === null ? `${taban.not}; rev-list çıktısı sayı değil, sayım yapılmadı` : taban.not,
    okundu,
  };
}

/* ── Giriş noktası ────────────────────────────────────────────────────── */

/**
 * Plan kaynaklarını okur ve her birini bayatlığıyla birlikte plan sınıfında
 * döner. Dönen dizinin uzunluğu kaynak listesiyle DAİMA aynıdır: okunamayan
 * kaynak da bir satır üretir.
 *
 * `kaynaklar` parametresi varsayılanlıdır; sözleşmedeki çağrı biçimi
 * `okuPlanlar()` olarak korunur. Testlerin var olmayan bir yolu gerçekten
 * geçirebilmesi için açık: aksi hâlde "okunamadı" yolu ancak depo kirletilerek
 * sınanabilirdi ve sınanmayan kalırdı.
 */
export function okuPlanlar(kaynaklar: readonly string[] = PLAN_KAYNAKLARI): Plan<PlanGovdesi>[] {
  return kaynaklar.map((kaynak) => {
    const baslik = kaynakBasligi(kaynak);
    const mutlak = path.join(ROOT_DIR, ...kaynak.split("/"));

    let md: string;
    try {
      md = readFileSync(mutlak, "utf8");
    } catch (e) {
      return okunamadiPlani(baslik, kaynak, e instanceof Error ? e.message : String(e));
    }

    /* `kaynak` YALNIZ repo-göreli yoldur. Ölçüm tabanı/gerekçesi artık
       `olcum_notu`'nun işi; iki ayrı bilgiyi tek alana yığmak yok. */
    return planBasliklari(md, baslik, kaynak, bayatlikOlc(kaynak));
  });
}
