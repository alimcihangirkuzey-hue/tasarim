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

export interface AdaptifKarar {
  yogunluk: Yogunluk;
  varyant: TemaVaryanti;
  olcek: number;
  /** Toplam kalem / toplam kapasite */
  doluluk: number;
}

/**
 * Belgenin TÜMÜ için yoğunluk ve ölçek kararı. Ölçek MIN_OLCEK'in altına
 * inmez — sığmıyorsa çözüm sayfa/kolon, font değil.
 */
export function adaptifKarar(
  kalemSayisi: number,
  toplamKapasite: number
): AdaptifKarar {
  const doluluk = toplamKapasite > 0 ? kalemSayisi / toplamKapasite : 0;
  const yogunluk = yogunlukSeviyesi(doluluk);
  const varyant = temaVaryanti(kalemSayisi);
  /* İki kaynak da ölçek önerir (yoğunluk ve varyant); DAHA SIKI olan kazanır
     ama taban korunur. */
  const olcek = Math.max(MIN_OLCEK, Math.min(YOGUNLUK_OLCEGI[yogunluk], varyant.olcek));
  return { yogunluk, varyant, olcek, doluluk };
}

/** Fiyat listesinin verilen alanda kaç kalem taşıyacağı — ölçek duyarlı. */
export function listeSigan(h_mm: number, items: readonly MenuItem[], olcek: number): number {
  return listeKapasitesi(h_mm, items, olcek).fits;
}
