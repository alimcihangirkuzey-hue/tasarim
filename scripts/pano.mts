#!/usr/bin/env -S npx tsx
/* TEZGÂH PANO — yönetişim/sahip önizlemesi (salt-okunur, türetilmiş artefakt).

   GELİŞTİRME ARACI, ÜRÜN DEĞİL: ürün sunucusuna rota eklemez, apps/web'e bayt
   eklemez, yeni bağımlılık getirmez (yalnız node: çekirdeği + repo defteri).

   Kaynak = repo gerçeği:
     · docs/journal/events/*.jsonl  → paket defteri (ölçülen kapılar, aşamalar, git)
     · git                          → dal · HEAD · commit sayısı
     · docs/GOAL_QUEUE.md           → kuyruk görünümü
     · kapılar                      → BU TURDA koşulur (--hizli ile atlanır, defterdeki
                                      son ölçüm gösterilir ve öyle etiketlenir)

   Kullanım:
     npm run pano              → kapıları ölçer, docs/pano/index.html üretir
     npm run pano -- --hizli   → kapı koşmaz, defterdeki son ölçümü kullanır
     npm run pano -- --cikti <yol>

   Beyan yazmaz: gösterilen her kapı değeri ya bu turda ölçülmüştür ya da
   defterden gelir; hangisi olduğu ekranda AÇIKÇA yazar. */

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* ── argümanlar ───────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const HIZLI = argv.includes("--hizli");
const ciktiIx = argv.indexOf("--cikti");
const CIKTI =
  ciktiIx >= 0 && argv[ciktiIx + 1]
    ? path.resolve(argv[ciktiIx + 1]!)
    : path.join(KOK, "docs", "pano", "index.html");

/* ── defter okuma ─────────────────────────────────────────────────────── */

interface Kayit {
  package_id: string;
  seq: number;
  ts: string;
  type: string;
  payload: Record<string, unknown>;
}

interface Paket {
  id: string;
  ad: string;
  amac: string;
  ilkTs: string;
  sonTs: string;
  asama: string | null;
  kapilar: { gate: string; outcome: string; values: Record<string, unknown> | null }[];
  merge: string | null;
  commit: string | null;
  karar: string | null;
  acikBulgu: number;
  riskler: number;
}

function defteriOku(): Paket[] {
  const dizin = path.join(KOK, "docs", "journal", "events");
  let dosyalar: string[];
  try {
    dosyalar = readdirSync(dizin).filter((d) => d.endsWith(".jsonl"));
  } catch {
    return [];
  }

  const paketler = new Map<string, Paket>();

  for (const d of dosyalar) {
    let satirlar: string[];
    try {
      satirlar = readFileSync(path.join(dizin, d), "utf8").split("\n");
    } catch {
      continue;
    }
    for (const satir of satirlar) {
      const s = satir.trim();
      if (!s) continue;
      let k: Kayit;
      try {
        k = JSON.parse(s) as Kayit;
      } catch {
        continue; // bozuk satır sessizce atlanmaz: aşağıda sayılır
      }
      if (!k.package_id) continue;

      let p = paketler.get(k.package_id);
      if (!p) {
        p = {
          id: k.package_id,
          ad: k.package_id,
          amac: "",
          ilkTs: k.ts,
          sonTs: k.ts,
          asama: null,
          kapilar: [],
          merge: null,
          commit: null,
          karar: null,
          acikBulgu: 0,
          riskler: 0,
        };
        paketler.set(k.package_id, p);
      }
      if (k.ts < p.ilkTs) p.ilkTs = k.ts;
      if (k.ts > p.sonTs) p.sonTs = k.ts;

      const pl = k.payload ?? {};
      switch (k.type) {
        case "package_declared":
          if (typeof pl.name === "string") p.ad = pl.name;
          if (typeof pl.purpose === "string") p.amac = pl.purpose;
          break;
        case "stage_changed":
          if (typeof pl.to === "string") p.asama = pl.to;
          break;
        case "gate_run":
          p.kapilar.push({
            gate: String(pl.gate ?? "?"),
            outcome: String(pl.outcome ?? "?"),
            values: (pl.values as Record<string, unknown> | null) ?? null,
          });
          break;
        case "git_recorded":
          if (pl.kind === "merge" && typeof pl.value === "string") p.merge = pl.value;
          if (pl.kind === "commit" && typeof pl.value === "string") p.commit = pl.value;
          break;
        case "verifier_verdict":
          if (typeof pl.decision === "string") p.karar = pl.decision;
          if (Array.isArray(pl.findings_open)) p.acikBulgu = pl.findings_open.length;
          break;
        case "risk_recorded":
          p.riskler += 1;
          break;
      }
    }
  }

  return [...paketler.values()].sort((a, b) => (a.sonTs < b.sonTs ? 1 : -1));
}

/* ── git gerçeği ──────────────────────────────────────────────────────── */

function git(...args: string[]): string {
  try {
    return execFileSync("git", args, { cwd: KOK, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

interface GitDurum {
  dal: string;
  head: string;
  headKisa: string;
  konu: string;
  commitSayisi: string;
  temiz: boolean;
  shallow: boolean;
  sonCommitler: { sha: string; konu: string; tarih: string }[];
}

function gitDurumu(): GitDurum {
  const kirli = git("status", "--porcelain");
  const log = git("log", "-12", "--format=%h@@%s@@%cI");
  return {
    dal: git("rev-parse", "--abbrev-ref", "HEAD") || "(bilinmiyor)",
    head: git("rev-parse", "HEAD"),
    headKisa: git("rev-parse", "--short", "HEAD"),
    konu: git("log", "-1", "--format=%s"),
    commitSayisi: git("rev-list", "--count", "HEAD") || "?",
    temiz: kirli === "",
    shallow: git("rev-parse", "--is-shallow-repository") === "true",
    sonCommitler: log
      ? log.split("\n").map((r) => {
          const [sha, konu, tarih] = r.split("@@");
          return { sha: sha ?? "", konu: konu ?? "", tarih: tarih ?? "" };
        })
      : [],
  };
}

/* ── kapılar: BU TURDA ölçüm ──────────────────────────────────────────── */

interface KapiSonuc {
  ad: string;
  komut: string;
  gecti: boolean | null; // null = ölçülmedi
  sure: number | null;
  detay: string;
}

function kapiKos(ad: string, komut: string, args: string[]): KapiSonuc {
  const t0 = Date.now();
  const r = spawnSync(komut, args, {
    cwd: KOK,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    shell: false,
  });
  const sure = Date.now() - t0;
  const cikti = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  return { ad, komut: `${komut} ${args.join(" ")}`, gecti: r.status === 0, sure, detay: cikti };
}

function testKirilimi(cikti: string): { toplam: number; dosya: number; satirlar: string[] } {
  const isimler = [...cikti.matchAll(/^> (@tezgah\/[\w-]+)@/gm)].map((m) => m[1]!);
  const testler = [...cikti.matchAll(/Tests\s+(?:(\d+) failed \| )?(\d+) passed \((\d+)\)/g)];
  const dosyalar = [...cikti.matchAll(/Test Files\s+(?:(\d+) failed \| )?(\d+) passed \((\d+)\)/g)];
  const satirlar: string[] = [];
  let toplam = 0;
  let dosya = 0;
  for (let i = 0; i < testler.length; i++) {
    const gecen = Number(testler[i]![2]);
    const hepsi = Number(testler[i]![3]);
    const df = dosyalar[i] ? Number(dosyalar[i]![3]) : 0;
    toplam += hepsi;
    dosya += df;
    const ad = (isimler[i] ?? `paket-${i + 1}`).replace("@tezgah/", "");
    satirlar.push(`${ad} ${gecen}/${hepsi}`);
  }
  return { toplam, dosya, satirlar };
}

/* DÜŞEN TESTİN ADI — PANO YÜZEYİ (R-FLAKY-TEST-01).

   ÖLÇÜLEN YARA: pano test kapısını bir kez kırmızı ölçtü ve ekranda yalnız
   `journal 501/502` yazıyordu; HANGİ test olduğu hiçbir yerde yoktu.

   YETKİLİ KAYNAK BURASI DEĞİL: düşen testin kimliği artık kapı kaydına
   (journal `gate` olayı, `reason` alanı) vitest'in JSON raporundan yazılıyor
   — sayıyı üreten raporun ta kendisinden. Buradaki ayrıştırma, panonun
   `npm test` (insan okurlu) çıktısından okuduğu bir GÖSTERİM yardımıdır.

   İKİ ÖLÇÜM YOLU OLMASI BİLİNÇLİ DEĞİL, KAYITLI BİR BORÇTUR: pano kapıyı
   kendi koşuyor, defter kendi koşuyor. Doğru çözüm panonun defterin kapı
   koşucusunu ÇAĞIRMASIDIR; o ayrı bir iştir ve açık bulgu olarak yazıldı.
   Bu satırlar o gün silinecek. */
function dusenTestSatirlari(cikti: string): string[] {
  const gorulen = new Set<string>();
  for (const m of cikti.matchAll(/^\s*FAIL\s+(\S+)\s*>\s*(.+?)\s*$/gm)) {
    const dosya = (m[1] ?? "").split(/[\\/]/).pop() ?? m[1] ?? "";
    gorulen.add(`${dosya} > ${m[2] ?? ""}`);
  }
  return [...gorulen];
}

function bundleKb(cikti: string): { ana: number | null; enBuyukChunk: number | null } {
  const gz = [...cikti.matchAll(/gzip:\s*([\d.]+)\s*kB/g)].map((m) => Number(m[1]));
  if (gz.length === 0) return { ana: null, enBuyukChunk: null };
  const ana = Math.max(...gz);
  const kalan = gz.filter((v) => v !== ana);
  return { ana, enBuyukChunk: kalan.length ? Math.max(...kalan) : null };
}

/* ── kuyruk (GOAL_QUEUE.md tablosu) ───────────────────────────────────── */

interface KuyrukSatiri {
  no: string;
  goal: string;
  durum: string;
  kapi: string;
}

function kuyrugoOku(): KuyrukSatiri[] {
  let metin: string;
  try {
    metin = readFileSync(path.join(KOK, "docs", "GOAL_QUEUE.md"), "utf8");
  } catch {
    return [];
  }
  const satirlar: KuyrukSatiri[] = [];
  for (const s of metin.split("\n")) {
    if (!s.startsWith("|")) continue;
    const h = s.split("|").map((x) => x.trim());
    if (h.length < 6) continue;
    if (!h[1] || h[1] === "#" || /^-+$/.test(h[1])) continue;
    satirlar.push({ no: h[1]!, goal: h[2] ?? "", durum: h[3] ?? "", kapi: h[4] ?? "" });
  }
  return satirlar;
}

/* ── HTML ─────────────────────────────────────────────────────────────── */

function kacir(x: unknown): string {
  return String(x)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function md(x: string): string {
  // GOAL_QUEUE hücrelerindeki **kalın** ve `kod` işaretlemesi
  return kacir(x)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function tarihTR(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

function gunTR(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}`;
}

const STIL = `
:root{
  --ground:#F2F3F4; --surface:#FFFFFF; --surface-2:#FAFAFB;
  --ink:#171A1D; --ink-2:#4A5157; --muted:#767D84;
  --line:#DFE2E5; --line-2:#EAECEE;
  --accent:#2F55A0; --accent-soft:#E8EDF7;
  --ok:#12674A; --ok-soft:#E1F0EA;
  --warn:#8A5D0C; --warn-soft:#F7EEDC;
  --crit:#9C2B2B; --crit-soft:#F7E5E5;
  --shadow:0 1px 2px rgba(20,25,30,.05), 0 8px 24px -16px rgba(20,25,30,.28);
}
@media (prefers-color-scheme: dark){
  :root{
    --ground:#121417; --surface:#191C20; --surface-2:#1E2226;
    --ink:#E7EAED; --ink-2:#B2B9C0; --muted:#858D95;
    --line:#2B3037; --line-2:#23272C;
    --accent:#7BA0E0; --accent-soft:#1B2534;
    --ok:#5DBF9A; --ok-soft:#14261F;
    --warn:#D9A94E; --warn-soft:#2A2113;
    --crit:#E08585; --crit-soft:#2C1919;
    --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -16px rgba(0,0,0,.8);
  }
}
:root[data-theme="dark"]{
  --ground:#121417; --surface:#191C20; --surface-2:#1E2226;
  --ink:#E7EAED; --ink-2:#B2B9C0; --muted:#858D95;
  --line:#2B3037; --line-2:#23272C;
  --accent:#7BA0E0; --accent-soft:#1B2534;
  --ok:#5DBF9A; --ok-soft:#14261F;
  --warn:#D9A94E; --warn-soft:#2A2113;
  --crit:#E08585; --crit-soft:#2C1919;
  --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -16px rgba(0,0,0,.8);
}
:root[data-theme="light"]{
  --ground:#F2F3F4; --surface:#FFFFFF; --surface-2:#FAFAFB;
  --ink:#171A1D; --ink-2:#4A5157; --muted:#767D84;
  --line:#DFE2E5; --line-2:#EAECEE;
  --accent:#2F55A0; --accent-soft:#E8EDF7;
  --ok:#12674A; --ok-soft:#E1F0EA;
  --warn:#8A5D0C; --warn-soft:#F7EEDC;
  --crit:#9C2B2B; --crit-soft:#F7E5E5;
  --shadow:0 1px 2px rgba(20,25,30,.05), 0 8px 24px -16px rgba(20,25,30,.28);
}

*{box-sizing:border-box}
body{
  margin:0; background:var(--ground); color:var(--ink);
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;
  font-size:15px; line-height:1.5;
  -webkit-font-smoothing:antialiased;
}
code,.mono,.num{font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace}
.num{font-variant-numeric:tabular-nums}

.wrap{max-width:1140px; margin:0 auto; padding:28px 20px 72px; display:flex; flex-direction:column; gap:22px}

/* başlık bandı */
.band{
  background:var(--surface); border:1px solid var(--line); border-radius:10px;
  box-shadow:var(--shadow); overflow:hidden;
}
.band-top{
  display:flex; flex-wrap:wrap; gap:16px; align-items:baseline;
  padding:18px 22px 14px; border-bottom:1px solid var(--line-2);
}
.mark{
  font-size:19px; font-weight:680; letter-spacing:.16em; text-transform:uppercase;
  margin:0;
}
.mark span{color:var(--accent)}
.band-sub{color:var(--muted); font-size:13px; margin:0}
.band-grid{
  display:grid; grid-template-columns:repeat(auto-fit,minmax(168px,1fr));
  border-top:0;
}
.cell{padding:13px 22px; border-right:1px solid var(--line-2); display:flex; flex-direction:column; gap:3px}
.cell:last-child{border-right:0}
.cell dt{
  margin:0; font-size:10.5px; letter-spacing:.11em; text-transform:uppercase; color:var(--muted);
}
.cell dd{margin:0; font-size:14px; font-weight:560}

/* rozetler */
.pill{
  display:inline-flex; align-items:center; gap:6px;
  padding:2px 9px; border-radius:999px; font-size:11.5px; font-weight:620;
  letter-spacing:.02em; white-space:nowrap; border:1px solid transparent;
}
.pill::before{content:""; width:6px; height:6px; border-radius:50%; background:currentColor; flex:none}
.p-ok{background:var(--ok-soft); color:var(--ok); border-color:color-mix(in srgb,var(--ok) 22%,transparent)}
.p-warn{background:var(--warn-soft); color:var(--warn); border-color:color-mix(in srgb,var(--warn) 22%,transparent)}
.p-crit{background:var(--crit-soft); color:var(--crit); border-color:color-mix(in srgb,var(--crit) 22%,transparent)}
.p-mut{background:var(--surface-2); color:var(--muted); border-color:var(--line)}

/* bölüm */
section{background:var(--surface); border:1px solid var(--line); border-radius:10px; box-shadow:var(--shadow)}
.head{
  display:flex; flex-wrap:wrap; gap:10px; align-items:baseline; justify-content:space-between;
  padding:15px 22px; border-bottom:1px solid var(--line-2);
}
.head h2{margin:0; font-size:12px; letter-spacing:.13em; text-transform:uppercase; color:var(--ink-2); font-weight:640}
.head .note{font-size:12px; color:var(--muted)}

/* kapı şeridi */
.gates{display:grid; grid-template-columns:repeat(auto-fit,minmax(184px,1fr))}
.gate{padding:15px 22px; border-right:1px solid var(--line-2); border-top:0; display:flex; flex-direction:column; gap:7px}
.gate:last-child{border-right:0}
.gate-n{font-size:13px; font-weight:640; display:flex; align-items:center; justify-content:space-between; gap:8px}
.gate-v{font-size:12px; color:var(--muted)}
.gate-v b{color:var(--ink-2); font-weight:600}

/* tablo */
.scroll{overflow-x:auto}
table{width:100%; border-collapse:collapse; font-size:13.5px}
th{
  text-align:left; font-size:10.5px; letter-spacing:.1em; text-transform:uppercase;
  color:var(--muted); font-weight:620; padding:9px 14px; border-bottom:1px solid var(--line);
  white-space:nowrap; background:var(--surface-2);
}
td{padding:10px 14px; border-bottom:1px solid var(--line-2); vertical-align:top}
tr:last-child td{border-bottom:0}
td.num,th.num{text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap}
td.t{color:var(--muted); white-space:nowrap; font-variant-numeric:tabular-nums}
.pk{font-weight:580; display:block}
.pk-id{font-size:11px; color:var(--muted); font-family:ui-monospace,monospace}
code{
  font-size:12px; background:var(--surface-2); border:1px solid var(--line-2);
  border-radius:4px; padding:1px 5px;
}

/* iki sütun */
.cols{display:grid; grid-template-columns:1fr; gap:22px}
@media (min-width:900px){ .cols{grid-template-columns:1.35fr 1fr} }

/* akış */
.flow{display:flex; flex-wrap:wrap; gap:5px; padding:15px 22px}
.step{
  flex:1 1 96px; min-width:96px; padding:8px 10px; border-radius:6px;
  background:var(--surface-2); border:1px solid var(--line-2);
  display:flex; flex-direction:column; gap:2px;
}
.step b{font-size:12px; font-weight:620}
.step span{font-size:11px; color:var(--muted); font-variant-numeric:tabular-nums}

.foot{color:var(--muted); font-size:12px; text-align:center; line-height:1.7}
.foot code{background:transparent; border:0; padding:0}
@media (prefers-reduced-motion:no-preference){
  .band,section{animation:rise .32s cubic-bezier(.2,.7,.3,1) both}
  @keyframes rise{from{opacity:0; transform:translateY(5px)} to{opacity:1; transform:none}}
}
`;

function kapiKarti(k: KapiSonuc, deger: string): string {
  const rozet =
    k.gecti === null
      ? '<span class="pill p-mut">ölçülmedi</span>'
      : k.gecti
        ? '<span class="pill p-ok">geçti</span>'
        : '<span class="pill p-crit">kaldı</span>';
  const sure = k.sure === null ? "" : ` · ${(k.sure / 1000).toFixed(1)}s`;
  return `<div class="gate">
      <div class="gate-n"><span>${kacir(k.ad)}</span>${rozet}</div>
      <div class="gate-v">${deger}${sure}</div>
    </div>`;
}

function html(veri: {
  paketler: Paket[];
  git: GitDurum;
  kuyruk: KuyrukSatiri[];
  kapilar: KapiSonuc[];
  kapiDegerleri: string[];
  olculdu: boolean;
  uretim: string;
  toplamKapi: { gecti: number; kaldi: number; diger: number };
}): string {
  const { paketler, git: g, kuyruk, kapilar, kapiDegerleri, olculdu, uretim, toplamKapi } = veri;

  const hepsiYesil = kapilar.every((k) => k.gecti === true);
  const saglik = !olculdu
    ? '<span class="pill p-mut">bu turda ölçülmedi</span>'
    : hepsiYesil
      ? '<span class="pill p-ok">tüm kapılar yeşil</span>'
      : '<span class="pill p-crit">kapı kırmızı</span>';

  const asamaSirasi = [
    "planlama",
    "canonical-kaydi",
    "gelistirme",
    "test",
    "ikinci-dogrulayici",
    "hazir",
    "merge",
  ];
  const asamaSayim = new Map<string, number>();
  for (const p of paketler) if (p.asama) asamaSayim.set(p.asama, (asamaSayim.get(p.asama) ?? 0) + 1);

  const paketSatirlari = paketler
    .slice(0, 60)
    .map((p) => {
      const gecen = p.kapilar.filter((k) => k.outcome === "gecti").length;
      const kalan = p.kapilar.filter((k) => k.outcome === "kaldi").length;
      const kapiRozet =
        p.kapilar.length === 0
          ? '<span class="pill p-mut">kapı yok</span>'
          : kalan > 0
            ? `<span class="pill p-warn">${gecen}/${p.kapilar.length}</span>`
            : `<span class="pill p-ok">${gecen}/${p.kapilar.length}</span>`;
      const asama =
        p.asama === "merge"
          ? '<span class="pill p-ok">merge</span>'
          : `<span class="pill p-warn">${kacir(p.asama ?? "—")}</span>`;
      const karar = p.karar ? kacir(p.karar) : "—";
      return `<tr>
        <td class="t">${gunTR(p.sonTs)}</td>
        <td><span class="pk">${kacir(p.ad)}</span><span class="pk-id">${kacir(p.id)}</span></td>
        <td>${asama}</td>
        <td>${kapiRozet}</td>
        <td class="num">${karar}${p.acikBulgu ? ` · <b>${p.acikBulgu}</b> açık` : ""}</td>
        <td class="num">${p.merge ? `<code>${kacir(p.merge.slice(0, 7))}</code>` : p.commit ? `<code>${kacir(p.commit.slice(0, 7))}</code>` : "—"}</td>
      </tr>`;
    })
    .join("");

  const kuyrukSatirlari = kuyruk
    .map((k) => {
      const d = k.durum.toLowerCase();
      const rozet = d.includes("completed")
        ? "p-ok"
        : d.includes("koşuluyor") || d.includes("kosuluyor") || d.includes("verildi") || d.includes("koşuldu")
          ? "p-warn"
          : "p-mut";
      const kisa = k.durum.replace(/\*\*/g, "").split("—")[0]!.trim() || "—";
      return `<tr>
        <td class="t">${kacir(k.no)}</td>
        <td>${md(k.goal)}</td>
        <td><span class="pill ${rozet}">${kacir(kisa.length > 26 ? `${kisa.slice(0, 25)}…` : kisa)}</span></td>
      </tr>`;
    })
    .join("");

  const akis = asamaSirasi
    .map((a) => {
      const n = paketler.filter((p) => p.asama === a).length;
      return `<div class="step"><b>${kacir(a)}</b><span>${n} paket</span></div>`;
    })
    .join("");

  const commitler = g.sonCommitler
    .map(
      (c) => `<tr>
        <td class="t">${gunTR(c.tarih)}</td>
        <td><code>${kacir(c.sha)}</code></td>
        <td>${kacir(c.konu)}</td>
      </tr>`,
    )
    .join("");

  const kapiKartlari = kapilar.map((k, i) => kapiKarti(k, kapiDegerleri[i] ?? "")).join("");

  return `<title>TEZGÂH — İlerleme Panosu</title>
<style>${STIL}</style>
<div class="wrap">

  <div class="band">
    <div class="band-top">
      <h1 class="mark">Tezg<span>â</span>h</h1>
      <p class="band-sub">İlerleme panosu · saatlik otomasyon · salt-okunur</p>
      <p class="band-sub" style="margin-left:auto">${kacir(uretim)}</p>
    </div>
    <dl class="band-grid">
      <div class="cell"><dt>Sağlık</dt><dd>${saglik}</dd></div>
      <div class="cell"><dt>Dal</dt><dd class="mono" style="font-size:12.5px">${kacir(g.dal)}</dd></div>
      <div class="cell"><dt>HEAD</dt><dd><code>${kacir(g.headKisa)}</code></dd></div>
      <div class="cell"><dt>Commit</dt><dd class="num">${kacir(g.commitSayisi)}</dd></div>
      <div class="cell"><dt>Paket</dt><dd class="num">${paketler.length}</dd></div>
      <div class="cell"><dt>Çalışma ağacı</dt><dd>${g.temiz ? '<span class="pill p-ok">temiz</span>' : '<span class="pill p-warn">kirli</span>'}</dd></div>
    </dl>
  </div>

  <section>
    <div class="head">
      <h2>Kapılar</h2>
      <span class="note">${
        olculdu
          ? "bu turda ÖLÇÜLDÜ — beyan değil"
          : "bu turda koşulmadı (--hizli) — değerler defterdeki son ölçümden"
      } · defter toplamı: ${toplamKapi.gecti} geçti / ${toplamKapi.kaldi} kaldı</span>
    </div>
    <div class="gates">${kapiKartlari}</div>
  </section>

  <div class="cols">
    <section>
      <div class="head"><h2>Paket defteri</h2><span class="note">en yeni önce · ${paketler.length} paket</span></div>
      <div class="scroll"><table>
        <thead><tr><th>Tarih</th><th>Paket</th><th>Aşama</th><th>Kapı</th><th class="num">2. doğrulayıcı</th><th class="num">Commit</th></tr></thead>
        <tbody>${paketSatirlari || '<tr><td colspan="6">Defter boş.</td></tr>'}</tbody>
      </table></div>
    </section>

    <div style="display:flex; flex-direction:column; gap:22px">
      <section>
        <div class="head"><h2>Hedef kuyruğu</h2><span class="note">docs/GOAL_QUEUE.md</span></div>
        <div class="scroll"><table>
          <thead><tr><th>#</th><th>Hedef</th><th>Durum</th></tr></thead>
          <tbody>${kuyrukSatirlari || '<tr><td colspan="3">Kuyruk okunamadı.</td></tr>'}</tbody>
        </table></div>
      </section>

      <section>
        <div class="head"><h2>Paket yaşam döngüsü</h2><span class="note">aşamada duran paket sayısı</span></div>
        <div class="flow">${akis}</div>
      </section>
    </div>
  </div>

  <section>
    <div class="head"><h2>Son commitler</h2><span class="note">${kacir(g.dal)}</span></div>
    <div class="scroll"><table>
      <thead><tr><th>Tarih</th><th>SHA</th><th>Konu</th></tr></thead>
      <tbody>${commitler || '<tr><td colspan="3">Geçmiş okunamadı.</td></tr>'}</tbody>
    </table></div>
  </section>

  <p class="foot">
    Türetilmiş artefakt — kaynak repo gerçeğidir: <code>docs/journal/events/</code> · <code>git</code> · <code>docs/GOAL_QUEUE.md</code>.<br>
    Yeniden üret: <code>npm run pano</code>${g.shallow ? ' · <strong>UYARI: depo shallow — bayatlık ölçümü yapılamaz</strong>' : ""}
  </p>
</div>`;
}

/* ── ana ──────────────────────────────────────────────────────────────── */

const paketler = defteriOku();
const gd = gitDurumu();
const kuyruk = kuyrugoOku();

const toplamKapi = { gecti: 0, kaldi: 0, diger: 0 };
for (const p of paketler)
  for (const k of p.kapilar) {
    if (k.outcome === "gecti") toplamKapi.gecti++;
    else if (k.outcome === "kaldi") toplamKapi.kaldi++;
    else toplamKapi.diger++;
  }

let kapilar: KapiSonuc[];
let degerler: string[];

if (HIZLI) {
  const sonDeger = (ad: string): string => {
    for (const p of paketler)
      for (const k of p.kapilar)
        if (k.gate === ad && k.values) return kacir(JSON.stringify(k.values).slice(1, -1));
    return "defterde değer yok";
  };
  kapilar = ["typecheck", "lint", "test", "build", "bundle"].map((ad) => ({
    ad,
    komut: "—",
    gecti: null,
    sure: null,
    detay: "",
  }));
  degerler = kapilar.map((k) => sonDeger(k.ad));
} else {
  process.stderr.write("pano: kapılar ölçülüyor…\n");
  const tc = kapiKos("typecheck", "npm", ["run", "typecheck"]);
  const lint = kapiKos("lint", "npm", ["run", "lint"]);
  const test = kapiKos("test", "npm", ["test"]);
  const build = kapiKos("build", "npm", ["run", "build", "-w", "apps/web"]);
  const defter = kapiKos("journal:verify", "npm", ["run", "journal:verify"]);

  const tk = testKirilimi(test.detay);
  const bk = bundleKb(build.detay);

  kapilar = [tc, lint, test, build, defter];
  degerler = [
    "5 workspace · tsc --noEmit",
    "5 workspace · eslint",
    `<b>${tk.toplam}</b> test · ${tk.dosya} dosya`,
    bk.ana ? `ana <b>${bk.ana.toFixed(2)} kB</b> gzip` : "çıktı ayrıştırılamadı",
    defter.detay.includes("dört katman temiz") ? "<b>dört katman temiz</b>" : "zincir kontrolü",
  ];
  if (tk.satirlar.length) degerler[2] += `<br>${kacir(tk.satirlar.join(" · "))}`;
  if (!test.gecti) {
    /* KIRMIZI KAPIDA AD GÖRÜNÜR. Ad çıkmıyorsa bu da SÖYLENİR — boş bir
       kırmızı, "sebep yok" izlenimi verirdi. */
    const dusenler = dusenTestSatirlari(test.detay);
    degerler[2] += dusenler.length
      ? `<br><b>düşen:</b> ${kacir(dusenler.slice(0, 5).join(" · "))}${
          dusenler.length > 5 ? ` … +${dusenler.length - 5}` : ""
        }`
      : "<br><b>düşen:</b> ad ayrıştırılamadı — kapı kaydına bakın";
  }
}

const cikti = html({
  paketler,
  git: gd,
  kuyruk,
  kapilar,
  kapiDegerleri: degerler,
  olculdu: !HIZLI,
  uretim: `üretim: ${tarihTR(new Date().toISOString())}`,
  toplamKapi,
});

mkdirSync(path.dirname(CIKTI), { recursive: true });
writeFileSync(CIKTI, cikti, "utf8");
process.stderr.write(`pano: yazıldı → ${CIKTI} (${paketler.length} paket, ${(cikti.length / 1024).toFixed(1)} kB)\n`);
