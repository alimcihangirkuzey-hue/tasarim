/* ADAPTİF TEMA + YOĞUNLUK — paket 6 (journal 2026-08-07-adaptif-tema).

   SORU: aynı tema 25 üründe ferah, 70 üründe normal, 100 üründe yoğun
   görünmeli. Bunu SABİT bir şablon yapamaz; içerik miktarına göre kolon,
   tipografi ölçeği ve kart boyu birlikte kayar.

   ÜÇ KURAL:

   1. ADAY ÜRET, SKORLA, SEÇ — sonucu HARD-CODE ETME. "6 ürün → 2×3" gibi
      eşlemeler bu dosyada YOKTUR: kolon adayları üretilir, her biri gerçek
      panel ölçüsüyle puanlanır, en iyisi kazanır. Sabit tablo, panel
      genişliği ya da açıklama uzunluğu değiştiğinde sessizce yanlış olurdu.

   2. OKUNABİLİRLİK TABANI PAZARLIK KONUSU DEĞİL. Ölçek MIN_OLCEK'in altına
      İNMEZ. Sığmıyorsa fontu daha da küçültmek değil, kolonu/sayfayı
      değiştirmek gerekir — "sadece font küçülterek problemi gizleme"
      (ürün sahibi kuralı) burada mekanik olarak imkânsız kılınmıştır.

   3. FOTOĞRAF ORANI SABİT. Ölçek yalnız METİN bloğunu sıkıştırır
      (gridKartOlcusu'nda foto yüksekliği ölçeğe bağlı DEĞİLDİR). */

import {
  gridKapasitesi,
  gridKartOlcusu,
  listeKapasitesi,
  type MenuItem,
} from "@tezgah/shared";

/* ── Yoğunluk ─────────────────────────────────────────────────────────── */

export const YOGUNLUKLAR = ["dusuk", "orta", "yuksek", "cok_yuksek"] as const;
export type Yogunluk = (typeof YOGUNLUKLAR)[number];

/** Doluluk oranından (kalem / kapasite) yoğunluk seviyesi. */
export function yogunlukSeviyesi(doluluk: number): Yogunluk {
  if (doluluk <= 0.4) return "dusuk";
  if (doluluk <= 0.75) return "orta";
  if (doluluk <= 1.0) return "yuksek";
  return "cok_yuksek";
}

/** OKUNABİLİRLİK TABANI — bunun altına inilmez, kolon/sayfa değişir. */
export const MIN_OLCEK = 0.8;

/** Yoğunluğa göre tipografi/boşluk ölçeği. Az üründe FERAH (>1), çok üründe
    sıkı — ama hiçbir zaman tabanın altında. */
export const YOGUNLUK_OLCEGI: Record<Yogunluk, number> = {
  dusuk: 1.25,
  orta: 1.0,
  yuksek: 0.9,
  cok_yuksek: MIN_OLCEK,
};

/* ── Tema ailesi ──────────────────────────────────────────────────────── */

export interface TemaVaryanti {
  ad: string;
  /** Bu varyantın rahat taşıdığı kalem aralığı */
  min: number;
  ideal: number;
  max: number;
  olcek: number;
  /** Grid için tercih edilen kolon adayları — SONUÇ değil ADAY */
  kolonAdaylari: number[];
}

/** TEK TEMA AİLESİ, ÜÇ VARYANT. Aynı tasarım dili, farklı nefes. */
export const TEMA_AILESI: TemaVaryanti[] = [
  { ad: "ferah", min: 0, ideal: 25, max: 40, olcek: YOGUNLUK_OLCEGI.dusuk, kolonAdaylari: [2, 3] },
  { ad: "normal", min: 30, ideal: 65, max: 80, olcek: YOGUNLUK_OLCEGI.orta, kolonAdaylari: [2, 3] },
  { ad: "yogun", min: 70, ideal: 95, max: 140, olcek: YOGUNLUK_OLCEGI.yuksek, kolonAdaylari: [3] },
];

/**
 * Kalem sayısına göre varyant. Kapasite aşılırsa DAHA SIKI varyanta geçilir;
 * hiçbiri yetmezse en yoğunu döner (o noktada karar sayfa/panel eklemektir
 * ve onu çağıran verir — burada sessizce sıkıştırma yapılmaz).
 */
export function temaVaryanti(kalemSayisi: number): TemaVaryanti {
  for (const v of TEMA_AILESI) {
    if (kalemSayisi <= v.max) return v;
  }
  return TEMA_AILESI[TEMA_AILESI.length - 1];
}

/* ── Grid adayları ve skorlama ────────────────────────────────────────── */

export interface GridAdayi {
  kolon: number;
  /** Bu kolonla kaç kalem sığar */
  sigan: number;
  /** Kullanılmayan dikey alan (mm) — az olanı iyi, ama sıfır da hedef değil */
  bosAlan_mm: number;
  /** Kart genişliği — çok küçük kart okunmaz */
  kart_mm: number;
  skor: number;
}

/** Kart bundan darsa ürün adı ve fiyat okunmaz olur (mm). */
export const MIN_KART_MM = 20;

/**
 * Verilen alan ve kalem listesi için kolon ADAYLARINI üretir ve skorlar.
 * Skor boyutları (ürün sahibinin listesi): sığdırma (taşma) · kullanılmayan
 * alan · okunabilirlik (kart genişliği). Çakışma/safe/fold yerleşim
 * katmanının işidir ve orada zaten ölçülür — burada tekrar edilmez.
 */
export function gridAdaylari(
  w_mm: number,
  h_mm: number,
  items: readonly MenuItem[],
  olcek: number,
  adaylar: readonly number[] = [1, 2, 3]
): GridAdayi[] {
  const aciklamaVar = items.some((i) => i.desc.trim() !== "");
  return adaylar
    .map((kolon) => {
      const { card_w_mm, card_h_mm } = gridKartOlcusu(w_mm, kolon, aciklamaVar, olcek);
      const { fits } = gridKapasitesi(w_mm, h_mm, kolon, items, olcek);
      const satir = kolon > 0 ? Math.ceil(fits / kolon) : 0;
      const kullanilan = satir > 0 ? satir * card_h_mm + (satir - 1) * 2.5 : 0;
      const bosAlan_mm = Math.max(0, h_mm - kullanilan);

      /* SKOR — büyük daha iyi.
         · Sığdırma en ağır terim: basılmayan ürün her şeyden kötüdür.
         · Boş alan cezası ORANSAL: yarısı boş kalan panel dengesizdir.
         · Okunamayacak kadar dar kart AĞIR cezalıdır — "sığdı" demek
           "okunuyor" demek değildir. */
      const sigmaOrani = items.length > 0 ? fits / items.length : 1;
      const bosOran = h_mm > 0 ? bosAlan_mm / h_mm : 0;
      const okunur = card_w_mm >= MIN_KART_MM ? 1 : card_w_mm / MIN_KART_MM;
      const skor = sigmaOrani * 100 - bosOran * 25 + okunur * 20 - (card_w_mm < MIN_KART_MM ? 60 : 0);

      return { kolon, sigan: fits, bosAlan_mm, kart_mm: card_w_mm, skor };
    })
    .sort((a, b) => b.skor - a.skor || a.kolon - b.kolon); // eşitlikte AZ kolon (deterministik + okunaklı)
}

/** En iyi kolon — aday üretip skorlar, sonucu HARD-CODE etmez. */
export function enIyiKolon(
  w_mm: number,
  h_mm: number,
  items: readonly MenuItem[],
  olcek: number,
  adaylar?: readonly number[]
): number {
  const a = gridAdaylari(w_mm, h_mm, items, olcek, adaylar);
  return a.length > 0 ? a[0].kolon : 2;
}

/* ── Belge düzeyi karar ───────────────────────────────────────────────── */

/** Ölçek merdiveni — adaylar buradan gelir. Taban MIN_OLCEK, tavan ferah. */
export const OLCEK_ADAYLARI = [0.8, 0.85, 0.9, 0.95, 1.0, 1.1, 1.25] as const;

/** Bir ölçeğin belge üzerindeki sonucu — skorlanabilir bir aday. */
export interface OlcekAdayi {
  olcek: number;
  /** Bu ölçekte belgenin taşıyacağı kalem sayısı */
  kapasite: number;
  /** Sığmayan kalem — 0 olmak ZORUNDA, yoksa sayfa eklenir */
  tasan: number;
  doluluk: number;
  /** Kullanılmayan alan oranı (0 = tıka basa, 1 = bomboş) */
  bosOran: number;
  skor: number;
}

/** İçeriğin biçimi — ölçek kararına giren metin/görsel sinyalleri. */
export interface IcerikProfili {
  /** Açıklamalı kalem oranı 0..1. Uzun metin daha çok nefes ister. */
  aciklamaOrani?: number;
  /** Fotoğraflı kalem oranı 0..1. Foto ORANI bozulmaz; ölçek metne çalışır,
      ama fotoğraflı belge sıkıştıkça daha çabuk boğulur. */
  fotoOrani?: number;
  /** Belgedeki yaprak sayısı — sayfa eklemenin bedeli burada görünür. */
  yaprakSayisi?: number;
}

/**
 * HEDEF DOLULUK — "tek sayfaya her şeyi sıkıştır" DEĞİL.
 * Sade bir fiyat listesi %88'e kadar rahat dolar; açıklamalı ve fotoğraflı
 * içerik aynı doluluğa geldiğinde okunmaz hâle gelir, o yüzden hedef aşağı
 * çekilir. Sayı değil ORAN kararı: aynı alanda daha az kalem = daha çok nefes.
 */
export function hedefDoluluk(profil: IcerikProfili = {}): number {
  /* NaN KORKULUĞU: Math.min/max NaN'ı yutmaz, taşır — bozuk bir oran hedefi
     NaN yapar ve karar sessizce anlamsızlaşır (testte yakalandı). */
  const oran = (v: number | undefined): number =>
    Number.isFinite(v) ? Math.min(1, Math.max(0, v as number)) : 0;
  const aciklama = oran(profil.aciklamaOrani);
  const foto = oran(profil.fotoOrani);
  return 0.88 - 0.18 * aciklama - 0.12 * foto;
}

export interface AdaptifKarar {
  yogunluk: Yogunluk;
  varyant: TemaVaryanti;
  olcek: number;
  /* İKİ DOLULUK, İKİ AYRI SORU — biri diğerinin yerine kullanılamaz.

     `doluluk` GİRDİ sinyalidir: ölçek 1'de belge ne kadar dolu. Karar bundan
     ÖNCE gelir ve ölçekten bağımsızdır. Paket 6.6'da bu alanın anlamını
     "seçilen ölçekteki doluluk" diye değiştirmiştim ve paket 6'dan kalan bir
     test kızardı (0.5 beklerken 0.625). Testi yeni koda uydurmak yanlış
     olurdu: alan zaten bir şey ifade ediyordu, ben sessizce başka bir şeye
     çevirmişim. Eski anlam korundu, yeni ölçüm AYRI isim aldı. */
  /** Ölçek 1'de: toplam kalem / toplam kapasite (GİRDİ sinyali) */
  doluluk: number;
  /** SEÇİLEN ölçekte doluluk — kararın SONUCU (rapor ve yoğunluk buradan) */
  secilenDoluluk: number;
  /** Bu içerik profili için hedeflenen doluluk — kararın gerekçesi görünür olsun */
  hedefDoluluk: number;
  /** TABAN ölçekte bile sığmıyorsa: çözüm SAYFA EKLEMEK, font küçültmek değil */
  ekSayfaOner: boolean;
  /* FERAHLIK ÖNERİSİ: belge sığıyor ama hedef doluluğun ÜSTÜNDE. Okunabilirlik
     için bir sayfa daha açmak font küçültmekten iyidir; öneri buradan çıkar. */
  ferahSayfaOner: boolean;
  /** Skorlanmış adaylar (en iyi başta) — karar denetlenebilir olsun */
  adaylar: OlcekAdayi[];
}

/**
 * Belgenin TÜMÜ için ölçek kararı — ADAY ÜRET, SKORLA, SEÇ.
 *
 * NİÇİN DEĞİŞTİ (paket 6.6): eski hâli ölçeği KALEM SAYISINDAN türetiyordu
 * (`temaVaryanti(100).olcek = 0.9`) ve doluluk sinyalini eziyordu
 * (`min(1.25, 0.9) = 0.9`). Gerçek tarayıcıda ölçüldü: 100 ürünlük belgede
 * son panelin %36'sı BOŞken metin yine 0.9'a küçültülüyordu. Yani motor
 * "yer var" bilgisini ölçek kararında hiç kullanmıyordu. Ürün sayısı bir
 * yoğunluk ölçüsü DEĞİLDİR: 100 kalem A4 üç panelde ferah, kartvizitte
 * imkânsızdır. Yoğunluğu belirleyen şey KALEM/ALAN oranıdır.
 *
 * OKUNABİLİRLİK ÖNCE (ürün sahibi kuralı): skorda en ağır terim okunabilirlik,
 * yani BÜYÜK ölçek. Küçültme ancak taşma varsa kazanır. Taban MIN_OLCEK'in
 * altına hiç inilmez; taban bile yetmiyorsa karar "sayfa ekle" olur ve
 * `ekSayfaOner` ile SÖYLENİR — sessizce daha da küçültmek yasak.
 *
 * `temaVaryanti` KALDIRILMADI ama görevi daraldı: artık ölçeğe tavan koymaz,
 * yalnız kolon adaylarını ve tema dilini verir (geriye uyum).
 */
export function adaptifKarar(
  kalemSayisi: number,
  toplamKapasite: number,
  profil: IcerikProfili = {}
): AdaptifKarar {
  const varyant = temaVaryanti(kalemSayisi);
  const hedef = hedefDoluluk(profil);

  /* Kapasite ölçekle TERS orantılı: satır yüksekliği ölçekle çarpıldığı için
     ölçek küçüldükçe aynı alana daha çok kalem sığar (listeKapasitesi ve
     gridKapasitesi ikisi de böyle davranır — ölçüldü, varsayılmadı). */
  const adaylar: OlcekAdayi[] = OLCEK_ADAYLARI.map((olcek) => {
    const kapasite = toplamKapasite > 0 ? toplamKapasite / olcek : 0;
    const tasan = Math.max(0, kalemSayisi - kapasite);
    const doluluk = kapasite > 0 ? kalemSayisi / kapasite : 0;
    const bosOran = Math.max(0, 1 - doluluk);

    /* SKOR — büyük daha iyi. Üç terim, ağırlıkları ürün kararını taşır:
       · TAŞMA en ağır ceza: basılmayan ürün her şeyden kötüdür.
       · OKUNABİLİRLİK ikinci ve pozitif: büyük ölçek ödüllendirilir. Bu terim
         olmasa motor "her şey sığıyor" diye en küçük ölçeği seçerdi.
       · HEDEFTEN SAPMA üçüncü: hem tıka basa hem yarı boş sayfa cezalı.
         Yarı boş sayfayı cezalandırmak "ferah" ile "savruk"u ayırır. */
    /* SKOR — büyük daha iyi. İKİ terim, ve DOLULUK HEDEFİ BURADA YOK.

       BİR TUR YANLIŞ MODEL KURDUM, ÖLÇÜP DÜZELTTİM: skora "hedef doluluktan
       sapma" cezası koymuştum. Testte profil kararı hiç değiştirmiyordu;
       hesabı elle yürüttüğümde nedeni çıktı — kapasite ölçekle TERS orantılı
       olduğu için "daha az dolu olsun" isteği doğrudan "FONTU KÜÇÜLT"e
       çıkıyor (0.8 ölçekte kapasite büyür, doluluk düşer). Yani ceza terimi
       tam olarak ürün sahibinin yasakladığı şeyi ödüllendiriyordu.

       DOĞRU AYRIM: ölçeği OKUNABİLİRLİK seçer (taşmayan EN BÜYÜK ölçek),
       doluluk hedefi ise SAYFA ÖNERİR. Ferahlık fontu küçültmekle değil
       sayfa eklemekle kazanılır. */
    const tasmaOrani = kalemSayisi > 0 ? tasan / kalemSayisi : 0;
    const skor = -tasmaOrani * 400 + olcek * 60;

    return { olcek, kapasite, tasan, doluluk, bosOran, skor };
  }).sort((a, b) => b.skor - a.skor);
  /* SIRALAMA YALNIZ SKORA BAKAR — eşitlikte "büyük ölçek kazanır" diye bir
     bozucu YOK. Vardı ve KALDIRILDI: kırmızı-kanıt turunda okunabilirlik
     ödülünü (olcek * 60) skordan çıkardım ve HİÇBİR TEST KIZARMADI, çünkü
     eşitlik bozucusu aynı işi sessizce yapıyordu. Yani tercih iki yerde
     yaşıyordu ve biri ölü ağırlıktı. Artık tercih TEK yerde: skorda.
     `OLCEK_ADAYLARI` artan sırada ve JS sort'u kararlı (ES2019), dolayısıyla
     skorlar eşitse EN KÜÇÜK ölçek başa gelir — okunabilirlik ödülü olmadan
     motor küçüğü seçer ve test bunu yakalar. */

  const kazanan = adaylar[0];
  /* TABAN ölçekte de taşıyorsa çözüm sayfa eklemektir. Kararı burada
     vermiyoruz — çağırana SÖYLÜYORUZ (sayfalama globalReflow'un işi). */
  const tabanAdayi = adaylar.find((a) => a.olcek === MIN_OLCEK);
  const ekSayfaOner = (tabanAdayi?.tasan ?? 0) > 0;
  /* Taban bile yetmiyorsa ölçek tabanda DURUR — daha aşağısı yok. */
  const olcek = ekSayfaOner ? MIN_OLCEK : kazanan.olcek;
  const secilen = adaylar.find((a) => a.olcek === olcek) ?? kazanan;

  /* FERAHLIK İÇİN SAYFA ÖNERİSİ — içerik profilinin GERÇEK işi.
     Belge taşmıyor olabilir ama tıka basa dolmuş olabilir; açıklamalı ve
     fotoğraflı içerikte bu okunabilirlik kaybıdır. Çözüm fontu küçültmek
     DEĞİL (o doluluğu düşürür ama okunaklığı da düşürür), bir sayfa daha
     açmaktır. Burada yalnız ÖNERİLİR; sayfa açma kararı çağıranın. */
  const ferahSayfaOner = !ekSayfaOner && secilen.doluluk > hedef;

  return {
    yogunluk: yogunlukSeviyesi(secilen.doluluk),
    varyant,
    olcek,
    doluluk: toplamKapasite > 0 ? kalemSayisi / toplamKapasite : 0,
    secilenDoluluk: secilen.doluluk,
    hedefDoluluk: hedef,
    ekSayfaOner,
    ferahSayfaOner,
    adaylar,
  };
}

/** Fiyat listesinin verilen alanda kaç kalem taşıyacağı — ölçek duyarlı. */
export function listeSigan(h_mm: number, items: readonly MenuItem[], olcek: number): number {
  return listeKapasitesi(h_mm, items, olcek).fits;
}
