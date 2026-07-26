/* Kimlik-yalnız alt-yol (C-P2; C-P1 backlog, TODO.md) — @tezgah/templates'in
   "./identity" giriş noktası. Yalnız manifest.ts modüllerini import eder;
   HİÇBİR index.tsx/Template.tsx'e (dolayısıyla react/jsx-runtime'a) dokunmaz.
   Sunucu bugün materyal türünden BAŞKA hiçbir şey istemiyor (routes/vector.ts,
   surfaces.ts — bkz. apps/server/src/material-routing.ts); bu yüzden yüzey
   yalnız o ihtiyacı karşılar (materialTypeOfOrNull), tam sorgu API'sini
   (materialTypeOf/listTemplatesByType/registeredMaterialTypes) TEKRARLAMAZ —
   ihtiyaç doğarsa eklenir (YAGNI; genişletmek her zaman additive'dir).

   TEK KAYNAK: aşağıdaki manifest'ler ana kayıt defterinin (../index.ts)
   AYNI manifest.ts dosyalarından gelir — ESM modül önbelleği aynı nesne
   referansını verir (index.test.ts "referans-eşitliği" testiyle kanıtlı);
   iki kayıt defteri arasında ayrı bir senkron invaryantı YAZILMAZ, gerek yok.

   KAPSAM SINIRI (bilinçli, journal'da kayıtlı): fabrika üretimi (generated/)
   BURADA YOK. Fabrika HEP type:"menu" beyan eder (C-P0 karar C-B-1); bu iki
   yönlendirme yardımcısı zaten "menu" türünü null'a çözüyor — kayıtlı/kayıtsız
   fark etmez (bkz. apps/server/src/material-routing.test.ts altın eşdeğerlik).
   Bu varsayım index.test.ts'teki YÜKSEK SESLİ nöbetçiyle kilitlidir: fabrika
   emit'i bir gün "menu" dışı tür yayarsa (ürün sahibi yetkisi ister, C-B-1
   emsali) o test PATLAR — sessizce eskimez. */

import { birlestirVeDogrula } from "../registry-core.js";
import type { MaterialType, TemplateManifest } from "../types.js";

/* Şiddet katmanı re-export'u (blocker-enforcement paketi): severity.ts yalnız
   TYPE-ONLY import taşır (silinir) — alt-yolun react'sız grafiği bozulmaz
   (esbuild metafile kanıtı paket kapanışında yeniden ölçüldü). Sunucunun
   export backstop'u isBlockerType + severityOverridesOf'u buradan okur. */
export { isBlockerType, severityOf, blockersOf, WARNING_SEVERITIES } from "../engine/severity.js";
export type { SeverityOverrides, WarningSeverity } from "../engine/severity.js";

/* Üretim kanalı katmanı (7.2/8.5): sunucu uçları kanal ilanını ve SVG tür
   önceliğini buradan okur — channels.ts saf/react'sız (type-only import). */
export { svgKindOf, exportRouteOf, kanalNitelikleriOf, KANAL_NITELIKLERI } from "../engine/channels.js";
export type { KanalNitelikBildirimi } from "../engine/channels.js";
export { PRODUCTION_CHANNELS } from "../types.js";
export type { ProductionChannel } from "../types.js";

/* Üretim substratı katmanı (7.2/501 malzeme yarısı; 4.5/8.5 teknik–malzeme
   uyumu): sözlük ve teknik–substrat bağı types.ts'ten aynen geçer — type-only
   olmayan iki sabit de saf veridir, alt-yolun react'sız grafiği bozulmaz. */
export { PRODUCTION_SUBSTRATES, SUBSTRAT_TEKNIKLERI } from "../types.js";
export type { ProductionSubstrate } from "../types.js";

import type { SeverityOverrides } from "../engine/severity.js";
import type { ProductionChannel, ProductionSubstrate } from "../types.js";

import { manifest as menuGridCellsManifest } from "../menu-grid-cells/manifest.js";
import { manifest as menuListePremiumManifest } from "../menu-liste-premium/manifest.js";
import { manifest as menuTrifoldManifest } from "../menu-trifold/manifest.js";
import { manifest as flyerManifest } from "../flyer/manifest.js";
import { manifest as carteFideliteManifest } from "../carte-fidelite/manifest.js";
import {
  VITRO_BANDEAU_MANIFEST,
  VITRO_CENTRE_MANIFEST,
  VITRO_COLONNE_MANIFEST,
} from "../vitrophanie/manifest.js";
import { manifest as enseigneManifest } from "../enseigne/manifest.js";
import { manifest as garmentManifest } from "../garment/manifest.js";

const EL_YAZIMI: readonly TemplateManifest[] = [
  menuGridCellsManifest,
  menuListePremiumManifest,
  menuTrifoldManifest,
  flyerManifest,
  carteFideliteManifest,
  VITRO_BANDEAU_MANIFEST,
  VITRO_CENTRE_MANIFEST,
  VITRO_COLONNE_MANIFEST,
  enseigneManifest,
  garmentManifest,
];

/** Kimlik-yalnız kayıt defteri — generated/ BİLEREK yok (yukarıdaki kapsam notu) */
export const MANIFESTS: Record<string, TemplateManifest> = birlestirVeDogrula(
  {},
  EL_YAZIMI,
  (m) => m
);

/** Kayıtsız id için null döner, FIRLATMAZ — ana registry'deki materialTypeOfOrNull
    ile aynı sözleşme (Object.hasOwn: prototip zinciri kimlik değildir). */
export function materialTypeOfOrNull(id: string): MaterialType | null {
  return Object.hasOwn(MANIFESTS, id) ? MANIFESTS[id].type : null;
}

/** Profil şiddet katmanı sorgusu (4.5) — sunucu backstop'u belge şablonunun
    override tablosunu buradan okur. Kayıtsız id (fabrika/generated dahil —
    yukarıdaki kapsam sınırı) undefined döner: çekirdek sözlük geçerli kalır. */
export function severityOverridesOf(id: string): SeverityOverrides | undefined {
  return Object.hasOwn(MANIFESTS, id) ? MANIFESTS[id].severity_overrides : undefined;
}

/** Üretim kanalı ilanı sorgusu (7.2/8.5) — uçların bekçileri buradan okur.
    Kayıtsız id (fabrika/generated ve süreç sonrası taze kayıt) null döner:
    bekçiler null'da GEÇİRİR (bugünkü düşme davranışı korunur — fabrika
    belgeleri print/preview üretmeye devam eder; kayıtlı sınır, journal). */
export function productionChannelsOf(id: string): readonly ProductionChannel[] | null {
  return Object.hasOwn(MANIFESTS, id) ? MANIFESTS[id].production_channels : null;
}

/** Üretim substratı ilanı sorgusu (7.2/501 malzeme yarısı; 4.5/8.5 teknik–
    malzeme uyumu) — şablonun fiziksel taşıyıcısı. Kayıtsız id (fabrika/
    generated ve süreç sonrası taze kayıt) null döner, FIRLATMAZ —
    productionChannelsOf ile aynı sözleşme (Object.hasOwn: prototip zinciri
    kimlik değildir). */
export function productionSubstrateOf(id: string): ProductionSubstrate | null {
  return Object.hasOwn(MANIFESTS, id) ? MANIFESTS[id].production_substrate : null;
}

/* ── SİPARİŞ→BELGE KÖPRÜSÜ (7.2/4.5; journal 2026-07-26-siparis-belge-koprusu)
   Sipariş katmanının ürün türü sözlüğü (ProductType) ile profil kimliği
   (C-P0 MaterialType + kayıt defteri) arasındaki bağ. Önceden WEB-YEREL iki
   tür-koşulluydu (ProjectsPanel.DESIGNABLE + paramsFromItem) ve HİÇBİR
   tutarlılık denetimi yoktu: köprü yanlış aileyi gösterse test kırılmazdı.
   Artık İLAN burada yaşar ve modül yüklenirken doğrulanır (fail-loud). */

import type { OrderItemLike, ProductType } from "@tezgah/shared";

/** Ürün türü → beklenen MATERYAL (kimlik bağı). null = tasarlanamaz (diger). */
export const SIPARIS_MATERYALI: Record<ProductType, MaterialType | null> = {
  menu: "menu",
  trifold: "menu",
  flyer: "flyer",
  fidelite: "kart",
  vitrophanie: "cam",
  tabela: "tabela",
  tisort: "tekstil",
  onluk: "tekstil",
  diger: null,
};

/** Ürün türü → şablon SEÇENEKLERİ: 0 = tasarlanamaz (UI uyarır), 1 = doğrudan,
    ≥2 = kullanıcı seçer (bugün yalnız menu: grid|liste — eski `""` sihirli
    değerinin açık hâli). Varsayılan aile temsilcileri (vitro-centre,
    enseigne-panneau) ürün kararı olarak AYNEN korunur. */
export const SIPARIS_SABLONLARI: Record<ProductType, readonly string[]> = {
  menu: ["menu-grid-cells", "menu-liste-premium"],
  trifold: ["menu-trifold"],
  flyer: ["flyer"],
  fidelite: ["carte-fidelite"],
  vitrophanie: ["vitro-centre"],
  tabela: ["enseigne-panneau"],
  tisort: ["garment"],
  onluk: ["garment"],
  diger: [],
};

/** Köprü tutarlılığı: her seçenek KAYITLI olmalı ve materyali türün ilanıyla
    EŞLEŞMELİ; tasarlanamaz tür seçenek taşıyamaz. Modül yüklemede gerçek
    tablolarla çalışır — bozuk köprü uygulamayı ayağa kaldırmaz (testler red
    yollarını sahte tablolarla İCRA eder). */
export function dogrulaSiparisKoprusu(
  sablonlar: Record<ProductType, readonly string[]>,
  materyaller: Record<ProductType, MaterialType | null>
): void {
  for (const [tur, secenekler] of Object.entries(sablonlar) as Array<
    [ProductType, readonly string[]]
  >) {
    const beklenen = materyaller[tur];
    if (beklenen === null && secenekler.length > 0) {
      throw new Error(`Sipariş köprüsü "${tur}": tasarlanamaz tür şablon seçeneği taşıyamaz`);
    }
    for (const id of secenekler) {
      const gercek = materialTypeOfOrNull(id);
      if (gercek === null) {
        throw new Error(`Sipariş köprüsü "${tur}": şablon "${id}" kayıt defterinde yok`);
      }
      if (gercek !== beklenen) {
        throw new Error(
          `Sipariş köprüsü "${tur}": şablon "${id}" "${gercek}" materyalinde, ilan "${String(beklenen)}" bekler`
        );
      }
    }
  }
}
dogrulaSiparisKoprusu(SIPARIS_SABLONLARI, SIPARIS_MATERYALI);

/** Ürün türünün şablon seçenekleri — startDesign bunun okuyucusudur */
export function siparisSablonlari(t: ProductType): readonly string[] {
  return SIPARIS_SABLONLARI[t];
}

/* ── Sipariş katmanı substrat BAĞI (3.1/202 "seçilen materyaller"; journal
   2026-07-26-siparis-substrat-bagi) — TÜRETİLMİŞ sabit, el yazımı İKİNCİ
   KAYNAK DEĞİL: SIPARIS_SABLONLARI × production_substrate zaten iki ayrı
   ilan; burada yalnız bileşimleri yük zamanında dondurulur (çift-kaynak
   sürüklenemez — sürüklenecek ikinci el yoktur). KEŞİF DÜZELTMESİ ŞERHİ:
   TODO'nun önerdiği "opsiyonel substrat GİRDİSİ" ölçümle reddedildi — bu
   küme bugün her tasarlanabilir türde TEK elemanlıdır, girdi bilgi taşımaz
   (preview_types emsali: ölü sözleşme yasak). Küme çok-elemanlı olduğu gün
   homojenlik nöbetçisi (identity.test.ts) kırılır ve girdi kararı print_qty
   emsaliyle gündeme gelir. Kuruluş dogrulaSiparisKoprusu'nden SONRA koşar:
   her seçenek kayıtlıdır, substrat null olamaz — yine de fail-loud denetim
   korunur (sessiz düşme yasak). */
export const SIPARIS_SUBSTRATLARI: Record<ProductType, readonly ProductionSubstrate[]> = (() => {
  /* `{} as Record` kasti: anahtar kümesi SIPARIS_SABLONLARI'ndan (kendisi
     exhaustive Record) birebir kopyalanır — döngü her anahtarı doldurur */
  const sonuc = {} as Record<ProductType, readonly ProductionSubstrate[]>;
  for (const [tur, secenekler] of Object.entries(SIPARIS_SABLONLARI) as Array<
    [ProductType, readonly string[]]
  >) {
    const kume: ProductionSubstrate[] = [];
    for (const id of secenekler) {
      const s = productionSubstrateOf(id);
      if (s === null) {
        throw new Error(`Sipariş substrat bağı "${tur}": şablon "${id}" kayıt defterinde yok`);
      }
      if (!kume.includes(s)) kume.push(s);
    }
    sonuc[tur] = kume;
  }
  return sonuc;
})();

/** Ürün türünün üretileceği substrat kümesi (şablon seçeneği sırasıyla,
    tekrarsız; diger boş) — kalem kartı ticari bilgisi bunun okuyucusudur */
export function siparisSubstratlari(t: ProductType): readonly ProductionSubstrate[] {
  return SIPARIS_SUBSTRATLARI[t];
}

/* Kalem→belge param AKIŞI: dispatch İLANDIR (exhaustive Record — yeni ürün
   türü akışını beyan etmeden derlenemez; null = ön-dolum yok), gövdeler
   ProjectsPanel.paramsFromItem'dan birebir taşınan küçük saf eşlemeler
   (varsayılanlar ürün kararı: 100×100 cam, 300×60 tabela, tshirt/apron
   alan kümeleri). Diferansiyel referans-kopya testli. */
const PARAM_AKISI: Record<
  ProductType,
  ((item: OrderItemLike) => Record<string, unknown>) | null
> = {
  vitrophanie: (it) => ({
    w_cm: it.width_cm ?? 100,
    h_cm: it.height_cm ?? 100,
    mode: it.details.mode ?? "impression",
    miroir: it.details.side === "interieur", // içten uygulama → otomatik öneri
  }),
  tabela: (it) => ({ w_cm: it.width_cm ?? 300, h_cm: it.height_cm ?? 60 }),
  tisort: (it) => ({
    garment_kind: "tshirt",
    technique: it.details.technique ?? "impression",
    areas: ["chest_left", "back_full"],
  }),
  onluk: (it) => ({
    garment_kind: "apron_bavette",
    technique: it.details.technique ?? "impression",
    areas: ["chest"],
  }),
  menu: null,
  trifold: null,
  flyer: null,
  fidelite: null,
  diger: null,
};

/** Kalemden belge paramları — akışı olmayan tür null döner (ön-dolum yok) */
export function siparisParamlari(item: OrderItemLike): Record<string, unknown> | null {
  return PARAM_AKISI[item.product_type]?.(item) ?? null;
}
