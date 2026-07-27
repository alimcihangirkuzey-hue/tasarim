/* MAKİNE KANALI DENETİM İZİ — integration_events'e TEK YAZMA KAPISI (migration
   v14). Kanonik: 7.4/524 (bağlayıcı "denetim kaydı" bildirir) · 9.2/673
   ("entegrasyon hataları") · 9.1/665 ("denetim izi değişmezdir") · 5.6/410
   ("dış servise gönderilen her veri kayıt altına alınır").

   APPEND-ONLY SÖZLEŞMESİ (brief_audit emsali — routes/brief-files.ts:75-96
   writeAudit): bu modül integration_events'e YALNIZ INSERT yapar. Tabloya
   UPDATE ya da DELETE yazan bir yol bu repoda BULUNMAZ ve bu, brief_audit'te
   olduğu gibi repo-taramalı testle korunur. Düzeltme "satırı güncelle" değil
   "YENİ satır" ile yapılır — tarihçe yerinde değiştirilmez (9.1/665).

   AYRI KAYIT SINIFI: burası export_records DEĞİLDİR. /render'ın STATELESS
   kararı (routes/render.ts başlığı) BOZULMAZ — atölye sürüm sayacı ve atölye
   export listesi bu satırları hiç görmez (gerekçe: migrations.ts v14 (a)).

   ÇAĞIRAN KİMLİĞİ: alan YOK — bugün tek paylaşılan secret var, gerçek caller
   kimliği yok; sahte/hep-NULL aktör alanı eklenmedi (journal.ts:135-141 dersi,
   gerekçe: migrations.ts v14 (d)). */

import { newId, nowISO } from "@tezgah/shared";
import { db } from "./db.js";

export interface IntegrationEventInput {
  /** Kapalı küme (DB CHECK + Zod: IntegrationChannelSchema). Bugün tek kanal. */
  channel: "render";
  /** Kanalın sözleşme sürümü — ör. RENDER_CONTRACT_V */
  contract_v: number;
  outcome: "uretildi" | "reddedildi";
  /** Dış istemciye DÖNEN durum — izin parçası, sonradan tahmin edilmez */
  http_status: number;
  /** reddedildi'de ZORUNLU, uretildi'de NULL (DB CHECK) */
  error_code?: string | null;
  document_id?: string | null;
  client_id?: string | null;
  /** SNAPSHOT değerler: FK kopsa bile "ne istendi" cevaplanabilir kalır */
  template_id?: string | null;
  variant?: string | null;
  target?: string | null;
  /** uretildi'de ZORUNLU (DB CHECK) — üretilen dosyanın parmak izi */
  sha256?: string | null;
  /** uretildi'de ZORUNLU (DB CHECK) — ROOT_DIR'e göreli yol */
  filepath?: string | null;
  payload?: Record<string, unknown>;
}

/** integration_events'e TEK yazma kapısı — yalnız INSERT (append-only).

    SENKRON ve YUTMAZ: DB hatası (ör. outcome↔error_code CHECK ihlali) olduğu
    gibi FIRLAR ki çağıran görsün. try/catch ile sessizce yutmak, denetim izini
    "bazen yazılan" bir şeye çevirirdi — M8'in sessiz düşme yasağı tam burada
    geçerlidir: iz yazılamıyorsa bu bir arızadır, gizlenmez.

    Dönüş VOID (ortak sözleşme): brief_audit'in writeAudit'i id döndürür çünkü
    çağıran o id'yi yanıtta taşır; burada satır id'si (`ie_...`) dış istemciye
    ait bir bilgi değildir — iz sunucuda okunur (B: GET .../integration-events).
    Kullanılmayan dönüş değeri, ölü sözleşme olurdu. */
export function writeIntegrationEvent(e: IntegrationEventInput): void {
  const id = newId("ie");
  /* Prepared statement BİLEREK modül düzeyinde tutulmaz: `db` testlerde
     setDatabase ile (:memory: harness'ı) yeniden atanabiliyor — modül yüklenme
     anında hazırlanan bir statement ESKİ bağlantıya çivilenir ve testte
     "no such table" ya da yanlış veritabanına yazma doğururdu. Her çağrıda
     db.prepare (ESM canlı bağ, db.ts:24-27 sözleşmesi; brief-files.ts
     writeAudit deseni birebir). */
  db.prepare(
    `INSERT INTO integration_events (id, channel, contract_v, outcome, http_status,
       error_code, document_id, client_id, template_id, variant, target,
       sha256, filepath, payload_json, created_at)
     VALUES (@id, @channel, @contract_v, @outcome, @http_status,
       @error_code, @document_id, @client_id, @template_id, @variant, @target,
       @sha256, @filepath, @payload_json, @created_at)`
  ).run({
    id,
    channel: e.channel,
    contract_v: e.contract_v,
    outcome: e.outcome,
    http_status: e.http_status,
    error_code: e.error_code ?? null,
    document_id: e.document_id ?? null,
    client_id: e.client_id ?? null,
    template_id: e.template_id ?? null,
    variant: e.variant ?? null,
    target: e.target ?? null,
    sha256: e.sha256 ?? null,
    filepath: e.filepath ?? null,
    payload_json: JSON.stringify(e.payload ?? {}),
    created_at: nowISO(),
  });
}
