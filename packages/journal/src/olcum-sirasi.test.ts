/* ÖLÇÜM SIRASI KAPISI — saf çekirdeğin testleri.

   NEREDEN GELDİ: `2026-08-07-defter-dosya-baglari` paketinin açık bulgusu
   `K-SIRA-1` (tek "ciddi" şiddetli bulgu): "doküman/defter düzenlemeleri de
   kapı konusudur ve ölçümden ÖNCE yapılmalıdır; bugün bunu tutan bir
   mekanizma YOK, sıra yalnızca uygulayıcının disiplinine bağlı."

   ZARAR ÖLÇÜLMÜŞTÜ: bir tur kapıları koştu, SONRA `TODO.md`'yi düzenledi ve
   commit etti; düzenleme başka bir nöbetçiyi kırmızıya düşürüyordu ve defter
   bir tur boyunca "gecti" dedi. Artık `stage --to hazir` bunu reddediyor.

   KARAR NİYE SAF BİR MODÜLDE: git çıktısı ve dosya sistemi CLI'da toplanır,
   kural burada yaşar. Böylece kural gerçek bir depo durumu kurgulamadan —
   yani sahte commit/checkout yapmadan — doğrudan sınanabilir. */

import { describe, expect, it } from "vitest";
import { defterinKendiYolu, olcumdenSonraDegisenler } from "./olcum-sirasi.js";

const OLCUM = "2026-08-07T10:00:00.000Z";
const ONCE = Date.parse(OLCUM) - 60_000;
const SONRA = Date.parse(OLCUM) + 60_000;

describe("ön-koşul — kural GERÇEKTEN ayırt ediyor", () => {
  it("ölçümden ÖNCE değişen dosya sayılmaz, SONRA değişen sayılır", () => {
    /* Bu satır olmadan aşağıdaki her iddia, hep boş dizi döndüren (ya da hep
       her şeyi döndüren) bozuk bir kuralla da yeşil kalırdı. */
    const sonuc = olcumdenSonraDegisenler(OLCUM, [
      { yol: "TODO.md", mtimeMs: SONRA },
      { yol: "apps/server/src/db.ts", mtimeMs: ONCE },
    ]);
    expect(sonuc).toEqual(["TODO.md"]);
  });

  it("ÖLÇÜM ANI okunamazsa FIRLATIR — sessizce 'sorun yok' demez", () => {
    /* Sessiz düşme, kapının hiç olmamasından beterdir: yeşil görünür. */
    expect(() => olcumdenSonraDegisenler("bozuk-tarih", [])).toThrow(/ölçüm anı okunamadı/);
  });
});

describe("KAPSAM — defterin kendi yazdıkları sayılmaz", () => {
  it("olay dosyaları · pano · kilitler MUAF (süreç onları kendisi yazar)", () => {
    const sonuc = olcumdenSonraDegisenler(OLCUM, [
      { yol: "docs/journal/events/2026-08-07-x.jsonl", mtimeMs: SONRA },
      { yol: "docs/pano/index.html", mtimeMs: SONRA },
      { yol: "docs/journal/.lock/x.lock", mtimeMs: SONRA },
    ]);
    expect(sonuc, "defterin kendi satırı yüzünden durmak anlamsız olurdu").toEqual([]);
  });

  it("MUAFİYET DAR: docs altındaki BAŞKA dosyalar muaf DEĞİL", () => {
    /* Muafiyet "docs/" değil, defterin KENDİ yollarıdır. Ürün sahibi
       kararları ya da mimari belgeler değişirse kapı konuşmalıdır. */
    expect(defterinKendiYolu("docs/URUN_SAHIBI_KARARLARI.md")).toBe(false);
    expect(defterinKendiYolu("docs/journal/events/x.jsonl")).toBe(true);
    expect(
      olcumdenSonraDegisenler(OLCUM, [
        { yol: "docs/URUN_SAHIBI_KARARLARI.md", mtimeMs: SONRA },
      ])
    ).toEqual(["docs/URUN_SAHIBI_KARARLARI.md"]);
  });
});

describe("SİLİNMİŞ DOSYA — bilinçli boşluk, yazılı", () => {
  it("mtime okunamayan dosya SAYILMAZ", () => {
    /* Silme zamanı ölçülemez; uydurmak olmayan bir kanıt üretmek olurdu.
       Boşluk kabul edildi ve `olcum-sirasi.ts` başlığında yazılı. */
    expect(olcumdenSonraDegisenler(OLCUM, [{ yol: "silinen.ts", mtimeMs: null }])).toEqual([]);
  });
});

describe("SIRALAMA ve ÇOKLUK", () => {
  it("birden çok ihlal ALFABETİK sırada döner — çıktı kararlı", () => {
    const sonuc = olcumdenSonraDegisenler(OLCUM, [
      { yol: "z.ts", mtimeMs: SONRA },
      { yol: "a.ts", mtimeMs: SONRA },
      { yol: "m.ts", mtimeMs: ONCE },
    ]);
    expect(sonuc).toEqual(["a.ts", "z.ts"]);
  });

  it("TAM ÖLÇÜM ANINDA değişen dosya sayılmaz — sınır dışlayıcı", () => {
    /* Kapı koşumunun kendisi dosyalara dokunabilir (derleme çıktısı, önbellek);
       eşitlik ihlal sayılsaydı nöbetçi kendi ölçümü yüzünden konuşurdu. */
    expect(
      olcumdenSonraDegisenler(OLCUM, [{ yol: "a.ts", mtimeMs: Date.parse(OLCUM) }])
    ).toEqual([]);
  });
});
