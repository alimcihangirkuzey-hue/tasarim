/* F1 pilot P3 — DOSYA POLİTİKASI (spec §5). SAF sınıflandırma: I/O yok,
   sharp/fs yok — çağıran bulguları toplar, burası KARARI verir. Tek şema,
   iki kontrol noktası (genel /api/assets sertleştirmesi + brief sınırı).

   ÜÇ SINIF (spec §5 birebir):
   · REDDET  — istisnalanamaz (F1.5): bozuk/açılamayan dosya · desteklenmeyen
     tür · zorunlu dosya eksikliği · ölçü/yön belirlenemeyen dosya
   · UYAR + KAYITLI ONAY — düşük DPI · güvenli-alan riski · font riski
   · YALNIZ BİLGİLENDİR — CMYK/ICC/PDF-X doğrulanamaması: SESSİZ YOKLUK
     DEĞİL, açık not üretilir (F3 keşif bulgusu G'nin düzeltmesi)

   Kodlar completeness motorunun openRejectItems/notices sözleşmesiyle ve
   brief_audit.warning_code kolonuyla BİREBİR aynı dizelerdir. */

export type F1PolicyClass = "reject" | "warn" | "info";

/** warning_code sözlüğü — DB'ye yazılan dizeler burada tanımlıdır */
export const F1_POLICY_CODES = {
  /* REDDET */
  bozuk_dosya: "reject",
  desteklenmeyen_tur: "reject",
  zorunlu_dosya_eksik: "reject",
  olcu_belirlenemedi: "reject",
  /* UYAR + kayıtlı onay */
  dusuk_dpi: "warn",
  guvenli_alan_riski: "warn",
  font_riski: "warn",
  /* YALNIZ BİLGİLENDİR */
  cmyk_dogrulanamadi: "info",
  icc_dogrulanamadi: "info",
  pdfx_dogrulanamadi: "info",
  pdf_derin_dogrulama_yok: "info",
} as const satisfies Record<string, F1PolicyClass>;

export type F1PolicyCode = keyof typeof F1_POLICY_CODES;

/** Brief sınırında kabul edilen türler (spec v1). webp BİLİNÇLİ olarak YOK. */
export const F1_ACCEPTED_UPLOAD_TYPES = ["png", "jpg", "svg", "pdf"] as const;
export type F1UploadType = (typeof F1_ACCEPTED_UPLOAD_TYPES)[number];

/* checkDpi (packages/templates/src/engine/layout.ts) eşikleriyle BİREBİR.
   shared → templates importu YOK (templates zaten shared'a bağlı; döngü
   olurdu) → değer burada YENİDEN BEYAN edilir; testte sabitlenmiştir. */
export const F1_DPI_THRESHOLDS = { yellow: 250, red: 150 } as const;

const MIME_TO_TYPE: Readonly<Record<string, F1UploadType>> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
};

export function f1UploadTypeFromMime(mime: string | null | undefined): F1UploadType | null {
  if (!mime) return null;
  return MIME_TO_TYPE[mime.toLowerCase().trim()] ?? null;
}

export function f1PolicyClassOf(code: string): F1PolicyClass | null {
  return (F1_POLICY_CODES as Record<string, F1PolicyClass>)[code] ?? null;
}

/** Yalnız UYAR sınıfı kayıtlı onayla kapatılabilir (REDDET F1.5, BİLGİ gereksiz) */
export function isF1Acknowledgeable(code: string): boolean {
  return f1PolicyClassOf(code) === "warn";
}

export interface F1PolicyFinding {
  code: F1PolicyCode;
  class: F1PolicyClass;
  detail_tr: string;
}

/** Çağıranın topladığı ham bulgular (sharp/magic/ölçü sonuçları) */
export interface F1FileFindings {
  mime?: string | null;
  size_bytes: number;
  /** raster/svg: sharp parse etti mi · pdf: %PDF imzası tuttu mu */
  parsed: boolean;
  width_px?: number | null;
  height_px?: number | null;
  /** false → derin doğrulama yapılmadı (PDF v1 yolu): BİLGİLENDİR */
  deep_validation_available?: boolean;
  /** ölçüldüyse etkin DPI (yoksa DPI uyarısı üretilmez) */
  effective_dpi?: number | null;
  safe_area_risk?: boolean;
  font_risk?: boolean;
  /** false → CMYK/ICC/PDF-X doğrulanamadı: üç BİLGİ notu (sessiz yokluk yasak) */
  color_profile_verifiable?: boolean;
}

export interface F1PolicyVerdict {
  decision: "accept" | "reject";
  type: F1UploadType | null;
  rejects: F1PolicyFinding[];
  warnings: F1PolicyFinding[];
  infos: F1PolicyFinding[];
}

const finding = (code: F1PolicyCode, detail_tr: string): F1PolicyFinding => ({
  code,
  class: F1_POLICY_CODES[code],
  detail_tr,
});

/**
 * Dosya bulgularını politikaya çevirir. SAF: girdi değişmez.
 * REDDET varsa decision="reject" — uyarı/bilgi notları yine de döner
 * (audit satırı zenginleşsin; "neden" listesi görünür olsun — F1.1).
 */
export function classifyF1File(findings: F1FileFindings): F1PolicyVerdict {
  const rejects: F1PolicyFinding[] = [];
  const warnings: F1PolicyFinding[] = [];
  const infos: F1PolicyFinding[] = [];

  const type = f1UploadTypeFromMime(findings.mime);
  if (!type) {
    rejects.push(
      finding(
        "desteklenmeyen_tur",
        `Desteklenmeyen dosya türü: ${findings.mime ?? "bilinmiyor"} (kabul: PNG, JPG, SVG, PDF)`
      )
    );
  }

  if (findings.size_bytes <= 0) {
    rejects.push(finding("bozuk_dosya", "Dosya boş (0 bayt)"));
  } else if (!findings.parsed) {
    rejects.push(finding("bozuk_dosya", "Dosya açılamadı / okunamadı"));
  }

  /* Ölçü/yön kuralı: PDF v1'de ölçü OKUNMAZ (yalnız-sakla yolu) → bu kural
     PDF'e uygulanmaz; yerine derin-doğrulama BİLGİ notu üretilir. */
  if (type && type !== "pdf" && findings.parsed) {
    const w = findings.width_px ?? 0;
    const h = findings.height_px ?? 0;
    if (w <= 0 || h <= 0) {
      rejects.push(finding("olcu_belirlenemedi", "Dosyanın ölçü/yön bilgisi belirlenemedi"));
    }
  }

  if (findings.deep_validation_available === false) {
    infos.push(
      finding("pdf_derin_dogrulama_yok", "PDF içeriği derin doğrulanmadı (v1: yalnız saklanır)")
    );
  }

  if (findings.color_profile_verifiable === false) {
    infos.push(finding("cmyk_dogrulanamadi", "CMYK doğrulanamadı"));
    infos.push(finding("icc_dogrulanamadi", "ICC profili doğrulanamadı"));
    infos.push(finding("pdfx_dogrulanamadi", "PDF/X uygunluğu doğrulanamadı"));
  }

  const dpi = findings.effective_dpi;
  if (typeof dpi === "number" && Number.isFinite(dpi) && dpi < F1_DPI_THRESHOLDS.yellow) {
    const level = dpi < F1_DPI_THRESHOLDS.red ? "kritik" : "düşük";
    warnings.push(finding("dusuk_dpi", `Etkin çözünürlük ${Math.round(dpi)} DPI (${level})`));
  }
  if (findings.safe_area_risk === true) {
    warnings.push(finding("guvenli_alan_riski", "İçerik güvenli alan sınırına taşıyor olabilir"));
  }
  if (findings.font_risk === true) {
    warnings.push(finding("font_riski", "Font gömme/kapsam riski"));
  }

  return { decision: rejects.length > 0 ? "reject" : "accept", type, rejects, warnings, infos };
}
