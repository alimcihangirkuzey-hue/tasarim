/* TEKSTİL EXPORT KAYITLARININ ŞEKLİ — hangi dosya hangi kayda düşer.

   ÖLÇÜLEN YARA (bu turda, ilan taramasıyla): `ExportRecordDTO["kind"]` on iki
   değer ilan eder; yazan siteler tarandığında on biri yazılıyor, `broderie_fiche`
   HİÇBİR YERDE YAZILMIYOR. Yani ilan var, üretici yok — bu depoda kayıtlı
   yasak: "ölü sözleşme". Üstelik ölü ilan yalnız kâğıt üstünde kalmıyordu;
   `docs/export-kinds.md` onu üretiliyor gibi tarif ediyor ve arayüzde karşılık
   gelen bir etiket bile var (`orders.out_broderie_fiche`).

   VE İKİNCİ, DAHA SOMUT YARA: nakış fişi PDF'i GERÇEKTEN üretiliyordu
   (`{taban}_broderie-fiche.pdf`) ama kendi kaydı olmadığı için tek satırın
   `filepath`ine düşüyordu — çünkü satır `files[files.length - 1]` alıyordu ve
   broderie yolunda EN SON eklenen dosya fiştir. Sonuç: operatör "Nakış"
   çıktısına tıkladığında NAKIŞ TASARIMINI değil NAKIŞÇI FİŞİNİ açıyordu;
   tasarım dosyaları yalnız `snapshot_json.files` içinde kalıyordu.

   BU DOSYA SAF: Puppeteer'siz, DB'siz. Rota tarayıcıyı sürer, kayıt ŞEKLİNE
   burası karar verir — kararın kendisi böylece ölçülebilir (rota testi gerçek
   Chromium ve gerçek bir tekstil belgesi isterdi; baski-bekle emsali). */

import { kanalNitelikleriOf } from "@tezgah/templates/identity";

/** Bir export turunda diskte oluşan dosyalar (ROOT'a göreli DEĞİL — mutlak). */
export interface UretilenDosyalar {
  /** Alan başına üretilen TASARIM dosyaları (PNG/SVG/PDF) — en az bir tane */
  tasarim: readonly string[];
  /** Nakış fişi PDF'i — yalnız broderie tekniğinde üretilir */
  fis: string | null;
}

export interface KayitTaslagi {
  kind: "png" | "broderie" | "broderie_fiche";
  /** Bu kaydın TEMSİL ETTİĞİ dosya */
  dosya: string;
  /** 8.5 dürüstlük bildirimi — kanal ilanı olmayan kayıtta null */
  nitelikler: ReturnType<typeof kanalNitelikleriOf>;
}

/**
 * Bir tekstil export turunun yazacağı kayıtlar.
 *
 * BASKI (impression): tek kayıt, bugünkü davranış BİREBİR.
 * NAKIŞ (broderie): İKİ kayıt — tasarım ve fiş AYRI. Fiş, tasarımın
 * `filepath`ini gasp etmez.
 */
export function garmentKayitlari(
  teknik: "impression" | "broderie",
  dosyalar: UretilenDosyalar
): KayitTaslagi[] {
  const sonTasarim = dosyalar.tasarim[dosyalar.tasarim.length - 1];
  if (sonTasarim === undefined) {
    /* Fail-loud: eskiden bu hâl `filepath: undefined` ile sessizce diske
       yazılabilirdi. Dosyası olmayan export kaydı, olmayan bir çıktıyı var
       gösterir — sessiz yalan, hatadan kötüdür. */
    throw new Error("tekstil export: tasarım dosyası üretilmedi");
  }

  const kind = teknik === "broderie" ? "broderie" : "png";
  const kayitlar: KayitTaslagi[] = [
    { kind, dosya: sonTasarim, nitelikler: kanalNitelikleriOf(kind) },
  ];

  if (dosyalar.fis !== null) {
    /* NİTELİK BİLDİRİMİ YOK ve bu KASITLIDIR: `broderie_fiche` bir ÜRETİM
       KANALI değildir — üretim kanalı ilanı v1 onu açıkça kapsam dışı bıraktı
       ("broderie'nin eki", journal 2026-07-26-uretim-kanali-ilani). Kanal
       niteliği uydurmak, denetim izine olmayan bir iddia yazmak olurdu;
       `kanalNitelikleriOf` bu yüzden null döner ve null AYNEN kaydedilir. */
    kayitlar.push({
      kind: "broderie_fiche",
      dosya: dosyalar.fis,
      nitelikler: kanalNitelikleriOf("broderie_fiche"),
    });
  }

  return kayitlar;
}
