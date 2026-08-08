/* SİPARİŞ FORMUNUN SUNDUĞU SEÇENEKLER — şemanın KABUL ETTİĞİYLE aynı olmalı.

   ÖLÇÜLEN DURUM (2026-08-06): kalem formunun üç seçeneği var ve ikisi zaten
   İLANDAN türüyor — `mode` ve `technique` (`siparisTeknikleri`: ürün türü →
   şablon → production_channels → KANAL_GEREKTIRIR). Üçüncüsü, `side`, JSX'te
   elle yazılıydı ve TÜRETECEK İLANI YOK: uygulama yönü (dıştan/içten) bir
   ÜRETİM KANALI değildir, `KANAL_GEREKTIRIR` zincirinde karşılığı yoktur.
   Bu, TODO'da kayıtlı ve BİLEREK korunan bir sınırdır.

   NİYE YİNE DE BURAYA TAŞINDI: elle yazılmış olması, denetimsiz olmasını
   gerektirmiyor. Seçenek kümesi ile `OrderDetailsSchema`nın kabul ettiği küme
   AYRIŞIRSA operatör, sunucunun 400'leyeceği bir değeri seçebilir — ya da
   şemanın kabul ettiği bir değer arayüzde HİÇ görünmez (erişilemez yetenek).
   İkisi de bu deponun tek tek kapattığı yaralardan. Adı olan bir küme
   çivilenebilir; JSX'e gömülü olan çivilenemez.

   TÜRETME DEĞİL, ADLANDIRMA: burada yeni bir kaynak yaratılmıyor. `side` için
   tek gerçek kaynak şemadır; bu sabit onun arayüz karşılığıdır ve nöbetçi
   (siparisSecenekleri.test.ts) ikisinin eş-kümeliğini her koşuda ölçer —
   `DIS_KANALLAR ≡ contract enum` emsalinin aynısı. */

import type { OrderDetails } from "@tezgah/shared";

/** Uygulama yönü seçenekleri — sıra ARAYÜZ sırasıdır (dıştan önce gelir). */
export const SIPARIS_YONLERI = ["exterieur", "interieur"] as const satisfies ReadonlyArray<
  NonNullable<OrderDetails["side"]>
>;

export type SiparisYonu = (typeof SIPARIS_YONLERI)[number];
