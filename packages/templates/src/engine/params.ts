/* Param çözümü — manifest varsayılanları + format'a bağlı seçenekler */

import { HexColor } from "@tezgah/shared";
import type { DocumentState } from "@tezgah/shared";
import type { ParamDef, ParamValue, TemplateManifest } from "../types.js";

export function currentFormat(manifest: TemplateManifest, doc: DocumentState): string {
  const raw = doc.params["format"];
  if (typeof raw === "string" && manifest.formats[raw]) return raw;
  return manifest.defaultFormat;
}

function defFor(param: ParamDef, format: string): ParamValue {
  return param.defaultByFormat?.[format] ?? param.default;
}

export function paramOptions(param: ParamDef, format: string): ParamValue[] {
  return param.optionsByFormat?.[format] ?? param.options ?? [];
}

/* ------------------------------------------------------------------ */
/* number ilanının okunması — ParamDef.min/max/step                    */
/* ------------------------------------------------------------------ */

/**
 * Adım (step) hizası kıyasında kullanılan tolerans — kayan nokta artığı içindir,
 * gevşeklik değildir.
 *
 * GEREKÇE (ölçüm): adım hizası "(v - taban) / step tam sayı mı" diye sorulur ve
 * bu bölme IEEE-754'te tam çıkmaz. Ölçülen örnek: min=0, step=0.1, v=0.3 için
 * (0.3 - 0) / 0.1 = 2.9999999999999996 — yani ilanı KUSURSUZ karşılayan bir
 * değer, çıplak `% step === 0` kıyasıyla GEÇERSİZ sayılırdı. Tolerans bu yanlış
 * reddi kapatır; gerçek bir kayma (ör. k = 3.5) 1e-9'un beş mertebe üstünde
 * kaldığı için elenmeye devam eder.
 *
 * SINIRI DÜRÜSTÇE: tolerans adım SAYISI üzerinde mutlaktır, yani adım sayısı
 * 1e9 mertebesine tırmanan bir ilanda anlamını yitirir. Bugünkü kayıt defterinde
 * ölçülen en büyük adım sayısı designSeed'in 9999'u (min 0, max 9999, step 1) —
 * yani sınırın altı beş mertebe uzakta. Bu yüzden göreli tolerans karmaşıklığı
 * satın alınmadı; ilan uzayı oraya yaklaşırsa burası yeniden ölçülmelidir.
 * (journal 2026-07-27-param-gecerli-deger-ilani)
 */
const ADIM_TOLERANSI = 1e-9;

/**
 * Belge değerinin `ParamDef`'teki number ilanına uyup uymadığını ölçer.
 *
 * BU FONKSİYON İLAN UYDURMAZ, İLANI OKUR: min/max/step alanları `ParamDef`'te
 * (types.ts) zaten VARDI ve kayıt defterindeki 13 number paramın 13'ünde de
 * ilan edilmişti (ölçüldü: designSeed 0–9999/1 ×5 şablon; vitro-bandeau /
 * -centre / -colonne w_cm+h_cm 10–2000/1; enseigne-panneau w_cm 50–2000/1 ve
 * h_cm 20–500/1). Eksik olan ilan değil, ilanı UYGULAYAN nokta idi.
 *
 * ADIM TABANI = `min ?? 0` — keyfi değil, DEĞERİ ÜRETEN parçayla hizalıdır:
 * EditorPage number paramı `<input type="number" min max step>` olarak basar ve
 * HTML'de step tabanı tam olarak "min varsa min, yoksa 0"dır. Başka bir taban
 * seçmek, tarayıcının kullanıcıya "bu değer kabul edilebilir" dediği bir sayıyı
 * motorun sessizce reddetmesi demek olurdu — yani UI ile motorun geçerlilik
 * tanımı ayrışırdı. İlan-okur mimaride iki okuyucunun aynı ilandan aynı sonucu
 * çıkarması şarttır.
 *
 * `step <= 0` ve sonlu olmayan step İLANSIZ sayılır: sıfır/negatif adım bir ızgara
 * TANIMLAMAZ; bölme Infinity veya NaN üretir ve tolerans kıyası her değeri
 * "geçersiz" ilan ederdi. Yani bozuk bir ilan, sessizce TÜM belge değerlerini
 * yutan bir tuzağa dönüşürdü. Bozuk ilanın cezası belgeyi kesmek değildir; ilan
 * tutarlılığı yükleme zamanı kapısının işidir (registry-core, aynı paketin ayrı
 * kalemi) — burada güvenli yön değeri OKUMAKTIR.
 */
function sayiIlanaUyar(param: ParamDef, v: number): boolean {
  /* NaN ve ±Infinity `typeof v === "number"` testinden GEÇER; bu yüzden sonluluk
     ayrı ve ÖNCE sorulur. Kritik: min/max ilansızken NaN hiçbir kıyasa takılmaz
     (NaN >= x ve NaN <= x ikisi de false'tur, yani "sınır ihlali" görünmez) ve
     "ilan yoksa kısıtsız" kuralından sızarak geçerli sayılırdı. Sonsuzluk ise
     ilansız bir paramda çizim matematiğini sessizce bozardı. */
  if (!Number.isFinite(v)) return false;

  if (param.min !== undefined && v < param.min) return false;
  if (param.max !== undefined && v > param.max) return false;

  const step = param.step;
  if (step !== undefined && Number.isFinite(step) && step > 0) {
    const taban = param.min ?? 0;
    const adimSayisi = (v - taban) / step;
    if (Math.abs(adimSayisi - Math.round(adimSayisi)) > ADIM_TOLERANSI) return false;
  }

  return true;
}

/**
 * Belge parametresini çözer: belge değeri İLANA UYUYORSA o değer, uymuyorsa
 * (veya hiç yoksa) manifest varsayılanı döner — deterministik.
 *
 * "İLAN" tipe göre farklı okunur, çünkü her tipin geçerlilik tanımı farklı yerde
 * ilan edilmiştir:
 *   · choice  → `optionsByFormat` / `options` (kapalı değer kümesi)
 *   · toggle  → tipin kendisi (boolean)
 *   · number  → `min` / `max` / `step` (ParamDef alanları)
 *   · color   → kanonik `HexColor` biçimi (#RRGGBB), @tezgah/shared
 *
 * DEJENERASYONUN TARİHİ (neden vardı, neden kalktı):
 * Bu fonksiyon eskiden TEK bir yol kullanıyordu — toggle dışındaki her tip için
 * `paramOptions()` çağırıp belge değerini o kümede ARIYORDU. choice paramlarında
 * bu doğrudur; number ve color paramlarında ise `options` hiç ilan edilmediği
 * için küme DAİMA boş dönüyordu. Sonuç: `opts.some((o) => o === raw)` hiçbir
 * zaman true olamıyor, belge değeri OKUNMADAN atılıyor ve fonksiyon her çağrıda
 * varsayılanı döndürüyordu. Yani üstteki docstring'in ("geçersiz/eksik değer
 * varsayılana düşer") bu iki tipte YALAN olduğu ölçülmüştü: GEÇERLİ değer de
 * atılıyordu. Depo bu tuzağı beş ayrı yerde şerhlemiş (types.ts:195,
 * registry-core.ts:49 ve :59, kosullu-gereklilik.test.ts:273,
 * dosya-gereklilik.test.ts:219) ama düzeltmemişti.
 *
 * DÜZELTMENİN DAVRANIŞ YÜZEYİ SIFIR — İDDİA DEĞİL, ÖLÇÜM:
 *   (1) paramValue()'nun tüm üretim çağrıları choice/toggle paramları okuyor
 *       (flow, cols, columns, priceStyle, priceLayout, qrSource, stampCount,
 *       showDesc, showQr). stampCount `number` DEĞİL, `options: [8,10,12]` taşıyan
 *       bir `choice`'tur — number sanılıp yanlış sayılabilirdi, ölçüldü.
 *   (2) Tek genel çağrı EditorPage.tsx:425'tir; tüm paramlar için `val` hesaplar
 *       ama number ve color dallarında `val`'i KULLANMAZ — ham `doc.params[p.id]`
 *       okur. Yani o iki dalda sonuç zaten çöpe gidiyordu.
 *   (3) Kayıt defteri taranarak ölçüldü: `options` veya `optionsByFormat` İLAN
 *       EDEN number/color param sayısı = 0. Dolayısıyla yeni dalların eski
 *       seçenek yolundan kopması hiçbir mevcut paramın çözümünü değiştiremez.
 * Bu yüzden değişen şey davranış değil, docstring'in DOĞRU olması ve tuzağın
 * kalkmasıdır: bundan sonra ilan eden bir number/color paramı gerçekten okunur.
 *
 * choice/toggle yolu BİREBİR korunmuştur (üretimin tamamı oradan geçtiği için).
 *
 * VARSAYILAN TERMİNALDİR: number/color dalları varsayılanı ilana karşı YENİDEN
 * doğrulamaz. choice'ta bir yedek vardır (varsayılan küme dışıysa `opts[0]`),
 * number/color'da böyle bir "ilk seçenek" yoktur — doğrulanan varsayılanın
 * gideceği yer olmadığı için kıyas ölçüsüz kalırdı. Aralık dışı varsayılan bir
 * MANİFEST hatasıdır ve yeri yükleme zamanı kapısıdır (registry-core), okuma
 * zamanı değil: yüklemede gürültülü kırılmak, her okumada sessizce başka bir
 * sayı döndürmekten iyidir.
 *
 * (journal 2026-07-27-param-gecerli-deger-ilani)
 */
export function paramValue(
  manifest: TemplateManifest,
  doc: DocumentState,
  id: string
): ParamValue {
  const param = manifest.params.find((p) => p.id === id);
  if (!param) return "";
  const format = currentFormat(manifest, doc);
  const raw = doc.params[id];
  if (param.type === "toggle") {
    return typeof raw === "boolean" ? raw : defFor(param, format);
  }
  if (param.type === "number") {
    /* İLAN YOKSA NE OLUR? — ürün kararı: min/max/step'in hiçbiri ilan
       edilmemişse HER SONLU SAYI GEÇERLİDİR (yokluk = kısıtsız). `sayiIlanaUyar`
       bunu yapı olarak sağlar: ilan edilmeyen her kıyas atlanır.

       NEDEN BU YÖN:
       (a) Depo emsali aynı doktrini zaten yazmış: types.ts:297, SlotDef.kabul için
           "Yokluk = KISITSIZ (mockup_tercihi emsali): çağıran hiçbir türü elemez."
           Aynı soruya aynı cevabı vermek, ilan dilini tek anlamlı tutar.
       (b) Ters seçenek — "ilan yok → doğrulanamaz → varsayılana düş" — az önce
           SÖKÜLEN HATANIN TA KENDİSİNİ geri kurardı: kullanıcının bilerek girdiği,
           hiçbir kurala aykırı olmayan bir değeri sessizce çöpe atmak. "Geçersiz"
           ile "doğrulanamaz" aynı şey değildir; yalnız birincisi değeri atmayı
           haklı çıkarır. Sinyalsiz veri kaybı güvenlik değildir.
       (c) UI kanıtı: EditorPage:430-440 min/max/step'i ilandan alıp doğrudan
           `<input type="number">` özniteliği yapar. İlan yoksa öznitelik de yoktur
           ve tarayıcı her sayıyı kabul eder — yani widget kullanıcıya "bu değer
           kabul edilebilir" der. Motorun aynı değeri sessizce reddetmesi, UI'ın
           verdiği sözü arkadan bozmak olurdu.
       (d) Bir number paramının gerçekten sınıra ihtiyacı varsa doğru yer manifest
           ilanı + yükleme kapısıdır; okuma zamanında sessizce yutmak değil.

       BU KARARIN BUGÜNKÜ YÜZEYİ SIFIRDIR (ölçüldü): kayıt defterindeki 13 number
       paramın 13'ü de min+max+step ilan ediyor, yani "ilansız" dal bugün hiç
       çalışmıyor. Karar GELECEK manifestleri yönetir; testte yine de çivilenir. */
    return typeof raw === "number" && sayiIlanaUyar(param, raw) ? raw : defFor(param, format);
  }
  if (param.type === "color") {
    /* KANONİK TANIMA BAĞLANDI, YERİNDE REGEX YAZILMADI — @tezgah/shared'daki
       HexColor (schemas.ts:8, /^#[0-9a-fA-F]{6}$/) kullanılıyor.

       NEDEN: "geçerli renk"in ikinci bir tanımını yazmak, bu depoda zaten ölçülmüş
       bir hastalığı büyütmek olurdu — hex kabulünün ÜÇÜNCÜ bir tanımı qr.ts:48'de
       yaşıyor (# isteğe bağlı, fazla haneyi sessizce kırpıyor) ve bu ayrışma
       paketin kapsam-dışı kalemlerinde kayıtlı. Dördüncüsünü eklemek düzeltmenin
       tersi yönde bir adım olurdu. Kanonik tanım genişlerse (ör. #RRGGBBAA),
       kopyalanmış bir regex sessizce ayrışır; import edilen tanım ayrışamaz.

       BAĞIMLILIK MALİYETİ ÖLÇÜLDÜ, SIFIR ÇIKTI: `@tezgah/shared` bu paketin
       package.json'ında zaten `dependencies` altında ve üretim modülleri ondan
       zaten DEĞER import ediyor (ör. menu-liste-premium/analyze.ts:5 → formatPrice),
       yani zod bu paketin çalışma zamanı grafiğinde hâlihazırda var; yeni paket
       yönü, yeni bağımlılık yok. Bilerek hafif tutulan `./identity` alt-yolu da
       etkilenmez: identity/index.ts manifest modülleri ile registry-core'u çeker,
       registry-core ise engine/severity.js'i çeker — engine/params.js o grafiğe
       hiç girmez (ölçüldü).

       `typeof raw === "string"` kıyası HexColor'ın işini tekrar etmez; TS'e daralma
       verir: DocumentState.params `z.record(z.unknown())`tur (schemas.ts:189), yani
       raw `unknown` gelir ve safeParse başarısı tek başına dönüş tipini string
       yapmaz. Eski kodun `raw as ParamValue` cast'ının yerini alan şey budur. */
    return typeof raw === "string" && HexColor.safeParse(raw).success
      ? raw
      : defFor(param, format);
  }
  const opts = paramOptions(param, format);
  if (raw !== undefined && opts.some((o) => o === raw)) return raw as ParamValue;
  const d = defFor(param, format);
  return opts.some((o) => o === d) ? d : (opts[0] ?? d);
}
