import { describe, expect, it } from "vitest";
import {
  DocumentStateSchema,
  KUMAS_RENKLERI,
  cmToPx300,
  defaultBrandKit,
  defaultCatalog,
  type ClientDTO,
} from "@tezgah/shared";
import { LINE_SOURCES, analyzeGarment, garment } from "./index.js";

function makeClient(withMono = true): ClientDTO {
  const kit = defaultBrandKit();
  kit.logo_primary = "ast_p";
  if (withMono) kit.logo_mono = "ast_m";
  kit.contact.phone = "04 78 12 34 56";
  kit.contact.address = "12 rue de la République, Lyon";
  const asset = (id: string) => ({
    id, client_id: "cli_g", kind: "logo" as const, filename: `${id}.svg`,
    width_px: 4000, height_px: 4000, tags: "", created_at: "t",
    urls: { orig: "/o", master: `/m/${id}`, thumb: "/t" },
  });
  return {
    id: "cli_g", name: "Garment Test", slug: "garment-test", notes: "", currency: "EUR", menu_language: "fr",
    brandkit: kit, catalog: defaultCatalog(),
    assets: withMono ? [asset("ast_p"), asset("ast_m")] : [asset("ast_p")],
    created_at: "t", updated_at: "t",
  };
}

const doc = (params: Record<string, unknown>, overrides: Record<string, unknown> = {}) =>
  DocumentStateSchema.parse({ template_id: "garment", params, overrides });

describe("analyzeGarment (FAZ3-GOREV §6)", () => {
  it("tshirt alan preset'leri; mavi kumaşta mono otomatik + primary'de öneri uyarısı", () => {
    const a = analyzeGarment(
      makeClient(),
      doc({ garment_kind: "tshirt", fabric_color: "blue", areas: ["chest_left", "back_full"] })
    );
    expect(a.fabricDark).toBe(true);
    expect(a.areas.map((x) => x.id)).toEqual(["chest_left", "back_full"]);
    /* mono asset var → otomatik mono seçilir, öneri uyarısı ÇIKMAZ */
    expect(a.areas[0].logoVariant).toBe("mono");
    expect(a.warnings.some((w) => w.type === "mono-suggest")).toBe(false);

    /* primary'ye zorlanırsa öneri uyarısı çıkar */
    const forced = analyzeGarment(
      makeClient(),
      doc(
        { garment_kind: "tshirt", fabric_color: "blue", areas: ["chest_left"] },
        { "area:chest_left:logo": { value: "primary", detached: true } }
      )
    );
    expect(forced.warnings.some((w) => w.type === "mono-suggest")).toBe(true);
  });

  it("kit-bağlı metinler: line1 default telefon; adres kaynağı seçilebilir (M1)", () => {
    const a = analyzeGarment(
      makeClient(),
      doc(
        { garment_kind: "tshirt", areas: ["back_full"] },
        { "area:back_full:line2": { value: { source: "address" }, detached: true } }
      )
    );
    expect(a.areas[0].lines[0].text).toBe("04 78 12 34 56");
    expect(a.areas[0].lines[1].text).toContain("Lyon");
  });

  it("broderie + <15cm alan → ince-detay uyarısı; büyük alanda çıkmaz", () => {
    const small = analyzeGarment(
      makeClient(),
      doc({ garment_kind: "tshirt", technique: "broderie", areas: ["sleeve"] })
    );
    expect(small.warnings.some((w) => w.type === "fine-detail")).toBe(true);

    const big = analyzeGarment(
      makeClient(),
      doc({ garment_kind: "apron_bavette", technique: "broderie", areas: ["chest"] })
    );
    expect(big.warnings.some((w) => w.type === "fine-detail")).toBe(false);
  });

  it("iki kademe (FAZ4 §3, mimar #8): her broderie belgesinde bilgi notu; impression'da yok", () => {
    /* büyük alan: güçlü uyarı YOK ama bilgi notu VAR */
    const big = analyzeGarment(
      makeClient(),
      doc({ garment_kind: "apron_bavette", technique: "broderie", areas: ["chest"] })
    );
    expect(big.warnings.filter((w) => w.type === "broderie-info")).toHaveLength(1);
    expect(big.warnings.some((w) => w.type === "fine-detail")).toBe(false);

    /* küçük alan: ikisi birden */
    const small = analyzeGarment(
      makeClient(),
      doc({ garment_kind: "tshirt", technique: "broderie", areas: ["sleeve"] })
    );
    expect(small.warnings.some((w) => w.type === "broderie-info")).toBe(true);
    expect(small.warnings.some((w) => w.type === "fine-detail")).toBe(true);

    /* impression: not yok */
    const imp = analyzeGarment(
      makeClient(),
      doc({ garment_kind: "tshirt", technique: "impression", areas: ["chest_left"] })
    );
    expect(imp.warnings.some((w) => w.type === "broderie-info")).toBe(false);
  });

  it("kind'e uymayan alanlar elenir; boş kalırsa ilk geçerli alan", () => {
    const a = analyzeGarment(
      makeClient(),
      doc({ garment_kind: "apron_taille", areas: ["back_full"] })
    );
    expect(a.areas.map((x) => x.id)).toEqual(["front"]);
  });

  it("cmToPx300: 30cm → 3543 px (kabul §8/5 hedefi)", () => {
    expect(cmToPx300(30)).toBe(3543);
    expect(cmToPx300(40)).toBe(4724);
  });

  it("entry: alan başına sayfa boyutu (pageSizeMMAt) + şeffaf zemin sözleşmesi", () => {
    const c = makeClient();
    const d = doc({ garment_kind: "tshirt", areas: ["chest_left", "back_full"] });
    expect(garment.pageCount!(c, d)).toBe(2);
    /* 300 dpi PNG hedefleri bu mm'lerden türer: 10×10 cm ve 30×40 cm */
    expect(garment.pageSizeMMAt!(c, d, 0)).toEqual({ w_mm: 100, h_mm: 100, bleed_mm: 0 });
    expect(garment.pageSizeMMAt!(c, d, 1)).toEqual({ w_mm: 300, h_mm: 400, bleed_mm: 0 });
    expect(garment.transparentBg).toBe(true);
  });
});

describe("fabricToHex — prototip zinciri çökmesi (journal 2026-07-27-param-gecerli-deger-ilani)", () => {
  const c = makeClient();
  const hex = (v: unknown) => analyzeGarment(c, doc({ garment_kind: "tshirt", fabric_color: v })).fabricHex;

  it("Object.prototype ANAHTARLARI artık ÇÖKERTMİYOR, ilanlı varsayılana düşüyor", () => {
    /* ÖLÇÜLMÜŞ ÇÖKME (bu paket öncesi, koşularak doğrulandı): FABRIC_HEX düz
       nesne literali olduğu için `FABRIC_HEX["constructor"]` prototip zincirinden
       `Object` FONKSİYONUNU döndürüyordu. Nullish olmadığı için `??` yedeği
       ateşlenmiyor, string olmayan değer relativeLuminance'a gidiyor ve
       `TypeError: hex.trim is not a function` ile patlıyordu.

       Yol ERİŞİLEBİLİR: GarmentParamsSchema `fabric_color`ı düz `z.string()`
       olarak alır ve sunucu belge params'ını hiç doğrulamaz
       (`params: z.record(z.unknown())`), yani bu değer API'den yazılabilir.
       Düzeltme `Object.hasOwn` ile prototip zincirini kapatır. */
    for (const anahtar of ["constructor", "toString", "valueOf", "hasOwnProperty", "__proto__"]) {
      expect(() => hex(anahtar), `${anahtar}: prototip zinciri yeniden açıldı`).not.toThrow();
      expect(hex(anahtar), `${anahtar}: beklenmeyen renk`).toBe("#FFFFFF");
    }
  });

  it("adlandırılmış renkler ve hex yolu BİREBİR korunuyor (düzeltme daraltma değil)", () => {
    /* Düzeltmenin davranış yüzeyi ölçülmüştür: çöken girdiler dışında hiçbir
       şey değişmez. Bu assert onu çiviler — aksi hâlde `Object.hasOwn`'a geçiş
       sessiz bir daraltma olabilirdi. */
    expect(hex("white")).toBe("#FFFFFF");
    expect(hex("black")).toBe("#1A1A1A");
    expect(hex("red")).toBe("#C8102E");
    expect(hex("blue")).toBe("#1D4ED8");
    expect(hex("#1A1A1A")).toBe("#1A1A1A");
  });

  it("BİLİNEN SINIR: hex biçimi doğrulanmıyor, adsız metin sessizce BEYAZa düşer", () => {
    /* Bu bir kusur ilanıdır, sözleşme DEĞİL. Adlandırılmış-renk BİRLİĞİ ARTIK
       İLAN EDİLDİ: `@tezgah/shared`daki KUMAS_RENKLERI (journal
       2026-07-27-kumas-rengi-birligi) ve fabricToHex isim aramasını artık o
       ilandan yapıyor. Eski şerh "birlik ilan edildiği gün burası kırmızıya
       döner" diyordu — DÖNMEDİ, çünkü o paket SAF kaynak-birleştirmeydi:
       yalnızca sözlüğün kaynağı ortaklandı, davranış BİLEREK değiştirilmedi.
       Çizici toleransını kapatmak (adsız metni reddetmek, "#zzz" gibi geçersiz
       hex'i süzmek) render çıktısını değiştiren AYRI bir karardır ve o karar
       alınmadı. Pinler bu yüzden yeşil kaldı: "siyah" (BriefPage
       placeholder'ının davet ettiği Türkçe biçim) hâlâ beyaz sanılır →
       fabricDark ters döner → mono-öneri yanlış tarafa gider; "#zzz" hâlâ
       olduğu gibi geçer — birlik geçerli hex isterken (`kumasRengiHex("#zzz")`
       → null) çizici `#` ile başlayan her şeyi geçirir; bu SAPMA index.tsx'te
       gerekçesiyle şerhlidir. Test bu sınırı GÖRÜNÜR tutmaya devam eder:
       toleransı kapatma kararı alındığı gün bu pinler BİLİNÇLİ olarak
       güncellenir, sessizce değil. */
    expect(hex("siyah")).toBe("#FFFFFF");
    expect(hex("#zzz")).toBe("#zzz");
  });

  it("mutabakat: ilanın (KUMAS_RENKLERI) her adı fabricToHex'ten ilandaki hex ile döner", () => {
    /* Yerel FABRIC_HEX kopyası silindiği için (journal
       2026-07-27-kumas-rengi-birligi) "kopya ile ilan aynı mı" sorusu artık
       kaynak düzeyinde sorulamaz — bu test onun davranış düzeyindeki
       karşılığıdır: çizicinin isim araması ilana bağlı KALMALI. Biri
       fabricToHex'e yerel bir istisna/kopya geri eklerse ya da ilana eklenen
       yeni bir ad çizicide farklı çözülürse burası kırmızıya döner. Bugünkü
       ilanla bu, yukarıdaki dört sabit pinin ilan-üzerinden genellenmiş
       hâlidir; ilan büyüdüğünde otomatik genişler. Sabit pinlere DOKUNULMADI:
       onlar ilandan bağımsız, mutlak değerleri çiviler. */
    for (const [ad, beklenen] of Object.entries(KUMAS_RENKLERI)) {
      expect(hex(ad), `${ad}: çizici ilandan ayrıştı`).toBe(beklenen);
    }
  });
});

describe("satır kaynağı 'web' (journal 2026-07-28-web-alani)", () => {
  it("source 'web' → kit'teki website metni AYNEN; boş website → boş metin (satır gizlenir)", () => {
    /* makeClient website'i DOLDURMAZ (defaultBrandKit → "") — önce boş dal:
       diğer kit-bağlı kaynaklarla aynı disiplin, boş metin döner ve şablonun
       linesShown filtresi satırı zaten çizmez. */
    const bos = analyzeGarment(
      makeClient(),
      doc(
        { garment_kind: "tshirt", areas: ["back_full"] },
        { "area:back_full:line2": { value: { source: "web" }, detached: true } }
      )
    );
    expect(bos.areas[0].lines[1]).toEqual({ source: "web", text: "" });

    const cli = makeClient();
    cli.brandkit.contact.website = "https://aras.example";
    const dolu = analyzeGarment(
      cli,
      doc(
        { garment_kind: "tshirt", areas: ["back_full"] },
        { "area:back_full:line2": { value: { source: "web" }, detached: true } }
      )
    );
    expect(dolu.areas[0].lines[1]).toEqual({ source: "web", text: "https://aras.example" });
    /* line1 default'u değişmedi (phone) — additive kanıtı */
    expect(dolu.areas[0].lines[0].text).toBe("04 78 12 34 56");
  });

  it("LINE_SOURCES ilanı: union'ın tam listesi ve 'web'i içerir (SlotPanel bu ilana bağlanır)", () => {
    expect(LINE_SOURCES).toContain("web");
    /* SlotPanel'in eski sert-kodlu sırası korunur, "web" custom'dan önce */
    expect(LINE_SOURCES).toEqual(["none", "phone", "address", "instagram", "web", "custom"]);
  });
});
