/* C-P1 — kimlik bağlama eşdeğerlik testleri. İki katman:

   (1) ALTIN EŞDEĞERLİK: kayıt defterindeki HER şablon için yeni materyal
       yönlendirmesi, sökülen id-sniff'in verdiği sonucun AYNISINI verir.
       Bu, "davranışsal paket ama bugünkü davranış değişimi SIFIR" iddiasının
       ölçülen kanıtıdır — iddia cümleyle değil, döngüyle kurulur. Sniff
       ifadeleri buraya BİLEREK kopyalanmıştır: canlı koddan silinen eski
       davranış, karşılaştırma tabanı olarak testte yaşar.

   (2) RED YOLLARI: kayıt defterinde OLMAYAN id (ör. fabrika şablonu, süreç
       ayaktayken üretilen taze bir kayıt) eski sniff'te hiçbir ön-eke
       uymazdı; yeni yol da aynı yere düşer (null) ve ASLA fırlatmaz — belge
       oluşturma 500'e dönemez.

   C-P2: `@tezgah/templates` (TAM, react/jsx-runtime taşır) DEĞİL "/identity"
   alt-yolu import edilir — bu dosya apps/server/src altında yaşadığı için
   (typecheck kapsamı), tam registry'yi import etmek server'ın TÜM typecheck
   grafiğine .tsx dosyalarını geri sızdırırdı (ölçüldü: jsx bayrağı kaldırınca
   TS6142 patladı, kök neden buydu). "kabul-fabrika" (fabrikanın GERÇEK
   ürettiği id) red-yolları listesine eklendi: identity/index.test.ts'in
   "generated hep null" kanıtının bu dosyadaki somut yansıması. */

import { describe, expect, it } from "vitest";
import { MANIFESTS } from "@tezgah/templates/identity";
import { surfacePrefillKind, svgExportKind } from "./material-routing.js";

/* Sökülen sniff'ler — canlı koddaki ESKİ davranışın referans kopyası */
const eskiSvgKind = (id: string): "decoupe" | "broderie" | null =>
  id.startsWith("vitro-") ? "decoupe" : id === "garment" ? "broderie" : null;
const eskiPrefillKind = (id: string): "vitrine" | "tabela" | null =>
  id.startsWith("vitro-") ? "vitrine" : id === "enseigne-panneau" ? "tabela" : null;

describe("altın eşdeğerlik — kayıtlı HER şablonda yeni yönlendirme == eski sniff", () => {
  it("svgExportKind (routes/vector.ts yönlendirmesi)", () => {
    for (const id of Object.keys(MANIFESTS)) {
      expect(svgExportKind(id), id).toBe(eskiSvgKind(id));
    }
  });

  it("surfacePrefillKind (surfaces.ts ön-dolum yönlendirmesi)", () => {
    for (const id of Object.keys(MANIFESTS)) {
      expect(surfacePrefillKind(id), id).toBe(eskiPrefillKind(id));
    }
  });

  it("kayıt defteri boş değil — döngü gerçekten bir şey ölçtü", () => {
    /* Boş MANIFESTS ile iki test de 'yeşil' olurdu; bekçi bunu kapatır */
    expect(Object.keys(MANIFESTS).length).toBeGreaterThanOrEqual(10);
  });
});

describe("red yolları — kayıtsız id düşer, fırlatmaz", () => {
  it("kayıtsız id her iki yönlendirmede null (eski sniff'in düşme davranışı)", () => {
    for (const id of ["olmayan-sablon", "", "kabul-fabrika", "kabul-fabrika-2", "toString"]) {
      expect(svgExportKind(id), id).toBe(null);
      expect(surfacePrefillKind(id), id).toBe(null);
    }
  });

  it("ön-ek TAKLİDİ kimlik DEĞİLDİR: 'vitro-' ile başlayan KAYITSIZ id artık düşer", () => {
    /* Bilinçli, kayıtlı sapma (journal C-P1): eski sniff "vitro-sahte" gibi
       kayıtsız bir id'yi cam SANIRDI; kimlik katmanında tür yalnız KAYITLI
       manifest'ten okunur. Kayıt defterinde olmayan şablon zaten render
       edilemez (getTemplate fırlatır) — sniff'in bu kolu ölü-yoldu. */
    expect(svgExportKind("vitro-sahte")).toBe(null);
    expect(surfacePrefillKind("vitro-sahte")).toBe(null);
  });
});
