/* Cockpit modül fazı 0 — YETKİ KONTROL NOKTASI (Canonical 11.7).

   11.7: rol modeli UYGULANMAZ, yeri şimdiden ayrılır. Bu dosya o "yer"dir:
   appendEvent'in İLK adımı buraya sorar, başka hiçbir yol journal'a yazamaz.
   Rol→olay matrisi doldurulduğunda tek dosya değişir, çağıran taraf değişmez.

   FAZ 0'DA UYGULANAN ÜÇ KURAL — hepsi zaten verilmiş kararların türevidir,
   yeni politika İCAT EDİLMEZ:
   1) Aktör iyi-biçimli olmak zorundadır (kind/id/role). 11.7'nin "aktör ASLA
      null" hükmü şema tarafında tiple, burada ÇALIŞMA ANINDA korunur: CLI ve
      HTTP çağıranları buraya tipsiz JSON ile gelir, tip onları denetlemez.
   2) Olay türü kapalı sözlükten olmalıdır. brief_audit'in kısıtsız TEXT
      event_type kolonu tipoyu geçerli olay gibi kabul ediyordu; tekrarlanmaz.
   3) Ajan `urun-sahibi` rolüyle yazamaz. 11.6/3 insan turu gereken kapıyı
      ajanın imzalamasını yasaklar; ürün sahibinin yetkisini ajanın üstlenmesi
      aynı yasağın daha geniş hâlidir. Kapı imzası ayrıca checkGateActor ile
      payload düzeyinde denetlenir — bu kural onun zarf düzeyindeki eşi.

   BİLİNÇLİ OLARAK YOK: "hangi rol hangi olayı yazar" matrisi. 11.7 rol
   modelini ertelediği için burada uydurulmuş bir matris, kaydı gerçekte
   olmayan bir yetki düzeninin var olduğuna inandırırdı. */

import {
  JOURNAL_ACTOR_ROLES,
  JOURNAL_EVENT_TYPES,
  type JournalActor,
  type JournalEventType,
} from "@tezgah/shared";

type Decision = { allow: boolean; reason: string | null };

const deny = (reason: string): Decision => ({ allow: false, reason });
const ALLOW: Decision = { allow: true, reason: null };

/**
 * Journal'a yazma yetkisi. appendEvent dışında çağrılmaz; tek kontrol noktası
 * olması, yetkinin "bazı yollarda" atlanmasını yapısal olarak imkânsız kılar.
 */
export function authorizeJournalWrite(
  actor: JournalActor,
  eventType: JournalEventType
): Decision {
  /* Tipler çalışma anında yoktur: CLI/HTTP çağıranı buraya ham nesne getirir */
  if (typeof actor !== "object" || actor === null) {
    return deny("actor ZORUNLU — kim yaptığı yazılmayan olay kayda giremez (11.7)");
  }
  if (actor.kind !== "human" && actor.kind !== "agent") {
    return deny(`actor.kind human|agent olmalı: ${JSON.stringify(actor.kind)}`);
  }
  if (typeof actor.id !== "string" || actor.id.trim().length === 0) {
    return deny("actor.id boş olamaz — geriye dönük 'kim yaptı' sorusu cevapsız kalır");
  }
  if (!JOURNAL_ACTOR_ROLES.includes(actor.role)) {
    return deny(`actor.role bilinmiyor: ${JSON.stringify(actor.role)}`);
  }
  if (!JOURNAL_EVENT_TYPES.includes(eventType)) {
    return deny(`bilinmeyen olay türü: ${JSON.stringify(eventType)}`);
  }
  if (actor.kind === "agent" && actor.role === "urun-sahibi") {
    return deny("ajan 'urun-sahibi' rolüyle yazamaz — ürün sahibinin yetkisi devredilmez (11.6/3)");
  }
  return ALLOW;
}
