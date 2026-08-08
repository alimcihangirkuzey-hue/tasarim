/* ŞABLON ADI — KAYIT DEFTERİNDEN (K-1/A, tek tık akışı).

   ÖLÇÜLEN YARA (`2026-08-06-sablon-secim-sorusu`): seçim sorusunun metni
   i18n'de ELLE yazılıydı — "Tamam = Resimli Izgara, İptal = Premium Liste" —
   ve "Premium Liste" sistemde YOKTU (gerçek ad "Premium Yazılı Menü"). Elle
   tutulan kopya ilandan ayrışmıştı.

   BU DOSYA NEDEN KÜÇÜLDÜ (2026-08-06, N-seçenekli seçici): eski hâli ikili
   `window.confirm` metnini ve onay→kimlik çevirisini ölçüyordu; ikisi de
   kaldırıldı, çünkü tüketicisi kalmadı. En sesli kaybı bilinçli:

     "HİÇBİR TÜR ikiden fazla şablon İLAN ETMİYOR — ikili diyalog yeterli"

   Bu nöbetçi ÇÖZÜLDÜĞÜ İÇİN kaldırıldı, gevşetildiği için değil: ikili
   diyalog artık yok, `SablonSecici` ilan kaç seçenek verirse o kadarını çizer
   ve N-seçenek kapasitesi `SablonSecici.test.tsx`te ÜÇ seçenekle ölçülür.
   Sınırın ortadan kalktığını iddia etmek yetmez — ölçülmesi gerekir, ve o
   ölçüm oraya taşındı.

   BURADA KALAN GÜVENCE: ilan edilen her seçenek KAYITLI olmalı. Kayıtsız bir
   kimlikte `sablonAdi` uydurma ad üretmez, kimliğin kendisini döndürür —
   operatör "menu-xyz" görür ve sorar; sahte bir ad görüp güvenmez. */

import { describe, expect, it } from "vitest";
import { SIPARIS_SABLONLARI, siparisSablonlari } from "@tezgah/templates/identity";
import { TEMPLATES } from "@tezgah/templates";
import { ProductTypeSchema } from "@tezgah/shared";
import { sablonAdi } from "./sablonSorusu";

const MENU_SECENEKLERI = siparisSablonlari("menu");

describe("ön-koşul — seçici sorusunun dayandığı ilan", () => {
  it("EN AZ BİR TÜR çok seçenekli — yoksa seçici hiç koşmaz", () => {
    /* Bu satır olmadan aşağıdaki iddialar, hiçbir türün çok seçenekli olmadığı
       bir ilanda da (seçici ölü kodken) yeşil kalırdı. */
    const cok = ProductTypeSchema.options.filter((t) => SIPARIS_SABLONLARI[t].length >= 2);
    expect(cok.length).toBeGreaterThan(0);
    expect(MENU_SECENEKLERI.length).toBeGreaterThanOrEqual(2);
  });

  it("İLAN EDİLEN HER ŞABLON KAYITLI — hiçbir türde ad uydurulmuyor", () => {
    /* Tür başına DEĞİL, ilanın TAMAMI taranır: yeni bir tür ikinci şablonunu
       aldığı gün bu satır onu da ölçer (menüye özgü bir güvence, o gün
       sessizce yetersiz kalırdı). */
    const kayitsiz = ProductTypeSchema.options
      .flatMap((t) => SIPARIS_SABLONLARI[t].map((tid) => [t, tid] as const))
      .filter(([, tid]) => !TEMPLATES[tid])
      .map(([t, tid]) => `${t}: ${tid}`);
    expect(kayitsiz, "İlan edilen bu şablon(lar) kayıt defterinde YOK").toEqual([]);
  });
});

describe("şablon adı", () => {
  it("KAYIT DEFTERİNDEN okunur — elle yazılmaz", () => {
    for (const tid of MENU_SECENEKLERI) {
      expect(sablonAdi(tid)).toBe(TEMPLATES[tid]!.manifest.name_tr);
    }
  });

  it("İKİ ŞABLONUN ADI BİRBİRİNDEN FARKLI — seçici ayırt edilebilir olmalı", () => {
    /* Seçicinin işe yaraması adların ayırt edilebilmesine bağlıdır; aynı adı
       taşıyan iki düğme operatöre hiçbir şey söylemezdi. */
    const adlar = MENU_SECENEKLERI.map(sablonAdi);
    expect(new Set(adlar).size).toBe(adlar.length);
  });

  it("KAYITSIZ kimlikte kimliğin KENDİSİ döner — sahte ad üretilmez", () => {
    expect(sablonAdi("kayitsiz-sablon-xyz")).toBe("kayitsiz-sablon-xyz");
  });
});
