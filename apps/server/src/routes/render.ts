/* T3 PART-B adım-1 — Render Contract v1 kapısı: POST /render (B→C makine kanalı;
   styva FLYER M7 buradan çağırır). Kısıtlar (paket): additive-only · mevcut
   davranışa SIFIR dokunuş (PrintPage/exports/MockupPage el değmez — getBrowser
   yalnız IMPORT edilir) · contract dışı yüzey yok.

   Kapı varsayılan KAPALI (local-first güvenli duruş): RENDER_CONTRACT_SECRET
   env'i yoksa 503 contract_disabled — görünür, sessiz değil. STATELESS şim:
   export_records'a YAZMAZ (versiyon sayacı/geçmiş atölye UI kanalınındır;
   provenance = yanıt meta'sı + dosya adı). Çıktı ayrı klasörde
   (data/exports/_contract/<slug>/) — atölye export adlandırmasıyla çakışmaz. */

import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { nowISO } from "@tezgah/shared";
import { db } from "../db.js";
import { EXPORTS_DIR, ROOT_DIR } from "../paths.js";
import { disaAcikKanallar, productionChannelsOf } from "@tezgah/templates/identity";
import { documentWithClient, rowToDocument } from "./documents.js";
import { getBrowser } from "./exports.js";
import {
  RENDER_CONTRACT_V,
  RenderRequestV1Schema,
  verifyRender,
} from "../render-contract.js";

const PRINT_BASE = process.env.PRINT_BASE ?? "http://localhost:5173";

export function renderRoutes(app: FastifyInstance): void {
  app.post("/render", async (req, reply) => {
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
    if (!found) return reply.code(404).send({ error: "document_not_found" });
    const client = db.prepare("SELECT slug FROM clients WHERE id = ?").get(found.clientId) as
      | { slug: string }
      | undefined;
    if (!client) return reply.code(404).send({ error: "client_not_found" });
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
      return reply.code(400).send({
        error: "profile_not_registered",
        detail: { template_id: docDTO.template_id },
      });
    }
    if (!disaAcik.includes(body.variant)) {
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
        sha256: crypto.createHash("sha256").update(pdf).digest("hex"),
        created_at,
      },
    };
  });
}
