/* T3 PART-B adım-1 — Render Contract v1 kapısı: POST /render (B→C makine kanalı;
   styva FLYER M7 buradan çağırır). Kısıtlar (paket): additive-only · mevcut
   davranışa SIFIR dokunuş (PrintPage/exports/MockupPage el değmez — getBrowser
   yalnız IMPORT edilir) · contract dışı yüzey yok.

   Kapı varsayılan KAPALI (local-first güvenli duruş): RENDER_CONTRACT_SECRET
   env'i yoksa 503 contract_disabled — görünür, sessiz değil. STATELESS şim:
   export_records'a YAZMAZ (versiyon sayacı/geçmiş atölye UI kanalınındır;
   provenance = yanıt meta'sı + dosya adı) — ama artık integration_events'e
   YAZAR (ADR-008, migration v14): export_records ÜRETİM TAKSONOMİSİDİR (kind
   sözlüğü + belge bazlı versiyon sayacı; yalnız BAŞARILI çıktının atölye
   geçmişi), integration_events ise DIŞ KANALIN DENETİM KAYDIDIR (9.2/675
   kontrol noktası: hangi sözleşme sürümüyle ne istendi, ne oldu — REDDEDİLEN
   istek de kayda geçer, oysa reddin üretilmiş bir çıktısı yoktur). Çıktı ayrı
   klasörde (data/exports/_contract/<slug>/) — atölye export adlandırmasıyla
   çakışmaz. */

import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { IntegrationEventDTOSchema, nowISO, type IntegrationEventDTO } from "@tezgah/shared";
import { db } from "../db.js";
import { EXPORTS_DIR, ROOT_DIR } from "../paths.js";
import { disaAcikKanallar, productionChannelsOf } from "@tezgah/templates/identity";
import { documentWithClient, rowToDocument } from "./documents.js";
import { getBrowser } from "./exports.js";
import { writeIntegrationEvent } from "../integration-audit.js";
import {
  RENDER_CONTRACT_V,
  RenderRequestV1Schema,
  verifyRender,
} from "../render-contract.js";

const PRINT_BASE = process.env.PRINT_BASE ?? "http://localhost:5173";

/* ——— DENETİM İZİ OKUMA KATMANI (integration_events, migration v14) ———
   exports.ts'in ExportRow/toDTO deseni: satır biçimi TİPLENİR, dışa dönen
   gövde AYRI bir işlevde kurulur (kolon adı ≠ API alanı sürüklenmesi tek
   yerde yakalanır). Tek fark payload_json → payload nesne çözümüdür. */
type IntegrationEventRow = {
  id: string;
  /* channel/outcome DB'de CHECK ile kapalı kümedir (migration v14) ve tabloya
     yazan tek yol writeIntegrationEvent'tir — satır tipi bu iki garantiyi
     yansıtır, dönüşümde `as` cast'i gerekmez (cast, kapalı kümenin sessizce
     `string`e düşmesinin kapısıydı). */
  channel: IntegrationEventDTO["channel"];
  contract_v: number;
  outcome: IntegrationEventDTO["outcome"];
  http_status: number;
  error_code: string | null;
  document_id: string | null;
  client_id: string | null;
  template_id: string | null;
  variant: string | null;
  target: string | null;
  sha256: string | null;
  filepath: string | null;
  payload_json: string;
  created_at: string;
};

/* DTO TEK KAYNAKTAN: `packages/shared` (IntegrationEventDTO + kapalı kümeler
   + IntegrationEventDTOSchema). Uç yerel bir kopya TANIMLAMAZ — kopya, tam da
   bu paketin engellemek istediği "salt-interface zaafı"nı (kapalı kümenin
   `string`e düşmesi) sunucu tarafında yeniden üretirdi. Uca özgü olan yalnız
   DB SATIR biçimidir (aşağıdaki IntegrationEventRow). */
function toIntegrationEventDTO(r: IntegrationEventRow): IntegrationEventDTO {
  /* SAVUNMALI ÇÖZÜM (brief-view.ts parseJson emsali): payload_json'u yazan tek
     yol writeIntegrationEvent'tir ve o JSON.stringify eder — ama bozuk bir tek
     satır, DENETİM İZİNİN TAMAMINI okunmaz kılmamalıdır (izin değeri
     sürekliliğindedir). Bozuk gövde {} olur, satırın geri kalanı görünür. */
  let payload: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(r.payload_json || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      payload = parsed as Record<string, unknown>;
    }
  } catch {
    payload = {};
  }
  /* KAPALI KÜMELER ZOD'DAN GEÇER — `as IntegrationEventDTO` cast'i YETMEZ
     (IntegrationEventDTOSchema başlığındaki kural): DB satırında channel/outcome
     ham `string`tir; cast bunu derleyiciye "kapalı küme" diye yutturur ama
     RUNTIME'da hiçbir şey doğrulamaz. Migration v14 CHECK'i yazma yolunu zaten
     tutuyor; bu parse OKUMA yolunun ikinci katmanıdır — elle INSERT edilmiş ya
     da eski/yabancı bir satır, kapalı kümeyi sessizce genişleterek dışarı
     SIZAMAZ. Şema ihlali fırlar (M8: sessiz düşme yok). */
  return IntegrationEventDTOSchema.parse({
    id: r.id,
    channel: r.channel,
    contract_v: r.contract_v,
    outcome: r.outcome,
    http_status: r.http_status,
    error_code: r.error_code,
    document_id: r.document_id,
    client_id: r.client_id,
    template_id: r.template_id,
    variant: r.variant,
    target: r.target,
    sha256: r.sha256,
    filepath: r.filepath,
    payload,
    created_at: r.created_at,
  });
}

export function renderRoutes(app: FastifyInstance): void {
  app.post("/render", async (req, reply) => {
    /* ——— DENETİM İZİ KURALI (ADR-008): KAYIT İMZA KAPISININ ARKASINDADIR ———
       503 (kapı kapalı) ve 401 (imza tutmuyor) dallarında integration_events'e
       satır YAZILMAZ. Gerekçe iki katlıdır: (i) kapı kapalıyken sözleşme
       YOKTUR — "sözleşme sürümü v1 ile şu istendi" diye kaydedilecek bir olay
       da yoktur, DB'ye hiç dokunulmaz; (ii) imzasız istemcinin satır
       yazdırabilmesi, denetim tablosunu kimliksiz bir GÜRÜLTÜ/DoS yüzeyine
       çevirirdi (tek anonim istek = tek kalıcı satır) — izin değeri, yazanın
       bilinmesindedir. İmza doğrulandıktan SONRA istemci "bilinen taraf"
       sayılır ve HER sonuç kayda geçer: red de, üretim de.
       PİN: bu ekleme KAPI SIRASINI ve YANIT GÖVDELERİNİ değiştirmez —
       render-channel.test.ts'teki 503/401/404/400 kontrat pinleri aynen
       geçerlidir; eklenen tek şey yan-etki kaydıdır. */
    const secret = process.env.RENDER_CONTRACT_SECRET;
    if (!secret) {
      return reply.code(503).send({
        error: "contract_disabled",
        hint: "RENDER_CONTRACT_SECRET tanımlı değil — render kapısı kapalı (varsayılan güvenli duruş).",
      });
    }

    const body = RenderRequestV1Schema.parse(req.body ?? {});
    const sig = req.headers["x-render-signature"];
    if (!verifyRender(body, typeof sig === "string" ? sig : undefined, secret)) {
      return reply.code(401).send({ error: "invalid_signature" });
    }

    const found = documentWithClient(body.doc);
    if (!found) {
      /* document_id NULL — belge YOK: var olmayan satıra FK bağı kurulamaz
         (uydurma id yazmak izi yalanlar). İstenen id payload'da yaşar; denetim
         sorusu tam da budur: "hangi id istendi de bulunamadı". */
      writeIntegrationEvent({
        channel: "render",
        contract_v: RENDER_CONTRACT_V,
        outcome: "reddedildi",
        http_status: 404,
        error_code: "document_not_found",
        document_id: null,
        variant: body.variant,
        target: body.target,
        payload: { istenen_doc: body.doc },
      });
      return reply.code(404).send({ error: "document_not_found" });
    }
    const client = db.prepare("SELECT slug FROM clients WHERE id = ?").get(found.clientId) as
      | { slug: string }
      | undefined;
    if (!client) {
      /* client_id NULL BIRAKILIR: müşteri satırı yok — integration_events.client_id
         FK'sı (clients(id)) sarkan id'yi zaten reddederdi. Kopuk bağ payload'da
         okunur kalır. document_id DOLU: belge VAR, iz belgeye asılır. */
      writeIntegrationEvent({
        channel: "render",
        contract_v: RENDER_CONTRACT_V,
        outcome: "reddedildi",
        http_status: 404,
        error_code: "client_not_found",
        document_id: found.row.id,
        template_id: found.row.template_id,
        variant: body.variant,
        target: body.target,
        payload: { kopuk_client_id: found.clientId },
      });
      return reply.code(404).send({ error: "client_not_found" });
    }
    const docDTO = rowToDocument(found.row, found.clientId);

    /* KANAL BEKÇİSİ — DIŞ KANAL DARALTMASI (Canonical 7.2/507, 9.5/699, 114;
       journal 2026-07-26-entegrasyon-siniri-karari; taban: 2026-07-26-render-
       kanal-bekcisi). exports.ts'teki channel_not_declared kapısının MAKİNE
       eşi, iki noktada sıkılaştırıldı:

       (i) KAYITSIZ PROFİL REDDİ. Önceki hâl `kanallar === null → GEÇER`
       diyordu; o "fabrika düşme deseni" ATÖLYE ucu için yazılmıştı, MAKİNE
       KANALI için değil. İmzalı DIŞ istemci, ilan denetiminden geçmemiş bir
       profile üretim yaptıramaz — kayıtsız id artık 400 profile_not_registered
       (fail-loud; sessiz "üretiliyor" yok). ATÖLYE/MAKİNE ASİMETRİSİ BİLİNÇLİ
       ve kayıtlı: UI kanadı fabrika belgesini export etmeye DEVAM EDER
       (exports.ts'in null→geçer davranışı DEĞİŞMEDİ — atölyede operatör
       sorumludur; asimetri exports-channel.test.ts'te ÇİVİLİDİR), dış dünya
       YALNIZ ilanlı profillere erişir (9.5/699 kontrol noktaları arasında
       "profil kullanımı" sayılır; 114 "entegrasyon yalnızca sürümlü
       sözleşmelerle" — sözleşmenin öznesi ilanlı profildir).

       (ii) disa_acik ALANI (M8 dürüstlük). Eski yanıt garment reddinde
       `declared:["png","broderie"]` diyordu; ikisi de DIŞ kanal DEĞİL — dış
       istemciye YANLIŞ sınır bildiriliyordu ("png isteseydim geçerdi" yanılgısı,
       oysa contract enum'u yalnız print|preview taşır). declared ham profil
       ilanı olarak KALIR (tanı değeri: profil ne ilan ediyor), disa_acik ise
       istemcinin GERÇEKTEN isteyebileceği kesişimi bildirir — additive alan.
       ŞERH: bugün ulaşılabilir tek değeri boş dizidir (contract enum'u
       print|preview, DIS_KANALLAR ile eş küme → variant her zaman dış
       kanaldır; dolayısıyla bu dala yalnız hiçbir dış kanal açmayan profil
       düşer: garment). Alan yine de bilgi taşır — "yanlış kanal istedin"
       ile "bu profil dışa kapalı" ayrımını söyler; enum bir gün genişlerse
       (decoupe/png) ayrışır.

       (iii) SÜRÜM DEĞERLENDİRMESİ — DÜRÜST AD: disa_acik alanı additive'dir,
       ama profile_not_registered ADDITIVE DEĞİL, DAVRANIŞ DARALTMASIDIR:
       dün 201 dönen bir istek (kayıtsız profil) bugün 400 alır. İstek şeması
       ve kanonik imza dizesi değişmediği için istemci kodu kırılmaz ve
       RENDER_CONTRACT_V=1 korunur; daralan şey başarı kümesidir — bilinçli
       GÜVENLİK sıkılaştırması (ilan denetimsiz üretim kapatıldı). MULTI_REPO
       "kırıcı değişiklik = MAJOR" kuralı açısından çağıran tarafa BİLDİRİM
       borcu doğar (TODO şerhi); styva FLYER M7 çağıranı ilanlı flyer profili
       üzerinden geçtiği için bugün etkilenmez.

       (iv) SIRA: imza/belge/müşteri kapılarının ARKASINDA (kayıtsız profil
       bilgisi imzasız istemciye sızmaz), getBrowser'ın ÖNÜNDE → puppeteer'siz
       inject-testli. */
    /* İki sorgu TEK null kapısında toplanır: disaAcikKanallar zaten
       productionChannelsOf üzerinden türer (biri null ise diğeri de null) —
       ayrı bir `?? []` yedeği ULAŞILAMAZ ölü dal olurdu ve okuyucuya
       "burada null olabilir" diye yanlış sinyal verirdi (ölü sözleşme
       yasağının kod hâli). declared ham ilan, disa_acik kesişim. */
    const ilan = productionChannelsOf(docDTO.template_id);
    const disaAcik = disaAcikKanallar(docDTO.template_id);
    if (ilan === null || disaAcik === null) {
      /* template_id DOLU: reddin ÖZNESİ profildir — "hangi kayıtsız profile
         üretim istendi" sorusu izden okunabilmelidir (ilan denetimi borcunun
         kanıtı da budur). */
      writeIntegrationEvent({
        channel: "render",
        contract_v: RENDER_CONTRACT_V,
        outcome: "reddedildi",
        http_status: 400,
        error_code: "profile_not_registered",
        document_id: found.row.id,
        client_id: found.clientId,
        template_id: docDTO.template_id,
        variant: body.variant,
        target: body.target,
      });
      return reply.code(400).send({
        error: "profile_not_registered",
        detail: { template_id: docDTO.template_id },
      });
    }
    if (!disaAcik.includes(body.variant)) {
      /* declared + disa_acik payload'a GİRER: yanıt gövdesinde istemciye ne
         bildirdiysek denetim izinde de o durur (M8 dürüstlüğünün kalıcı
         yarısı — ilan bir gün değişirse "o gün ne demiştik" okunabilir). */
      writeIntegrationEvent({
        channel: "render",
        contract_v: RENDER_CONTRACT_V,
        outcome: "reddedildi",
        http_status: 400,
        error_code: "channel_not_declared",
        document_id: found.row.id,
        client_id: found.clientId,
        template_id: docDTO.template_id,
        variant: body.variant,
        target: body.target,
        payload: { declared: ilan, disa_acik: disaAcik },
      });
      return reply.code(400).send({
        error: "channel_not_declared",
        detail: {
          requested: [body.variant],
          declared: ilan,
          disa_acik: disaAcik,
        },
      });
    }

    /* Engine iç çağrısı: mevcut /print sayfası (M3 tek render kaynağı) —
       exports.ts rotasıyla aynı desen, exports.ts DEĞİŞTİRİLMEDEN. */
    const browser = await getBrowser();
    const page = await browser.newPage();
    let pdf: Uint8Array;
    let size: { w: number; h: number; pages: number };
    try {
      await page.goto(`${PRINT_BASE}/print/${body.doc}?variant=${body.variant}`, {
        waitUntil: "networkidle0",
        timeout: 60_000,
      });
      await page.waitForFunction("window.__PRINT_READY__ === true", { timeout: 30_000 });
      size = (await page.evaluate("window.__PAGE_SIZE__")) as { w: number; h: number; pages: number };
      pdf = await page.pdf({
        width: `${size.w}mm`,
        height: `${size.h}mm`,
        printBackground: true,
        pageRanges: `1-${size.pages}`,
      });
    } finally {
      await page.close();
    }

    const dir = path.join(EXPORTS_DIR, "_contract", client.slug);
    await fs.mkdir(dir, { recursive: true });
    const created_at = nowISO();
    const abs = path.join(dir, `render_v${RENDER_CONTRACT_V}_${body.doc}_${body.variant}_${Date.parse(created_at)}.pdf`);
    await fs.writeFile(abs, pdf);
    const file = path.relative(ROOT_DIR, abs).split(path.sep).join("/");
    /* sha256 TEK KEZ hesaplanır: aynı değer hem yanıt meta'sına hem denetim
       izine gider — iki ayrı hesap iki ayrı gerçek riski taşırdı. */
    const sha256 = crypto.createHash("sha256").update(pdf).digest("hex");

    /* BAŞARI KAYDI — dosya diske YAZILDIKTAN SONRA (kayıt, var olmayan bir
       çıktıyı iddia etmez). filepath GÖRELİ yol: export_records.filepath ile
       aynı kök (ROOT_DIR) — iki tabloyu yan yana okuyan denetçi aynı adres
       uzayında kalır. */
    writeIntegrationEvent({
      channel: "render",
      contract_v: RENDER_CONTRACT_V,
      outcome: "uretildi",
      http_status: 201,
      document_id: body.doc,
      client_id: found.clientId,
      template_id: docDTO.template_id,
      variant: body.variant,
      target: body.target,
      sha256,
      filepath: file,
      payload: {
        pages: size.pages,
        page_w_mm: size.w,
        page_h_mm: size.h,
        cd_version: docDTO.cd_version,
        watermark: body.watermark,
        /* v1 şimi filigran uygulamaz — yanıt meta'sındaki GÖRÜNÜR bildirimin
           kalıcı eşi (istendi mi / uygulandı mı ayrımı izde de durur). */
        watermark_applied: false,
      },
    });

    reply.code(201);
    return {
      file,
      meta: {
        contract_v: RENDER_CONTRACT_V,
        /* CD1-2 (P1): belgenin Creative Document sürümü — ADDITIVE meta alanı;
           istek şeması ve kanonik imza dizesi DEĞİŞMEDİ → RENDER_CONTRACT_V=1 korunur */
        cd_version: docDTO.cd_version,
        document_id: body.doc,
        template_id: docDTO.template_id,
        variant: body.variant,
        target: body.target,
        watermark: body.watermark,
        /* v1 şimi filigran uygulamaz — GÖRÜNÜR bildirim (M8), sessiz düşme yok */
        watermark_applied: false,
        ...(body.watermark ? { note: "watermark v1 şiminde uygulanmaz (engine'de taslak-filigran yok; ADR-005)" } : {}),
        pages: size.pages,
        page_w_mm: size.w,
        page_h_mm: size.h,
        sha256,
        created_at,
      },
    };
  });

  /* DENETİM İZİ OKUMA UCU (ADR-008) — OKUNAMAYAN İZ DENETLENEMEZ.
     Yazılıp hiç okunmayan tablo denetim izi değil, ölü depodur: bu uç olmadan
     "dış kanaldan bu belgeye ne yapıldı" sorusunun tek yanıtı DB dosyasını
     elle açmaktır — local-first bir araçta bile bu, izin kendisini geçersiz
     kılar (denetlenebilirlik = okunabilirlik).
     EMSAL DEĞİL ŞERHİ: intake_records bugün YALNIZ yazılır (POST /api/intake
     var, okuma ucu YOK). Bu bir DESEN değil, kayıtlı bir KUSURDUR; yeni tablo
     onu tekrarlamaz — "orada da yok" bir gerekçe olamaz.
     Sıra created_at DESC: denetim önce "az önce ne oldu" diye sorar. Tavan 100
     — sınırsız gövde yerine görünür/sabit bir kesim (sayfalama borcu doğarsa
     additive açılır; sessiz kırpma değil, belgeli tavan). */
  app.get<{ Params: { id: string } }>("/api/documents/:id/integration-events", async (req) => {
    const rows = db
      .prepare(
        `SELECT * FROM integration_events WHERE document_id = ?
         ORDER BY created_at DESC LIMIT 100`
      )
      .all(req.params.id) as IntegrationEventRow[];
    return rows.map(toIntegrationEventDTO);
  });
}
