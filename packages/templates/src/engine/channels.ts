/* ÜRETİM KANALI YÖNLENDİRMESİ — Canonical 7.2 "Üretim çıktıları" + 8.5 kanal
   taksonomisi. Hangi belgenin hangi üretim yolundan çıkacağı önceden İKİ yerde
   tür-koşuluyla yaşıyordu (web doExport: tekstil→garment ucu, cam+decoupe→SVG,
   gerisi→PDF; sunucu material-routing: türden SVG kind türetimi). Karar artık
   manifest'in production_channels İLANINDAN okunur ve TEK yerde yaşar; eski
   tür-koşullu mantıkla birebir eşdeğerlik referans-kopya testiyle çivilidir
   (uretim-kanallari.test.ts).

   Bilerek SAF ve react'sız: yalnız type-only import taşır — hem web (tam
   paket) hem sunucu (identity alt-yolu re-export) aynı fonksiyonu okur. */

import type { ProductionChannel } from "../types.js";

/** Vektör (SVG) ucunun çıktı türü: découpe ilanı broderie'den ÖNCELİKLİDİR
    (bugün hiçbir profil ikisini birden ilan etmiyor — nöbetçi tablo pin'i;
    ilan etse kesim sözleşmesi kazanır). Hiçbiri ilanlı değilse null → uç 400. */
export function svgKindOf(
  channels: readonly ProductionChannel[]
): "decoupe" | "broderie" | null {
  if (channels.includes("decoupe")) return "decoupe";
  if (channels.includes("broderie")) return "broderie";
  return null;
}

/** Editörün export düğmesinin yolu — eski tür-koşullu sıranın birebir taşınmışı:
    (1) tekstil paketi (png/broderie ilanlı, print İLANSIZ — PDF üretmeyen profil),
    (2) kesim SVG'si (decoupe ilanlı VE belge decoupe modunda),
    (3) varsayılan print+preview PDF. */
export function exportRouteOf(
  channels: readonly ProductionChannel[],
  mode: unknown
): "garment" | "svg" | "pdf" {
  const tekstilPaketi =
    (channels.includes("png") || channels.includes("broderie")) && !channels.includes("print");
  if (tekstilPaketi) return "garment";
  if (channels.includes("decoupe") && mode === "decoupe") return "svg";
  return "pdf";
}
