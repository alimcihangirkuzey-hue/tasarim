/* Cockpit modül fazı 1 — GÖRÜNÜM MODELİ (Canonical 11.3/11.4).

   11.4 yüzeyin İKİ VERİ SINIFI taşımasını ve bunların "görsel olarak ayrışmasını"
   şart koşar. Görsel ayrışma bir üslup kuralıdır ve üslup kuralları zamanla
   aşınır: bir alan yanlış bileşenle render edilir, bir renk kopyalanır, plan
   verisi ölçüm kılığına girer.

   Bu yüzden sınıf BURADA, TİPTE taşınır. Görünüm modelindeki her değer
   sınıfıyla birlikte sarmalanır ve render edici yalnız sarmalanmış değer kabul
   eder. Sınıfsız bir değeri ekrana koymanın yolu YOKTUR — 11.4'ün "plan sınıfı
   hiçbir koşulda ölçüm gibi sunulamaz" hükmü üslup değil, tip kısıtı olur.

   ÜÇ SINIF (11.3 + 11.4):
   · olcum — Journal'daki bir alana BİREBİR karşılık gelir. Karşılığı olmayan
     ölçüm alanı bu modele giremez; girecek yer yoktur.
   · canli — dış sistemin ANLIK durumu (11.3 canlı okuma istisnası). Geçmiş
     ölçüm gibi sunulamaz; okunduğu an daima yanında taşınır.
   · plan  — henüz ölçülmemiş NİYET bilgisi (11.4 plan sınıfı). Kaynağı
     programın planlama kayıtlarıdır, Journal DEĞİLDİR. Kendi bayatlığını
     ölçülmüş olarak taşır: "plan" demek yetmez, planın NE KADAR eski olduğu
     da görünür olmalıdır.

   SAF: I/O yok. Journal okuma, git okuma ve dosya okuma çağıranın işidir. */

import {
  JOURNAL_GATES,
  JOURNAL_GATE_NAMES,
  type JournalGateName,
  type JournalGateRun,
  type JournalPackageRecord,
  type JournalStage,
  JOURNAL_STAGES,
} from "@tezgah/shared";

/* ── Sınıf sarmalayıcıları ────────────────────────────────────────────── */

/** Journal'dan gelen ölçüm. `kaynak` hangi Journal alanından geldiğini söyler. */
export interface Olcum<T> {
  sinif: "olcum";
  deger: T;
  /** Journal'daki karşılığı — "karşılığı olmayan alan eklenmez" denetlenebilsin */
  kaynak: string;
}

/** Dış sistemin anlık durumu. `okundu` ZORUNLUDUR (11.3). */
export interface Canli<T> {
  sinif: "canli";
  deger: T;
  okundu: string;
  komut: string;
}

/**
 * Niyet bilgisi. Bayatlık ÖLÇÜLÜR; "plan" etiketi tek başına yetmez.
 *
 * İÇERİK plan sınıfıdır (dosyadan gelir), BAYATLIK ise canlı okumadır (render
 * anında git'ten ölçülür). Bu yüzden `okundu` burada da zorunludur: JSON olarak
 * serileştirilen bir görünümde "42 commit geride" sessizce eskir — 11.3'ün canlı
 * okuma istisnasının önlemek için var olduğu kalıp.
 */
export interface Plan<T> {
  sinif: "plan";
  deger: T;
  kaynak: string;
  /** Kaynağın son değişim anı (git'ten ölçülür); ölçülemezse null */
  guncellendi: string | null;
  /** Kaynak dosyadan sonra ana dala giren commit sayısı; ölçülemezse null */
  geride_commit: number | null;
  /**
   * Bayatlığın NEYE GÖRE ölçüldüğü, ölçülemediyse NEDEN.
   *
   * `geride_commit: null` tek başına "neden" demiyor, dolu bir değer de "neye
   * göre" demiyordu. JournalGateRun ölçülemeyen kapı için `reason` şart koşuyor;
   * plan sınıfı aynı kuralın dışında bırakılmıştı. Serbest metin olan `kaynak`
   * alanına gerekçe iliştirmek, iki ayrı bilgiyi tek alana yığmaktı.
   */
  olcum_notu: string | null;
  /** Bayatlığın ölçüldüğü an (ISO UTC ms) — içerik değil, ÖLÇÜM eskir */
  okundu: string;
}

/**
 * Canlı okuma YAPILAMADI — 11.3'ün "olculemedi" ilkesinin canlı okuma karşılığı.
 *
 * Düz `| null` kullanmak "dış sistem yok" ile "okunamadı"yı tek değerde
 * birleştiriyordu; oysa kapı tarafında `yazilmadi` ile `olculemedi` titizlikle
 * ayrılıyor. Aynı titizlik burada da geçerli: sebep düşerse ekran, okumanın
 * denendiğini bile söyleyemez.
 */
export interface CanliOkunamadi {
  sinif: "canli-okunamadi";
  sebep: string;
  okundu: string;
  komut: string;
}

/**
 * ANLATI — Journal'dan gelir ama ÖLÇÜM DEĞİLDİR (11.4).
 *
 * `note` olayları insan cümleleridir. İlk taslak onları `Olcum<T>` ile
 * sarmalıyordu ve `kaynak` metni "ANLATI, ölçüm değil" diyordu: tip bir şey,
 * yazı tam tersini söylüyordu. Sınıfı tipte taşıyan bir dosyada bu çelişki,
 * kapatmak için kurulduğu deliğin ta kendisi.
 */
export interface Anlati<T> {
  sinif: "anlati";
  deger: T;
  kaynak: string;
}

export type Sinifli<T> = Olcum<T> | Canli<T> | CanliOkunamadi | Plan<T> | Anlati<T>;

export const olcum = <T>(deger: T, kaynak: string): Olcum<T> => ({ sinif: "olcum", deger, kaynak });

export const canli = <T>(deger: T, okundu: string, komut: string): Canli<T> => ({
  sinif: "canli",
  deger,
  okundu,
  komut,
});

export const canliOkunamadi = (sebep: string, okundu: string, komut: string): CanliOkunamadi => ({
  sinif: "canli-okunamadi",
  sebep,
  okundu,
  komut,
});

export const anlati = <T>(deger: T, kaynak: string): Anlati<T> => ({
  sinif: "anlati",
  deger,
  kaynak,
});

/**
 * Plan kurucusu. Üç sınıfın üçünün de kurucusu vardır ve elle nesne kurulmaz:
 * `Plan<T>` bayatlık alanlarını (kaynak · guncellendi · geride_commit) zorunlu
 * tutan tek sınıftır ve elle kurulan tek sınıf, o kuralın aşınacağı yerdir.
 */
export const plan = <T>(
  deger: T,
  kaynak: string,
  bayatlik: {
    guncellendi: string | null;
    geride_commit: number | null;
    olcum_notu: string | null;
    okundu: string;
  }
): Plan<T> => ({ sinif: "plan", deger, kaynak, ...bayatlik });

/* ── Kapı görünümü ────────────────────────────────────────────────────── */

/**
 * Bir kapının ekrandaki hâli.
 *
 * `kapsam` ZORUNLUDUR ve opsiyonel yapılmamalıdır. Hakem turunun bağlayıcı
 * devir şartı: kapsam şerhi HER sayının yanında görünmelidir, yoksa dürüstlük
 * kozmetik kalır — "lint 0" ifadesi, kapsamı kadar dürüst olmayan bir sayıdır.
 * Tipte zorunlu olduğu için render edici onu atlayamaz.
 */
export interface KapiGorunumu {
  ad: JournalGateName;
  /** null → bu kapı bu paket için HİÇ YAZILMADI ("olculemedi"den FARKLIDIR) */
  kosum: JournalGateRun | null;
  /** Kapının ÖLÇMEDİĞİ şey — JOURNAL_GATES kütüğünden, daima gösterilir */
  kapsam: string;
  /** İnsan turu gerektiren kapı (11.6/3) */
  insan: boolean;
  /**
   * Bu kapı ölçüldüğünde SAYI üretmek zorunda mı?
   *
   * Model bunu taşımazsa yüzey, "geçti ama sayı yok" gördüğünde bunun MEŞRU mu
   * (typecheck: başarısı sessizdir) yoksa ÖLÇÜM KAYBI mı (lint: sayı üretmeliydi)
   * olduğunu söyleyemez — journal.ts bu alanı tam da o ayrım için tanımlıyor.
   * Alternatif, render edicinin JOURNAL_GATES'i yeniden okumasıydı; bu da
   * modelin kapatmak için kurulduğu ikinci kütük-okuma yolunu geri açardı.
   */
  sayi_uretmeli: boolean;
  /**
   * Kütükteki REFERANS komut. `yazilmadi` durumunda `kosum` da null olduğu için
   * bu olmadan kart, kapının ne ölçmediğini söyleyip ne koşacağını söyleyemezdi —
   * okuyanın en az bilgiye sahip olduğu an, kütüğün en çok bilgiye sahip olduğu andı.
   */
  referans_komut: string | null;
  /**
   * "Hiç yazılmadı" ile "ölçülemedi" ayrımının ekrandaki karşılığı.
   * Bu ayrım kaybolursa Faz 1 yanıltıcı olur: koşulmamış bir kapı, koşulup
   * ölçülememiş bir kapıyla aynı görünür.
   */
  durum: "gecti" | "kaldi" | "atlandi" | "olculemedi" | "yazilmadi";
}

export interface AsamaAdimi {
  asama: JournalStage;
  /** Bu aşamaya İLK geçildiği an; hiç geçilmediyse null */
  ts: string | null;
  durum: "gecildi" | "simdi" | "bekliyor";
  /**
   * Bu aşamaya kaç kez gelindi. 1'den büyükse paket buraya GERİ DÖNDÜ.
   *
   * İlk taslak yalnız ilk varış anını okuyordu; sonuç: doğrulayıcı bulgu çıkarıp
   * paketi geri gönderdiğinde çizelge hem `test`i hem `ikinci-dogrulayici`yi
   * "geçildi" gösteriyordu — doğrulamada TIKANMIŞ paket, temiz geçmiş paketle
   * AYNI görünüyordu. 11.5 geri dönüşü geçerli bir geçiş sayar ve "kayda geçer"
   * der; kayıtta olup ekranda olmayan bir geçiş, ekranın yalanıdır.
   */
  ziyaret: number;
  /** Bu aşamadan kaç kez GERİ dönüldü (ör. doğrulayıcı bulgusu) */
  geri_donus: number;
}

/* ── Görünüm modeli ───────────────────────────────────────────────────── */

/* 11.3(a) "Kimlik" kümesi: paket adı · amaç · BAŞLANGIÇ VE BİTİŞ ANI.
   İlk taslak yalnız `ad` taşıyordu; amaç ve anlar kayıtta VARDI ama özet onları
   düşürüyordu — yüzey paketin ne İÇİN olduğunu gösteremiyordu. */
export interface PaketOzeti {
  package_id: string;
  ad: string | null;
  amac: string | null;
  baslangic: string | null;
  /** İlk merge geçişinin anı; yoksa null — TAHMİNİ BİTİŞ ÜRETİLMEZ (11.3) */
  bitis: string | null;
  asama: JournalStage | null;
  olay_sayisi: number;
  son_olay_ts: string | null;
  dogrulayici_karari: "onay" | "bulgu" | null;
  dogrulayici_acik_bulgu: number;
  acik_risk: number;
  kapali_risk: number;
}

export interface CockpitGorunumu {
  /** Yüzeyin üretildiği an — sayfanın kendi zaman damgası */
  uretildi: string;

  /* — ÖLÇÜM SINIFI (11.4): her alan Journal'daki bir alana birebir karşılık gelir — */
  aktif_paket: Olcum<PaketOzeti | null>;
  /** 11.5 yaşam döngüsü konumu — sekiz aşamanın tamamı, nerede olunduğu işaretli */
  zaman_cizelgesi: Olcum<AsamaAdimi[]>;
  kapilar: Olcum<KapiGorunumu[]>;
  izlenebilirlik: Olcum<{
    canonical_version: string | null;
    bolumler: string[];
    adr_tdr: string[];
    moduller: string[];
    sozlesmeler: string[];
    kapsam_ic: string[];
    kapsam_dis: string[];
    risk_sinifi: string | null;
  }>;
  gecmis: Olcum<PaketOzeti[]>;
  riskler: Olcum<{ risk_id: string; summary: string; ts: string }[]>;

  /* — ANLATI: Journal'dan gelir, ÖLÇÜM DEĞİL (11.4) — */
  notlar: Anlati<{ text: string; ts: string }[]>;

  /* — CANLI OKUMA (11.3 istisnası): okunduğu an daima yanında — */
  git: Canli<{ dal: string; head: string; temiz: boolean; degisen: number }> | CanliOkunamadi;

  /* — PLAN SINIFI (11.4): ölçüm DEĞİL, niyet — */
  plan: Plan<{ baslik: string; satirlar: string[] }>[];
}

/* ── Kurucu ───────────────────────────────────────────────────────────── */

/** Paket kaydını ekran özetine indirger (liste ve aktif paket aynı biçimi kullanır) */
export function paketOzeti(rec: JournalPackageRecord): PaketOzeti {
  return {
    package_id: rec.package_id,
    ad: rec.identity?.name ?? null,
    amac: rec.identity?.purpose ?? null,
    baslangic: rec.started_at,
    bitis: rec.finished_at,
    asama: rec.stage,
    olay_sayisi: rec.event_count,
    son_olay_ts: rec.last_event_ts,
    dogrulayici_karari: rec.verifier.decision,
    dogrulayici_acik_bulgu: rec.verifier.findings_open,
    acik_risk: rec.open_risks.length,
    kapali_risk: rec.closed_risks.length,
  };
}

/** 11.5'in sekiz aşamasını, kaydın nerede olduğu işaretlenmiş biçimde verir. */
export function zamanCizelgesi(rec: JournalPackageRecord): AsamaAdimi[] {
  /* "Ne zaman ulaşıldı" sorusunun cevabı İLK varıştır; ama tek başına yetmez —
     kaç kez gelindiği ve nereden geri dönüldüğü de sayılır, yoksa geri dönüş
     ekranda kaybolur. */
  const varis = new Map<JournalStage, string>();
  const ziyaret = new Map<JournalStage, number>();
  const geriDonus = new Map<JournalStage, number>();

  for (const adim of rec.stage_history) {
    if (!varis.has(adim.to)) varis.set(adim.to, adim.ts);
    ziyaret.set(adim.to, (ziyaret.get(adim.to) ?? 0) + 1);
    /* Geri dönüş, TERK EDİLEN aşamaya yazılır: "buradan geri gönderildi" */
    if (adim.direction === "geri" && adim.from !== null) {
      geriDonus.set(adim.from, (geriDonus.get(adim.from) ?? 0) + 1);
    }
  }

  return JOURNAL_STAGES.map((asama) => ({
    asama,
    ts: varis.get(asama) ?? null,
    durum: rec.stage === asama ? "simdi" : varis.has(asama) ? "gecildi" : "bekliyor",
    ziyaret: ziyaret.get(asama) ?? 0,
    geri_donus: geriDonus.get(asama) ?? 0,
  }));
}

/**
 * Kapı görünümleri — kütükteki TÜM kapılar için, koşulmamış olanlar dâhil.
 *
 * Yalnız koşulmuş kapıları listelemek, koşulmamış bir kapıyı EKRANDAN silerdi:
 * "lint hiç koşulmadı" ile "lint yok" aynı görünürdü. Kütük tam listedir;
 * eksik olan `durum:"yazilmadi"` ile GÖRÜNÜR kalır.
 */
export function kapiGorunumleri(rec: JournalPackageRecord): KapiGorunumu[] {
  return JOURNAL_GATE_NAMES.map((ad) => {
    const kosum = rec.gates[ad] ?? null;
    return {
      ad,
      kosum,
      kapsam: JOURNAL_GATES[ad].scope,
      insan: JOURNAL_GATES[ad].human,
      sayi_uretmeli: JOURNAL_GATES[ad].produces_values,
      referans_komut: JOURNAL_GATES[ad].command,
      durum: kosum === null ? "yazilmadi" : kosum.outcome,
    };
  });
}

export interface GorunumGirdisi {
  uretildi: string;
  /** Aktif paket kaydı (yoksa null) */
  aktif: JournalPackageRecord | null;
  /** Tüm paketler, yeniden eskiye */
  hepsi: JournalPackageRecord[];
  git: Canli<{ dal: string; head: string; temiz: boolean; degisen: number }> | CanliOkunamadi;
  plan: Plan<{ baslik: string; satirlar: string[] }>[];
  /**
   * Kayıtların GERÇEKTEN okunduğu dizin. Sabit yazılamaz: `TEZGAH_JOURNAL_DIR`
   * ayarlıyken veri başka yerden gelir ve sabit bir yol bildiren `kaynak` alanı
   * ölçülmemiş bir iddia olur — kaynak dürüstlüğü (11.3) alanının kendisi yalan söyler.
   */
  journal_dizini: string;
}

/**
 * SAF kurucu. Ölçüm alanlarının TAMAMI `aktif` kaydından türer; başka hiçbir
 * kaynaktan ölçüm sınıfına veri giremez (git canlı, plan ayrı sınıf).
 */
export function buildCockpitView(girdi: GorunumGirdisi): CockpitGorunumu {
  const a = girdi.aktif;

  return {
    uretildi: girdi.uretildi,

    aktif_paket: olcum(a === null ? null : paketOzeti(a), "foldPackageJournal()"),
    zaman_cizelgesi: olcum(a === null ? [] : zamanCizelgesi(a), "stage_changed olayları"),
    kapilar: olcum(a === null ? [] : kapiGorunumleri(a), "gate_run olayları"),
    izlenebilirlik: olcum(
      {
        canonical_version: a?.identity?.canonical_version ?? null,
        bolumler: a?.identity?.canonical_sections ?? [],
        adr_tdr: a?.identity?.adr_tdr ?? [],
        moduller: a?.identity?.modules ?? [],
        sozlesmeler: a?.identity?.contracts ?? [],
        kapsam_ic: a?.identity?.scope_in ?? [],
        kapsam_dis: a?.identity?.scope_out ?? [],
        risk_sinifi: a?.identity?.risk_class ?? null,
      },
      "package_declared olayı"
    ),
    /* Ayraçlar tekleştirilir: Windows'ta `journal_dizini` ters bölü taşır ve
       şablonun düz bölüsüyle karışık bir yol üretirdi (…\events/*.jsonl). */
    gecmis: olcum(
      girdi.hepsi.map(paketOzeti),
      `${girdi.journal_dizini.replace(/\\/g, "/")}/*.jsonl`
    ),
    riskler: olcum(
      a === null ? [] : a.open_risks.map((r) => ({ risk_id: r.risk_id, summary: r.summary, ts: r.ts })),
      "risk_recorded olayları (açık olanlar)"
    ),
    notlar: anlati(
      a === null ? [] : a.notes.map((n) => ({ text: n.text, ts: n.ts })),
      "note olayları"
    ),

    git: girdi.git,
    plan: girdi.plan,
  };
}
