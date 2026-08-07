/* KALEM BİÇİMİ ile ŞABLON BİÇİMİ — İKİ AYRI SÖZLÜK (K-1/A ölçümü).

   NEREDEN GELDİ: `2026-08-07-acilis-takimi-bicimi` paketinin açık bulgusu
   (`K1A-BICIM-1`) şöyle yazılmıştı: "biçim DEĞERİ doğrulanmıyor ve
   doğrulanamaz — `format` şemada serbest metindir, geçerli biçim kümesi HİÇ
   İLAN EDİLMEMİŞTİR". Bu tur o cümleyi ölçtü ve YARISININ YANLIŞ olduğunu
   buldu: `menu` türünün şablonları biçim seçeneklerini GERÇEKTEN ilan ediyor.

   ÖLÇÜLEN TABLO (kayıt defterinden okunarak):

     tür        kalem `format`   şablonun `format` paramı
     ────────── ──────────────── ─────────────────────────────────────────────
     menu       ZORUNLU          a4-portrait · a4-landscape · a3-portrait
                                 (menu-liste-premium: a4-portrait · a3-portrait)
     flyer      ZORUNLU          YOK
     trifold    ZORUNLU          YOK
     fidelite   ZORUNLU          YOK
     diğer 5    yok              YOK

   VE ASIL BULGU: `OPENING_KIT`'in menü kalemi `format: "a3"` yazar — bu değer
   şablonun ilan ettiği seçeneklerin HİÇBİRİ DEĞİLDİR (`a3-portrait` var,
   `a3` yok). İki sözlük AYRIK.

   NİYE DOĞRULAMA YAZILMADI (ve bu bir karar, ihmal değil): ikisini birbirine
   karşı doğrulamak, ARALARINDA BİR KÖPRÜ OLDUĞUNU İDDİA ETMEK olurdu. Ölçüm
   tersini söylüyor: `PARAM_AKISI` menu/flyer/trifold/fidelite için `null`dur,
   yani kalemin biçimi belge paramlarına HİÇ GİTMEZ — ikisi bugün hiç
   buluşmuyor. Köprü kurmak (ör. "a3" → "a3-portrait") ürün/tasarım kararıdır
   ve ölçülmemiş bir olguyu kod hâline getirirdi; bu depo o hatayı daha önce
   ödedi (`dogus-varsayilanlari`: meslekten para birimi türetmek).

   MODÜL SINIRI (C-P2, material-routing.ts başlığındaki kural): manifest
   `MANIFESTS`ten okunur — `@tezgah/templates` TAM kaydı DEĞİL, çünkü o
   react/jsx-runtime taşır. Bu dosyanın ilk hâli tam kaydı import ediyordu ve
   sunucu typecheck'i onu kırmızıya düşürdü (TS6142, `--jsx` yok): sınır
   yazılı bir kural değil, ÇALIŞAN bir kapıymış. Kapsam farkı ÖLÇÜLDÜ ve bu
   soru için sıfır: identity 10 el-yazımı manifest taşır, tam kayıt 11
   (fazlası `kabul-fabrika`) — ama `SIPARIS_SABLONLARI` hiçbir türde fabrika
   şablonu adlandırmaz, üstelik `dogrulaSiparisKoprusu` yük zamanında her
   seçeneğin KAYITLI olmasını zorlar. Onun için burada ikinci bir "kayıtsız
   id" kapısı YOK: alttaki kapı zaten hiç geçirmiyor, üstüne konacak kapı
   ölçülemez bir süs olurdu.

   BU DOSYA NE YAPAR: köprüyü kurmaz, iki sözlüğü OKUNUR kılar. Kararı verecek
   olan gün ölçüm hazır olsun diye; ve ikisinden biri değiştiğinde nöbetçi
   konuşsun diye (bugün ayrık olmaları KAYITLI bir olgudur, sessizce
   değişmemeli). */

import { pricingInputsOf, type ProductType } from "@tezgah/shared";
import { MANIFESTS, siparisSablonlari } from "@tezgah/templates/identity";

/** Kalem düzeyinde `format` girdisi ZORUNLU mu — girdi ilanından okunur. */
export function kalemBicimiZorunluMu(tur: ProductType): boolean {
  return pricingInputsOf(tur).some((g) => g.alan === "format" && g.zorunlu);
}

/**
 * Türün ŞABLONLARININ ilan ettiği biçim seçenekleri — birleşim, ilan sırasında.
 *
 * Boş dizi = hiçbir şablon `format` paramı ilan etmiyor, yani kalemin biçimi
 * o türde hiçbir şablon parametresine karşılık gelmez.
 */
export function sablonBicimSecenekleri(tur: ProductType): string[] {
  const gorulen: string[] = [];
  for (const id of siparisSablonlari(tur)) {
    const param = MANIFESTS[id]?.params.find((p) => p.id === "format");
    for (const s of param?.options ?? []) {
      const metin = String(s);
      if (!gorulen.includes(metin)) gorulen.push(metin);
    }
  }
  return gorulen;
}

/**
 * KÖPRÜYE HAZIR türler: kalem biçimi ZORUNLU **ve** şablon biçimi İLANLI.
 *
 * Bugün yalnız `menu`. İkinci bir tür bu duruma girdiği gün (ör. flyer
 * şablonuna `format` paramı eklenirse) "iki sözlük nasıl buluşacak" sorusu
 * kendiliğinden gündeme gelir — nöbetçi o günü söyler.
 */
export function koprusuOlabilecekTurler(turler: readonly ProductType[]): ProductType[] {
  return turler.filter((t) => kalemBicimiZorunluMu(t) && sablonBicimSecenekleri(t).length > 0);
}
