/* DOSYA ADLANDIRMA SÖZLEŞMESİ — Canonical 8.5: "her çıktı türü ... sürüm
   sayacı taşır ve dosya adlandırma sözleşmesine uyar."
   ============================================================================
   Sözleşme önceden İLANSIZDI: aynı kalıp exports.ts ve vector.ts'te satır-içi
   TEKRARLI yaşıyordu; garment kendi kalıbını satır-içi kuruyordu; en kritiği
   cmyk.ts, print dosya adının `_print.pdf` ile bittiğine SESSİZCE güveniyordu —
   exports adlandırmayı değiştirse CMYK çalışma anında kırılırdı (500) ve
   hiçbir test bu bağlaşımı korumazdı. Sözleşme artık BURADA yaşar; dört uç
   okuyucudur; cmyk bağlaşımı round-trip nöbetçisiyle çivilidir
   (dosya-adi.test.ts). AD ŞEMASI DEĞİŞMEDİ — bu modül yalnız ilan.

   Saf ve deterministiktir: fs/path/db yok — birim-test edilebilir. */

/** Belge exportu (print/preview PDF · decoupe/broderie SVG):
    `{gün}_{şablon}_{format}_v{sürüm}_{tür}.{uzantı}` */
export function exportDosyaAdi(p: {
  day: string;
  templateId: string;
  format: string;
  version: number;
  kind: string;
  uzanti: "pdf" | "svg";
}): string {
  return `${p.day}_${p.templateId}_${p.format}_v${p.version}_${p.kind}.${p.uzanti}`;
}

/** Garment paketi taban adı: `{gün}_garment-{ürün}_v{sürüm}` — alan dosyaları
    `{taban}_{alan}.{png|pdf|svg}`, broderie fişi `{taban}_broderie-fiche.pdf` */
export function garmentDosyaTabani(p: {
  day: string;
  garmentKind: string;
  version: number;
}): string {
  return `${p.day}_garment-${p.garmentKind}_v${p.version}`;
}

/** CMYK türev adı — print PDF adından türetilir (BAĞLAŞIM BURADA İLANLI:
    `_print.pdf` soneki exportDosyaAdi'nin kind="print" çıktısıdır; round-trip
    nöbetçisi iki fonksiyonun birlikte çalıştığını çiviler). Kalıba uymayan
    girişte null — uç 500 bad_filename döner (bugünkü davranış birebir). */
export function cmykTuretilmisAd(printYolu: string): string | null {
  const turetilmis = printYolu.replace(/_print\.pdf$/, "_print-cmyk.pdf");
  return turetilmis === printYolu ? null : turetilmis;
}
