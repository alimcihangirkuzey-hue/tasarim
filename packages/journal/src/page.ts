/* Cockpit modül fazı 1 — HTML RENDER EDİCİ (Canonical 11.4/11.6).

   SAF: girdi CockpitGorunumu, çıktı tam HTML belgesi. I/O yoktur, zaman
   okunmaz (`uretildi` görünüm modelinden gelir), ağ isteği yoktur.

   ÜÇ YAPISAL KISIT — üslup değil, sınanabilir kural:

   1. SALT-OKUNUR (11.4 Modül Fazı 1: "Hiçbir işlem düğmesi yoktur").
      Bu dosya `<button>`, `<form>`, `<input>` veya olay işleyicisi ÜRETMEZ.
      Katlama `<details>/<summary>` ile yapılır — tarayıcının kendi davranışı,
      bizim kodumuz değil. 11.6'nın "düğmenin kapısı düğmenin İÇİNDE olmalı"
      hükmüne uymanın Faz 1'deki tek dürüst yolu, düğmeyi hiç üretmemektir.

   2. SINIF AYRIŞMASI (11.4). Üç sınıfın üçü de KENDİ kutusuyla, KENDİ
      rozetiyle ve KENDİ zemin/kenarlık kimliğiyle çizilir. Plan ve canlı
      kutuları ölçüm kutusundan taranmış zemin ve kesikli kenarlıkla ayrılır;
      rozet metni ("PLAN — ÖLÇÜM DEĞİL", "CANLI OKUMA") tek başına da yeterli
      olmalıdır, çünkü renk körlüğü ve tek renkli çıktı gerçektir.

   3. KAPSAM ŞERHİ HER SAYININ YANINDA (hakem turunun bağlayıcı devir şartı).
      Şerh katlanmaz, tooltip'e saklanmaz, kısaltılmaz: kapı kartının daima
      görünür gövdesinde tam metin olarak durur. "lint 0" ifadesi kapsamı
      kadar dürüsttür; kapsamı gizlemek sayıyı olduğundan güçlü gösterir.

   KENDİ KENDİNE YETER: harici stil/betik/font/görsel YOKTUR. Tüm biçim
   satır içi `<style>` içindedir; hiçbir `src=`, `href=`, `url()` üretilmez.
   Sayfa ağı olmayan bir makinede, dosyadan açıldığında birebir aynı görünür. */

import type {
  Anlati,
  AsamaAdimi,
  Canli,
  CockpitGorunumu,
  KapiGorunumu,
  Olcum,
  PaketOzeti,
  Plan,
} from "./view.js";

/* ── Kaçış ────────────────────────────────────────────────────────────────

   Journal metinleri Türkçe SERBEST METİNDİR: paket adı, not, risk özeti,
   gerekçe — hepsi insan yazımıdır ve hiçbiri denetimden geçmez. Diskten
   JSON.parse ile geldikleri için tipleri de çalışma zamanında garanti
   DEĞİLDİR; bu yüzden kaçış `unknown` kabul eder ve önce dizeye çevirir.
   Tipe güvenip `string` istemek, tam olarak tipin yalan söylediği yerde
   (bozuk JSONL satırı) kaçışı devre dışı bırakırdı.

   SIRA ÖNEMLİ: `&` İLK sırada değiştirilmezse kendi ürettiğimiz kaçış
   dizileri yeniden kaçışlanır ve `&lt;` ekranda `&amp;lt;` görünür. */
export function kacir(deger: unknown): string {
  if (deger === null || deger === undefined) return "";
  const s = typeof deger === "string" ? deger : String(deger);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ── Kapalı sözlüklerin ekran karşılıkları ────────────────────────────────

   Tipler view.ts'ten TÜRETİLİR (`Record<Asama, string>`), yeniden yazılmaz:
   sözlüğe yeni bir aşama/durum eklendiğinde bu dosya DERLENMEZ. Eksik etiket
   sessizce "undefined" basmak yerine tip hatası olur. */

type Asama = AsamaAdimi["asama"];
type KapiDurumu = KapiGorunumu["durum"];
type Kosum = NonNullable<KapiGorunumu["kosum"]>;
type Koken = Kosum["origin"];

const ASAMA_ADI: Record<Asama, string> = {
  planlama: "Planlama",
  "canonical-kaydi": "Canonical kaydı",
  gelistirme: "Geliştirme",
  test: "Test",
  "ikinci-dogrulayici": "İkinci doğrulayıcı",
  hazir: "Hazır",
  merge: "Merge",
  dagitim: "Dağıtım",
};

const ASAMA_DURUMU: Record<AsamaAdimi["durum"], string> = {
  gecildi: "geçildi",
  simdi: "ŞİMDİ BURADA",
  bekliyor: "henüz ulaşılmadı",
};

interface DurumBicimi {
  etiket: string;
  isaret: string;
  /** "yazilmadi" ile "olculemedi" ekranda BURADAN ayrışır — rozet rengi tek
      başına yeterli değildir; ikisi de "geçmedi" ama sebepleri farklıdır. */
  aciklama: string;
}

const KAPI_DURUMU: Record<KapiDurumu, DurumBicimi> = {
  gecti: {
    etiket: "GEÇTİ",
    isaret: "✓",
    aciklama: "gerçekten koşuldu ve geçti",
  },
  kaldi: {
    etiket: "KALDI",
    isaret: "✕",
    aciklama: "gerçekten koşuldu ve kaldı",
  },
  atlandi: {
    etiket: "ATLANDI",
    isaret: "⊘",
    aciklama: "bilerek atlandı, gerekçesi kayıtlıdır — ölçüm YOKTUR",
  },
  olculemedi: {
    etiket: "ÖLÇÜLEMEDİ",
    isaret: "⚠",
    aciklama: "kapı Journal'a YAZILDI ama değeri ölçülemedi, gerekçesi kayıtlıdır",
  },
  yazilmadi: {
    etiket: "YAZILMADI",
    isaret: "○",
    aciklama: "bu paket için Journal'da HİÇ kayıt yok — kapı hiç yazılmadı, gerekçe de yok",
  },
};

/* 11.3 kaynak dürüstlüğü: "yasak olan tahminin varlığı değil, tahminin ölçüm
   gibi sunulmasıdır" — bu yüzden ölçülmemiş köken ekranda İŞARETLENİR. */
const KOKEN_ADI: Record<Koken, string> = {
  olculdu: "ÖLÇÜLDÜ",
  turetilmis: "TÜRETİLMİŞ — ölçüm değil",
  tahmini: "TAHMİNİ — ölçüm değil",
};

/* ── Küçük yapı taşları ───────────────────────────────────────────────── */

const YOK = `<span class="yok">— kayıt yok</span>`;

/** Etiket/değer çifti. Değer HAM verilir ve BURADA kaçışlanır: çağıran
    tarafın kaçışı unutması mümkün olmasın. */
function alan(etiket: string, deger: string | number | boolean | null | undefined): string {
  const bos = deger === null || deger === undefined || deger === "";
  return `<div class="alan"><dt>${kacir(etiket)}</dt><dd>${bos ? YOK : kacir(deger)}</dd></div>`;
}

/** Değeri tek aralıklı yazıyla gösterir (komut, hash, dosya yolu). */
function alanKod(etiket: string, deger: string | number | null | undefined): string {
  const bos = deger === null || deger === undefined || deger === "";
  return `<div class="alan"><dt>${kacir(etiket)}</dt><dd>${
    bos ? YOK : `<code>${kacir(deger)}</code>`
  }</dd></div>`;
}

function liste(degerler: string[], bosMetin: string): string {
  if (degerler.length === 0) return `<span class="yok">${kacir(bosMetin)}</span>`;
  return `<ul class="etiketler">${degerler
    .map((d) => `<li><code>${kacir(d)}</code></li>`)
    .join("")}</ul>`;
}

/** Ölçüm sınıfının kaynak şerhi — 11.3'ün "her ölçüm bir Journal alanına
    birebir karşılık gelir" iddiasının ekrandaki kanıtı. */
function olcumKaynagi(o: Olcum<unknown>): string {
  return `<p class="kaynak"><span class="rozet rozet--olcum">ÖLÇÜM</span> Journal kaynağı: <code>${kacir(
    o.kaynak
  )}</code></p>`;
}

/** Anlatı sınıfının kaynak şerhi — Journal'dan gelir ama ölçüm DEĞİLDİR (11.4). */
function anlatiKaynagi(a: Anlati<unknown>): string {
  return `<p class="kaynak"><span class="rozet rozet--anlati">ANLATI — ÖLÇÜM DEĞİL</span> Journal kaynağı: <code>${kacir(
    a.kaynak
  )}</code></p>`;
}

function bolum(id: string, baslik: string, govde: string): string {
  return `
<section class="bolum" id="${kacir(id)}">
  <h2>${kacir(baslik)}</h2>
  ${govde}
</section>`;
}

/* ── Üst şerit ────────────────────────────────────────────────────────── */

function ust(view: CockpitGorunumu): string {
  return `
<header class="ust">
  <div class="ust-satir">
    <h1>TEZGÂH · Developer Cockpit</h1>
    <p class="ust-damga">Yüzey üretildi: <code>${kacir(view.uretildi)}</code></p>
  </div>
  <p class="ust-alt">Modül Fazı 1 — <strong>salt-okunur</strong> (Canonical 11.4)</p>
  <p class="serit-uyari">Bu yüzeyde <strong>hiçbir işlem düğmesi yoktur</strong>. Cockpit bir
  icra yüzeyidir, yetki kaynağı değildir (Canonical 11.6): yürürlükteki yönetişimi
  <em>gösterir</em>, <em>üretmez</em>. Faz 1 yalnız okur.</p>
</header>`;
}

/* ── Veri sınıfı sözlüğü ──────────────────────────────────────────────── */

function sinifSozlugu(): string {
  return bolum(
    "bolum-sozluk",
    "Veri sınıfları",
    `<p class="not">Canonical 11.4: bu yüzeydeki her değer bir sınıf taşır ve sınıflar
    <strong>görsel olarak ayrışır</strong>. Sınıfsız bir değerin bu sayfaya girmesinin yolu yoktur.</p>
    <div class="sozluk">
      <div class="kutu kutu--olcum">
        <span class="rozet rozet--olcum">ÖLÇÜM</span>
        <p>Journal'daki bir alana <strong>birebir</strong> karşılık gelir. Karşılığı olmayan ölçüm
        alanı eklenmez; Cockpit hiçbir ölçümü kendisi türetmez veya tahmin etmez.</p>
      </div>
      <div class="kutu kutu--canli">
        <span class="rozet rozet--canli">CANLI OKUMA</span>
        <p>Dış sistemin <strong>anlık</strong> durumu (11.3 istisnası). Geçmiş ölçüm gibi sunulamaz;
        okunduğu an ve okuyan komut daima yanındadır. Okuma <em>yapılamazsa</em> bu da ayrıca
        söylenir: "dış sistem yok" ile "okunamadı" aynı şey değildir.</p>
      </div>
      <div class="kutu kutu--plan">
        <span class="rozet rozet--plan">PLAN — ÖLÇÜM DEĞİL</span>
        <p>Henüz ölçülmemiş <strong>niyet</strong> bilgisi. Kaynağı programın planlama kayıtlarıdır,
        Journal değildir. Bayatlığı ölçülür: "plan" demek yetmez, ne kadar eski olduğu da görünür.</p>
      </div>
      <div class="kutu kutu--anlati">
        <span class="rozet rozet--anlati">ANLATI — ÖLÇÜM DEĞİL</span>
        <p>Journal'dan gelir ama <strong>ölçüm değildir</strong>: insan cümleleridir. Ölçüm sınıfıyla
        aynı kaynaktan geldiği için en kolay karışan sınıf budur — bu yüzden ayrı rozeti vardır.</p>
      </div>
    </div>`
  );
}

/* ── Aktif paket ──────────────────────────────────────────────────────── */

/**
 * Bitiş anı. Paket sürüyorsa TAHMİNİ BİTİŞ ÜRETİLMEZ (11.3): "muhtemelen
 * yarın" bir ölçüm değildir ve boş bırakılan bir hücre, okuyanın kendi
 * tahminini doldurmasına davetiyedir. Süregeldiği AÇIKÇA yazılır.
 */
const bitisMetni = (bitis: string | null): string =>
  bitis === null
    ? `<span class="suruyor">sürüyor — tahmini bitiş ÜRETİLMEZ</span>`
    : `<code>${kacir(bitis)}</code>`;

const kararMetni = (karar: PaketOzeti["dogrulayici_karari"]): string | null =>
  karar === null ? null : karar === "onay" ? "ONAY" : "BULGU";

function paketAlanlari(p: PaketOzeti): string {
  return `<dl class="alanlar">
    ${alanKod("Paket kimliği", p.package_id)}
    ${alan("Ad", p.ad)}
    ${alan("Aşama", p.asama === null ? null : ASAMA_ADI[p.asama])}
    ${alanKod("Başlangıç", p.baslangic)}
    <div class="alan"><dt>Bitiş</dt><dd>${bitisMetni(p.bitis)}</dd></div>
    ${alan("Olay sayısı", p.olay_sayisi)}
    ${alanKod("Son olay", p.son_olay_ts)}
    ${alan("Doğrulayıcı kararı", kararMetni(p.dogrulayici_karari))}
    ${alan("Doğrulayıcının açık bulgusu", p.dogrulayici_acik_bulgu)}
    ${alan("Açık risk", p.acik_risk)}
    ${alan("Kapalı risk", p.kapali_risk)}
  </dl>
  <dl class="alanlar alanlar--genis">
    <div class="alan"><dt>Amaç</dt><dd>${p.amac === null ? YOK : kacir(p.amac)}</dd></div>
  </dl>`;
}

function aktifPaketBolumu(o: Olcum<PaketOzeti | null>): string {
  const govde =
    o.deger === null
      ? `<p class="bos">Aktif paket YOK — Journal'da açık bir paket kaydı bulunmuyor.
         Bu bir ölçüm değil, <strong>kayıt yokluğudur</strong>: aşağıdaki ölçüm alanları boş
         görünüyorsa sebebi budur, sıfır değer değildir.</p>`
      : `<div class="kutu kutu--olcum">${paketAlanlari(o.deger)}</div>`;
  return bolum("bolum-paket", "Aktif paket", `${olcumKaynagi(o)}${govde}`);
}

/* ── Aşama zaman çizelgesi (11.5) ─────────────────────────────────────── */

function cizelgeBolumu(o: Olcum<AsamaAdimi[]>): string {
  const govde =
    o.deger.length === 0
      ? `<p class="bos">Aktif paket olmadığı için yaşam döngüsü konumu yok.</p>`
      : `<ol class="serit">${o.deger
          .map(
            (a, i) => `<li class="adim adim--${a.durum}${a.ziyaret > 1 ? " adim-tekrarli" : ""}">
              <span class="adim-no">${i + 1}</span>
              <span class="adim-ad">${kacir(ASAMA_ADI[a.asama])}</span>
              <span class="adim-durum">${kacir(ASAMA_DURUMU[a.durum])}</span>
              <span class="adim-ts">${a.ts === null ? "—" : kacir(a.ts)}</span>
              ${
                a.ziyaret > 1
                  ? `<span class="adim-tekrar">↺ ${kacir(a.ziyaret)} KEZ GELİNDİ — buraya geri dönüldü</span>`
                  : ""
              }
              ${
                a.geri_donus > 0
                  ? `<span class="adim-tekrar">↩ buradan ${kacir(a.geri_donus)} kez GERİ dönüldü</span>`
                  : ""
              }
            </li>`
          )
          .join("")}</ol>
        <p class="not">Sekiz aşamanın <strong>tamamı</strong> gösterilir; ulaşılmamış aşama
        listeden düşürülmez. Zaman damgası aşamaya <em>ilk varış</em> anıdır — 11.5'te geriye
        dönüş geçerli bir geçiştir ve aşama tekrar ziyaret edilebilir. Tekrar ziyaret ve geri
        dönüş <strong>ayrıca işaretlenir</strong>: doğrulamada tıkanıp geri gönderilmiş bir paket,
        oradan temiz geçmiş bir paketle aynı görünemez.</p>`;
  return bolum("bolum-cizelge", "Yaşam döngüsü (Canonical 11.5)", `${olcumKaynagi(o)}${govde}`);
}

/* ── Kalite kapıları ──────────────────────────────────────────────────── */

/**
 * ÖLÇÜM KAYBI yargısı — sessiz bozulmanın ekrandaki kapısı.
 *
 * Kütük bir kapının ölçüldüğünde SAYI üretmek zorunda olduğunu söylüyorsa
 * (`sayi_uretmeli`) ve kayıt sonucu ÖLÇÜLMÜŞ olarak taşıyorsa, sayının
 * yokluğu meşru bir sessizlik değil KAYIP ölçümdür: şemanın (checkGateHonesty
 * 5c) yazılmasına izin vermediği bir satır ekrana gelmiştir. Yargı modelden
 * gelir; JOURNAL_GATES burada YENİDEN OKUNMAZ — ikinci kütük-okuma yolu, bu
 * alanın modele eklenmesiyle kapatılan şeyin ta kendisiydi.
 *
 * "kaldi" DE dâhildir. Şema kuralı `measured = gecti || kaldi` üzerinden işler;
 * yalnız "gecti"yi denetlemek, sayısı kaybolmuş bir KALAN satırını meşru
 * gösterirdi. Kaybın yönü kaybı değiştirmez.
 *
 * BOŞ NESNE de kayıptır: `values:{}` şemanın `values === null` denetiminden
 * geçer ama ekranda sayı yoktur. Yargı, ekranda görünene göre verilir.
 */
function olcumKaybi(k: KapiGorunumu): boolean {
  if (!k.sayi_uretmeli || k.kosum === null) return false;
  if (k.durum !== "gecti" && k.durum !== "kaldi") return false;
  const v = k.kosum.values;
  return v === null || Object.keys(v).length === 0;
}

function kapiSayilari(k: KapiGorunumu): string {
  const kosum = k.kosum;
  if (kosum === null) return "";

  const girdiler = kosum.values === null ? [] : Object.entries(kosum.values);
  if (girdiler.length > 0) {
    return `<dl class="sayilar">${girdiler
      .map(
        ([ad, v]) =>
          `<div class="sayi"><dt>${kacir(ad)}</dt><dd><strong>${kacir(v)}</strong></dd></div>`
      )
      .join("")}</dl>`;
  }

  if (olcumKaybi(k)) {
    return `<p class="olcum-kaybi">Bu kapı ölçüldüğünde <strong>sayı üretmek zorundadır</strong>
    ve sonucu <strong>ölçülmüş</strong> olarak yazılmıştır — ama sayısal değer YOK.
    Sonuç kendi ölçümüyle doğrulanamıyor: <strong>bu sonuca güvenilmez</strong>, kapı yeniden
    koşulmalıdır.</p>`;
  }

  return `<p class="sayisiz">${
    k.sayi_uretmeli
      ? "Sayısal değer yok — kapı ölçülmüş sayılmadığı için beklenen de değil (gerekçe aşağıda)."
      : "Bu kapı sayı ÜRETMEZ; sayısızlığı MEŞRUDUR — başarısı sessizdir, tek sinyali sonucudur."
  }</p>`;
}

function kapiKarti(k: KapiGorunumu): string {
  const b = KAPI_DURUMU[k.durum];
  const kosum = k.kosum;
  const kayip = olcumKaybi(k);

  const kokenRozeti =
    kosum === null || kosum.origin === "olculdu"
      ? ""
      : `<span class="rozet rozet--koken">${kacir(KOKEN_ADI[kosum.origin])}</span>`;

  /* Kayıp uyarısı BAŞLIKTA da durur: "GEÇTİ" rozeti taşıyan bir kart, sayısı
     kaybolmuşken temiz bir geçiş gibi taranmamalıdır. */
  const kayipRozeti = kayip ? `<span class="rozet rozet--kayip">⚑ ÖLÇÜM KAYBI</span>` : "";

  const ayrinti =
    kosum === null
      ? `<p class="sayisiz">Koşum kaydı yok: bu kapı için hiç <code>gate_run</code> olayı yazılmamış.</p>
         ${
           k.referans_komut === null
             ? `<p class="referans">Bu kapı bir komuta <strong>bağlanamaz</strong> — insan turu
                gerektirir (11.6/3), otomatik ölçümü yoktur.</p>`
             : `<p class="referans">Koşulacak komut: <code>${kacir(k.referans_komut)}</code>
                <span class="referans-not">— kütükteki REFERANS komut; koşucunun gerçekten
                çalıştıracağı çağrı bundan sapabilir</span></p>`
         }`
      : `<details class="ayrinti">
          <summary>Koşum ayrıntısı</summary>
          <dl class="alanlar">
            ${alan("Köken", KOKEN_ADI[kosum.origin])}
            ${alanKod("Komut", kosum.command)}
            ${alanKod("Çalışma dizini", kosum.cwd)}
            ${alan("Araç", kosum.tool === null ? null : `${kosum.tool.name} ${kosum.tool.version}`)}
            ${alanKod("Koşum ortamı", kosum.runner_platform)}
            ${alan("Çıkış kodu", kosum.exit_code)}
            ${alanKod("Ölçüm anı", kosum.measured_at)}
            ${alan("Süre (ms)", kosum.duration_ms)}
            ${alan("Sayının çıkarılma yöntemi", kosum.method)}
            ${alan("Gerekçe", kosum.reason)}
            ${alanKod("İnsan kanıtı", kosum.evidence)}
            ${alanKod("Ham kanıt", kosum.raw_evidence)}
            ${alanKod("Ham kanıt sha256", kosum.raw_sha256)}
          </dl>
        </details>`;

  return `<article class="kapi kapi--${k.durum}${kayip ? " kapi-kayipli" : ""}">
    <header class="kapi-bas">
      <span class="kapi-ad"><code>${kacir(k.ad)}</code></span>
      <span class="rozet rozet--${k.durum}">${b.isaret} ${kacir(b.etiket)}</span>
      ${kayipRozeti}
      ${k.insan ? `<span class="rozet rozet--insan">İNSAN TURU GEREKİR</span>` : ""}
      ${kokenRozeti}
    </header>
    <p class="kapi-aciklama">${kacir(b.aciklama)}</p>
    ${kapiSayilari(k)}
    <p class="kapsam"><span class="kapsam-etiket">KAPSAM ŞERHİ — bu kapının ÖLÇMEDİĞİ şey</span>
    ${kacir(k.kapsam)}</p>
    ${
      k.insan
        ? `<p class="not">Canonical 11.6/3: insan turu gereken kapı otomatikleştirilemez; görsel
           yargı yeşil testle ikame edilemez, sözlü onay yetmez — kanıt kaydedilir.</p>`
        : ""
    }
    ${ayrinti}
  </article>`;
}

function kapilarBolumu(o: Olcum<KapiGorunumu[]>): string {
  const govde =
    o.deger.length === 0
      ? `<p class="bos">Aktif paket olmadığı için kapı görünümü üretilmedi.</p>`
      : `<div class="kapilar">${o.deger.map(kapiKarti).join("")}</div>`;
  return bolum(
    "bolum-kapilar",
    "Kalite kapıları",
    `${olcumKaynagi(o)}
     <p class="not">Kütükteki <strong>tüm</strong> kapılar listelenir — koşulmamış olanlar dâhil.
     Yalnız koşulanları göstermek, koşulmamış bir kapıyı ekrandan silerdi: "lint hiç koşulmadı"
     ile "lint diye bir kapı yok" aynı görünürdü. Her sayının yanında kapsam şerhi durur;
     kapsamı gizlenmiş bir sayı olduğundan güçlü görünür.</p>
     ${govde}`
  );
}

/* ── Canonical izlenebilirlik ─────────────────────────────────────────── */

function izlenebilirlikBolumu(o: CockpitGorunumu["izlenebilirlik"]): string {
  const d = o.deger;
  const govde = `<div class="kutu kutu--olcum">
    <dl class="alanlar">
      ${alanKod("Canonical sürümü", d.canonical_version)}
      ${alan("Risk sınıfı", d.risk_sinifi)}
    </dl>
    <dl class="alanlar alanlar--genis">
      <div class="alan"><dt>Bölümler</dt><dd>${liste(d.bolumler, "bölüm bildirilmedi")}</dd></div>
      <div class="alan"><dt>ADR / TDR</dt><dd>${liste(d.adr_tdr, "ADR/TDR bildirilmedi")}</dd></div>
      <div class="alan"><dt>Etkilenen modüller</dt><dd>${liste(d.moduller, "modül bildirilmedi")}</dd></div>
      <div class="alan"><dt>Sözleşmeler</dt><dd>${liste(d.sozlesmeler, "sözleşme bildirilmedi")}</dd></div>
      <div class="alan"><dt>Kapsam içi</dt><dd>${liste(d.kapsam_ic, "kapsam bildirilmedi")}</dd></div>
      <div class="alan"><dt>Kapsam DIŞI</dt><dd>${liste(d.kapsam_dis, "kapsam dışı bildirilmedi")}</dd></div>
    </dl>
  </div>`;
  return bolum("bolum-izlenebilirlik", "Canonical izlenebilirlik", `${olcumKaynagi(o)}${govde}`);
}

/* ── Git — CANLI OKUMA (11.3 istisnası) ───────────────────────────────── */

function gitBolumu(g: CockpitGorunumu["git"]): string {
  /* "Okunamadı" ile "yok" AYRI durumlardır — kapı tarafındaki olculemedi/yazilmadi
     ayrımının canlı okuma karşılığı. Sebep düşerse ekran, okumanın denendiğini
     bile söyleyemez ve okunamamış bir sistem, olmayan bir sistem gibi görünür. */
  if (g.sinif === "canli-okunamadi") {
    return bolum(
      "bolum-git",
      "Git durumu",
      `<div class="kutu kutu--okunamadi">
        <p class="sinif-bas">
          <span class="rozet rozet--okunamadi">CANLI OKUMA YAPILAMADI</span>
          <span class="sinif-not">Okuma DENENDİ ve başarısız oldu — "dış sistem yok" değildir (11.3)</span>
        </p>
        <dl class="alanlar">
          ${alan("Sebep", g.sebep)}
          ${alanKod("Deneme anı", g.okundu)}
          ${alanKod("Denenen komut", g.komut)}
        </dl>
        <p class="not">Gösterilecek değer YOK ve yerine geçmiş bir ölçüm KONULMAZ: canlı okuma
        Journal'da yaşamaz, yalnız okunabildiği anda vardır.</p>
      </div>`
    );
  }
  const d: Canli<{ dal: string; head: string; temiz: boolean; degisen: number }> = g;
  return bolum(
    "bolum-git",
    "Git durumu",
    `<div class="kutu kutu--canli">
      <p class="sinif-bas">
        <span class="rozet rozet--canli">CANLI OKUMA</span>
        <span class="sinif-not">Dış sistemin anlık durumu — geçmiş ölçüm DEĞİLDİR (Canonical 11.3)</span>
      </p>
      <dl class="alanlar">
        ${alanKod("Okunduğu an", d.okundu)}
        ${alanKod("Okuyan komut", d.komut)}
        ${alanKod("Dal", d.deger.dal)}
        ${alanKod("HEAD", d.deger.head)}
        ${alan("Çalışma ağacı", d.deger.temiz ? "temiz" : "KİRLİ")}
        ${alan("Değişen dosya", d.deger.degisen)}
      </dl>
      <p class="not">Bu değerler yalnız <code>${kacir(d.okundu)}</code> anında doğruydu.
      Sayfa yeniden üretilmeden değişmiş olabilirler.</p>
    </div>`
  );
}

/* ── Plan sınıfı (11.4) ───────────────────────────────────────────────── */

function planKarti(p: Plan<{ baslik: string; satirlar: string[] }>): string {
  const bayatlik =
    p.geride_commit === null
      ? `<span class="yok">kaç commit geride olduğu ÖLÇÜLEMEDİ</span>`
      : p.geride_commit === 0
        ? `ana dalla aynı hizada — <strong>0 commit geride</strong>`
        : `<strong>${kacir(p.geride_commit)} commit geride</strong>`;

  return `<article class="kutu kutu--plan">
    <p class="sinif-bas">
      <span class="rozet rozet--plan">PLAN — ÖLÇÜM DEĞİL</span>
      <span class="sinif-not">Niyet bilgisi; kaynağı Journal DEĞİLDİR (Canonical 11.4)</span>
    </p>
    <h3>${kacir(p.deger.baslik)}</h3>
    <dl class="alanlar">
      ${alanKod("Plan kaynağı", p.kaynak)}
      <div class="alan"><dt>Son güncelleme</dt><dd>${
        p.guncellendi === null
          ? `<span class="yok">son güncelleme ÖLÇÜLEMEDİ</span>`
          : `<code>${kacir(p.guncellendi)}</code>`
      }</dd></div>
      <div class="alan"><dt>Bayatlık</dt><dd>${bayatlik}</dd></div>
      <div class="alan"><dt>Bayatlık okundu</dt><dd>
        <span class="rozet rozet--canli">BAYATLIK: CANLI OKUMA</span>
        <code>${kacir(p.okundu)}</code>
      </dd></div>
      <div class="alan"><dt>Ölçüm notu</dt><dd>${
        p.olcum_notu === null
          ? `<span class="yok">ölçüm notu YOK — bayatlığın neye göre ölçüldüğü kayıtlı değil</span>`
          : kacir(p.olcum_notu)
      }</dd></div>
    </dl>
    <p class="not">İçerik plan sınıfıdır, ama <strong>bayatlık CANLI OKUMADIR</strong>: yukarıdaki
    commit sayısı yalnız okunduğu anda doğruydu ve bu görünüm saklanırsa sessizce eskir.</p>
    ${
      p.deger.satirlar.length === 0
        ? `<p class="bos">Plan gövdesi boş.</p>`
        : `<ul class="plan-satirlar">${p.deger.satirlar
            .map((s) => `<li>${kacir(s)}</li>`)
            .join("")}</ul>`
    }
  </article>`;
}

function planBolumu(planlar: CockpitGorunumu["plan"]): string {
  const govde =
    planlar.length === 0
      ? `<p class="bos">Plan kaydı yok.</p>`
      : planlar.map(planKarti).join("");
  return bolum(
    "bolum-plan",
    "Plan (ölçüm değil)",
    `<p class="not">Bu bölümdeki hiçbir değer ölçüm değildir. Plan sınıfı yasak değildir;
     <strong>ölçüm kılığına girmesi</strong> yasaktır (Canonical 11.4). Bu yüzden her plan
     kartı kaynağını ve bayatlığını taşır.</p>
     ${govde}`
  );
}

/* ── Riskler · notlar · geçmiş ────────────────────────────────────────── */

function risklerBolumu(o: Olcum<{ risk_id: string; summary: string; ts: string }[]>): string {
  const govde =
    o.deger.length === 0
      ? `<p class="bos">Açık risk kaydı yok.</p>`
      : `<ul class="kayitlar">${o.deger
          .map(
            (r) => `<li class="kutu kutu--olcum">
              <p class="kayit-bas"><code>${kacir(r.risk_id)}</code> <span class="kayit-ts">${kacir(
                r.ts
              )}</span></p>
              <p>${kacir(r.summary)}</p>
            </li>`
          )
          .join("")}</ul>`;
  return bolum("bolum-riskler", "Açık riskler", `${olcumKaynagi(o)}${govde}`);
}

function notlarBolumu(a: CockpitGorunumu["notlar"]): string {
  const govde =
    a.deger.length === 0
      ? `<p class="bos">Not yok.</p>`
      : `<ul class="kayitlar">${a.deger
          .map(
            (n) => `<li class="kutu kutu--anlati">
              <p class="kayit-bas"><span class="kayit-ts">${kacir(n.ts)}</span></p>
              <p>${kacir(n.text)}</p>
            </li>`
          )
          .join("")}</ul>`;
  return bolum(
    "bolum-notlar",
    "Notlar (anlatı)",
    `${anlatiKaynagi(a)}
     <p class="not">Notlar <strong>anlatıdır, ölçüm değildir</strong>. Journal'da ayrı olay
     türü oldukları için ölçüm alanlarına karışamazlar; burada da ayrı sınıf rozetiyle,
     ayrı bölümde dururlar.</p>
     ${govde}`
  );
}

function gecmisBolumu(o: Olcum<PaketOzeti[]>): string {
  const govde =
    o.deger.length === 0
      ? `<p class="bos">Package Journal geçmişi boş.</p>`
      : `<div class="tablo-sar"><table class="tablo">
          <thead><tr>
            <th>Paket</th><th>Ad</th><th>Amaç</th><th>Aşama</th>
            <th>Başlangıç</th><th>Bitiş</th><th>Olay</th><th>Son olay</th>
            <th>Doğrulayıcı</th><th>Açık bulgu</th><th>Açık risk</th><th>Kapalı risk</th>
          </tr></thead>
          <tbody>${o.deger
            .map(
              (p) => `<tr>
                <td><code>${kacir(p.package_id)}</code></td>
                <td>${p.ad === null ? YOK : kacir(p.ad)}</td>
                <td class="amac">${p.amac === null ? YOK : kacir(p.amac)}</td>
                <td>${p.asama === null ? YOK : kacir(ASAMA_ADI[p.asama])}</td>
                <td><code>${p.baslangic === null ? "—" : kacir(p.baslangic)}</code></td>
                <td>${
                  p.bitis === null
                    ? `<span class="suruyor">sürüyor</span>`
                    : `<code>${kacir(p.bitis)}</code>`
                }</td>
                <td class="sag">${kacir(p.olay_sayisi)}</td>
                <td><code>${p.son_olay_ts === null ? "—" : kacir(p.son_olay_ts)}</code></td>
                <td>${p.dogrulayici_karari === null ? YOK : kacir(kararMetni(p.dogrulayici_karari))}</td>
                <td class="sag">${kacir(p.dogrulayici_acik_bulgu)}</td>
                <td class="sag">${kacir(p.acik_risk)}</td>
                <td class="sag">${kacir(p.kapali_risk)}</td>
              </tr>`
            )
            .join("")}</tbody>
        </table></div>`;
  return bolum("bolum-gecmis", "Package Journal geçmişi", `${olcumKaynagi(o)}${govde}`);
}

/* ── Biçim ────────────────────────────────────────────────────────────────

   Tümü satır içi. `url()` kullanılmaz — dış kaynak isteği üretebilecek tek
   CSS yapısı odur; taranmış zeminler `repeating-linear-gradient` ile çizilir.
   Yazı tipleri sistem yığınıdır: web fontu indirmek ağ isteğidir. */

const STIL = `
:root {
  color-scheme: light dark;
  --zemin:#f4f6f8; --kart:#ffffff; --metin:#151a20; --soluk:#5a6673; --cizgi:#d3d9e0;
  --vurgu:#1c3f6e;
  --gecti:#10632c; --gecti-z:#e4f3e9;
  --kaldi:#a01414; --kaldi-z:#fce9e9;
  --atlandi:#7f5300; --atlandi-z:#fbf1de;
  --olculemedi:#63389c; --olculemedi-z:#f0eafa;
  --yazilmadi:#4c5763; --yazilmadi-z:#e8ecf0;
  --canli:#0a6470; --canli-z:#e0f2f4;
  --plan:#8a4200; --plan-z:#faefe2;
  --anlati:#414a8c; --anlati-z:#eceef8;
}
@media (prefers-color-scheme: dark) {
  :root {
    --zemin:#0e1216; --kart:#161c23; --metin:#e6ebf1; --soluk:#95a2b1; --cizgi:#2c3641;
    --vurgu:#8fb6e8;
    --gecti:#63d68d; --gecti-z:#12291a;
    --kaldi:#ff8f8f; --kaldi-z:#301415;
    --atlandi:#e5b95c; --atlandi-z:#2c2311;
    --olculemedi:#c1a2f0; --olculemedi-z:#221a33;
    --yazilmadi:#9aa7b4; --yazilmadi-z:#1d232a;
    --canli:#5fd6e2; --canli-z:#0d2a2e;
    --plan:#f0ac63; --plan-z:#2e2011;
    --anlati:#a9aee0; --anlati-z:#1a1d33;
  }
}
* { box-sizing: border-box; }
body {
  margin:0; padding:1.2rem clamp(0.7rem, 3vw, 2.2rem) 4rem;
  background: var(--zemin); color: var(--metin);
  font-family: "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
  font-size: 14px; line-height: 1.5;
}
code, .adim-ts, .kayit-ts {
  font-family: ui-monospace, "Cascadia Mono", Consolas, "DejaVu Sans Mono", monospace;
  font-size: 0.86em;
}
code { background: color-mix(in srgb, var(--cizgi) 45%, transparent); padding: 0.05em 0.3em; border-radius: 3px; word-break: break-word; }
h1 { font-size: 1.25rem; margin: 0; letter-spacing: 0.01em; }
h2 { font-size: 1rem; margin: 0 0 0.5rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--vurgu); }
h3 { font-size: 0.95rem; margin: 0.5rem 0 0.4rem; }
p { margin: 0.35rem 0; }

.ust { border: 1px solid var(--cizgi); border-left: 5px solid var(--vurgu); background: var(--kart); padding: 0.8rem 1rem; border-radius: 6px; }
.ust-satir { display:flex; flex-wrap:wrap; gap:0.5rem 1.2rem; align-items:baseline; justify-content:space-between; }
.ust-alt { color: var(--soluk); margin: 0.15rem 0 0.5rem; }
.ust-damga { color: var(--soluk); margin:0; }
.serit-uyari { border: 1px dashed var(--cizgi); border-radius: 5px; padding: 0.45rem 0.6rem; margin: 0.5rem 0 0; color: var(--soluk); }

.bolum { margin-top: 1.4rem; }
.not { color: var(--soluk); font-size: 0.9em; margin: 0.3rem 0 0.6rem; }
.bos { border: 1px dashed var(--cizgi); border-radius: 6px; padding: 0.8rem 1rem; color: var(--soluk); background: var(--kart); }
.yok { color: var(--soluk); font-style: italic; }
.kaynak { font-size: 0.88em; color: var(--soluk); margin: 0 0 0.5rem; }

.kutu { border-radius: 6px; padding: 0.7rem 0.9rem; margin: 0 0 0.7rem; }
.kutu--olcum { background: var(--kart); border: 1px solid var(--cizgi); }
.kutu--canli {
  background: var(--canli-z); border: 2px dashed var(--canli);
  background-image: repeating-linear-gradient(90deg, transparent 0 14px, color-mix(in srgb, var(--canli) 9%, transparent) 14px 16px);
}
.kutu--plan {
  background: var(--plan-z); border: 2px dashed var(--plan);
  background-image: repeating-linear-gradient(135deg, transparent 0 9px, color-mix(in srgb, var(--plan) 12%, transparent) 9px 18px);
}
/* Okunamadı: kapı tarafındaki "olculemedi" ile aynı görsel aile — aynı kavram */
.kutu--okunamadi {
  background: var(--olculemedi-z); border: 2px dashed var(--olculemedi);
  background-image: repeating-linear-gradient(45deg, transparent 0 8px, color-mix(in srgb, var(--olculemedi) 10%, transparent) 8px 16px);
}
/* Anlatı: ölçümle AYNI kaynaktan gelir, o yüzden en kolay karışan sınıf.
   Ayrımı taranmış zemin değil, kalın alıntı çubuğu ve eğik yazı taşır. */
.kutu--anlati {
  background: var(--anlati-z); border: 1px solid var(--anlati);
  border-left: 6px solid var(--anlati); font-style: italic;
}
.kutu--anlati .kayit-ts { font-style: normal; }
.sozluk { display: grid; gap: 0.6rem; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.sozluk .kutu { margin: 0; }
.sinif-bas { display: flex; flex-wrap: wrap; gap: 0.4rem 0.7rem; align-items: center; margin: 0 0 0.4rem; }
.sinif-not { color: var(--soluk); font-size: 0.88em; }

.rozet {
  display: inline-block; padding: 0.1rem 0.45rem; border-radius: 999px;
  font-size: 0.74rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
  border: 1px solid currentColor; white-space: nowrap;
}
.rozet--olcum { color: var(--vurgu); }
.rozet--canli { color: var(--canli); background: var(--canli-z); }
.rozet--plan { color: var(--plan); background: var(--plan-z); }
.rozet--okunamadi { color: var(--olculemedi); background: var(--olculemedi-z); border-style: dashed; }
.rozet--anlati { color: var(--anlati); background: var(--anlati-z); }
.rozet--insan { color: var(--vurgu); border-style: dashed; }
.rozet--koken { color: var(--atlandi); background: var(--atlandi-z); border-style: dashed; }
.rozet--gecti { color: var(--gecti); background: var(--gecti-z); }
.rozet--kaldi { color: var(--kaldi); background: var(--kaldi-z); }
.rozet--atlandi { color: var(--atlandi); background: var(--atlandi-z); }
.rozet--olculemedi { color: var(--olculemedi); background: var(--olculemedi-z); }
.rozet--yazilmadi { color: var(--yazilmadi); background: var(--yazilmadi-z); border-style: dotted; }

.serit { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.35rem; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
.adim { background: var(--kart); border: 1px solid var(--cizgi); border-radius: 5px; padding: 0.4rem 0.55rem; display: grid; gap: 0.1rem; }
.adim-no { font-size: 0.72rem; color: var(--soluk); }
.adim-ad { font-weight: 600; }
.adim-durum { font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--soluk); }
.adim-ts { color: var(--soluk); }
.adim--gecildi { border-left: 4px solid var(--gecti); }
.adim--simdi { border: 2px solid var(--vurgu); border-left-width: 6px; background: color-mix(in srgb, var(--vurgu) 10%, var(--kart)); }
.adim--simdi .adim-durum { color: var(--vurgu); font-weight: 700; }
.adim--bekliyor { border-style: dashed; opacity: 0.72; }
/* Tekrar ziyaret: doğrulamada tıkanıp geri gönderilmiş aşama, temiz geçilmiş
   aşamayla aynı görünemez. Sonra tanımlanır ki durum sınıflarını yensin. */
.adim-tekrarli { border: 2px solid var(--atlandi); background: color-mix(in srgb, var(--atlandi-z) 55%, var(--kart)); }
.adim-tekrar { font-size: 0.74rem; font-weight: 700; letter-spacing: 0.03em; color: var(--atlandi); }

.kapilar { display: grid; gap: 0.7rem; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); }
.kapi { border-radius: 6px; padding: 0.7rem 0.9rem; background: var(--kart); border: 1px solid var(--cizgi); border-left-width: 6px; }
.kapi--gecti { border-left-color: var(--gecti); }
.kapi--kaldi { border-left-color: var(--kaldi); background: color-mix(in srgb, var(--kaldi-z) 55%, var(--kart)); }
.kapi--atlandi { border-left-color: var(--atlandi); }
.kapi--olculemedi { border-left-color: var(--olculemedi); border-style: dashed; border-left-style: solid; background: color-mix(in srgb, var(--olculemedi-z) 45%, var(--kart)); }
.kapi--yazilmadi {
  border-left-color: var(--yazilmadi); border-style: dotted; border-left-style: solid; opacity: 0.94;
  background-image: repeating-linear-gradient(135deg, transparent 0 7px, color-mix(in srgb, var(--yazilmadi) 8%, transparent) 7px 14px);
}
/* Kayıp uyarısı, durum sınıflarından SONRA gelir: aynı özgüllükte sonraki kural
   kazanır, böylece "GEÇTİ" kartının yeşil kenarı kaybı örtemez. */
.kapi-kayipli {
  border: 2px solid var(--kaldi); border-left-width: 7px; border-left-color: var(--kaldi);
  background: color-mix(in srgb, var(--kaldi-z) 45%, var(--kart));
}
.rozet--kayip { color: var(--kaldi); background: var(--kaldi-z); border-width: 2px; }
.olcum-kaybi {
  border: 2px solid var(--kaldi); border-radius: 5px; background: var(--kaldi-z);
  padding: 0.45rem 0.6rem; margin: 0.5rem 0 0; font-size: 0.9em;
}
.referans { margin-top: 0.35rem; font-size: 0.9em; }
.referans-not { color: var(--soluk); font-size: 0.9em; }
.suruyor { color: var(--atlandi); font-weight: 600; }
.kapi-bas { display: flex; flex-wrap: wrap; gap: 0.35rem 0.5rem; align-items: center; }
.kapi-ad { font-size: 1.02rem; font-weight: 700; }
.kapi-aciklama { color: var(--soluk); font-size: 0.9em; }
.kapsam { border-top: 1px solid var(--cizgi); padding-top: 0.4rem; margin-top: 0.5rem; font-size: 0.88em; }
.kapsam-etiket { display: block; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em; color: var(--vurgu); }
.sayisiz { color: var(--soluk); font-size: 0.9em; font-style: italic; }
.sayilar { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.5rem 0 0; }
.sayi { border: 1px solid var(--cizgi); border-radius: 5px; padding: 0.25rem 0.5rem; background: var(--zemin); }
.sayi dt { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--soluk); }
.sayi dd { margin: 0; font-size: 1.05rem; }

.alanlar { display: grid; gap: 0.3rem 1rem; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); margin: 0; }
.alanlar--genis { grid-template-columns: 1fr; margin-top: 0.5rem; }
.alan { display: grid; grid-template-columns: minmax(120px, 34%) 1fr; gap: 0.5rem; border-bottom: 1px solid color-mix(in srgb, var(--cizgi) 60%, transparent); padding: 0.15rem 0; }
.alan dt { color: var(--soluk); font-size: 0.86em; }
.alan dd { margin: 0; word-break: break-word; }
.etiketler { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.25rem; }
.plan-satirlar { margin: 0.4rem 0 0; padding-left: 1.1rem; }
.kayitlar { list-style: none; margin: 0; padding: 0; }
.kayit-bas { display: flex; gap: 0.6rem; align-items: baseline; flex-wrap: wrap; }
.kayit-ts { color: var(--soluk); }

.ayrinti { margin-top: 0.5rem; border-top: 1px solid var(--cizgi); padding-top: 0.35rem; }
.ayrinti > summary { cursor: pointer; color: var(--vurgu); font-size: 0.86em; letter-spacing: 0.03em; }

.tablo-sar { overflow-x: auto; border: 1px solid var(--cizgi); border-radius: 6px; background: var(--kart); }
.tablo { border-collapse: collapse; width: 100%; font-size: 0.9em; }
.tablo th, .tablo td { text-align: left; padding: 0.35rem 0.6rem; border-bottom: 1px solid var(--cizgi); white-space: nowrap; }
.tablo th { background: var(--zemin); font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--soluk); }
.tablo td.sag { text-align: right; }
.tablo td.amac { white-space: normal; min-width: 15rem; }

.dip { margin-top: 2rem; border-top: 1px solid var(--cizgi); padding-top: 0.7rem; color: var(--soluk); font-size: 0.86em; }
`;

/* ── Giriş noktası ────────────────────────────────────────────────────── */

/**
 * Görünüm modelini TAM bir HTML belgesine çevirir.
 *
 * Saf: aynı görünüm daima aynı dizeyi verir. Zaman damgası dahil hiçbir değer
 * burada üretilmez — `uretildi` modelden gelir, çünkü sayfanın kendi damgasını
 * render sırasında okumak, ölçüm anını render anıyla karıştırmak olurdu.
 */
export function renderCockpitPage(view: CockpitGorunumu): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TEZGÂH Developer Cockpit — salt-okunur</title>
<style>${STIL}</style>
</head>
<body>
${ust(view)}
${sinifSozlugu()}
${aktifPaketBolumu(view.aktif_paket)}
${cizelgeBolumu(view.zaman_cizelgesi)}
${kapilarBolumu(view.kapilar)}
${izlenebilirlikBolumu(view.izlenebilirlik)}
${gitBolumu(view.git)}
${planBolumu(view.plan)}
${risklerBolumu(view.riskler)}
${notlarBolumu(view.notlar)}
${gecmisBolumu(view.gecmis)}
<footer class="dip">
  <p>Developer Cockpit · Modül Fazı 1 (salt-okunur) · Canonical 11.4 / 11.6.
  İşlem düğmesi Faz 3'ün konusudur; <em>merge başlat</em> ve <em>dağıtım başlat</em>
  kalemleri Canonical 11.4'te kapalıdır.</p>
  <p>Yüzey üretildi: <code>${kacir(view.uretildi)}</code></p>
</footer>
</body>
</html>
`;
}
