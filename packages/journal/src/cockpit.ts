/* Cockpit modül fazı 1 — GÖRÜNÜM KURUCU (Canonical 11.1/11.3/11.4).

   view.ts SAFTIR: diske, git'e, sürece dokunmaz. Bu dosya o saflığın bedelini
   ödediği yerdir — okumayı, düşen okumayı ve sınıflandırmayı burası yapar.
   Sınır bilinçli: saf çekirdek sınanabilir kalsın, I/O tek katmanda toplansın.

   ÜÇ ŞART BU DOSYADA YAŞAR:

   1. ÖNBELLEK YOK. cockpitGorunumu() her çağrıda journal'ı DİSKTEN yeniden
      okur. Bellekte tutulan bir görünüm, dosya değiştiğinde sessizce bayatlar
      ve 11.3'ün mahkûm ettiği "ölçüm gibi görünen eski değer"i üretir.

   2. SESSİZ YUTMA YOK, AMA TEK KANAL. Bir journal dosyası bozuksa yüzey ÇÖKMEZ
      ve hata GİZLENMEZ. Arıza, GÖRÜNÜM MODELİNDE YERİ VARSA oraya yazılır:
      canlı git okuması düşerse `git` alanının kendisi `CanliOkunamadi` olur.
      Yeri olmayan arıza (bozuk journal dosyası, plan kaynağı) `hatalar`a düşer.
      Aynı olguyu iki kanaldan söylemek, biri güncellenmediğinde çelişki üretir.

   3. SINIF KARIŞMAZ. Ölçüm alanlarının TAMAMI buildCockpitView üzerinden ve
      yalnız journal kaydından geçer. Okuma hataları ölçüm DEĞİLDİR: dosya
      sisteminin şu anki hâlidir, bu yüzden `canli` sınıfıyla ve okunduğu anla
      birlikte taşınır (11.3 canlı okuma istisnası).

   ÜRÜN YÜZEYİNE SIFIR DOKUNUŞ (11.1): burası bir GELİŞTİRME aracıdır. Ürün
   sunucusuna rota, ürün web paketine bayt eklemez; yalnız node: çekirdeği ve
   bu paketin kendi modülleri kullanılır. */

import { foldPackageJournal, type JournalPackageRecord } from "@tezgah/shared";

import { GIT_DURUM_KOMUTU, gitDurumu } from "./live.js";
import { journalDir } from "./paths.js";
import { okuPlanlar } from "./plan.js";
import { listPackageIds, readJournal } from "./store.js";
import {
  buildCockpitView,
  canli,
  canliOkunamadi,
  type Canli,
  type CanliOkunamadi,
  type CockpitGorunumu,
} from "./view.js";

/** Okunamayan kaynak. `kaynak` bir paket id'si ya da bir yol/komut adıdır. */
export interface OkumaHatasi {
  kaynak: string;
  mesaj: string;
}

/**
 * cockpitGorunumu()'nun ürettiği şey: görünüm modeli + görünüm modelinde YERİ
 * OLMAYAN okuma arızaları.
 *
 * CockpitGorunumu'nu genişletir, dolayısıyla renderCockpitPage'e olduğu gibi
 * verilebilir. Hataların ayrı alanda durmasının sebebi 11.4'tür: bir okuma
 * arızası ölçüm alanlarından birine yazılsaydı, journal'da karşılığı olmayan
 * bir metin ölçüm kılığına girerdi. `git` buraya YAZILMAZ — onun kendi
 * `CanliOkunamadi` yeri var.
 */
export interface CockpitCiktisi extends CockpitGorunumu {
  hatalar: Canli<OkumaHatasi[]>;
}

const mesaj = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * AKTİF PAKET — en son olayı olan paket. SAF: girdi dışında hiçbir şeye bakmaz.
 *
 * Sıralama `last_event_ts` üzerindendir; ISO-8601 UTC damgaları sözlük sırası
 * ile zaman sırasını aynı anda verir. İki karar açıkça yazılır:
 *
 * · Olayı OLMAYAN kayıt (last_event_ts null) hiçbir zaman olayı olana yenmez;
 *   yalnız başka aday yoksa seçilebilir.
 * · Beraberlikte package_id'nin BÜYÜĞÜ kazanır. Rastgele değil: id'ler tarih
 *   önekiyle açıldığı için büyük olan yenidir. Belirsiz bir beraberlik,
 *   aynı journal'ın iki çağrıda iki farklı aktif paket göstermesi demekti.
 *
 * Kimliği boş kayıt (foldPackageJournal([]) böyle üretir) ELENİR: karşılığı
 * bir dosya olmayan bir id, açılamayacak bir paketi aktif gösterirdi.
 */
export function aktifPaketId(kayitlar: JournalPackageRecord[]): string | null {
  let en: JournalPackageRecord | null = null;
  for (const k of kayitlar) {
    if (k.package_id.length === 0) continue;
    if (en === null || dahaYeni(k, en)) en = k;
  }
  return en === null ? null : en.package_id;
}

function dahaYeni(a: JournalPackageRecord, b: JournalPackageRecord): boolean {
  const ta = a.last_event_ts ?? "";
  const tb = b.last_event_ts ?? "";
  if (ta !== tb) return ta > tb;
  return a.package_id > b.package_id;
}

/**
 * Journal + plan + git → görünüm. SAF DEĞİLDİR; I/O bu fonksiyonda toplanır.
 *
 * Üç kaynak da AYRI AYRI korunur: biri düşerse diğerleri okunmaya devam eder
 * ve düşen kaynak `hatalar`da adıyla görünür. Tek bir try bloğu, bozuk tek bir
 * dosya yüzünden sağlam paketleri de ekrandan silerdi.
 */
export function cockpitGorunumu(): CockpitCiktisi {
  /* Sayfanın kendi zaman damgası; canlı okumaların "okundu" anı da budur. */
  const uretildi = new Date().toISOString();
  const hatalar: OkumaHatasi[] = [];

  let idler: string[] = [];
  try {
    idler = listPackageIds();
  } catch (e) {
    hatalar.push({ kaynak: journalDir(), mesaj: `paket listesi okunamadı: ${mesaj(e)}` });
  }

  const kayitlar: JournalPackageRecord[] = [];
  for (const id of idler) {
    try {
      /* Paket kaydının dosyası yoktur: her istekte olay akışından türetilir
         (11.3). Önbelleğe alınan bir kayıt, ikinci doğruluk kaynağı olurdu. */
      kayitlar.push(foldPackageJournal(readJournal(id)));
    } catch (e) {
      hatalar.push({ kaynak: id, mesaj: `journal okunamadı: ${mesaj(e)}` });
    }
  }

  /* Yeniden eskiye — geçmiş listesi ve aktif paket aynı sıralamayı kullanır */
  const hepsi = [...kayitlar].sort((a, b) => (dahaYeni(a, b) ? -1 : 1));
  const aktifId = aktifPaketId(kayitlar);
  const aktif = hepsi.find((k) => k.package_id === aktifId) ?? null;

  /* GİT — canlı okuma. Başarısızlık `hatalar`a DEĞİL, alanın KENDİSİNE yazılır:
     görünüm modeli artık `CanliOkunamadi` taşıdığı için "git yok" ile "git
     okunamadı" ayrımı ekranda kendi yerinde durur. İki kanal (hem alan hem
     hata listesi) aynı olguyu iki kez söyler, biri güncellenmediğinde de
     çelişirdi. */
  let git: Canli<{ dal: string; head: string; temiz: boolean; degisen: number }> | CanliOkunamadi;
  try {
    git =
      gitDurumu() ??
      /* SINIRDA KAYBOLAN SEBEP (ölçüldü): gitCalistir başarısızlığı DEĞER olarak
         döner ama gitDurumu her başarısızlığı tek bir `null`a indirger — mesaj
         orada düşer. Sebebi geri getiremeyiz (live.ts'in sözleşmesi), elimizdeki
         en dürüst ifadeyi yazarız: ölçülemedi ve NEDEN'i kaynağında taşınmıyor. */
      canliOkunamadi(
        "git durumu okunamadı: gitDurumu() null döndü — live.ts sebebi taşımıyor " +
          "(git yok mu, komut mu düştü, çıktı mı beklenmedik: ayırt edilemiyor)",
        uretildi,
        GIT_DURUM_KOMUTU
      );
  } catch (e) {
    /* Beklenmeyen fırlatma: sebep BURADA var, o yüzden aynen taşınır */
    git = canliOkunamadi(`git durumu okunamadı: ${mesaj(e)}`, uretildi, GIT_DURUM_KOMUTU);
  }

  let plan: CockpitGorunumu["plan"] = [];
  try {
    plan = okuPlanlar();
  } catch (e) {
    hatalar.push({ kaynak: "plan", mesaj: `plan kaynağı okunamadı: ${mesaj(e)}` });
  }

  /* journal_dizini SABİT YAZILMAZ: kaynak alanı, verinin GERÇEKTEN okunduğu
     yeri bildirmelidir (TEZGAH_JOURNAL_DIR ayarlıyken sabit yol yalan olurdu). */
  const gorunum = buildCockpitView({
    uretildi,
    aktif,
    hepsi,
    git,
    plan,
    journal_dizini: journalDir(),
  });

  return {
    ...gorunum,
    hatalar: canli(hatalar, uretildi, "listPackageIds() · readJournal() — her istekte diskten"),
  };
}
