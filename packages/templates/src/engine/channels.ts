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

/* ── KANAL NİTELİK BİLDİRİMİ (Canonical 8.5 dürüstlük kuralı) ─────────────
   "Sistem, gerçekten sağlamadığı bir çıktı niteliğini (CMYK uygunluğu,
   PDF/X, ICC) iddia edemez. Doğrulanamayan nitelik sessiz geçilmez; INFO
   seviyesinde açıkça bildirilir." Bu tablo her üretim kanalının (ve türev
   print_cmyk kanalının) GERÇEK durumunu beyan eder; UI INFO satırları ve
   export snapshot denetim izi buradan okur.

   BUGÜNKÜ GERÇEK: hiçbir kanal ICC ya da PDF/X sağlamaz; print/preview/png
   RGB'dir (puppeteer/tarayıcı), print_cmyk gs pdfwrite DeviceCMYK dönüşümüdür
   (output intent ve rendering intent YÖNETİLMEZ), decoupe/broderie vektör
   text→path çıktılarıdır (renk yönetimi uygulanmaz — kesim/nakış makinesi
   sözleşmesi renkle değil geometriyle çalışır).

   NÖBETÇİ DİSİPLİNİ (kanal-nitelikleri testi): bir niteliği true yapmak,
   o niteliği GERÇEKTEN üreten/doğrulayan makine ile AYNI pakette gelmek
   zorundadır — sağlanmayan nitelik iddiası yalan ilandır (bloklamayan
   blocker emsali). */

export interface KanalNitelikBildirimi {
  /** Çıktının gerçek renk uzayı/doğası */
  renk: "rgb" | "device-cmyk" | "vektor";
  /** ICC profili / output intent yönetimi VAR mı (bugün: hayır) */
  icc: boolean;
  /** PDF/X uygunluğu VAR mı (bugün: hayır) */
  pdfx: boolean;
}

export const KANAL_NITELIKLERI: Record<
  ProductionChannel | "print_cmyk",
  KanalNitelikBildirimi
> = {
  print: { renk: "rgb", icc: false, pdfx: false },
  preview: { renk: "rgb", icc: false, pdfx: false },
  decoupe: { renk: "vektor", icc: false, pdfx: false },
  broderie: { renk: "vektor", icc: false, pdfx: false },
  png: { renk: "rgb", icc: false, pdfx: false },
  print_cmyk: { renk: "device-cmyk", icc: false, pdfx: false },
};

/** TİPSİZ giriş (export kayıt türü dizesi) — bilinmeyen/sunum kanalı null
    (Object.hasOwn: prototip zinciri kanal değildir). Snapshot gömme ve UI
    INFO satırları bunu okur. */
export function kanalNitelikleriOf(kind: string): KanalNitelikBildirimi | null {
  return Object.hasOwn(KANAL_NITELIKLERI, kind)
    ? KANAL_NITELIKLERI[kind as ProductionChannel | "print_cmyk"]
    : null;
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
