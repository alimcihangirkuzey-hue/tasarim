/* KURULUMUN DARALTMASINI OKUMA — TEK İLAN (K-1/C modül sınırı).

   ÖLÇÜLEN YARA: `is-kollari` ilanının arayüz tarafındaki okuması ALTI ayrı
   dosyada EL YAZIMIYLA kopyalanmıştı — `DocumentsPanel` · `ProjectsPanel` ·
   `ScenesPanel` · `EditorPage` · `ParseDictPage` · `SiparisPage`. Altısında da
   aynı iki karar tekrar tekrar veriliyordu:

     (1) sorgu anahtarı `["isKollari"]` (react-query tekilleştirmesi BUNA
         bağlıdır — biri anahtarı farklı yazsa aynı ilan için ikinci bir istek
         doğar ve iki yüzey aynı anda FARKLI daraltma gösterebilirdi);
     (2) "kaynak `varsayilan` ise daraltma YOK" eşlemesi (`undefined`).

   İkisi de kural, ikisi de tek yerde yaşamalı. Altı kopya bugün birbirinin
   aynısıydı — yani yara henüz görünmüyordu; yedinci yüzeyin yanlış yazması
   ise sessiz olurdu, çünkü daraltmanın YOKLUĞU ekranda bir şeyin eksilmesi
   değil, FAZLA görünmesidir ve fazlalık kimseye kırmızı yakmaz.

   DAVRANIŞ BİREBİR KORUNDU: hook aynı anahtarla aynı `api.isKollari`
   sorgusunu kurar ve aynı ternary'i uygular; altı çağrı yerinin hiçbirinde
   sonuç değişmez.

   TERNARY BUGÜN AYIRT EDİCİ DEĞİL, VE BU ÖLÇÜLDÜ (bkz. testteki kayıt):
   sunucu `kaynak:"varsayilan"` derken `aktif` olarak TÜM iş kollarını
   döndürür, dolayısıyla `undefined` ile `SEKTORLER` bugün aynı sonucu verir.
   Kural yine de silinmedi — sunucunun sözleşmesi değişirse (daraltılmış bir
   `aktif` ile `varsayilan` kaynağı) tek yerde duruyor olması, altı yerde
   düzeltmekten iyidir. Ayırt ediciliği sentetik girdiyle sınanır. */

import { useQuery } from "@tanstack/react-query";
import type { Sektor } from "@tezgah/templates/identity";
import { api } from "../api";

/** İlanın arayüz tarafındaki şekli — `api.isKollari`'nin dönüşü. */
export interface KurulumDaraltmasiIlani {
  aktif: readonly Sektor[];
  tumu: readonly Sektor[];
  kaynak: "varsayilan" | "yapilandirma";
}

/**
 * react-query anahtarı — TEK İLAN.
 *
 * Altı yüzey aynı ilanı okur; anahtarın tek yerden gelmesi, tekilleştirmenin
 * yazım âdetine değil bir sabite dayanması demektir.
 */
export const KURULUM_DARALTMASI_ANAHTARI = ["isKollari"] as const;

/**
 * İlandan DARALTMA KÜMESİNİ türetir.
 *
 * @returns `undefined` = süzme YOK (yapılandırma yapılmamış kurulum, ya da uç
 *   henüz yanıtlamamış). `gorunurSablonlar` · `gorunurSiparisTurleri` ·
 *   `gorunurRehber` · `gorunurSahneTuru` hepsi bu sözleşmeyi paylaşır.
 */
export function daraltmaKumesi(
  ilan: KurulumDaraltmasiIlani | undefined
): readonly Sektor[] | undefined {
  return ilan?.kaynak === "yapilandirma" ? ilan.aktif : undefined;
}

/** Kurulumun daraltma kümesini okuyan hook — altı yüzeyin ortak girişi. */
export function useKurulumDaraltmasi(): readonly Sektor[] | undefined {
  const q = useQuery({ queryKey: KURULUM_DARALTMASI_ANAHTARI, queryFn: api.isKollari });
  return daraltmaKumesi(q.data);
}
