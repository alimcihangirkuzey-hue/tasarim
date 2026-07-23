/* C-P1 — kimlik bağlama: sunucunun malzeme ayrımı manifest'in materyal
   türünden okunur, template_id ön-ekinden değil (Canonical 7.2; C-P0 bulgusu
   C-B-2 / RISK-CP0-2). Eski hâlde `startsWith("vitro-")` üç yerde yaşıyordu;
   yeni bir cam şablonu ancak adı "vitro-" ile başlarsa doğru yönlenirdi.

   İki işlev de kayıtsız id'de null döner (materialTypeOfOrNull): kayıt
   defterinde olmayan bir template_id — ör. çalışan süreç başladıktan SONRA
   fabrikanın ürettiği bir şablon — eski sniff'te de hiçbir ön-eke uymuyordu;
   düşme davranışı (prefill {} · svg-export 400) birebir korunur.

   Route dosyasında değil BURADA yaşar: routes/* modülleri import anında db/
   puppeteer yan etkisi taşır, birim-test edilemez (surfaces.ts başlığındaki
   "route-harness'ı yok" deseni). Bu modülün tek bağımlılığı kayıt defteridir. */

import { materialTypeOfOrNull } from "@tezgah/templates";

/** SVG (vektör) export ucunun tür yönlendirmesi: cam → découpe (kesim),
    tekstil → broderie (nakış); diğer/kayıtsız → null (uç 400 döner). */
export function svgExportKind(templateId: string): "decoupe" | "broderie" | null {
  const t = materialTypeOfOrNull(templateId);
  return t === "cam" ? "decoupe" : t === "tekstil" ? "broderie" : null;
}

/** Belge oluşturmada ölçü ön-dolumunun yüzey türü (F8-A): cam → vitrine,
    tabela → tabela; diğer/kayıtsız → null (ön-dolum yok, şablon varsayılanı). */
export function surfacePrefillKind(templateId: string): "vitrine" | "tabela" | null {
  const t = materialTypeOfOrNull(templateId);
  return t === "cam" ? "vitrine" : t === "tabela" ? "tabela" : null;
}
