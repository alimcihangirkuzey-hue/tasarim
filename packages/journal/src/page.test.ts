/* HTML render edici testleri — Canonical 11.4 / 11.6.

   BU DOSYA BİR SÖZLEŞME BEKÇİSİDİR, bir "çalışıyor mu" testi değil. Render
   edicinin ürettiği HTML gözle bakılarak denetlenemez: bir düğme, bir CDN
   bağlantısı veya kaçışsız bir paket adı ilk bakışta doğru görünür. Bu yüzden
   her yasak SIFIR-EŞLEŞME iddiasıyla, her zorunluluk POZİTİF KONTROLLE
   sınanır — "buton yok" iddiasının yanında "details GERÇEKTEN kullanılıyor"
   durur, yoksa kural boş bir dizede de sağlanırdı.

   BÖLÜM KESİTİ ALINIR, tüm belge taranmaz. Sınıf sözlüğü üç rozetin üçünü de
   içerir; "PLAN rozeti çıktıda var" iddiası belge genelinde SAHTE YEŞİLDİR —
   plan kartından rozeti silseniz bile sözlükteki kopya testi geçirirdi.
   `kesit()` iddiayı ilgili bölüme hapseder. */

import { describe, expect, it } from "vitest";
import { JOURNAL_GATES, JOURNAL_GATE_NAMES, JOURNAL_STAGES } from "@tezgah/shared";

import { kacir, renderCockpitPage } from "./page.js";
import type { AsamaAdimi, CockpitGorunumu, KapiGorunumu, PaketOzeti } from "./view.js";

/* ── Kesit yardımcıları ───────────────────────────────────────────────── */

function kesit(html: string, id: string): string {
  const bas = html.indexOf(`<section class="bolum" id="${id}"`);
  expect(bas, `bölüm bulunamadı: ${id}`).toBeGreaterThan(-1);
  const son = html.indexOf("<section", bas + 12);
  return son === -1 ? html.slice(bas) : html.slice(bas, son);
}

function kapiKarti(html: string, ad: string): string {
  const bolge = kesit(html, "bolum-kapilar");
  const parcalar = bolge.split(`<article class="kapi`).slice(1);
  const bulunan = parcalar.find((p) => p.includes(`<span class="kapi-ad"><code>${ad}</code></span>`));
  expect(bulunan, `kapı kartı bulunamadı: ${ad}`).toBeDefined();
  return bulunan as string;
}

const sayac = (html: string, kalip: RegExp): number => (html.match(kalip) ?? []).length;

/* ── Sabit görünüm (elle kurulur — fold ÇAĞRILMAZ) ────────────────────── */

type Kosum = NonNullable<KapiGorunumu["kosum"]>;
type Durum = KapiGorunumu["durum"];

const TASLAK: Kosum = {
  gate: "typecheck",
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
};

/**
 * Beş durumun BEŞİ de temsil edilir: gecti · kaldi · atlandi · olculemedi · yazilmadi.
 *
 * TEMİZ KÜTÜK: bu ayarda ölçüm kaybı YOKTUR ve bu bilerek böyledir — kayıp
 * yargısının koşulsuz basılmadığı ancak kayıpsız bir kütükte hiç görünmemesiyle
 * kanıtlanır. Kayıp senaryoları ayrı render'larda kurulur.
 *
 * `build` MAKİNE kapısı olduğu hâlde yazılmamıştır: `referans_komut`'un
 * gösterildiği tek durum budur ve `gt` (insan, komutsuz) ile karşıtlık kurar.
 */
const AYAR: Record<keyof typeof JOURNAL_GATES, { durum: Durum; kosum: Kosum | null }> = {
  /* sayi_uretmeli=false + values=null → MEŞRU sayısızlık (kaybın negatif kontrolü) */
  typecheck: { durum: "gecti", kosum: { ...TASLAK } },
  lint: {
    durum: "gecti",
    kosum: {
      ...TASLAK,
      gate: "lint",
      command: "npx eslint . --format json -o <tmp>",
      values: { problems: 0, files: 128 },
      method: "eslint --format json çıktısındaki errorCount+warningCount toplamı",
      tool: { name: "eslint", version: "9.39.5" },
    },
  },
  test: {
    durum: "kaldi",
    kosum: {
      ...TASLAK,
      gate: "test",
      outcome: "kaldi",
      command: "npm test -w packages/journal",
      exit_code: 1,
      values: { tests: 629, failed: 3 },
      method: "vitest json reporter numTotalTests/numFailedTests",
      tool: { name: "vitest", version: "3.2.4" },
      raw_evidence: "docs/journal/evidence/test-2026-07-19.txt",
      raw_sha256: "a".repeat(64),
    },
  },
  /* MAKİNE kapısı, hiç yazılmamış → "koşulacak komut" gösterilmeli */
  build: { durum: "yazilmadi", kosum: null },
  bundle: {
    durum: "atlandi",
    kosum: {
      ...TASLAK,
      gate: "bundle",
      outcome: "atlandi",
      origin: "tahmini",
      command: null,
      exit_code: null,
      tool: null,
      measured_at: null,
      duration_ms: null,
      reason: "build koşulmadığı için dist/assets üretilmedi; gzip boyutu ölçülemedi",
    },
  },
  /* İNSAN kapısı, hiç yazılmamış → komuta bağlanamayacağı söylenmeli */
  gt: { durum: "yazilmadi", kosum: null },
  smoke: {
    durum: "olculemedi",
    kosum: {
      ...TASLAK,
      gate: "smoke",
      outcome: "olculemedi",
      origin: "turetilmis",
      command: null,
      exit_code: null,
      tool: null,
      measured_at: null,
      duration_ms: null,
      reason: "insan turu gerektirir; koşucu koşamaz",
    },
  },
};

function kapilarKur(): KapiGorunumu[] {
  return JOURNAL_GATE_NAMES.map((ad) => ({
    ad,
    kosum: AYAR[ad].kosum,
    kapsam: JOURNAL_GATES[ad].scope,
    insan: JOURNAL_GATES[ad].human,
    sayi_uretmeli: JOURNAL_GATES[ad].produces_values,
    referans_komut: JOURNAL_GATES[ad].command,
    durum: AYAR[ad].durum,
  }));
}

/** Tek kapıyı değiştirip kütüğün geri kalanını olduğu gibi bırakır */
function kapilarIle(ad: string, degis: (k: KapiGorunumu) => KapiGorunumu): CockpitGorunumu["kapilar"] {
  return {
    sinif: "olcum",
    kaynak: "gate_run olayları",
    deger: kapilarKur().map((k) => (k.ad === ad ? degis(k) : k)),
  };
}

const kosumIle = (k: KapiGorunumu, uzerine: Partial<Kosum>): KapiGorunumu => ({
  ...k,
  kosum: { ...(k.kosum ?? TASLAK), ...uzerine },
});

/**
 * GERİ DÖNÜŞLÜ çizelge: paket ikinci doğrulayıcıya kadar gitti, bulgu çıktı ve
 * `gelistirme`ye geri gönderildi. Düz bir çizelge bu paketi temiz ilerlemiş bir
 * paketle aynı gösterirdi — 11.5 geri dönüşü geçerli bir geçiş sayar ve kayda
 * geçirir; kayıtta olup ekranda olmayan geçiş, ekranın yalanıdır.
 */
const CIZELGE: AsamaAdimi[] = [
  { asama: "planlama", ts: "2026-07-19T21:09:50.000Z", durum: "gecildi", ziyaret: 1, geri_donus: 0 },
  { asama: "canonical-kaydi", ts: "2026-07-19T21:09:52.000Z", durum: "gecildi", ziyaret: 1, geri_donus: 0 },
  { asama: "gelistirme", ts: "2026-07-19T21:09:53.000Z", durum: "simdi", ziyaret: 2, geri_donus: 0 },
  { asama: "test", ts: "2026-07-19T21:09:55.000Z", durum: "gecildi", ziyaret: 1, geri_donus: 0 },
  { asama: "ikinci-dogrulayici", ts: "2026-07-19T21:09:58.000Z", durum: "gecildi", ziyaret: 1, geri_donus: 1 },
  { asama: "hazir", ts: null, durum: "bekliyor", ziyaret: 0, geri_donus: 0 },
  { asama: "merge", ts: null, durum: "bekliyor", ziyaret: 0, geri_donus: 0 },
  { asama: "dagitim", ts: null, durum: "bekliyor", ziyaret: 0, geri_donus: 0 },
];

/** Aynı paket, hiç geri dönmemiş hâli — tekrar işaretinin negatif kontrolü */
const DUZ_CIZELGE: AsamaAdimi[] = CIZELGE.map((a) => ({ ...a, ziyaret: Math.min(a.ziyaret, 1), geri_donus: 0 }));

/** SÜREN paket: `bitis: null` → tahmini bitiş ÜRETİLMEMELİ */
const PAKET: PaketOzeti = {
  package_id: "2026-07-20-cockpit-p1-readonly",
  ad: "Cockpit Modül Fazı 1 — Salt-okunur Developer Cockpit",
  amac: "Package Journal'ın okunduğu yüzey; ölçüm ve plan sınıfları görsel olarak ayrışır",
  baslangic: "2026-07-19T21:09:41.109Z",
  bitis: null,
  asama: "gelistirme",
  olay_sayisi: 6,
  son_olay_ts: "2026-07-19T21:09:56.415Z",
  dogrulayici_karari: null,
  dogrulayici_acik_bulgu: 2,
  acik_risk: 1,
  kapali_risk: 4,
};

/** BİTMİŞ paket: bitiş anı gerçekten ölçülmüş (merge geçişi) */
const BITMIS: PaketOzeti = {
  package_id: "2026-07-18-cockpit-p0-journal",
  ad: "Cockpit Modül Fazı 0 — Package Journal",
  amac: "Kaydın üretilmesi, saklanması ve şemasının sabitlenmesi",
  baslangic: "2026-07-18T08:30:00.000Z",
  bitis: "2026-07-18T12:00:00.000Z",
  asama: "merge",
  olay_sayisi: 41,
  son_olay_ts: "2026-07-18T12:00:00.000Z",
  dogrulayici_karari: "onay",
  dogrulayici_acik_bulgu: 0,
  acik_risk: 0,
  kapali_risk: 8,
};

function gorunumKur(uzerine: Partial<CockpitGorunumu> = {}): CockpitGorunumu {
  return {
    uretildi: "2026-07-20T00:45:12.000Z",
    aktif_paket: { sinif: "olcum", deger: PAKET, kaynak: "foldPackageJournal()" },
    zaman_cizelgesi: { sinif: "olcum", deger: CIZELGE, kaynak: "stage_changed olayları" },
    kapilar: { sinif: "olcum", deger: kapilarKur(), kaynak: "gate_run olayları" },
    izlenebilirlik: {
      sinif: "olcum",
      kaynak: "package_declared olayı",
      deger: {
        canonical_version: "4.1.0",
        bolumler: ["11.1", "11.3", "11.4", "11.5", "11.6"],
        adr_tdr: ["TDR-001"],
        moduller: ["@tezgah/journal"],
        sozlesmeler: [],
        kapsam_ic: ["salt-okunur yüzey", "kapı kapsam şerhi her sayının yanında"],
        kapsam_dis: ["işlem düğmeleri (Faz 3)", "canlı olay akışı (Faz 2)"],
        risk_sinifi: "dusuk",
      },
    },
    gecmis: {
      sinif: "olcum",
      deger: [PAKET, BITMIS],
      kaynak: "docs/journal/events/*.jsonl",
    },
    riskler: {
      sinif: "olcum",
      kaynak: "risk_recorded olayları (açık olanlar)",
      deger: [
        {
          risk_id: "R-01",
          summary: "Cockpit yüzeyi henüz ürün sunucusuna bağlanmadı",
          ts: "2026-07-19T22:00:00.000Z",
        },
      ],
    },
    notlar: {
      sinif: "anlati",
      kaynak: "note olayları",
      deger: [{ text: "Faz 1 salt-okunurdur; düğme üretilmedi.", ts: "2026-07-19T22:10:00.000Z" }],
    },
    git: {
      sinif: "canli",
      deger: { dal: "feature/cockpit-p1-readonly", head: "93811ac", temiz: false, degisen: 2 },
      okundu: "2026-07-20T00:44:59.000Z",
      komut: "git status --porcelain",
    },
    plan: [
      {
        sinif: "plan",
        deger: {
          baslik: "Yol haritası — Cockpit Faz 2 ve 3",
          satirlar: ["Faz 2: canlı olay akışı", "Faz 3: kapı-içi operasyonlar"],
        },
        kaynak: "docs/roadmap/cockpit.md",
        guncellendi: "2026-07-12T08:00:00.000Z",
        geride_commit: 37,
        olcum_notu: "git rev-list --count <dosyanın son commit'i>..main",
        okundu: "2026-07-20T00:44:58.000Z",
      },
      {
        sinif: "plan",
        deger: { baslik: "Bayatlığı ölçülemeyen plan", satirlar: [] },
        kaynak: "docs/roadmap/olcumsuz.md",
        guncellendi: null,
        geride_commit: null,
        olcum_notu: "dosya git tarihçesinde yok; bayatlık ölçülemedi",
        okundu: "2026-07-20T00:44:58.000Z",
      },
    ],
    ...uzerine,
  };
}

const HTML = renderCockpitPage(gorunumKur());

/* ── Belge kabuğu ─────────────────────────────────────────────────────── */

describe("belge kabuğu", () => {
  it("tam bir HTML belgesi döner", () => {
    expect(HTML.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(HTML).toContain(`<html lang="tr">`);
    expect(HTML.trimEnd().endsWith("</html>")).toBe(true);
    expect(HTML).toContain("<title>");
  });

  it("view.uretildi sayfanın kendi zaman damgası olarak görünür", () => {
    expect(HTML).toContain("2026-07-20T00:45:12.000Z");
    expect(HTML).toContain("Yüzey üretildi");
  });

  it("saf: aynı görünüm daima aynı dizeyi verir", () => {
    expect(renderCockpitPage(gorunumKur())).toBe(HTML);
  });
});

/* ── KURAL 1 — hiçbir işlem düğmesi yok (11.4 Modül Fazı 1) ───────────── */

describe("kural 1 — salt-okunur yüzey", () => {
  it("düğme/form/girdi üretmez", () => {
    expect(sayac(HTML, /<button/gi)).toBe(0);
    expect(sayac(HTML, /<form/gi)).toBe(0);
    expect(sayac(HTML, /<input/gi)).toBe(0);
    expect(sayac(HTML, /onclick/gi)).toBe(0);
  });

  it("başka etkileşim öğesi de üretmez", () => {
    expect(sayac(HTML, /<textarea/gi)).toBe(0);
    expect(sayac(HTML, /<select/gi)).toBe(0);
    expect(sayac(HTML, /<dialog/gi)).toBe(0);
    expect(sayac(HTML, /contenteditable/gi)).toBe(0);
    /* Betik yok: Faz 1'de çalışan tek şey tarayıcının kendi davranışıdır */
    expect(sayac(HTML, /<script/gi)).toBe(0);
  });

  it("hiçbir satır içi olay işleyicisi taşımaz", () => {
    /* onclick'i tek tek saymak yetmez: onmouseover/onload/onerror aynı kapıdır */
    expect(HTML.match(/\son[a-z]+\s*=/gi) ?? []).toEqual([]);
  });

  it("POZİTİF KONTROL: izin verilen istisna (details/summary) gerçekten kullanılıyor", () => {
    /* Bu olmadan "düğme yok" iddiası boş bir belgede de geçerdi */
    expect(sayac(HTML, /<details/g)).toBeGreaterThan(0);
    expect(sayac(HTML, /<summary>/g)).toBeGreaterThan(0);
  });
});

/* ── KURAL 5 — kendi kendine yeter, ağ isteği yok ─────────────────────── */

describe("kural 5 — dış kaynak yok", () => {
  it("hiçbir mutlak/protokolsüz adres geçmez", () => {
    expect(sayac(HTML, /https?:\/\//gi)).toBe(0);
    expect(sayac(HTML, /\/\/cdn/gi)).toBe(0);
  });

  it("dış kaynak yükleyebilecek hiçbir öznitelik üretilmez", () => {
    expect(sayac(HTML, /<link/gi)).toBe(0);
    expect(sayac(HTML, /rel=["']?stylesheet/gi)).toBe(0);
    expect(sayac(HTML, /\ssrc=/gi)).toBe(0);
    expect(sayac(HTML, /\shref=/gi)).toBe(0);
    expect(sayac(HTML, /<img/gi)).toBe(0);
    expect(sayac(HTML, /<iframe/gi)).toBe(0);
  });

  it("CSS de dışarı çıkmaz", () => {
    expect(sayac(HTML, /url\(/gi)).toBe(0);
    expect(sayac(HTML, /@import/gi)).toBe(0);
    expect(sayac(HTML, /@font-face/gi)).toBe(0);
  });

  it("POZİTİF KONTROL: biçim gerçekten gömülü", () => {
    expect(HTML).toContain("<style>");
    expect(HTML.indexOf("</style>")).toBeGreaterThan(HTML.indexOf("<style>") + 500);
  });

  it("kural 7 — karanlık ve aydınlık tema birlikte desteklenir", () => {
    expect(HTML).toContain("prefers-color-scheme: dark");
    expect(HTML).toContain("color-scheme: light dark");
  });
});

/* ── KURAL 3 — kapsam şerhi her sayının yanında ───────────────────────── */

describe("kural 3 — kapsam şerhi (bağlayıcı devir şartı)", () => {
  it.each(JOURNAL_GATE_NAMES)("%s: kütükteki kapsam metni TAM olarak görünür", (ad) => {
    const kart = kapiKarti(HTML, ad);
    expect(kart).toContain(kacir(JOURNAL_GATES[ad].scope));
  });

  it.each(JOURNAL_GATE_NAMES)("%s: kapsam şerhi katlanmış değil, görünür kısımda", (ad) => {
    const kart = kapiKarti(HTML, ad);
    const kapsamYeri = kart.indexOf(`class="kapsam"`);
    const ayrintiYeri = kart.indexOf("<details");
    expect(kapsamYeri).toBeGreaterThan(-1);
    /* details VARSA kapsam ondan ÖNCE gelmeli; tooltip/katlama içine saklanamaz */
    if (ayrintiYeri > -1) expect(kapsamYeri).toBeLessThan(ayrintiYeri);
    expect(kart).toContain("KAPSAM ŞERHİ");
  });

  it("sayı üreten kapının sayısı ile kapsamı AYNI kartta durur", () => {
    const kart = kapiKarti(HTML, "lint");
    expect(kart).toContain("problems");
    expect(kart).toContain(">0<");
    expect(kart).toContain(kacir(JOURNAL_GATES.lint.scope));
  });
});

/* ── KURAL 4 — yazilmadi ≠ olculemedi ≠ gecti ─────────────────────────── */

describe("kural 4 — koşulmamış kapı ile ölçülememiş kapı ayrışır", () => {
  it("üç durum ÜÇ AYRI görsel sınıf taşır", () => {
    const bolge = kesit(HTML, "bolum-kapilar");
    expect(bolge).toContain("kapi--yazilmadi");
    expect(bolge).toContain("kapi--olculemedi");
    expect(bolge).toContain("kapi--gecti");
    /* Sınıflar CSS'te GERÇEKTEN farklı tanımlı — aynı ada üç kez yazılmış
       boş kural, ayrışma iddiasını kozmetik bırakırdı */
    for (const s of ["kapi--yazilmadi", "kapi--olculemedi", "kapi--gecti"]) {
      expect(HTML).toContain(`.${s} {`);
    }
  });

  it("üç durum ÜÇ AYRI metin açıklaması taşır", () => {
    const yazilmadi = kapiKarti(HTML, "gt");
    const olculemedi = kapiKarti(HTML, "smoke");
    const gecti = kapiKarti(HTML, "typecheck");

    expect(yazilmadi).toContain("Journal&#39;da HİÇ kayıt yok");
    expect(olculemedi).toContain("Journal&#39;a YAZILDI ama değeri ölçülemedi");
    expect(gecti).toContain("gerçekten koşuldu ve geçti");

    expect(yazilmadi).not.toContain("Journal&#39;a YAZILDI ama değeri ölçülemedi");
    expect(olculemedi).not.toContain("Journal&#39;da HİÇ kayıt yok");
    expect(gecti).not.toContain("Journal&#39;da HİÇ kayıt yok");
  });

  it("koşulmamış kapı EKRANDAN SİLİNMEZ", () => {
    const bolge = kesit(HTML, "bolum-kapilar");
    expect(bolge).toContain(`<span class="kapi-ad"><code>gt</code></span>`);
    expect(bolge).toContain("YAZILMADI");
    /* Kütükteki yedi kapının yedisi de ekranda */
    expect(sayac(bolge, /<article class="kapi/g)).toBe(JOURNAL_GATE_NAMES.length);
  });

  it("beş durumun beşi de kendi rozetiyle görünür", () => {
    const bolge = kesit(HTML, "bolum-kapilar");
    for (const e of ["GEÇTİ", "KALDI", "ATLANDI", "ÖLÇÜLEMEDİ", "YAZILMADI"]) {
      expect(bolge).toContain(e);
    }
  });

  it("insan turu gereken kapı işaretlenir (11.6/3)", () => {
    expect(kapiKarti(HTML, "gt")).toContain("İNSAN TURU GEREKİR");
    expect(kapiKarti(HTML, "smoke")).toContain("İNSAN TURU GEREKİR");
    expect(kapiKarti(HTML, "lint")).not.toContain("İNSAN TURU GEREKİR");
  });

  it("ölçülmemiş köken (11.3 kaynak dürüstlüğü) KATLANMADAN işaretlenir", () => {
    /* MUTASYONLA BULUNDU: bu iddia önce yalnız `toContain` idi ve rozeti kartın
       görünür başlığından silmek testi KIRMIYORDU — çünkü aynı metin katlanmış
       "Koşum ayrıntısı" listesinde <dt>Köken</dt> olarak ikinci kez geçiyor.
       11.3 "işareti BİRLİKTE gösterir" der; katlamanın içindeki işaret,
       kapsam şerhini tooltip'e saklamakla aynı kusurdur. Konum sınanır. */
    for (const [ad, etiket] of [
      ["bundle", "TAHMİNİ — ölçüm değil"],
      ["smoke", "TÜRETİLMİŞ — ölçüm değil"],
    ] as const) {
      const kart = kapiKarti(HTML, ad);
      const rozetYeri = kart.indexOf("rozet--koken");
      const ayrintiYeri = kart.indexOf("<details");
      expect(rozetYeri, `${ad}: köken rozeti yok`).toBeGreaterThan(-1);
      expect(ayrintiYeri).toBeGreaterThan(-1);
      expect(rozetYeri, `${ad}: köken rozeti katlamanın içine saklanmış`).toBeLessThan(ayrintiYeri);
      expect(kart.slice(0, ayrintiYeri)).toContain(etiket);
    }
    /* olculdu olan kapı bu rozeti TAŞIMAZ — yoksa işaret anlamını yitirir */
    expect(kapiKarti(HTML, "typecheck")).not.toContain("rozet--koken");
  });
});

/* ── ÖLÇÜM KAYBI yargısı (sayi_uretmeli) ─────────────────────────────────

   11.3'ün önlemek için var olduğu sessiz bozulma: sayı üretmek ZORUNDA olan
   bir kapı, sonucu ölçülmüş yazılmışken sayısız kalırsa "geçti" kendi ölçümüyle
   doğrulanamaz. Yargı POZİTİF ve NEGATİF birlikte sınanır — koşulsuz basılan
   bir uyarı da, hiç basılmayan bir uyarı kadar işe yaramaz. */

describe("ÖLÇÜM KAYBI — sayı üretmesi gereken kapı sayısız geçemez", () => {
  /* lint: sayi_uretmeli=true. Aynı render'da typecheck (sayi_uretmeli=false)
     de sayısızdır — ikisi tek belgede karşılaştırılabilsin diye. */
  const KAYIP = renderCockpitPage(
    gorunumKur({
      kapilar: kapilarIle("lint", (k) =>
        kosumIle({ ...k, durum: "gecti" }, { outcome: "gecti", values: null })
      ),
    })
  );

  it("sayi_uretmeli=true + gecti + values=null → uyarı GÖRÜNÜR", () => {
    expect(JOURNAL_GATES.lint.produces_values).toBe(true);
    const kart = kapiKarti(KAYIP, "lint");
    expect(kart).toContain("rozet--kayip");
    expect(kart).toContain("ÖLÇÜM KAYBI");
    expect(kart).toContain("sayı üretmek zorundadır");
    expect(kart).toContain("bu sonuca güvenilmez");
    /* "GEÇTİ" kartı temiz bir geçiş gibi taranmamalı — kart gövdesi de işaretli */
    expect(kart).toContain("kapi-kayipli");
  });

  it("sayi_uretmeli=false + values=null → uyarı ÇIKMAZ, sayısızlık meşru sayılır", () => {
    expect(JOURNAL_GATES.typecheck.produces_values).toBe(false);
    /* AYNI render — yargının koşullu olduğu ancak burada kanıtlanır */
    const kart = kapiKarti(KAYIP, "typecheck");
    expect(kart).not.toContain("rozet--kayip");
    expect(kart).not.toContain("olcum-kaybi");
    expect(kart).not.toContain("kapi-kayipli");
    expect(kart).toContain("sayı ÜRETMEZ");
    expect(kart).toContain("MEŞRUDUR");
  });

  it("uyarı katlamanın (details) İÇİNE saklanmaz — M18 dersi", () => {
    const kart = kapiKarti(KAYIP, "lint");
    const ayrintiYeri = kart.indexOf("<details");
    expect(ayrintiYeri).toBeGreaterThan(-1);
    for (const im of ["rozet--kayip", `class="olcum-kaybi"`]) {
      const yer = kart.indexOf(im);
      expect(yer, `${im} kartta yok`).toBeGreaterThan(-1);
      expect(yer, `${im} katlamanın içine saklanmış`).toBeLessThan(ayrintiYeri);
    }
  });

  it("KALDI + values=null da kayıptır — kaybın yönü kaybı değiştirmez", () => {
    const h = renderCockpitPage(
      gorunumKur({
        kapilar: kapilarIle("test", (k) =>
          kosumIle({ ...k, durum: "kaldi" }, { outcome: "kaldi", values: null })
        ),
      })
    );
    expect(kapiKarti(h, "test")).toContain("rozet--kayip");
  });

  it("BOŞ values nesnesi de kayıptır (şemadan geçer, ekranda sayı yoktur)", () => {
    const h = renderCockpitPage(
      gorunumKur({
        kapilar: kapilarIle("lint", (k) => kosumIle({ ...k, durum: "gecti" }, { values: {} })),
      })
    );
    const kart = kapiKarti(h, "lint");
    expect(kart).toContain("rozet--kayip");
    expect(kart).not.toContain("MEŞRUDUR");
  });

  it("ölçülmemiş sonuç (atlandi) kayıp SAYILMAZ — gerekçesi vardır", () => {
    expect(JOURNAL_GATES.bundle.produces_values).toBe(true);
    const kart = kapiKarti(HTML, "bundle");
    expect(kart).not.toContain("rozet--kayip");
    expect(kart).toContain("beklenen de değil");
  });

  it("sayısı OLAN kapı kayıp değildir", () => {
    const kart = kapiKarti(HTML, "lint");
    expect(kart).not.toContain("rozet--kayip");
    expect(kart).toContain("problems");
  });

  it("temiz kütükte HİÇBİR kapı kayıp işaretlenmez (uyarı koşulsuz basılmıyor)", () => {
    const bolge = kesit(HTML, "bolum-kapilar");
    expect(bolge).not.toContain("rozet--kayip");
    expect(bolge).not.toContain("olcum-kaybi");
    expect(bolge).not.toContain("kapi-kayipli");
  });

  it("kayıp kartı CSS'te ayrı çizilir", () => {
    expect(KAYIP).toContain(".kapi-kayipli {");
    expect(KAYIP).toContain(".olcum-kaybi {");
    expect(KAYIP).toContain(".rozet--kayip {");
  });

  it("uyarı sayfayı salt-okunur olmaktan çıkarmaz", () => {
    expect(sayac(KAYIP, /<button|<form|<input|onclick/gi)).toBe(0);
  });
});

/* ── referans_komut — yazılmamış kapı ne koşulacağını söyler ──────────── */

describe("yazilmadi kartı kütükteki referans komutu gösterir", () => {
  it("MAKİNE kapısı: koşulacak komut görünür", () => {
    const kart = kapiKarti(HTML, "build");
    expect(kart).toContain("Koşulacak komut");
    expect(kart).toContain(kacir(JOURNAL_GATES.build.command));
  });

  it("komut, kütükteki REFERANS olduğu şerhiyle birlikte durur", () => {
    const kart = kapiKarti(HTML, "build");
    expect(kart).toContain("REFERANS komut");
    expect(kart).toContain("bundan sapabilir");
  });

  it("İNSAN kapısı: komuta bağlanamayacağı söylenir (11.6/3)", () => {
    expect(JOURNAL_GATES.gt.command).toBeNull();
    const kart = kapiKarti(HTML, "gt");
    expect(kart).toContain("komuta <strong>bağlanamaz</strong>");
    expect(kart).not.toContain("Koşulacak komut");
  });

  it.each(JOURNAL_GATE_NAMES)("%s: kütük hepsi yazılmamışken de tam bilgi verir", (ad) => {
    const hepsiYazilmadi = renderCockpitPage(
      gorunumKur({
        kapilar: {
          sinif: "olcum",
          kaynak: "gate_run olayları",
          deger: kapilarKur().map((k) => ({ ...k, durum: "yazilmadi" as const, kosum: null })),
        },
      })
    );
    const kart = kapiKarti(hepsiYazilmadi, ad);
    const komut = JOURNAL_GATES[ad].command;
    if (komut === null) expect(kart).toContain("komuta <strong>bağlanamaz</strong>");
    else expect(kart).toContain(kacir(komut));
    /* kapsam şerhi hâlâ yerinde — bilgi eklemek şerhi düşürmedi */
    expect(kart).toContain(kacir(JOURNAL_GATES[ad].scope));
  });
});

/* ── 11.3(a) Kimlik: ad · amaç · başlangıç ve bitiş anı ──────────────── */

describe("Kimlik kümesi (Canonical 11.3-a) tam gösterilir", () => {
  const b = kesit(HTML, "bolum-paket");

  it("amaç görünür", () => {
    expect(b).toContain("<dt>Amaç</dt>");
    expect(b).toContain(kacir(PAKET.amac));
  });

  it("başlangıç anı görünür", () => {
    expect(b).toContain("Başlangıç");
    expect(b).toContain("2026-07-19T21:09:41.109Z");
  });

  it("bitiş yokken TAHMİNİ BİTİŞ ÜRETİLMEZ — 'sürüyor' yazılır", () => {
    expect(b).toContain("<dt>Bitiş</dt>");
    expect(b).toContain("sürüyor — tahmini bitiş ÜRETİLMEZ");
  });

  it("bitmiş paketin ÖLÇÜLMÜŞ bitiş anı gösterilir", () => {
    const h = renderCockpitPage(
      gorunumKur({
        aktif_paket: { sinif: "olcum", kaynak: "foldPackageJournal()", deger: BITMIS },
      })
    );
    const kb = kesit(h, "bolum-paket");
    expect(kb).toContain("2026-07-18T12:00:00.000Z");
    expect(kb).not.toContain("sürüyor");
  });

  it("doğrulayıcının açık bulgusu ve iki risk sayacı ayrı ayrı görünür", () => {
    expect(b).toContain("<dt>Doğrulayıcının açık bulgusu</dt><dd>2</dd>");
    expect(b).toContain("<dt>Açık risk</dt><dd>1</dd>");
    expect(b).toContain("<dt>Kapalı risk</dt><dd>4</dd>");
  });
});

describe("geçmiş listesi kimlik alanlarını taşır", () => {
  const g = kesit(HTML, "bolum-gecmis");

  it("yeni sütunlar var", () => {
    for (const s of ["Amaç", "Başlangıç", "Bitiş", "Açık bulgu", "Kapalı risk"]) {
      expect(g).toContain(`<th>${s}</th>`);
    }
  });

  it("süren paket 'sürüyor', biten paket ölçülmüş anı gösterir", () => {
    expect(g).toContain(`<span class="suruyor">sürüyor</span>`);
    expect(g).toContain("2026-07-18T12:00:00.000Z");
  });

  it("amaç metni listede de görünür", () => {
    expect(g).toContain(kacir(BITMIS.amac));
    expect(g).toContain(kacir(PAKET.amac));
  });
});

/* ── KURAL 2 — üç veri sınıfı görsel olarak ayrışır (11.4) ────────────── */

describe("kural 2 — plan sınıfı ölçüm gibi görünmez", () => {
  const bolge = kesit(HTML, "bolum-plan");

  it("PLAN rozeti plan kartının KENDİSİNDE var", () => {
    expect(bolge).toContain("PLAN — ÖLÇÜM DEĞİL");
    expect(bolge).toContain("rozet--plan");
    expect(bolge).toContain("kutu--plan");
  });

  it("plan kartı ölçüm kutusu kılığına girmez", () => {
    expect(bolge).not.toContain("kutu--olcum");
    expect(bolge).not.toContain("rozet--olcum");
  });

  it("kaynak görünür ve Journal olmadığı söylenir", () => {
    expect(bolge).toContain("docs/roadmap/cockpit.md");
    expect(bolge).toContain("Plan kaynağı");
    expect(bolge).toContain("Journal DEĞİLDİR");
  });

  it("bayatlık ÖLÇÜLMÜŞ olarak görünür — son güncelleme + kaç commit geride", () => {
    expect(bolge).toContain("Son güncelleme");
    expect(bolge).toContain("2026-07-12T08:00:00.000Z");
    expect(bolge).toContain("37 commit geride");
  });

  it("ölçülemeyen bayatlık sessizce 0 gösterilmez", () => {
    expect(bolge).toContain("son güncelleme ÖLÇÜLEMEDİ");
    expect(bolge).toContain("kaç commit geride olduğu ÖLÇÜLEMEDİ");
  });

  it("plan kutusu CSS'te ölçüm kutusundan farklı çizilir", () => {
    expect(HTML).toContain(".kutu--plan {");
    expect(HTML).toContain(".kutu--olcum {");
    const plan = HTML.slice(HTML.indexOf(".kutu--plan {"));
    expect(plan.slice(0, 400)).toContain("dashed");
  });
});

describe("kural 2 — canlı sınıf okunma anını daima taşır (11.3)", () => {
  const bolge = kesit(HTML, "bolum-git");

  it("CANLI OKUMA rozeti git kutusunun KENDİSİNDE var", () => {
    expect(bolge).toContain("CANLI OKUMA");
    expect(bolge).toContain("kutu--canli");
  });

  it("okunduğu an görünür", () => {
    expect(bolge).toContain("Okunduğu an");
    expect(sayac(bolge, /2026-07-20T00:44:59\.000Z/g)).toBeGreaterThan(0);
  });

  it("okuyan komut görünür", () => {
    expect(bolge).toContain("git status --porcelain");
    expect(bolge).toContain("Okuyan komut");
  });

  it("geçmiş ölçüm olmadığı açıkça söylenir", () => {
    expect(bolge).toContain("geçmiş ölçüm DEĞİLDİR");
  });

  it("canlı kutu ölçüm kutusu kılığına girmez", () => {
    expect(bolge).not.toContain("kutu--olcum");
    expect(HTML).toContain(".kutu--canli {");
  });
});

describe("kural 2 — ölçüm sınıfı kaynağını gösterir", () => {
  it("her ölçüm bölümü Journal kaynağını yazar", () => {
    expect(kesit(HTML, "bolum-paket")).toContain("foldPackageJournal()");
    expect(kesit(HTML, "bolum-kapilar")).toContain("gate_run olayları");
    expect(kesit(HTML, "bolum-cizelge")).toContain("stage_changed olayları");
    expect(kesit(HTML, "bolum-gecmis")).toContain("docs/journal/events/*.jsonl");
  });
});

/* ── Yaşam döngüsü şeridi (11.5) ─────────────────────────────────────── */

describe("yaşam döngüsü şeridi", () => {
  const bolge = kesit(HTML, "bolum-cizelge");

  it("sekiz aşamanın tamamı görünür", () => {
    expect(sayac(bolge, /<li class="adim /g)).toBe(JOURNAL_STAGES.length);
    expect(JOURNAL_STAGES.length).toBe(8);
    for (const ad of ["Planlama", "Canonical kaydı", "Geliştirme", "Test", "İkinci doğrulayıcı", "Hazır", "Merge", "Dağıtım"]) {
      expect(bolge).toContain(ad);
    }
  });

  it(`"şimdi" olan aşama tek ve belirgin`, () => {
    expect(sayac(bolge, /adim--simdi/g)).toBe(1);
    expect(bolge).toContain("ŞİMDİ BURADA");
    expect(HTML).toContain(".adim--simdi {");
  });

  it("ulaşılmamış aşama listeden düşürülmez", () => {
    expect(sayac(bolge, /adim--bekliyor/g)).toBe(3);
    expect(bolge).toContain("henüz ulaşılmadı");
  });
});

/* ── Geri dönüş: tıkanmış paket temiz paketle aynı görünemez (11.5) ───── */

describe("tekrar ziyaret ve geri dönüş görünür işaretlenir", () => {
  const bolge = kesit(HTML, "bolum-cizelge");

  it("ziyaret > 1 olan aşama işaretlenir", () => {
    expect(bolge).toContain("2 KEZ GELİNDİ");
    expect(bolge).toContain("buraya geri dönüldü");
    expect(sayac(bolge, /adim-tekrarli/g)).toBe(1);
  });

  it("geri_donus > 0 olan aşama işaretlenir", () => {
    expect(bolge).toContain("buradan 1 kez GERİ dönüldü");
  });

  it("işaretler KATLAMANIN İÇİNE saklanmaz — çizelgede details hiç yok", () => {
    /* M18 dersi: konum sınanır. Bu bölümde katlama olmadığını da doğrularız,
       yoksa gelecekte bir <details> eklenip işaret içine kaydırılabilir. */
    expect(bolge).not.toContain("<details");
    const tekrarYeri = bolge.indexOf("adim-tekrarli");
    const seritSonu = bolge.indexOf("</ol>");
    expect(tekrarYeri).toBeGreaterThan(-1);
    expect(tekrarYeri).toBeLessThan(seritSonu);
  });

  it("işaret, geri dönülen aşamanın KENDİ adımında durur", () => {
    const adimlar = bolge.split(`<li class="adim `).slice(1);
    const tekrarli = adimlar.filter((a) => a.includes("adim-tekrarli"));
    expect(tekrarli).toHaveLength(1);
    expect(tekrarli[0]).toContain("Geliştirme");
  });

  it("NEGATİF KONTROL: geri dönüşsüz çizelgede hiç işaret yok", () => {
    const duz = renderCockpitPage(
      gorunumKur({
        zaman_cizelgesi: { sinif: "olcum", deger: DUZ_CIZELGE, kaynak: "stage_changed olayları" },
      })
    );
    const b = kesit(duz, "bolum-cizelge");
    expect(b).not.toContain("adim-tekrarli");
    expect(b).not.toContain("KEZ GELİNDİ");
    expect(b).not.toContain("GERİ dönüldü");
  });

  it("tekrar işareti CSS'te ayrı çizilir", () => {
    expect(HTML).toContain(".adim-tekrarli {");
    expect(HTML).toContain(".adim-tekrar {");
  });
});

/* ── CanliOkunamadi: "okunamadı" ile "yok" ayrı durumlardır ───────────── */

describe("canlı okuma YAPILAMADI kendi sınıfıyla görünür", () => {
  const okunamadi = renderCockpitPage(
    gorunumKur({
      git: {
        sinif: "canli-okunamadi",
        sebep: "git deposu bulunamadı: .git dizini yok",
        okundu: "2026-07-20T00:44:57.000Z",
        komut: "git status --porcelain",
      },
    })
  );
  const b = kesit(okunamadi, "bolum-git");

  it("kendi rozetini taşır", () => {
    expect(b).toContain("CANLI OKUMA YAPILAMADI");
    expect(b).toContain("rozet--okunamadi");
    expect(b).toContain("kutu--okunamadi");
  });

  it("sebep · okundu · komut üçü de görünür", () => {
    expect(b).toContain("git deposu bulunamadı: .git dizini yok");
    expect(b).toContain("2026-07-20T00:44:57.000Z");
    expect(b).toContain("git status --porcelain");
  });

  it("okumanın DENENDİĞİ söylenir — 'dış sistem yok' ile karışmaz", () => {
    expect(b).toContain("Okuma DENENDİ");
    /* Sabit markup metnidir, journal verisi değil — kaçıştan geçmez */
    expect(b).toContain(`"dış sistem yok" değildir`);
  });

  it("yerine geçmiş bir ölçüm KONULMAZ", () => {
    expect(b).toContain("geçmiş bir ölçüm KONULMAZ");
    /* başarılı okumanın alanları sızmamalı */
    expect(b).not.toContain("Çalışma ağacı");
    expect(b).not.toContain("HEAD");
  });

  it("başarılı okuma bu rozeti TAŞIMAZ", () => {
    expect(kesit(HTML, "bolum-git")).not.toContain("rozet--okunamadi");
    expect(kesit(HTML, "bolum-git")).toContain("CANLI OKUMA");
  });

  it("okunamadı kutusu CSS'te ayrı çizilir", () => {
    expect(okunamadi).toContain(".kutu--okunamadi {");
    expect(okunamadi).toContain(".rozet--okunamadi {");
  });
});

/* ── Anlati: dördüncü sınıf, ölçümle AYNI kaynaktan gelir ────────────── */

describe("anlatı sınıfı ölçüm gibi görünmez", () => {
  const b = kesit(HTML, "bolum-notlar");

  it("kendi rozetini taşır", () => {
    expect(b).toContain("ANLATI — ÖLÇÜM DEĞİL");
    expect(b).toContain("rozet--anlati");
  });

  it("not kartları ölçüm kutusu kılığına girmez", () => {
    expect(b).toContain("kutu--anlati");
    expect(b).not.toContain("kutu--olcum");
    expect(b).not.toContain("rozet--olcum");
  });

  it("Journal kaynağını yine de gösterir (Journal'dan GELİR, ölçüm DEĞİLDİR)", () => {
    expect(b).toContain("note olayları");
    expect(b).toContain("anlatıdır, ölçüm değildir");
  });

  it("sözlükte dördüncü sınıf olarak tanıtılır", () => {
    const s = kesit(HTML, "bolum-sozluk");
    expect(s).toContain("ANLATI — ÖLÇÜM DEĞİL");
    expect(s).toContain("en kolay karışan sınıf");
    /* Dört sınıf kutusu: olcum · canli · plan · anlati */
    expect(sayac(s, /class="kutu kutu--/g)).toBe(4);
  });

  it("anlatı kutusu CSS'te ayrı çizilir", () => {
    expect(HTML).toContain(".kutu--anlati {");
    expect(HTML).toContain(".rozet--anlati {");
  });
});

/* ── Plan bayatlığı CANLI OKUMADIR (olcum_notu + okundu) ─────────────── */

describe("plan bayatlığı damgalı gösterilir", () => {
  const b = kesit(HTML, "bolum-plan");

  it("bayatlığın ölçüldüğü an görünür ve canlı okuma diye işaretlenir", () => {
    expect(b).toContain("Bayatlık okundu");
    expect(b).toContain("BAYATLIK: CANLI OKUMA");
    expect(b).toContain("2026-07-20T00:44:58.000Z");
  });

  it("bayatlığın NEYE GÖRE ölçüldüğü görünür", () => {
    expect(b).toContain("Ölçüm notu");
    expect(b).toContain(kacir("git rev-list --count <dosyanın son commit'i>..main"));
  });

  it("ölçülemeyen bayatlığın GEREKÇESİ görünür", () => {
    expect(b).toContain("dosya git tarihçesinde yok; bayatlık ölçülemedi");
  });

  it("bayatlığın eskiyeceği açıkça söylenir", () => {
    expect(b).toContain("bayatlık CANLI OKUMADIR");
    expect(b).toContain("sessizce eskir");
  });

  it("ölçüm notu yoksa bu da söylenir", () => {
    const h = renderCockpitPage(
      gorunumKur({
        plan: [
          {
            sinif: "plan",
            deger: { baslik: "Notsuz plan", satirlar: [] },
            kaynak: "docs/roadmap/x.md",
            guncellendi: null,
            geride_commit: null,
            olcum_notu: null,
            okundu: "2026-07-20T00:44:58.000Z",
          },
        ],
      })
    );
    expect(kesit(h, "bolum-plan")).toContain("ölçüm notu YOK");
  });
});

/* ── KURAL 6 — kaçış ─────────────────────────────────────────────────── */

describe("kacir — saf kaçış fonksiyonu", () => {
  it("beş tehlikeli karakteri kaçışlar", () => {
    expect(kacir("<")).toBe("&lt;");
    expect(kacir(">")).toBe("&gt;");
    expect(kacir("&")).toBe("&amp;");
    expect(kacir('"')).toBe("&quot;");
    expect(kacir("'")).toBe("&#39;");
  });

  it("SIRA doğru: & önce değiştirilir, çift kaçış olmaz", () => {
    /* & sonda değiştirilseydi bu "&amp;amp;lt;" olurdu */
    expect(kacir("<")).toBe("&lt;");
    expect(kacir("&lt;")).toBe("&amp;lt;");
    expect(kacir("&amp;")).toBe("&amp;amp;");
  });

  it("betik gövdesi tamamen etkisizleşir", () => {
    expect(kacir("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("öznitelik kaçışı da yapılır", () => {
    expect(kacir(`" onmouseover="alert(1)`)).toBe("&quot; onmouseover=&quot;alert(1)");
  });

  it("Türkçe metni bozmaz", () => {
    expect(kacir("Şğüöçİı — ölçüm dürüstlüğü")).toBe("Şğüöçİı — ölçüm dürüstlüğü");
  });

  it("dize olmayan girdiyi de kaçışlar (JSONL diskten gelir, tip garanti değildir)", () => {
    expect(kacir(null)).toBe("");
    expect(kacir(undefined)).toBe("");
    expect(kacir(0)).toBe("0");
    expect(kacir(false)).toBe("false");
    expect(kacir(["<b>"])).toBe("&lt;b&gt;");
  });
});

describe("kural 6 — düşmanca journal metni ekranda çalıştırılamaz", () => {
  const zehir = "<script>alert(1)</script>";
  const dusman = renderCockpitPage(
    gorunumKur({
      aktif_paket: {
        sinif: "olcum",
        kaynak: "foldPackageJournal()",
        deger: { ...PAKET, ad: zehir },
      },
      notlar: {
        sinif: "anlati",
        kaynak: "note olayları",
        deger: [
          { text: `<img onerror="alert(2)">`, ts: "2026-07-19T22:10:00.000Z" },
          { text: `" onmouseover="alert(3)`, ts: "2026-07-19T22:11:00.000Z" },
          { text: "bağlantı denemesi: https://evil.example/x", ts: "2026-07-19T22:12:00.000Z" },
        ],
      },
    })
  );

  it("paket adındaki betik ÇALIŞTIRILABİLİR olarak geçmez", () => {
    expect(dusman).not.toContain(zehir);
    expect(sayac(dusman, /<script/gi)).toBe(0);
    expect(dusman).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("nottaki etiket enjeksiyonu etkisizleşir", () => {
    expect(sayac(dusman, /<img/gi)).toBe(0);
    expect(dusman).toContain("&lt;img onerror=&quot;alert(2)&quot;&gt;");
  });

  it("öznitelikten kaçış denemesi tırnakla kırılamaz", () => {
    expect(dusman).not.toContain(`" onmouseover="alert(3)`);
    expect(dusman).toContain("&quot; onmouseover=&quot;alert(3)");
  });

  it("nottaki adres kaynak yükleyen bir öğeye dönüşmez", () => {
    expect(sayac(dusman, /\shref=/gi)).toBe(0);
    expect(sayac(dusman, /\ssrc=/gi)).toBe(0);
    expect(dusman).toContain("evil.example");
  });

  it("kapı sayısının ANAHTARI da kaçışlanır", () => {
    const kapilar = kapilarKur();
    const lint = kapilar.find((k) => k.ad === "lint");
    expect(lint?.kosum).not.toBeNull();
    const zehirli = renderCockpitPage(
      gorunumKur({
        kapilar: {
          sinif: "olcum",
          kaynak: "gate_run olayları",
          deger: kapilar.map((k) =>
            k.ad === "lint" && k.kosum !== null
              ? { ...k, kosum: { ...k.kosum, values: { "<b>problems</b>": 0 } } }
              : k
          ),
        },
      })
    );
    expect(sayac(zehirli, /<b>/gi)).toBe(0);
    expect(zehirli).toContain("&lt;b&gt;problems&lt;/b&gt;");
  });

  it("kütükteki <tmp> yer tutucusu kaçışlanmış geçer", () => {
    /* Gerçek veri zaten düşmanca: lint referans komutu `-o <tmp>` içerir */
    expect(kapiKarti(HTML, "lint")).toContain("-o &lt;tmp&gt;");
    expect(HTML).not.toContain("-o <tmp>");
  });
});

/* ── Boş durumlar ────────────────────────────────────────────────────── */

describe("aktif paket yokken çökmez, anlamlı boş durum gösterir", () => {
  const bos = renderCockpitPage(
    gorunumKur({
      aktif_paket: { sinif: "olcum", deger: null, kaynak: "foldPackageJournal()" },
      zaman_cizelgesi: { sinif: "olcum", deger: [], kaynak: "stage_changed olayları" },
      kapilar: { sinif: "olcum", deger: [], kaynak: "gate_run olayları" },
      gecmis: { sinif: "olcum", deger: [], kaynak: "docs/journal/events/*.jsonl" },
      riskler: { sinif: "olcum", deger: [], kaynak: "risk_recorded olayları (açık olanlar)" },
      notlar: { sinif: "anlati", deger: [], kaynak: "note olayları" },
      git: {
        sinif: "canli-okunamadi",
        sebep: "git komutu bulunamadı (PATH'te yok)",
        okundu: "2026-07-20T00:45:00.000Z",
        komut: "git status --porcelain",
      },
      plan: [],
    })
  );

  it("belge yine tam ve geçerli", () => {
    expect(bos.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(bos.trimEnd().endsWith("</html>")).toBe(true);
    expect(bos).not.toContain("undefined");
    expect(bos).not.toContain("[object Object]");
  });

  it("boşluk 'sıfır ölçüm' değil 'kayıt yok' diye açıklanır", () => {
    const b = kesit(bos, "bolum-paket");
    expect(b).toContain("Aktif paket YOK");
    expect(b).toContain("kayıt yokluğudur");
  });

  it("her boş bölüm kendi boş durumunu yazar", () => {
    expect(kesit(bos, "bolum-cizelge")).toContain("yaşam döngüsü konumu yok");
    expect(kesit(bos, "bolum-kapilar")).toContain("kapı görünümü üretilmedi");
    expect(kesit(bos, "bolum-git")).toContain("CANLI OKUMA YAPILAMADI");
    expect(kesit(bos, "bolum-plan")).toContain("Plan kaydı yok");
    expect(kesit(bos, "bolum-riskler")).toContain("Açık risk kaydı yok");
    expect(kesit(bos, "bolum-gecmis")).toContain("Package Journal geçmişi boş");
  });

  it("boş belgede de hiçbir düğme/dış kaynak yok", () => {
    expect(sayac(bos, /<button|<form|<input|onclick/gi)).toBe(0);
    expect(sayac(bos, /https?:\/\//gi)).toBe(0);
  });
});

/* ── 11.6 — Cockpit yönetişim kapılarını aşamaz ──────────────────────── */

describe("11.6 — yüzey yetki kaynağı olmadığını söyler", () => {
  it("üst şerit salt-okunurluğu yazar", () => {
    expect(HTML).toContain("hiçbir işlem düğmesi yoktur");
    expect(HTML).toContain("icra yüzeyidir, yetki kaynağı değildir");
  });

  it("kapalı kalemler (merge/dağıtım) açıkça kapalı anılır", () => {
    expect(HTML).toContain("merge başlat");
    expect(HTML).toContain("dağıtım başlat");
  });
});
