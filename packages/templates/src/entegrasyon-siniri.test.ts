/* ENTEGRASYON SINIRI — dışa açık kanal kümesi ve türetim sözleşmesi
   (Canonical 7.2/507 "Diğer modüllerle entegrasyon sınırları"; 7.4/524
   bağlayıcı katmanı; journal 2026-07-26-entegrasyon-siniri-karari).

   ŞERH — per-manifest entegrasyon alanı BİLEREK YOK: dışa açık kanal kümesi
   production_channels ∩ DIS_KANALLAR'dan TÜRETİLEBİLİR (el yazımı ikinci
   kaynak = sürüklenme), print/preview ilan eden 9 ailede FARKLILAŞMIYOR,
   kanonik entegrasyon beyanı 7.3/516 eklenti manifesti ile 7.4/524 bağlayıcı
   bildirimine verilmiştir (EK-D profil tanımında entegrasyon yoktur) ve
   9.5/696+699 erişim yetkisini entitlement katmanına bağlar. Emsal zinciri:
   preview_types · 7.2/495'in "hedef kullanıcı" yarısı — bu ÜÇÜNCÜSÜ
   (ölçümlü red, types.ts DIS_KANALLAR şerhi).

   Bu dosya BEŞ şeyi sabitler:
   (1) TÜM ailelerin dış kanal sınırı aile aile çivilenir — sınır elle yazılır,
       kayıt defterinden TÜRETİLMEZ (BEKLENEN_KANALLAR emsali).
   (2) TÜRETİM DOĞRU: her aile için disaAcikKanallar ≡ production_channels ∩
       DIS_KANALLAR, SIRA DAHİL (ilan sırası korunur).
   (3) İki uç hâl pinlidir: garment BOŞ küme (tanınır ama dışa hiçbir şey
       açmaz), vitro'da decoupe DIŞARIDA (kesim imzalı kanaldan istenemez).
   (4) disaAcikKanallar kayıtsız id'de null döner, FIRLATMAZ
       (productionChannelsOf emsali) — null "profil tanınmıyor"dur.
   (5) DIS_KANALLAR sözlüğü tutarlıdır: PRODUCTION_CHANNELS alt kümesi,
       tekrarsız, boş değil. */

import { describe, expect, it } from "vitest";
import { DIS_KANALLAR, PRODUCTION_CHANNELS, TEMPLATES, type ProductionChannel } from "./index.js";
import { disaAcikKanallar, productionChannelsOf } from "./identity/index.js";

/* Beklenen sınır AİLE AİLE elle yazılır; kayıt defterinden TÜRETİLMEZ
   (BEKLENEN_KANALLAR / BEKLENEN_SUBSTRATLAR emsali). null = profil identity
   kaydında yok (kayıtlı kapsam sınırı, C-P2) — "kanalsız" ile aynı şey DEĞİL. */
const BEKLENEN_DIS_KANALLAR: Record<string, readonly ProductionChannel[] | null> = {
  "menu-grid-cells": ["print", "preview"],
  "menu-liste-premium": ["print", "preview"],
  "menu-trifold": ["print", "preview"],
  flyer: ["print", "preview"],
  "carte-fidelite": ["print", "preview"],
  "enseigne-panneau": ["print", "preview"],
  /* vitro üçlüsü decoupe DA ilan eder; kesim dışarıda kalır (aşağıda ayrı pin) */
  "vitro-bandeau": ["print", "preview"],
  "vitro-centre": ["print", "preview"],
  "vitro-colonne": ["print", "preview"],
  /* garment: png+broderie ilanlı — ikisi de dış sözlükte yok → BOŞ küme */
  garment: [],
  /* fabrika: identity kaydında YOK (C-P2 kapsam sınırı) → null */
  "kabul-fabrika": null,
};

describe("NÖBETÇİ: dış kanal sınırı TAM olarak bu (11 aile)", () => {
  it("her aile için disaAcikKanallar beklenen tabloyla BİREBİR eşleşir (iki yönlü tamlık)", () => {
    const gercek = Object.fromEntries(
      Object.keys(TEMPLATES).map((id) => [id, disaAcikKanallar(id)])
    );
    expect(
      gercek,
      "dış kanal sınırı değişti: entegrasyon sınırı ürün kararıdır, journal ister — " +
        "bir kanalı imzalı makine kanalına açmak (veya kapatmak) render contract " +
        "enum'unu ve /render bekçisini AYNI pakette ilgilendirir"
    ).toEqual(BEKLENEN_DIS_KANALLAR);
    /* iki yönlü tamlık AÇIKÇA: kayıtta tablosuz aile yok, tabloda kayıtsız aile yok */
    expect(Object.keys(gercek).sort()).toEqual(Object.keys(BEKLENEN_DIS_KANALLAR).sort());
  });
});

/* ── (2) TÜRETİM doğrulaması — sınır ikinci kaynak değil, kesişimdir ─────── */

describe("türetim: disaAcikKanallar ≡ production_channels ∩ DIS_KANALLAR", () => {
  it("kayıtlı TÜM ailelerde kesişim birebir (SIRA DAHİL — ilan sırası korunur)", () => {
    for (const id of Object.keys(TEMPLATES)) {
      const ilan = productionChannelsOf(id);
      if (ilan === null) {
        /* identity kapsam dışı (fabrika/generated): türetimin girdisi yok →
           sonuç da null; uydurma boş küme ÜRETİLMEZ */
        expect(disaAcikKanallar(id), `${id}: kayıtsız id null çözülmeli`).toBe(null);
        continue;
      }
      const beklenen = ilan.filter((k) => (DIS_KANALLAR as readonly string[]).includes(k));
      expect(
        disaAcikKanallar(id),
        `${id}: dış kanal kümesi ilanın kesişiminden ayrıştı — türetim tek kaynaklıdır`
      ).toEqual(beklenen);
    }
  });

  it("sonuç HER ZAMAN ilanın alt kümesidir (dışa açık kanal önce üretim kanalıdır)", () => {
    for (const id of Object.keys(TEMPLATES)) {
      const disa = disaAcikKanallar(id);
      if (disa === null) continue;
      const ilan = productionChannelsOf(id) ?? [];
      for (const k of disa) {
        expect(ilan, `${id}: "${k}" ilan edilmemiş kanal dışa açılamaz`).toContain(k);
        expect(DIS_KANALLAR as readonly string[], `${id}: "${k}" dış sözlükte yok`).toContain(k);
      }
    }
  });
});

/* ── (3) İki uç hâl — ürün kararı pinleri ────────────────────────────────── */

describe("uç hâl pinleri: boş küme ve kesim kanalının dışarıda kalması", () => {
  it("garment BOŞ küme döner: tanınan profil, dışa açık kanalı YOK (null ile karıştırılamaz)", () => {
    /* png (alfa tişört baskısı) ve broderie (nakış makinesi dosyası) atölye içi
       üretim adımlarıdır; imzalı dış istemci tekstil çıktısı SİPARİŞ EDEMEZ.
       Boş dizi "profil tanınıyor ama dışarıya kapalı" der — null'ın anlamı
       (profil tanınmıyor) bundan farklıdır; uçlar iki hâle ayrı hata kodu verir. */
    expect(disaAcikKanallar("garment")).toEqual([]);
    expect(disaAcikKanallar("garment")).not.toBe(null);
    expect(productionChannelsOf("garment")).toEqual(["png", "broderie"]);
  });

  it("vitrophanie: decoupe İLANLIDIR ama dış kümede YOKTUR (kesim imzalı kanaldan istenemez)", () => {
    for (const id of ["vitro-bandeau", "vitro-centre", "vitro-colonne"]) {
      /* İlan kesimi içerir — atölye kullanıcısı /export-svg ile kesim dosyasını
         üretmeye DEVAM eder; sınır yalnız makine kanalını daraltır. */
      expect(productionChannelsOf(id), id).toContain("decoupe");
      /* Dış küme kesimi DIŞARIDA bırakır: render contract enum'u (variant:
         print|preview) kararıdır ve genişletmek MAJOR sözleşme değişikliğidir
         (yeni çıktı türü + yeni imza yüzeyi + yeni denetim kaydı — 7.4/524). */
      expect(disaAcikKanallar(id), `${id}: kesim kanalı dışa açılmış`).toEqual([
        "print",
        "preview",
      ]);
    }
  });
});

/* ── (4) identity alt-yolu sözleşmesi (productionChannelsOf emsali) ──────── */

describe("disaAcikKanallar — kayıtsız id null döner, FIRLATMAZ", () => {
  it("kayıtlı aileler kesişimlerini döner", () => {
    expect(disaAcikKanallar("flyer")).toEqual(["print", "preview"]);
    expect(disaAcikKanallar("vitro-centre")).toEqual(["print", "preview"]);
  });

  it("kayıtsız / fabrika / prototip / boş id null", () => {
    expect(disaAcikKanallar("yok-boyle-sablon")).toBe(null);
    expect(disaAcikKanallar("kabul-fabrika")).toBe(null); /* fabrika identity'de yok — kayıtlı sınır */
    expect(disaAcikKanallar("toString")).toBe(null); /* prototip zinciri kimlik değildir */
    expect(disaAcikKanallar("")).toBe(null);
  });
});

/* ── (5) Sözlük tutarlılığı ──────────────────────────────────────────────── */

describe("DIS_KANALLAR sözlüğü tutarlı", () => {
  it("dış sözlük TAM olarak {print, preview} — render contract enum'unun eşi", () => {
    expect(
      DIS_KANALLAR,
      "dış sözlük değişti: bu küme apps/server render contract enum'uyla EŞ olmak " +
        "zorundadır (bilinçli literal — templates→server bağı yok; eş-kümelik server " +
        "tarafında testle çivilidir, MOCKUP_SAHNE_TURLERI ≡ SceneKindSchema.options emsali)"
    ).toEqual(["print", "preview"]);
  });

  it("PRODUCTION_CHANNELS alt kümesi, tekrarsız ve boş değil", () => {
    expect(DIS_KANALLAR.length, "dış küme boş olamaz — sınır yoksa makine kanalı da yoktur").toBeGreaterThan(0);
    expect(new Set(DIS_KANALLAR).size, "tekrarlı dış kanal").toBe(DIS_KANALLAR.length);
    for (const k of DIS_KANALLAR) {
      expect(
        PRODUCTION_CHANNELS as readonly string[],
        `"${k}" üretim kanalı değil — dışa açık kanal önce ÜRETİM KANALI olmak zorundadır`
      ).toContain(k);
    }
  });
});
