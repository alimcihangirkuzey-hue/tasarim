/* HEDEF SEKTÖR (iş kolu) İLANI — MaterialType-düzeyi nöbetçi + identity
   sorgu sözleşmesi (Canonical 7.2/495 "yeni sektör = yeni profil" + 7.1/481
   görünürlük; journal 2026-07-26-hedef-sektor-ilani).

   ŞERH — per-manifest target_sector alanı BİLEREK YOK: sektör MaterialType'ın
   FONKSİYONU ölçüldü (aynı materyalden iki profil farklı sektöre düşmüyor;
   "yeni sektör = yeni profil" bunu doğrular) — manifest alanı TÜRETİLEBİLİR
   olurdu; türetilebilir alan = ÖLÜ İLAN (preview_types emsali: ölü sözleşme
   yasak). İlanın "hedef kullanıcı" yarısı da (1.3/95) ilan dışı: roller
   profil-başına FARKLILAŞMAZ, alan bilgi taşımazdı — farklılaştığı gün ayrı
   ilan kararı (TODO şerhi).

   Bu dosya DÖRT şeyi sabitler:
   (1) HEDEF_SEKTOR tablosu materyal materyal çivilenir — iş kolu ataması
       ürün kararıdır, journal ister.
   (2) SEKTORLER tekrarsızdır ve ÖLÜ ÜYE taşımaz (kanalsız-teknik emsali):
       kayıtlı MaterialType'ların sektör kümesi SEKTORLER kümesine iki yönlü
       EŞİTTİR.
   (3) identity sorgusu ana kayıtla TUTARLIDIR: her TEMPLATES üyesi için
       hedefSektorOf(id) manifest.type'ın ilanına çözülür (identity kapsamı
       dışındaki fabrika/generated null — kayıtlı sınır, C-P2).
   (4) hedefSektorOf kayıtsız id'de null döner, FIRLATMAZ
       (productionSubstrateOf emsali). */

import { describe, expect, it } from "vitest";
import { HEDEF_SEKTOR, SEKTORLER, TEMPLATES, registeredMaterialTypes, type Sektor } from "./index.js";
import { hedefSektorOf, materialTypeOfOrNull } from "./identity/index.js";

describe("NÖBETÇİ: hedef sektör ilanları TAM olarak bunlar (6 materyal → 5 sektör)", () => {
  it("HEDEF_SEKTOR beklenen tabloyla BİREBİR eşleşir (iki yönlü tamlık)", () => {
    expect(
      HEDEF_SEKTOR,
      "sektör eşlemesi değişti: iş kolu ataması ürün kararıdır, journal ister " +
        "(flyer+kart→matbaa okuması Canonical 1.1/70 iş kolu listesinden — ajans değil)"
    ).toEqual({
      menu: "menu-uretici",
      flyer: "matbaa",
      kart: "matbaa",
      tabela: "tabelaci",
      tekstil: "tekstil-baski",
      cam: "cam-giydirme",
    });
  });

  it("SEKTORLER tekrarsız VE ölü üyesiz: kayıtlı materyallerin sektör kümesi = SEKTORLER (iki yönlü)", () => {
    expect(new Set(SEKTORLER).size, "SEKTORLER tekrarlı üye taşıyamaz").toBe(SEKTORLER.length);
    /* Ölü sözlük üyesi yasak (kanalsız-teknik emsali): kayıtlı MaterialType'ı
       olmayan sektör ilan edilemez; SEKTORLER dışı sektör de üretilemez —
       küme eşitliği iki yönü birden ölçer. */
    const kayitliSektorler = new Set<Sektor>(registeredMaterialTypes().map((m) => HEDEF_SEKTOR[m]));
    expect(
      [...kayitliSektorler].sort(),
      "sektör kümesi ayrıştı: her SEKTORLER üyesinin EN AZ BİR kayıtlı MaterialType'ı olmalı " +
        "(ölü üye = ölü ilan); kayıtlı materyal de SEKTORLER dışına düşemez"
    ).toEqual([...SEKTORLER].sort());
  });
});

/* ── Kayıt-defteri taraması — identity ile ana kayıt tutarlı ─────────────── */

describe("kayıt-defteri taraması: hedefSektorOf ana kayıt ilanıyla tutarlı", () => {
  it("her TEMPLATES üyesi için hedefSektorOf(id) === HEDEF_SEKTOR[manifest.type]", () => {
    for (const [id, e] of Object.entries(TEMPLATES)) {
      const sektor = hedefSektorOf(id);
      if (materialTypeOfOrNull(id) === null) {
        /* identity kapsam sınırı (C-P2 kayıtlı karar): fabrika/generated
           identity kaydında YOK — sorgu null'a düşer, uydurma sektör ÜRETMEZ */
        expect(sektor, `${id}: identity-dışı kayıt null çözülmeli`).toBe(null);
      } else {
        expect(sektor, `${id}: identity sektörü ana kayıt ilanından ayrıştı`).toBe(
          HEDEF_SEKTOR[e.manifest.type]
        );
      }
    }
  });
});

/* ── identity alt-yolu sorgusu (productionSubstrateOf emsali) ────────────── */

describe("hedefSektorOf — kayıtsız id null döner, FIRLATMAZ", () => {
  it("kayıtlı aileler materyallerinin sektörünü döner", () => {
    expect(hedefSektorOf("garment")).toBe("tekstil-baski");
    expect(hedefSektorOf("flyer")).toBe("matbaa");
    expect(hedefSektorOf("carte-fidelite")).toBe("matbaa"); /* kart→matbaa: flyer'la aynı iş kolu */
  });

  it("kayıtsız / fabrika / prototip / boş id null", () => {
    expect(hedefSektorOf("yok-boyle")).toBe(null);
    expect(hedefSektorOf("toString")).toBe(null); /* prototip zinciri kimlik değildir */
    expect(hedefSektorOf("")).toBe(null);
    expect(hedefSektorOf("kabul-fabrika")).toBe(
      null
    ); /* fabrika identity kaydında yok — uretim-substrati.test.ts emsali (kayıtlı sınır) */
  });
});
