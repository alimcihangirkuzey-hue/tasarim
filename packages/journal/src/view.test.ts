/* Cockpit Faz 1 — GÖRÜNÜM MODELİ testleri (Canonical 11.3/11.4/11.5).

   BU DOSYA EŞLEMEYİ SINAR, RENDER'I DEĞİL. page.test.ts view.js'ten yalnız TİP
   alır ve modeli elle kurar: HTML'in doğru olduğunu ölçer, modelin doğru
   olduğunu değil. cockpit.test.ts ise diske yazıp okur ve üç olay türü üretir
   (package_declared · note · stage_changed) — `gate_run`, `risk_recorded`,
   `verifier_verdict` o dosyada HİÇ geçmez. Sonuç: view.ts'in dört saf
   fonksiyonu bugüne dek ADIYLA ÇAĞRILMADI. Aradaki boşluk, sınıf damgasının
   ve kapı eşlemesinin sessizce kayabileceği yerdi.

   ÜÇ DOKTRİN:

   1. KAYIT FOLD'DAN GELİR. Girdiler `foldPackageJournal` ile gerçek olay
      akışından türetilir; elle kurulan bir kayıt, akışta üretilemeyen bir
      biçimi sınamış olurdu. Yalnız TEK ALAN yalıtımı gerektiğinde kayıt
      noktasal yamalanır.

   2. TAM EŞİTLİK. Alan başına `toEqual` ile tüm özet/çizelge/kapı listesi
      beklenir. `toContain` bir alanın BAŞKA bir alandan gelmesini (çapraz
      kablolama) göremezdi: `ad`↔`amac` yer değiştirse "içeriyor" hâlâ yeşildi.

   3. KAYNAK METİNLERİ DE SÖZLEŞMEDİR. `kaynak` alanı "bu değer Journal'ın
      hangi alanından geldi" der; sessizce değişmesi 11.3'ün kaynak dürüstlüğü
      hükmünü boşa çıkarır. Bu yüzden metinler birebir pinlenir. */

import { describe, expect, it } from "vitest";
import {
  JOURNAL_GATES,
  JOURNAL_GATE_NAMES,
  JOURNAL_SCHEMA_VERSION,
  JOURNAL_STAGES,
  foldPackageJournal,
  type JournalActor,
  type JournalEvent,
  type JournalGateName,
  type JournalGateRun,
  type JournalLine,
  type JournalPackageDeclared,
  type JournalPackageRecord,
  type JournalStage,
} from "@tezgah/shared";

import {
  anlati,
  buildCockpitView,
  canli,
  canliOkunamadi,
  kapiGorunumleri,
  olcum,
  paketOzeti,
  plan,
  zamanCizelgesi,
  type AsamaAdimi,
  type Canli,
  type CanliOkunamadi,
  type GorunumGirdisi,
  type PaketOzeti,
  type Plan,
} from "./view.js";

/* ── Ortak kurgu ──────────────────────────────────────────────────────── */

const AJAN: JournalActor = { kind: "agent", id: "uygulayici:opus", role: "uygulayici" };

const hex = (n: number): string => n.toString(16).padStart(64, "0");
const TS = (i: number): string => `2026-07-19T09:00:${String(i).padStart(2, "0")}.000Z`;

/** Zarf elle tutarlı yazılır: fold zinciri DOĞRULAMAZ, yalnız okur. */
function satirlar(events: JournalEvent[], pkg: string): JournalLine[] {
  return events.map((event, i) => {
    const line = {
      ...event,
      v: JOURNAL_SCHEMA_VERSION,
      package_id: pkg,
      seq: i + 1,
      ts: TS(i),
      actor: AJAN,
      prev: i === 0 ? null : hex(i),
      hash: hex(i + 1),
    };
    return line as JournalLine;
  });
}

const kayit = (events: JournalEvent[], pkg = "PJ-K3"): JournalPackageRecord =>
  foldPackageJournal(satirlar(events, pkg));

/* — olay kısaltmaları — */

const KIMLIK: JournalPackageDeclared = {
  name: "K3 · Cockpit Faz 1",
  purpose: "Salt-okunur geliştirme yüzeyi",
  canonical_version: "4.1.0",
  /* Altı dizi de BİRBİRİNDEN FARKLI: ikisi aynı olsaydı çapraz kablolama
     (bolumler↔moduller) görünmezdi. Hiçbiri boş bırakılmaz — boş dizi de
     ayırt edilemeyen bir değerdir. */
  canonical_sections: ["11.3", "11.4"],
  adr_tdr: ["ADR-011"],
  modules: ["packages/journal"],
  contracts: ["CockpitGorunumu"],
  scope_in: ["okuma"],
  scope_out: ["yazma"],
  risk_class: "orta",
};

const PD: JournalEvent = { type: "package_declared", payload: KIMLIK };

const gec = (from: JournalStage | null, to: JournalStage): JournalEvent => ({
  type: "stage_changed",
  payload: { from, to },
});

const not = (text: string): JournalEvent => ({ type: "note", payload: { text } });

const risk = (risk_id: string, status: "acik" | "kapali", summary: string): JournalEvent => ({
  type: "risk_recorded",
  payload: { risk_id, status, summary },
});

const verdict = (
  decision: "onay" | "bulgu",
  findings_open: number,
  findings_closed: number
): JournalEvent => ({
  type: "verifier_verdict",
  payload: { decision, findings_open, findings_closed, summary: "doğrulayıcı turu" },
});

const kapi = (payload: JournalGateRun): JournalEvent => ({ type: "gate_run", payload });

const kosum = (patch: Partial<JournalGateRun> & { gate: JournalGateName }): JournalGateRun => ({
  outcome: "gecti",
  origin: "olculdu",
  command: "npm run typecheck",
  cwd: "C:/Users/MacBook/tasarim",
  tool: { name: "tsc", version: "5.6.3" },
  runner_platform: "win32/node24.15.0/npm11.12.1",
  exit_code: 0,
  measured_at: "2026-07-19T23:40:11.000Z",
  duration_ms: 8421,
  values: null,
  method: null,
  evidence: null,
  reason: null,
  raw_evidence: null,
  raw_sha256: null,
  ...patch,
});

/* ── (1) paketOzeti ───────────────────────────────────────────────────── */

/**
 * Merge'e ULAŞMIŞ zengin akış. On iki özet alanının kaynakları KASTEN
 * birbirinden ayrık değerler taşır: 14 olay · 8 aşama adımı · 2 not ·
 * açık bulgu 3 ≠ kapalı bulgu 7 · açık risk 2 ≠ kapalı risk 1, ve üç ayrı
 * zaman damgası (başlangıç ≠ bitiş ≠ son olay). Sayılar çakışsaydı
 * `olay_sayisi ← stage_history.length` gibi bir sapma yeşil kalırdı.
 */
const TAM_AKIS: JournalEvent[] = [
  PD /*                                     1 · TS(0) → started_at */,
  gec(null, "planlama") /*                  2 · TS(1) */,
  gec("planlama", "canonical-kaydi") /*     3 · TS(2) */,
  gec("canonical-kaydi", "gelistirme") /*   4 · TS(3) */,
  gec("gelistirme", "test") /*              5 · TS(4) */,
  gec("test", "ikinci-dogrulayici") /*      6 · TS(5) */,
  verdict("bulgu", 3, 7) /*                 7 · TS(6) */,
  risk("R-1", "acik", "vite stdout ayrıştırılmıyor") /*  8 · TS(7) */,
  risk("R-2", "acik", "plan bayatlığı ölçülemiyor") /*   9 · TS(8) */,
  risk("R-3", "kapali", "kilit yarışı kapandı") /*      10 · TS(9) */,
  not("kapasite uyarısı eklendi") /*       11 · TS(10) */,
  gec("ikinci-dogrulayici", "hazir") /*    12 · TS(11) */,
  gec("hazir", "merge") /*                 13 · TS(12) → finished_at */,
  not("merge sonrası tutanak") /*          14 · TS(13) → last_event_ts */,
];

const TAM = kayit(TAM_AKIS);

const TAM_OZET: PaketOzeti = {
  package_id: "PJ-K3",
  ad: "K3 · Cockpit Faz 1",
  amac: "Salt-okunur geliştirme yüzeyi",
  baslangic: TS(0),
  bitis: TS(12),
  asama: "merge",
  olay_sayisi: 14,
  son_olay_ts: TS(13),
  dogrulayici_karari: "bulgu",
  dogrulayici_acik_bulgu: 3,
  /* Bu akışta hiç `verifier_finding` OLAYI yok: karar 3 açık bulgu BEYAN
     ediyor ama kayıtlı bulgu olayı sıfır. İkisinin ayrı durması bilinçli —
     beyan ile kayıt arasındaki fark tek başına bir sinyaldir. */
  dogrulayici_kayitli_bulgu: 0,
  acik_risk: 2,
  kapali_risk: 1,
};

/* KAYITLI BULGU ≠ BEYAN EDİLEN BULGU — adversarial turun bulduğu kusurun
   gerileme testi. Önceki hâlde bulgu sayısı YALNIZ karardan doluyordu ve
   `verifier_finding` olayları hiçbir yere düşmüyordu; sonuç: üç blocker
   kaydedilmiş ama karar henüz yazılmamış bir paket, hiç bulgu çıkmamış
   paketle AYNI görünüyordu. Doğrulama turunun en riskli anı "temiz" okunurdu. */
describe("paketOzeti — kaydedilen bulgu, kararın beyanından BAĞIMSIZ sayılır", () => {
  const bulgu = (id: string, severity: "blocker" | "ciddi" | "kucuk"): JournalEvent => ({
    type: "verifier_finding",
    payload: { finding_id: id, severity, summary: `${id} özeti`, file: null },
  });

  it("karar YOKKEN kaydedilmiş bulgular görünür (0 göstermez)", () => {
    const r = kayit([
      { type: "package_declared", payload: KIMLIK },
      bulgu("B-1", "blocker"),
      bulgu("B-2", "blocker"),
      bulgu("B-3", "ciddi"),
    ]);
    const o = paketOzeti(r);
    expect(o.dogrulayici_kayitli_bulgu).toBe(3);
    /* Karar yok: beyan da yok. İkisi ayrı alanlardır ve biri diğerini örtmez. */
    expect(o.dogrulayici_karari).toBeNull();
    expect(o.dogrulayici_acik_bulgu).toBe(0);
  });

  it("hiç bulgu olayı yoksa sıfırdır (uydurulmaz)", () => {
    const r = kayit([{ type: "package_declared", payload: KIMLIK }]);
    expect(paketOzeti(r).dogrulayici_kayitli_bulgu).toBe(0);
  });
});

describe("paketOzeti — on iki alanın HER BİRİ kendi kaynağından gelir", () => {
  it("zengin kayıt tam olarak beklenen özete indirgenir", () => {
    expect(paketOzeti(TAM)).toEqual(TAM_OZET);
  });

  /**
   * Alan başına YALITIM: kaynakta tek alan değişir, çıktının TAMAMI beklenir.
   * Bir alan başka bir alandan okunuyorsa (çapraz kablolama) beklenen nesne
   * iki yerden birden sapar ve tam eşitlik düşer.
   */
  const VAKALAR: {
    ad: string;
    yama: (r: JournalPackageRecord) => JournalPackageRecord;
    bekle: Partial<PaketOzeti>;
  }[] = [
    {
      ad: "package_id ← rec.package_id",
      yama: (r) => ({ ...r, package_id: "PJ-BASKA" }),
      bekle: { package_id: "PJ-BASKA" },
    },
    {
      ad: "ad ← identity.name (purpose DEĞİL)",
      yama: (r) => ({ ...r, identity: r.identity && { ...r.identity, name: "BAŞKA AD" } }),
      bekle: { ad: "BAŞKA AD" },
    },
    {
      ad: "amac ← identity.purpose (name DEĞİL)",
      yama: (r) => ({ ...r, identity: r.identity && { ...r.identity, purpose: "BAŞKA AMAÇ" } }),
      bekle: { amac: "BAŞKA AMAÇ" },
    },
    {
      ad: "baslangic ← rec.started_at",
      yama: (r) => ({ ...r, started_at: "2020-01-01T00:00:00.000Z" }),
      bekle: { baslangic: "2020-01-01T00:00:00.000Z" },
    },
    {
      ad: "bitis ← rec.finished_at",
      yama: (r) => ({ ...r, finished_at: "2030-01-01T00:00:00.000Z" }),
      bekle: { bitis: "2030-01-01T00:00:00.000Z" },
    },
    {
      ad: "asama ← rec.stage",
      yama: (r) => ({ ...r, stage: "dagitim" }),
      bekle: { asama: "dagitim" },
    },
    {
      ad: "olay_sayisi ← rec.event_count (stage_history.length DEĞİL)",
      yama: (r) => ({ ...r, event_count: 99 }),
      bekle: { olay_sayisi: 99 },
    },
    {
      ad: "son_olay_ts ← rec.last_event_ts",
      yama: (r) => ({ ...r, last_event_ts: "2031-02-03T04:05:06.000Z" }),
      bekle: { son_olay_ts: "2031-02-03T04:05:06.000Z" },
    },
    {
      ad: "dogrulayici_karari ← verifier.decision",
      yama: (r) => ({ ...r, verifier: { ...r.verifier, decision: "onay" } }),
      bekle: { dogrulayici_karari: "onay" },
    },
    {
      ad: "dogrulayici_acik_bulgu ← verifier.findings_open (findings_closed DEĞİL)",
      yama: (r) => ({ ...r, verifier: { ...r.verifier, findings_open: 41 } }),
      bekle: { dogrulayici_acik_bulgu: 41 },
    },
    {
      ad: "acik_risk ← open_risks.length (closed_risks DEĞİL)",
      yama: (r) => ({ ...r, open_risks: [] }),
      bekle: { acik_risk: 0 },
    },
    {
      ad: "kapali_risk ← closed_risks.length (open_risks DEĞİL)",
      yama: (r) => ({ ...r, closed_risks: [] }),
      bekle: { kapali_risk: 0 },
    },
  ];

  it.each(VAKALAR)("$ad", ({ yama, bekle }) => {
    expect(paketOzeti(yama(TAM))).toEqual({ ...TAM_OZET, ...bekle });
  });

  it("identity null → ad ve amac NULL; varsayılan UYDURULMAZ", () => {
    expect(paketOzeti({ ...TAM, identity: null })).toEqual({ ...TAM_OZET, ad: null, amac: null });
  });

  it("package_declared'sız gerçek akışta da kimlik alanları null kalır", () => {
    /* Yamalanmış kayıt değil, fold'un kendi ürettiği kimliksiz kayıt:
       akışta package_declared yoksa started_at da yazılmaz. */
    const rec = kayit([gec(null, "planlama"), not("kimliksiz akış")], "PJ-KIMLIKSIZ");
    expect(paketOzeti(rec)).toEqual({
      package_id: "PJ-KIMLIKSIZ",
      ad: null,
      amac: null,
      baslangic: null,
      bitis: null,
      asama: "planlama",
      olay_sayisi: 2,
      son_olay_ts: TS(1),
      dogrulayici_karari: null,
      dogrulayici_acik_bulgu: 0,
      dogrulayici_kayitli_bulgu: 0,
      acik_risk: 0,
      kapali_risk: 0,
    });
  });

  it("bitis MERGE geçişinin anıdır — son olayın anı DEĞİL", () => {
    /* TS(12) merge geçişi, TS(13) ondan sonraki not. İkisi ayrı tutulmasaydı
       "bitis ← last_event_ts" sapması ölçülemezdi. */
    expect(paketOzeti(TAM).bitis).toBe(TS(12));
    expect(paketOzeti(TAM).son_olay_ts).toBe(TS(13));
  });

  it("merge'e ULAŞMAMIŞ paketin bitisi NULL kalır — TAHMİNİ BİTİŞ ÜRETİLMEZ (11.3)", () => {
    const rec = kayit(
      [
        PD,
        gec(null, "planlama"),
        gec("planlama", "canonical-kaydi"),
        gec("canonical-kaydi", "gelistirme"),
        gec("gelistirme", "test"),
        gec("test", "ikinci-dogrulayici"),
        gec("ikinci-dogrulayici", "hazir"),
        not("hazır ama merge edilmedi"),
      ],
      "PJ-BITMEMIS"
    );
    const ozet = paketOzeti(rec);
    /* Ortada dolu üç aday var (başlangıç · son olay · son aşama anı);
       hiçbiri bitişe kopyalanmaz. */
    expect(ozet.bitis).toBeNull();
    expect(ozet.asama).toBe("hazir");
    expect(ozet.baslangic).toBe(TS(0));
    expect(ozet.son_olay_ts).toBe(TS(7));
  });

  it("boş kayıt çökmez; sayılar 0, damgalar null", () => {
    expect(paketOzeti(foldPackageJournal([]))).toEqual({
      package_id: "",
      ad: null,
      amac: null,
      baslangic: null,
      bitis: null,
      asama: null,
      olay_sayisi: 0,
      son_olay_ts: null,
      dogrulayici_karari: null,
      dogrulayici_acik_bulgu: 0,
      dogrulayici_kayitli_bulgu: 0,
      acik_risk: 0,
      kapali_risk: 0,
    });
  });

  it("özet SAFTIR: kayıt üstünde hiçbir alan değişmez", () => {
    const anlik = JSON.stringify(TAM);
    paketOzeti(TAM);
    expect(JSON.stringify(TAM)).toBe(anlik);
  });
});

/* ── (2) zamanCizelgesi ───────────────────────────────────────────────── */

/**
 * GERİ DÖNÜŞLÜ akış: doğrulayıcı bulgu çıkarır, paket gelistirme'ye döner ve
 * test'e yeniden gelir. `test` ve `gelistirme` İKİ KEZ ziyaret edilir; geri
 * dönüş TERK EDİLEN aşamaya (`ikinci-dogrulayici`) yazılır.
 */
const GERI = kayit(
  [
    PD /*                                     1 · TS(0) */,
    gec(null, "planlama") /*                  2 · TS(1) */,
    gec("planlama", "canonical-kaydi") /*     3 · TS(2) */,
    gec("canonical-kaydi", "gelistirme") /*   4 · TS(3) · gelistirme İLK varış */,
    gec("gelistirme", "test") /*              5 · TS(4) · test İLK varış */,
    gec("test", "ikinci-dogrulayici") /*      6 · TS(5) */,
    gec("ikinci-dogrulayici", "gelistirme") /* 7 · TS(6) · GERİ dönüş */,
    gec("gelistirme", "test") /*              8 · TS(7) · test İKİNCİ varış */,
  ],
  "PJ-GERI"
);

const adim = (cizelge: AsamaAdimi[], ad: JournalStage): AsamaAdimi => {
  const bulunan = cizelge.find((a) => a.asama === ad);
  if (bulunan === undefined) throw new Error(`çizelgede yok: ${ad}`);
  return bulunan;
};

describe("zamanCizelgesi — 11.5'in sekiz aşaması, geri dönüş dâhil", () => {
  it("SEKİZ aşama DAİMA döner ve sıra JOURNAL_STAGES'tendir (biri bile eksilmez)", () => {
    for (const rec of [TAM, GERI, foldPackageJournal([])]) {
      expect(zamanCizelgesi(rec).map((a) => a.asama)).toEqual([...JOURNAL_STAGES]);
      expect(zamanCizelgesi(rec)).toHaveLength(8);
    }
  });

  it("geri dönüşlü akış TAM olarak pinlenir (ts · durum · ziyaret · geri_donus)", () => {
    expect(zamanCizelgesi(GERI)).toEqual([
      { asama: "planlama", ts: TS(1), durum: "gecildi", ziyaret: 1, geri_donus: 0 },
      { asama: "canonical-kaydi", ts: TS(2), durum: "gecildi", ziyaret: 1, geri_donus: 0 },
      { asama: "gelistirme", ts: TS(3), durum: "gecildi", ziyaret: 2, geri_donus: 0 },
      { asama: "test", ts: TS(4), durum: "simdi", ziyaret: 2, geri_donus: 0 },
      { asama: "ikinci-dogrulayici", ts: TS(5), durum: "gecildi", ziyaret: 1, geri_donus: 1 },
      { asama: "hazir", ts: null, durum: "bekliyor", ziyaret: 0, geri_donus: 0 },
      { asama: "merge", ts: null, durum: "bekliyor", ziyaret: 0, geri_donus: 0 },
      { asama: "dagitim", ts: null, durum: "bekliyor", ziyaret: 0, geri_donus: 0 },
    ]);
  });

  it("İLK VARIŞ DEĞİŞMEZİ: ikinci kez gelinen aşamanın ts'i KAYMAZ", () => {
    /* Bu tek satır, çizelgenin "ne zaman ulaşıldı" iddiasının tamamıdır.
       Guard kalkarsa son varış kazanır ve aşama, geri dönüşten SONRAKİ anı
       ilk ulaşma anı gibi gösterir — ekran paketi olduğundan taze anlatır. */
    const c = zamanCizelgesi(GERI);
    expect(adim(c, "test").ts).toBe(TS(4));
    expect(adim(c, "test").ts).not.toBe(TS(7));
    expect(adim(c, "gelistirme").ts).toBe(TS(3));
    expect(adim(c, "gelistirme").ts).not.toBe(TS(6));
    /* Ziyaret sayacı ise İKİ: ilk varış sabit, tekrar GÖRÜNÜR kalıyor */
    expect(adim(c, "test").ziyaret).toBe(2);
    expect(adim(c, "gelistirme").ziyaret).toBe(2);
  });

  it("geri_donus TERK EDİLEN aşamaya yazılır, gidilene değil", () => {
    const c = zamanCizelgesi(GERI);
    expect(adim(c, "ikinci-dogrulayici").geri_donus).toBe(1);
    /* Dönülen aşama sayacı ALMAZ — yoksa "buradan geri gönderildi" cümlesi
       yanlış aşamanın altında görünürdü */
    expect(adim(c, "gelistirme").geri_donus).toBe(0);
    expect(c.reduce((t, a) => t + a.geri_donus, 0)).toBe(1);
  });

  it("uğranmamış aşama: ziyaret 0 · ts null · bekliyor", () => {
    const c = zamanCizelgesi(GERI);
    for (const ad of ["hazir", "merge", "dagitim"] as const) {
      expect(adim(c, ad).ziyaret, ad).toBe(0);
      expect(adim(c, ad).ts, ad).toBeNull();
      expect(adim(c, ad).durum, ad).toBe("bekliyor");
    }
  });

  it("SİMETRİK NEGATİF: düz ilerleyen pakette geri_donus 0 ve ziyaret>1 YOK", () => {
    const c = zamanCizelgesi(TAM);
    expect(c.map((a) => a.geri_donus)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(c.filter((a) => a.ziyaret > 1)).toEqual([]);
    expect(c.map((a) => a.ziyaret)).toEqual([1, 1, 1, 1, 1, 1, 1, 0]);
  });

  it("durum: 'simdi' YALNIZ rec.stage'e bakar — ziyaret geçmişine değil", () => {
    /* Hiç uğranmamış bir aşama "şimdi" yapılır: durum kararı stage'den
       okunuyorsa bu aşama ts'siz ve ziyaretsiz "simdi" görünür, diğerleri
       "gecildi"ye düşer. Karar varış haritasından okunuyor olsaydı 'simdi'
       hiç görünmezdi. */
    const c = zamanCizelgesi({ ...GERI, stage: "dagitim" });
    expect(c.filter((a) => a.durum === "simdi")).toEqual([
      { asama: "dagitim", ts: null, durum: "simdi", ziyaret: 0, geri_donus: 0 },
    ]);
    expect(adim(c, "test").durum).toBe("gecildi");
    expect(c.map((a) => a.durum)).toEqual([
      "gecildi",
      "gecildi",
      "gecildi",
      "gecildi",
      "gecildi",
      "bekliyor",
      "bekliyor",
      "simdi",
    ]);
  });

  it("stage null iken hiçbir aşama 'simdi' değildir", () => {
    const c = zamanCizelgesi({ ...GERI, stage: null });
    expect(c.filter((a) => a.durum === "simdi")).toEqual([]);
    expect(adim(c, "test").durum).toBe("gecildi");
  });

  it("geçmişsiz kayıt: sekiz aşama da boş ve 'bekliyor'", () => {
    expect(zamanCizelgesi(foldPackageJournal([]))).toEqual(
      JOURNAL_STAGES.map((asama) => ({
        asama,
        ts: null,
        durum: "bekliyor",
        ziyaret: 0,
        geri_donus: 0,
      }))
    );
  });

  it("from=null adımı geri sayılmaz (açılış geçişi bir dönüş değildir)", () => {
    /* Elle kurulmuş SINIR kaydı: fold from=null'a daima 'ileri' yazar, bu yüzden
       bu biçim yalnız kayıt elle üretilirse doğar. Çizelge yine de çökmemeli
       ve geri dönüş sayacı hiçbir aşamaya yazılmamalı. */
    const rec: JournalPackageRecord = {
      ...foldPackageJournal([]),
      stage: "planlama",
      stage_history: [
        { from: null, to: "planlama", ts: TS(1), actor: AJAN, direction: "geri" },
      ],
    };
    const c = zamanCizelgesi(rec);
    expect(c.map((a) => a.geri_donus)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(adim(c, "planlama")).toEqual({
      asama: "planlama",
      ts: TS(1),
      durum: "simdi",
      ziyaret: 1,
      geri_donus: 0,
    });
  });

  it("çizelge SAFTIR: kayıt üstünde hiçbir alan değişmez", () => {
    const anlik = JSON.stringify(GERI);
    zamanCizelgesi(GERI);
    expect(JSON.stringify(GERI)).toBe(anlik);
  });
});

/* ── (3) kapiGorunumleri ──────────────────────────────────────────────── */

const TYPECHECK = kosum({ gate: "typecheck" });
const LINT_KALDI = kosum({
  gate: "lint",
  outcome: "kaldi",
  command: "npx eslint . --format json -o <tmp>",
  exit_code: 1,
  tool: { name: "eslint", version: "9.39.5" },
  values: { problems: 7, files: 128 },
  method: "eslint --format json errorCount+warningCount",
  raw_evidence: "docs/journal/evidence/PJ-K3/lint-kaldi.txt",
  raw_sha256: hex(0xbeef),
});
const TEST_ATLANDI = kosum({
  gate: "test",
  outcome: "atlandi",
  command: null,
  exit_code: null,
  measured_at: null,
  reason: "bu turda kod değişmedi",
});
const BUNDLE_OLCULEMEDI = kosum({
  gate: "bundle",
  outcome: "olculemedi",
  command: "npm run build -w apps/web",
  exit_code: null,
  reason: "vite stdout'u ayrıştırılamadı",
});

/** Dört outcome'ın DÖRDÜ de temsilli; üç kapı bilerek YAZILMAMIŞ. */
const KAPILI = kayit(
  [PD, kapi(TYPECHECK), kapi(LINT_KALDI), kapi(TEST_ATLANDI), kapi(BUNDLE_OLCULEMEDI)],
  "PJ-KAPI"
);

describe("kapiGorunumleri — kütük TAM listedir, eksik olan GÖRÜNÜR kalır", () => {
  it("koşulmamış kapılar dâhil TÜM kütük döner (sayı ve sıra JOURNAL_GATE_NAMES)", () => {
    const g = kapiGorunumleri(KAPILI);
    expect(g).toHaveLength(JOURNAL_GATE_NAMES.length);
    expect(g.map((k) => k.ad)).toEqual(JOURNAL_GATE_NAMES);
    /* Hiç kapı koşulmamış pakette de liste KISALMAZ */
    expect(kapiGorunumleri(foldPackageJournal([])).map((k) => k.ad)).toEqual(JOURNAL_GATE_NAMES);
  });

  it("koşulmamış kapı: kosum null ve durum 'yazilmadi' ('olculemedi' DEĞİL)", () => {
    const g = kapiGorunumleri(foldPackageJournal([]));
    expect(g.map((k) => k.durum)).toEqual(JOURNAL_GATE_NAMES.map(() => "yazilmadi"));
    expect(g.map((k) => k.kosum)).toEqual(JOURNAL_GATE_NAMES.map(() => null));
    /* 11.3'ün titiz ayrımı: hiç yazılmamış kapı ÖLÇÜLEMEMİŞ sayılmaz */
    expect(g.filter((k) => k.durum === "olculemedi")).toEqual([]);
  });

  it("DÖRT outcome'ın HER BİRİ ayrı ayrı taşınır; yazılmayanlar araya karışmaz", () => {
    /* Sıra da pinlenir: build (yazılmamış) tam olarak test ile bundle
       ARASINDA durur — liste yeniden sıralanırsa bu satır kırılır. */
    expect(kapiGorunumleri(KAPILI).map((k) => [k.ad, k.durum])).toEqual([
      ["typecheck", "gecti"],
      ["lint", "kaldi"],
      ["test", "atlandi"],
      ["build", "yazilmadi"],
      ["bundle", "olculemedi"],
      ["gt", "yazilmadi"],
      ["smoke", "yazilmadi"],
    ]);
  });

  it("kosum kaydın gates sözlüğünden BİREBİR taşınır (alan düşmez)", () => {
    const g = kapiGorunumleri(KAPILI);
    expect(g[0].kosum).toEqual(TYPECHECK);
    expect(g[1].kosum).toEqual(LINT_KALDI);
    expect(g[2].kosum).toEqual(TEST_ATLANDI);
    expect(g[4].kosum).toEqual(BUNDLE_OLCULEMEDI);
    expect(g[3].kosum).toBeNull();
  });

  it("kapsam · insan · sayi_uretmeli · referans_komut KÜTÜKTEN okunur", () => {
    /* Sabit metin YAZILMAZ: kapsam şerhi JOURNAL_GATES'te tek kaynakta durur;
       burada kopyalansaydı iki kaynak zamanla ayrışır ve test ekrandakinden
       başka bir kapsamı doğrulardı. */
    for (const k of kapiGorunumleri(KAPILI)) {
      const spec = JOURNAL_GATES[k.ad];
      expect(k.kapsam, k.ad).toBe(spec.scope);
      expect(k.kapsam.length, k.ad).toBeGreaterThan(0);
      expect(k.insan, k.ad).toBe(spec.human);
      expect(k.sayi_uretmeli, k.ad).toBe(spec.produces_values);
      expect(k.referans_komut, k.ad).toBe(spec.command);
    }
  });

  it("üç bayrağın AYRIK olduğu kapılar tek tek doğrulanır (kütükle aynı yönde değil)", () => {
    /* Kütükten okuma iddiası tek başına yetmez: insan↔sayi_uretmeli karışsa
       typecheck'te (false/false) fark görünmezdi. Aşağıdaki üç kapı üç ayrı
       kombinasyon taşır. */
    const g = kapiGorunumleri(KAPILI);
    const bul = (ad: JournalGateName): (typeof g)[number] => {
      const k = g.find((x) => x.ad === ad);
      if (k === undefined) throw new Error(`kapı yok: ${ad}`);
      return k;
    };

    /* makine · sayı üretir · komutu var */
    expect(bul("lint").insan).toBe(false);
    expect(bul("lint").sayi_uretmeli).toBe(true);
    expect(bul("lint").referans_komut).toBe("npx eslint . --format json -o <tmp>");

    /* makine · sayısızlığı MEŞRU (başarısı sessiz) */
    expect(bul("typecheck").insan).toBe(false);
    expect(bul("typecheck").sayi_uretmeli).toBe(false);

    /* insan · otomatik ölçümü YOK → referans komut null, ama kapsam yine dolu */
    expect(bul("gt").insan).toBe(true);
    expect(bul("gt").sayi_uretmeli).toBe(false);
    expect(bul("gt").referans_komut).toBeNull();
    expect(bul("gt").kapsam.length).toBeGreaterThan(0);
    /* Yazılmamış olmasına rağmen kart ne ölçmediğini SÖYLEYEBİLİYOR */
    expect(bul("gt").durum).toBe("yazilmadi");
  });

  it("aynı kapı iki kez koşulmuşsa SON koşum görünür", () => {
    const ilk = kosum({ gate: "test", values: { tests: 606 }, method: "vitest stdout" });
    const son = kosum({
      gate: "test",
      outcome: "kaldi",
      exit_code: 1,
      values: { tests: 629 },
      method: "vitest stdout",
      measured_at: "2026-07-19T23:59:59.000Z",
    });
    const rec = kayit([PD, kapi(ilk), kapi(son)], "PJ-IKIKEZ");
    const k = kapiGorunumleri(rec).find((x) => x.ad === "test");
    expect(k?.durum).toBe("kaldi");
    expect(k?.kosum).toEqual(son);
    expect(k?.kosum).not.toEqual(ilk);
  });

  it("kapı görünümü SAFTIR: kayıt üstünde hiçbir alan değişmez", () => {
    const anlik = JSON.stringify(KAPILI);
    kapiGorunumleri(KAPILI);
    expect(JSON.stringify(KAPILI)).toBe(anlik);
  });
});

/* ── (4) buildCockpitView ─────────────────────────────────────────────── */

const URETILDI = "2026-07-20T08:15:00.000Z";
const DIZIN = "/tmp/tezgah/journal/events";

const GIT_CANLI: Canli<{ dal: string; head: string; temiz: boolean; degisen: number }> = {
  sinif: "canli",
  deger: { dal: "feature/cockpit-p1-readonly", head: "d46b877", temiz: false, degisen: 2 },
  okundu: URETILDI,
  komut: "git rev-parse --abbrev-ref HEAD · git status --porcelain",
};

const GIT_DUSTU: CanliOkunamadi = {
  sinif: "canli-okunamadi",
  sebep: "git durumu okunamadı: gitDurumu() null döndü",
  okundu: URETILDI,
  komut: "git rev-parse --abbrev-ref HEAD",
};

const PLANLAR: Plan<{ baslik: string; satirlar: string[] }>[] = [
  {
    sinif: "plan",
    deger: { baslik: "docs/ROADMAP.md", satirlar: ["- T3 PART-B ◀ şimdi"] },
    kaynak: "docs/ROADMAP.md",
    guncellendi: "2026-07-14T03:32:59+03:00",
    geride_commit: 42,
    olcum_notu: "taban refs/heads/main",
    okundu: URETILDI,
  },
];

const girdi = (yama: Partial<GorunumGirdisi> = {}): GorunumGirdisi => ({
  uretildi: URETILDI,
  aktif: TAM,
  hepsi: [TAM],
  git: GIT_CANLI,
  plan: PLANLAR,
  journal_dizini: DIZIN,
  ...yama,
});

/** notlar BU LİSTEDE DEĞİLDİR: ANLATI sınıfıdır (11.4). */
const OLCUM_ALANLARI = [
  "aktif_paket",
  "zaman_cizelgesi",
  "kapilar",
  "izlenebilirlik",
  "gecmis",
  "riskler",
] as const;

describe("buildCockpitView — SINIF EŞLEMESİ (modülün merkezi tezi)", () => {
  it("ölçüm alanlarının HEPSİ sinif:'olcum' ve BOŞ OLMAYAN kaynak taşır", () => {
    const g = buildCockpitView(girdi());
    for (const ad of OLCUM_ALANLARI) {
      expect(g[ad].sinif, ad).toBe("olcum");
      expect(typeof g[ad].kaynak, ad).toBe("string");
      expect(g[ad].kaynak.trim().length, ad).toBeGreaterThan(0);
    }
  });

  it("KARŞI YÖN: hiçbir ölçüm alanı 'plan' ya da 'anlati' sınıfı taşımaz", () => {
    const g = buildCockpitView(girdi());
    for (const ad of OLCUM_ALANLARI) {
      expect(g[ad].sinif, ad).not.toBe("anlati");
      expect(g[ad].sinif, ad).not.toBe("plan");
      expect(g[ad].sinif, ad).not.toBe("canli");
    }
  });

  it("notlar ANLATI'dır — 'olcum' DEĞİL — ve içeriği notlardan gelir", () => {
    const g = buildCockpitView(girdi());
    expect(g.notlar.sinif).toBe("anlati");
    expect(g.notlar.sinif).not.toBe("olcum");
    expect(g.notlar).toEqual({
      sinif: "anlati",
      kaynak: "note olayları",
      deger: [
        { text: "kapasite uyarısı eklendi", ts: TS(10) },
        { text: "merge sonrası tutanak", ts: TS(13) },
      ],
    });
    /* Aktörü DÜŞÜRÜR: anlatı kartı yalnız cümle ve an taşır */
    expect(Object.keys(g.notlar.deger[0]).sort()).toEqual(["text", "ts"]);
  });

  it("her ölçüm alanının KAYNAK metni Journal'daki karşılığını adıyla söyler", () => {
    /* Metinler pinlidir: `kaynak` bir iddiadır ve sessizce değişmesi 11.3'ün
       kaynak dürüstlüğünü boşa çıkarır. gecmis ayrı sınanır (yol türetir). */
    const g = buildCockpitView(girdi());
    expect(g.aktif_paket.kaynak).toBe("foldPackageJournal()");
    expect(g.zaman_cizelgesi.kaynak).toBe("stage_changed olayları");
    expect(g.kapilar.kaynak).toBe("gate_run olayları");
    expect(g.izlenebilirlik.kaynak).toBe("package_declared olayı");
    expect(g.riskler.kaynak).toBe("risk_recorded olayları (açık olanlar)");
    expect(g.notlar.kaynak).toBe("note olayları");
  });

  it("ölçüm alanlarının DEĞERİ saf fonksiyonların çıktısıyla aynıdır", () => {
    const g = buildCockpitView(girdi());
    expect(g.aktif_paket.deger).toEqual(TAM_OZET);
    expect(g.zaman_cizelgesi.deger).toEqual(zamanCizelgesi(TAM));
    expect(g.kapilar.deger.map((k) => k.ad)).toEqual(JOURNAL_GATE_NAMES);
    expect(g.uretildi).toBe(URETILDI);
  });

  it("izlenebilirlik sekiz alanı identity'den BİREBİR alır (çapraz kablolama yok)", () => {
    expect(buildCockpitView(girdi()).izlenebilirlik.deger).toEqual({
      canonical_version: "4.1.0",
      bolumler: ["11.3", "11.4"],
      adr_tdr: ["ADR-011"],
      moduller: ["packages/journal"],
      sozlesmeler: ["CockpitGorunumu"],
      kapsam_ic: ["okuma"],
      kapsam_dis: ["yazma"],
      risk_sinifi: "orta",
    });
  });

  it("riskler YALNIZ AÇIK olanlardır; kapalı risk listeye sızmaz", () => {
    expect(buildCockpitView(girdi()).riskler.deger).toEqual([
      { risk_id: "R-1", summary: "vite stdout ayrıştırılmıyor", ts: TS(7) },
      { risk_id: "R-2", summary: "plan bayatlığı ölçülemiyor", ts: TS(8) },
    ]);
    /* Kapalı riskin sayısı özette DURUYOR ama listede YOK — iki alan
       birbirinin yerine geçmez */
    expect(buildCockpitView(girdi()).aktif_paket.deger?.kapali_risk).toBe(1);
  });

  it("gecmis TÜM paketleri girdi sırasıyla taşır (aktif olan da dâhil)", () => {
    const oteki = kayit([PD, not("başka paket")], "PJ-OTEKI");
    const g = buildCockpitView(girdi({ hepsi: [TAM, oteki] }));
    expect(g.gecmis.deger.map((p) => p.package_id)).toEqual(["PJ-K3", "PJ-OTEKI"]);
    expect(g.gecmis.deger[0]).toEqual(TAM_OZET);
    /* Sıralama BU KATMANIN İŞİ DEĞİL: girdi sırası aynen korunur */
    const ters = buildCockpitView(girdi({ hepsi: [oteki, TAM] }));
    expect(ters.gecmis.deger.map((p) => p.package_id)).toEqual(["PJ-OTEKI", "PJ-K3"]);
  });
});

describe("buildCockpitView — gecmis.kaynak GERÇEK okuma dizininden türer", () => {
  it("sabit yol DEĞİL: dizin değişince kaynak da değişir", () => {
    expect(buildCockpitView(girdi()).gecmis.kaynak).toBe("/tmp/tezgah/journal/events/*.jsonl");
    expect(buildCockpitView(girdi({ journal_dizini: "/baska/yer" })).gecmis.kaynak).toBe(
      "/baska/yer/*.jsonl"
    );
    /* Faz 0'ın sabit yolu geri gelirse bu satır kırmızıya döner */
    expect(buildCockpitView(girdi()).gecmis.kaynak).not.toBe("docs/journal/events/*.jsonl");
  });

  it("AYRAÇLAR TEKLEŞİR: Windows yolundaki ters bölüler düz bölüye çevrilir", () => {
    const g = buildCockpitView(
      girdi({ journal_dizini: "C:\\Users\\MacBook\\tasarim\\docs\\journal\\events" })
    );
    expect(g.gecmis.kaynak).toBe("C:/Users/MacBook/tasarim/docs/journal/events/*.jsonl");
    /* Karışık yol (…\events/*.jsonl) bir daha üretilmez */
    expect(g.gecmis.kaynak).not.toContain("\\");
  });

  it("ÖLÇÜLEN SINIR: dizin sonda ayraç taşırsa çift bölü kalır (kayıtlı kusur)", () => {
    /* `replace` yalnız ters bölüyü düz bölüye ÇEVİRİR; ardışık ayraçları
       SIKIŞTIRMAZ. paths.js bugün sonda ayraç üretmiyor, bu yüzden canlıda
       görünmez — ama sözleşme bunu yasaklamıyor. Davranış burada ölçülüp
       kayda geçiriliyor; düzeltilirse bu satır bilerek kırılacak. */
    expect(buildCockpitView(girdi({ journal_dizini: "/tmp/j/" })).gecmis.kaynak).toBe(
      "/tmp/j//*.jsonl"
    );
    expect(buildCockpitView(girdi({ journal_dizini: "C:\\j\\" })).gecmis.kaynak).toBe("C:/j//*.jsonl");
  });
});

describe("buildCockpitView — aktif null iken çökme YOK, sınıf yine TAŞINIR", () => {
  it("tüm ölçüm alanları boş/null döner ama sarmalayıcı ve kaynak yerinde durur", () => {
    expect(buildCockpitView(girdi({ aktif: null, hepsi: [] }))).toEqual({
      uretildi: URETILDI,
      aktif_paket: { sinif: "olcum", deger: null, kaynak: "foldPackageJournal()" },
      zaman_cizelgesi: { sinif: "olcum", deger: [], kaynak: "stage_changed olayları" },
      kapilar: { sinif: "olcum", deger: [], kaynak: "gate_run olayları" },
      izlenebilirlik: {
        sinif: "olcum",
        kaynak: "package_declared olayı",
        deger: {
          canonical_version: null,
          bolumler: [],
          adr_tdr: [],
          moduller: [],
          sozlesmeler: [],
          kapsam_ic: [],
          kapsam_dis: [],
          risk_sinifi: null,
        },
      },
      gecmis: { sinif: "olcum", deger: [], kaynak: `${DIZIN}/*.jsonl` },
      riskler: { sinif: "olcum", deger: [], kaynak: "risk_recorded olayları (açık olanlar)" },
      notlar: { sinif: "anlati", deger: [], kaynak: "note olayları" },
      git: GIT_CANLI,
      plan: PLANLAR,
    });
  });

  it("aktif null iken de her ölçüm alanı 'olcum', notlar 'anlati' kalır", () => {
    const g = buildCockpitView(girdi({ aktif: null, hepsi: [] }));
    for (const ad of OLCUM_ALANLARI) expect(g[ad].sinif, ad).toBe("olcum");
    expect(g.notlar.sinif).toBe("anlati");
  });

  it("aktif null ama gecmis DOLU olabilir (iki alan bağımsız)", () => {
    const g = buildCockpitView(girdi({ aktif: null, hepsi: [TAM] }));
    expect(g.aktif_paket.deger).toBeNull();
    expect(g.gecmis.deger).toEqual([TAM_OZET]);
  });
});

describe("buildCockpitView — git ve plan GİRDİDEN geçer, türetilmez", () => {
  it("canlı git nesnesi AYNEN (referansıyla) taşınır", () => {
    const g = buildCockpitView(girdi());
    expect(g.git).toBe(GIT_CANLI);
    expect(g.git).toEqual({
      sinif: "canli",
      deger: { dal: "feature/cockpit-p1-readonly", head: "d46b877", temiz: false, degisen: 2 },
      okundu: URETILDI,
      komut: "git rev-parse --abbrev-ref HEAD · git status --porcelain",
    });
  });

  it("okunamayan git DALI da aynen taşınır: 'canli-okunamadi' sınıfı korunur", () => {
    const g = buildCockpitView(girdi({ git: GIT_DUSTU }));
    expect(g.git).toBe(GIT_DUSTU);
    expect(g.git.sinif).toBe("canli-okunamadi");
    /* Ölçüm alanları bu arızadan ETKİLENMEZ */
    expect(g.aktif_paket.deger?.package_id).toBe("PJ-K3");
  });

  it("plan dizisi AYNEN taşınır ve hiçbir plan ölçüm sınıfına dönüşmez", () => {
    const g = buildCockpitView(girdi());
    expect(g.plan).toBe(PLANLAR);
    for (const p of g.plan) {
      expect(p.sinif).toBe("plan");
      expect(p.sinif).not.toBe("olcum");
      expect(p.okundu.length).toBeGreaterThan(0);
    }
    expect(buildCockpitView(girdi({ plan: [] })).plan).toEqual([]);
  });

  it("kurucu SAFTIR: aktif kayıt ve girdi nesnesi değişmez", () => {
    const anlik = JSON.stringify(TAM);
    const gir = girdi();
    const girAnlik = JSON.stringify(gir);
    buildCockpitView(gir);
    expect(JSON.stringify(TAM)).toBe(anlik);
    expect(JSON.stringify(gir)).toBe(girAnlik);
  });
});

/* ── (5) Sınıf kurucuları ─────────────────────────────────────────────── */

describe("sınıf kurucuları — damga ve zorunlu alanlar", () => {
  it("olcum: sinif damgası + kaynak; canlı alanları TAŞIMAZ", () => {
    const o = olcum(42, "gate_run olayları");
    expect(o).toEqual({ sinif: "olcum", deger: 42, kaynak: "gate_run olayları" });
    /* `okundu` taşımaz: ölçüm geçmiştir, anlık okuma değildir */
    expect(o).not.toHaveProperty("okundu");
  });

  it("canli: okundu ve komut ZORUNLUDUR (11.3 canlı okuma istisnası)", () => {
    expect(canli({ dal: "main" }, URETILDI, "git status")).toEqual({
      sinif: "canli",
      deger: { dal: "main" },
      okundu: URETILDI,
      komut: "git status",
    });
  });

  it("canliOkunamadi: sebep taşır, DEĞER taşımaz ('yazilmadi' ile karışmaz)", () => {
    const c = canliOkunamadi("git yok", URETILDI, "git status");
    expect(c).toEqual({
      sinif: "canli-okunamadi",
      sebep: "git yok",
      okundu: URETILDI,
      komut: "git status",
    });
    /* Değer alanı olsaydı boş bir okuma, ölçülmüş bir değer gibi görünürdü */
    expect(c).not.toHaveProperty("deger");
    expect(c.sinif).not.toBe("canli");
  });

  it("anlati: sinif 'anlati'dır ve HİÇBİR koşulda 'olcum' değildir (11.4)", () => {
    const a = anlati([{ text: "insan cümlesi", ts: TS(1) }], "note olayları");
    expect(a).toEqual({
      sinif: "anlati",
      deger: [{ text: "insan cümlesi", ts: TS(1) }],
      kaynak: "note olayları",
    });
    expect(a.sinif).not.toBe("olcum");
  });

  it("plan: bayatlık dörtlüsü nesneye AÇILIR (elle kurulmaz)", () => {
    expect(
      plan({ baslik: "docs/ROADMAP.md", satirlar: ["- T3"] }, "docs/ROADMAP.md", {
        guncellendi: "2026-07-14T03:32:59+03:00",
        geride_commit: 42,
        olcum_notu: "taban refs/heads/main",
        okundu: URETILDI,
      })
    ).toEqual({
      sinif: "plan",
      deger: { baslik: "docs/ROADMAP.md", satirlar: ["- T3"] },
      kaynak: "docs/ROADMAP.md",
      guncellendi: "2026-07-14T03:32:59+03:00",
      geride_commit: 42,
      olcum_notu: "taban refs/heads/main",
      okundu: URETILDI,
    });
  });

  it("plan: bayatlık ÖLÇÜLEMEDİYSE null kalır — uydurulmaz — ama okundu DURUR", () => {
    const p = plan(["satır"], "docs/GOAL_QUEUE.md", {
      guncellendi: null,
      geride_commit: null,
      olcum_notu: "son commit sha çözülemedi, sayım yapılmadı",
      okundu: URETILDI,
    });
    expect(p.sinif).toBe("plan");
    expect(p.guncellendi).toBeNull();
    expect(p.geride_commit).toBeNull();
    expect(p.olcum_notu).toBe("son commit sha çözülemedi, sayım yapılmadı");
    expect(p.okundu).toBe(URETILDI);
  });

  it("BEŞ kurucu BEŞ AYRI damga üretir (hiçbiri diğerinin kılığına girmez)", () => {
    const damgalar = [
      olcum(1, "k").sinif,
      canli(1, URETILDI, "k").sinif,
      canliOkunamadi("s", URETILDI, "k").sinif,
      anlati(1, "k").sinif,
      plan(1, "k", {
        guncellendi: null,
        geride_commit: null,
        olcum_notu: null,
        okundu: URETILDI,
      }).sinif,
    ];
    expect(damgalar).toEqual(["olcum", "canli", "canli-okunamadi", "anlati", "plan"]);
    expect(new Set(damgalar).size).toBe(5);
  });
});
