/* C-P1 — kimlik bağlama: sunucunun malzeme ayrımı manifest'in materyal
   türünden okunur, template_id ön-ekinden değil (Canonical 7.2; C-P0 bulgusu
   C-B-2 / RISK-CP0-2). Eski hâlde `startsWith("vitro-")` üç yerde yaşıyordu;
   yeni bir cam şablonu ancak adı "vitro-" ile başlarsa doğru yönlenirdi.

   İki işlev de kayıtsız id'de null döner (materialTypeOfOrNull): kayıt
   defterinde olmayan bir template_id — ör. fabrika üretimi bir şablon (bkz.
   aşağıki alt-yol notu) ya da çalışan süreç başladıktan SONRA üretilmiş taze
   bir kayıt — eski sniff'te de hiçbir ön-eke uymuyordu; düşme davranışı
   (prefill {} · svg-export 400) birebir korunur.

   Route dosyasında değil BURADA yaşar: routes/* modülleri import anında db/
   puppeteer yan etkisi taşır, birim-test edilemez (surfaces.ts başlığındaki
   "route-harness'ı yok" deseni). Bu modülün tek bağımlılığı kayıt defteridir.

   C-P2: "@tezgah/templates" (TAM, react/jsx-runtime taşır) DEĞİL "/identity"
   alt-yolu import edilir — server'ın react görmesi için hiçbir sebep yoktu
   (bkz. journal 2026-07-23-c-p2-identity-subpath). Bu alt-yol BİLEREK yalnız
   el-yazımı 10 aileyi kapsar; fabrika üretimi (generated/) kapsam dışıdır —
   fabrika HEP type:"menu" beyan eder (C-P0 C-B-1), iki yönlendirme de zaten
   "menu"yu null'a çözüyor, kayıtlı/kayıtsız fark etmez (identity/index.test.ts
   yüksek sesli nöbetçiyle kilitli). */

import { materialTypeOfOrNull, productionChannelsOf, svgKindOf } from "@tezgah/templates/identity";

/** SVG (vektör) export ucunun yönlendirmesi — ÜRETİM KANALI İLANINDAN
    (7.2/8.5, uretim-kanali-ilani paketi): decoupe ilanı → découpe (kesim),
    broderie ilanı → broderie (nakış); ilansız/kayıtsız → null (uç 400 döner).
    Türden türetme kaldırıldı: cam→decoupe/tekstil→broderie eşlemesi artık
    manifest'in kendi kanal beyanıdır (altın eşdeğerlik testli). */
export function svgExportKind(templateId: string): "decoupe" | "broderie" | null {
  const kanallar = productionChannelsOf(templateId);
  return kanallar === null ? null : svgKindOf(kanallar);
}

/** Belge oluşturmada ölçü ön-dolumunun yüzey türü (F8-A): cam → vitrine,
    tabela → tabela; diğer/kayıtsız → null (ön-dolum yok, şablon varsayılanı). */
export function surfacePrefillKind(templateId: string): "vitrine" | "tabela" | null {
  const t = materialTypeOfOrNull(templateId);
  return t === "cam" ? "vitrine" : t === "tabela" ? "tabela" : null;
}
