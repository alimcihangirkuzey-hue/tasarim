/* Sunucu hata gövdesi → OPERATÖRÜN okuyabileceği mesaj (P5 GT bulgusu).

   BULGU: /brief yüklemesinde bozuk dosya reddedildiğinde ekranda yalnız
   `policy_reject` yazıyordu — operatör NEDENİ göremiyordu (bozuk dosya mı,
   desteklenmeyen tür mü?). Aynı kör-nokta durum geçişinde de vardı
   (`transition_blocked`). Kök: istemcinin http yardımcısı gövdeden yalnız
   `error` kodunu okuyup `detail` / `rejects[].detail_tr` alanlarını ATIYORDU.

   Kural: KOD değil GEREKÇE gösterilir; gerekçe yoksa kod son çare olarak kalır
   (sessiz "bir şeyler ters gitti" YASAK — M8/M4 çizgisi). */

export interface ApiErrorBody {
  error?: string;
  code?: string;
  detail?: string;
  message?: string;
  issues?: Array<{ message?: string; path?: string }>;
  rejects?: Array<{ code?: string; detail_tr?: string }>;
  keys?: string[];
}

/** Hata kodu → operatör diliyle başlık (kod tek başına anlam taşımaz) */
const PREFIX: Readonly<Record<string, string>> = {
  policy_reject: "Dosya reddedildi",
  transition_blocked: "Geçiş engellendi",
  unknown_spec_keys: "Tanımsız alan",
  unknown_warning_code: "Bilinmeyen uyarı kodu",
  reject_not_acknowledgeable: "Bu kalem istisnayla kapatılamaz",
  info_not_acknowledgeable: "Bilgilendirme notu onay gerektirmez",
  not_yet_available: "Bu adım henüz açık değil",
  invalid_role: "Geçersiz dosya rolü",
  file_missing: "Dosya seçilmedi",
  brief_not_found: "Brief bulunamadı",
  file_not_found: "Dosya bulunamadı",
  client_not_found: "Müşteri bulunamadı",
  validation: "Geçersiz veri",
};

/**
 * Gövdeden en anlamlı açıklamayı çıkarır. Öncelik:
 * politika gerekçeleri → detail → Zod mesajı → message → tanımsız alan listesi.
 * Başlık (varsa) gerekçenin önüne eklenir: "Dosya reddedildi — Dosya açılamadı".
 */
export function apiErrorMessage(body: unknown, status?: number): string {
  const b = (body ?? {}) as ApiErrorBody;
  const reasons = (b.rejects ?? [])
    .map((r) => r.detail_tr)
    .filter((d): d is string => typeof d === "string" && d.trim() !== "");

  const core =
    (reasons.length > 0 ? reasons.join(" · ") : "") ||
    (typeof b.detail === "string" && b.detail.trim() !== "" ? b.detail : "") ||
    (b.issues ?? []).map((i) => i.message).find((m) => typeof m === "string" && m.trim() !== "") ||
    (typeof b.message === "string" && b.message.trim() !== "" ? b.message : "") ||
    (Array.isArray(b.keys) && b.keys.length > 0 ? b.keys.join(", ") : "") ||
    "";

  const title = b.error ? (PREFIX[b.error] ?? b.error) : "";

  if (title && core) return `${title} — ${core}`;
  if (title) return title;
  if (core) return core;
  return status ? `Sunucu hatası (${status})` : "Sunucu hatası";
}
