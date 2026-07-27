/* PARAM KAPISI — sunucu yazma/icra sınırında params şema doğrulaması
   (journal 2026-07-27-sunucu-params-dogrulamasi).

   NEDEN VAR: PUT /api/documents/:id params'ı REPLACE eder (documents.ts:
   `params_json: JSON.stringify(patch.params)`) — yani sunucu her yazımda
   params'ın TAMAMINI görür ama bugüne dek İÇİNE bakmıyordu
   (DocumentStateSchema.params = z.record(z.unknown())). Bozuk param diske
   giriyor, faturası ICRA anında kesiliyordu: tarayıcıda VitroParamsSchema.parse
   fırlar, ErrorBoundary yok, __PRINT_READY__ hiç atanmaz, Puppeteer 30-45 sn
   timeout bekleyip 500 {error:"internal"} döner (ölçülen bugünkü davranış).
   Bu modül o faturayı yazma sınırına ve icra sınırının EN BAŞINA çeker:
   anında 400 + issues[], Puppeteer'a hiç inilmez.

   NEDEN AYRI MODÜL: routes/* modülleri import anında db/puppeteer yan etkisi
   taşır, birim-test edilemez (material-routing.ts başlığındaki gerekçenin
   aynısı). Buranın tek bağımlılığı kimlik kaydı (@tezgah/templates/identity —
   C-P2: TAM registry react/jsx-runtime taşır, sunucu YALNIZ identity alt-yolunu
   import edebilir) ve @tezgah/shared şemalarıdır. */

import type { ZodSchema } from "zod";
import { GarmentParamsSchema, TabelaParamsSchema, VitroParamsSchema } from "@tezgah/shared";
import { materialTypeOfOrNull } from "@tezgah/templates/identity";

/** template_id → params şeması; şeması olmayan/kayıtsız profil için null.

    EŞLEME MALZEME CİNSİNDEN GİDER, id LİSTESİNDEN DEĞİL: kalıcı olan İLANDIR
    (manifest.type), id listesi değil — yarın ikinci bir vitrofani id'si
    doğduğunda (bugün üç tane var: vitro-bandeau/centre/colonne, hepsi
    type:"cam") kapı onu elle liste güncellenmeden otomatik kapsar. Aynı
    gerekçeyle C-P1 id-sniff'leri ("vitro-*" startsWith) söküp
    materialTypeOfOrNull'a bağlamıştı; bu modül o kararın devamıdır.

    ÖLÇÜLMÜŞ EŞLEME (identity kayıt defteri, bu paket sırasında tsx ile
    fiilen koşulup okundu — MATERIAL_TYPES = menu|flyer|kart|tabela|tekstil|cam):
      "cam"     (vitro-bandeau/centre/colonne) → VitroParamsSchema
      "tabela"  (enseigne-panneau)             → TabelaParamsSchema
      "tekstil" (garment)                      → GarmentParamsSchema

    DİĞERLERİ ŞEMASIZDIR → null → kapı GEÇİRİR:
    - "menu"/"flyer"/"kart": bu ailelerin @tezgah/shared'da params şeması YOK
      (menü params'ı format/kolon gibi serbest alanlar taşır); olmayan şemayı
      uydurmak bu paketin işi değil — kapı yalnız VAR OLAN sözleşmeyi uygular.
    - KAYITSIZ id (materialTypeOfOrNull null: fabrika/generated "kabul-fabrika"
      dahil — identity alt-yolu generated'ı BİLEREK kapsamaz, C-P2 şerhi):
      atölye düşme deseni uygulanır, kapı GEÇİRİR. Emsal exports.ts kanal
      bekçisidir (kayıtsız → null → geçer; operatör sorumludur); render.ts'nin
      null→400 profile_not_registered'ı MAKİNE kanalına özgü bir
      sıkılaştırmadır ve o kapı zaten params kapısından ÖNCE çalışır — burada
      tekrarlamak aynı reddi iki koda bölerdi (asimetri gerekçesi:
      2026-07-26-entegrasyon-siniri-karari; bu modülün kararı:
      2026-07-27-sunucu-params-dogrulamasi). */
export function paramsSemasiOf(templateId: string): ZodSchema | null {
  switch (materialTypeOfOrNull(templateId)) {
    case "cam":
      return VitroParamsSchema;
    case "tabela":
      return TabelaParamsSchema;
    case "tekstil":
      return GarmentParamsSchema;
    default:
      /* menu/flyer/kart + kayıtsız (null) — yukarıdaki şerh: şema yoksa kapı
         geçirir, uydurma şema üretilmez */
      return null;
  }
}

/** Kapı: şema varsa .parse — bozuk params ZodError FIRLATIR, app.ts'in global
    setErrorHandler'ı bunu 400 {error:"validation", issues:[{path,message}]}
    yapar (istemci apiErrorMessage bu biçimi zaten okuyor; route'larda ekstra
    hata gövdesi KURULMAZ, garment.ts:37'nin emsali).

    .parse'ın DÖNÜŞÜ BİLEREK YAZILMAZ/DÖNDÜRÜLMEZ — ham params diske olduğu
    gibi gider. Parse çıktısını yazmak, şemaların .default() zincirleri yüzünden
    default-doldurma normalizasyonu olurdu (ör. boş vitro params'ı diske
    {w_cm:100, h_cm:100, mode:"impression", ...} olarak şişerdi): kullanıcının
    YAZMADIĞI değerler kayda geçer, "şablon varsayılanı değişirse eski belge de
    değişir" davranışı sessizce kırılırdı. KAPI ile DÖNÜŞTÜRÜCÜ ayrı şeylerdir;
    bu işlev yalnız kapıdır (journal 2026-07-27-sunucu-params-dogrulamasi). */
export function paramlariDogrula(templateId: string, params: unknown): void {
  const sema = paramsSemasiOf(templateId);
  if (sema === null) return;
  sema.parse(params);
}
