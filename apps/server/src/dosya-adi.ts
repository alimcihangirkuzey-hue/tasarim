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

   SUNUM KANALLARI DA SÖZLEŞMEYE GİRER (8.5'in "her çıktı türü ... uyar"
   hükmü; journal 2026-07-26-onizleme-turleri): mockup / mockup_hires /
   presentation / digital_menu adları da satır-içi kuruluyordu (mockup.ts,
   present.ts, digital-menu.ts) — dosya-adlandirma paketinin "sunum kanalları
   ayrı karar" şerhi bu ekle KAPANIYOR; dört uç daha okuyucu olur.
   AD ŞEMASI YİNE DEĞİŞMEDİ — referans-kopya testleri birebirliği çiviler.

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

/** Mockup JPG'si: `{gün}_{şablon}_{format}_v{sürüm}_{tür}.jpg` — belge
    şablonuyla aynı kalıp, uzantı jpg. ÖLÇÜM: iki mockup ucu (mockup.ts)
    AYNI şablonu kuruyordu, yalnız tür soneki farklıydı — o yüzden ayrı
    fonksiyon değil TEK fonksiyon + kind paramı. DİKKAT: dosya soneki
    "mockup-hires" (tire), export_records kind'ı "mockup_hires" (alt çizgi) —
    bugünkü ayrım birebir korunur. */
export function mockupDosyaAdi(p: {
  day: string;
  templateId: string;
  format: string;
  version: number;
  kind: "mockup" | "mockup-hires";
}): string {
  return `${p.day}_${p.templateId}_${p.format}_v${p.version}_${p.kind}.jpg`;
}

/** Sunum PDF'i (BAT): `{gün}_{proje-slug}_a4_v{sürüm}_presentation.pdf` —
    format SABİT "a4" (sunum sayfası A4 basar). projeSlug çağıranda
    slugify(project.name) ile üretilir (slugify @tezgah/shared'de; modül
    saf/bağımsız kalsın diye slug burada parametredir). */
export function sunumDosyaAdi(p: {
  day: string;
  projeSlug: string;
  version: number;
}): string {
  return `${p.day}_${p.projeSlug}_a4_v${p.version}_presentation.pdf`;
}

/** Dijital menü HTML'i: `{gün}_{müşteri-slug}_menu-digital_v{sürüm}.html` —
    tür soneki YOK ("menu-digital" format konumundadır). musteriSlug çağıranda
    slugify(client.name) ile üretilir (kayıtlı client.slug alanı DEĞİL —
    bugünkü davranış birebir; klasör adı slug'dan, dosya adı isimden gelir). */
export function dijitalMenuDosyaAdi(p: {
  day: string;
  musteriSlug: string;
  version: number;
}): string {
  return `${p.day}_${p.musteriSlug}_menu-digital_v${p.version}.html`;
}
