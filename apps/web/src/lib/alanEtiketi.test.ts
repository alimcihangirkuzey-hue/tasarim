/* ALAN ETİKETİ — kurulumun iş koluna göre (K-1/D, sektörsüz dil).

   ÖLÇÜLEN YARA: `client.menu_language` arayüzde "Menü dili" diye
   etiketleniyordu ama alan menüye ait DEĞİL. Tüketicileri bu turda sayıldı:
   `PageChrome` (HER şablonun başlık chrome'u) · `MockupPage` filigranı
   (yorumu bile "çıktı dilini izler" diyor) · dijital menü · intake. Yani bir
   tabelacının tabelasının chrome'unu da bu alan belirliyor.

   DOĞRU AD SİSTEMDE ZATEN VARDI: `migrations.ts` "menü ÇIKTI dili" diyor,
   kurulum ilanı `TEZGAH_CIKTI_DILI` adını taşıyor. Uydurulan bir terim yok;
   yalnız operatörün gördüğü etiket eski kalmıştı.

   ALAN ADI DEĞİŞMEDİ: şema adını değiştirmek v13 migration'ı ve geri
   döndürülemez veri kararı ister (ürün sahibinde, TODO'da kayıtlı). Bu
   katman yalnız GÖRÜNEN etiketi ilana bağlar. */

import { describe, expect, it } from "vitest";
import { HEDEF_SEKTOR, SEKTORLER } from "@tezgah/templates/identity";
import { MENU_IS_KOLU, ciktiDiliEtiketi, menuUretiyorMu } from "./alanEtiketi";
import { t } from "../i18n";

const MENUSUZ = SEKTORLER.filter((s) => s !== MENU_IS_KOLU);

describe("ön-koşul — iki etiket GERÇEKTEN farklı", () => {
  it("i18n iki AYRI metin taşıyor", () => {
    /* Bu satır olmadan aşağıdaki iddialar, iki anahtarın aynı metne
       çözüldüğü bir dünyada da yeşil kalırdı — yani hiçbir şey ölçmezdi. */
    expect(t("intake.menu_lang")).not.toBe(t("intake.output_lang"));
    expect(t("intake.output_lang")).not.toBe("intake.output_lang");
  });

  it("MENÜSÜZ iş kolu GERÇEKTEN var — yoksa ayrım ölçülemezdi", () => {
    expect(MENUSUZ.length).toBeGreaterThan(0);
  });
});

describe("menü iş kolu İLANDAN türer", () => {
  it("ikinci bir tablo YOK — HEDEF_SEKTOR.menu okunur", () => {
    expect(MENU_IS_KOLU).toBe(HEDEF_SEKTOR.menu);
    expect(SEKTORLER).toContain(MENU_IS_KOLU);
  });
});

describe("etiket", () => {
  it("YAPILANDIRMA YOKSA bugünkü metin BİREBİR", () => {
    /* Kimlik-bilgisi-kapılı desenin sözü: değer boşken davranış değişmez. */
    expect(ciktiDiliEtiketi(undefined)).toBe(t("intake.menu_lang"));
  });

  it("MENÜ ÜRETEN kurulumda bugünkü metin BİREBİR", () => {
    expect(ciktiDiliEtiketi([MENU_IS_KOLU])).toBe(t("intake.menu_lang"));
    expect(ciktiDiliEtiketi(SEKTORLER)).toBe(t("intake.menu_lang"));
  });

  it("MENÜ ÜRETMEYEN kurulumda SEKTÖRSÜZ ada döner", () => {
    /* Tek bir iş kolu değil, menüsüz iş kollarının TAMAMI taranır: yeni bir
       iş kolu eklendiği gün de bu iddia onu kapsar. */
    for (const s of MENUSUZ) {
      expect(ciktiDiliEtiketi([s]), s).toBe(t("intake.output_lang"));
    }
    expect(ciktiDiliEtiketi(MENUSUZ)).toBe(t("intake.output_lang"));
  });

  it("BOŞ liste sektörsüz addır — 'hiçbir iş kolu' menü üretmez", () => {
    expect(ciktiDiliEtiketi([])).toBe(t("intake.output_lang"));
  });
});

describe("bilinmezlik BUGÜNKÜ davranışa düşer", () => {
  it("undefined → menü üretiyor SAYILIR", () => {
    /* Uç henüz yanıtlamamışken sektörsüz ada dönmek, menü işletmesine bir
       yükleme anı boyunca YANLIŞ etiket göstermek olurdu — göz kırpan bir
       arayüz. Kuşkuda bugünkü davranış korunur. */
    expect(menuUretiyorMu(undefined)).toBe(true);
    expect(menuUretiyorMu([])).toBe(false);
  });
});
