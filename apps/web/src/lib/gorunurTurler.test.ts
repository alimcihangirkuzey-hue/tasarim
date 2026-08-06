/* SİPARİŞ TÜRÜ GÖRÜNÜRLÜĞÜ testleri (K-1/C modül sınırı).

   ÇIKTI AYNI OLDUĞU İÇİN ÇIKTI ÖLÇÜLEMEZ: `SIPARIS_TURLERI` bugün, kaldırılan
   el yazımı `TYPES` dizisiyle BİREBİR aynıdır (aynı üyeler, aynı sıra) — eşitlik
   sınamak hiçbir şeyi ayırt edemezdi. Bu yüzden burada KAYNAĞA BAĞLILIK ölçülür:
   ilan sahte bir değerle değiştirildiğinde liste onunla birlikte değişiyor mu.
   (Aynı ders teknik ilanı paketinde alınmıştı: sahte-yeşil, çıktısı değişmeyen
   bir türetmede eşitlik testiyle doğar.) */

import { describe, expect, it, vi } from "vitest";
import { ProductTypeSchema, type ProductType } from "@tezgah/shared";
import { SEKTORLER, siparisSektoru, type Sektor } from "@tezgah/templates/identity";
import { SIPARIS_TURLERI, gorunurSiparisTurleri } from "./gorunurTurler";

describe("sipariş türü listesi — şemadan türetilir", () => {
  it("ÖN-KOŞUL: şema tür ilanı boş değil ve bilinen türleri taşır", () => {
    /* Şema bir gün boşalırsa aşağıdaki iddialar hiçbir şey ölçmeden yeşil
       kalırdı — ölçüm aracının kör noktası ölçtüğü kusurdan tehlikelidir. */
    expect(ProductTypeSchema.options.length).toBeGreaterThan(5);
    expect(ProductTypeSchema.options).toContain("tabela");
    expect(ProductTypeSchema.options).toContain("diger");
  });

  it("LİSTE = ŞEMA (üye ve SIRA birebir) — ikinci el kopya yok", () => {
    expect(SIPARIS_TURLERI).toEqual(ProductTypeSchema.options);
  });

  it("ESKİ EL YAZIMI SIRA KORUNDU (davranış birebir)", () => {
    /* Kaldırılan `TYPES` dizisinin sırası buydu; türetme onu değiştirmemelidir,
       yoksa operatörün alışkın olduğu seçici sessizce yeniden dizilirdi. */
    expect([...SIPARIS_TURLERI]).toEqual([
      "menu", "flyer", "trifold", "fidelite", "vitrophanie", "tabela", "tisort", "onluk", "diger",
    ]);
  });
});

describe("iş koluna göre daraltma", () => {
  it("YAPILANDIRMA YOKSA (undefined) süzme YOK — bugünkü davranış birebir", () => {
    expect(gorunurSiparisTurleri(undefined)).toEqual([...SIPARIS_TURLERI]);
  });

  it("TÜM İŞ KOLLARI etkinken hiçbir tür düşmez", () => {
    expect(gorunurSiparisTurleri(SEKTORLER)).toEqual([...SIPARIS_TURLERI]);
  });

  it("TABELACI kurulumunda tabela KALIR, tişört/menü DÜŞER", () => {
    const gorunur = gorunurSiparisTurleri(["tabelaci"]);
    expect(gorunur).toContain("tabela");
    expect(gorunur).not.toContain("tisort");
    expect(gorunur).not.toContain("menu");
  });

  it("KAÇIŞ KAPISI: iş kolundan bağımsız tür HER kurulumda görünür", () => {
    /* `diger`in materyali null'dur → sektörü null. Düşseydi daraltma
       "sipariş alamıyorum"a dönüşürdü: görünürlük kısıtı, yetki kısıtı olurdu. */
    expect(siparisSektoru("diger")).toBeNull();
    for (const s of SEKTORLER) {
      expect(gorunurSiparisTurleri([s]), `${s}: kaçış kapısı kapandı`).toContain("diger");
    }
  });

  it("LİSTE HİÇBİR yapılandırmada BOŞALMAZ", () => {
    /* Tek tek her iş kolu ve boş küme — boş liste seçiciyi kullanılamaz kılardı. */
    expect(gorunurSiparisTurleri([]).length).toBeGreaterThan(0);
    for (const s of SEKTORLER) expect(gorunurSiparisTurleri([s]).length).toBeGreaterThan(0);
  });

  it("KORUNAN TÜR iş kolu kapalı olsa bile görünür (gorunurSablonlar sözleşmesi)", () => {
    expect(gorunurSiparisTurleri(["tabelaci"])).not.toContain("tisort");
    expect(gorunurSiparisTurleri(["tabelaci"], "tisort")).toContain("tisort");
  });

  it("DARALTMA SIRAYI bozmaz — kalanlar ilan sırasındadır", () => {
    const gorunur = gorunurSiparisTurleri(["tabelaci"]);
    const beklenenSira = SIPARIS_TURLERI.filter((t) => gorunur.includes(t));
    expect(gorunur).toEqual([...beklenenSira]);
  });
});

describe("KAYNAĞA BAĞLILIK — ilan değişirse liste değişir", () => {
  it("SAHTE İLAN: tabela iş kolundan bağımsız ilan edilirse HER kurulumda görünür", async () => {
    /* Bugünkü çıktıyla ayırt edilemeyen bir türetmeyi ancak böyle ölçebilirsiniz:
       ilanı değiştir, sonucun onu İZLEDİĞİNİ gör. Sabit kodlanmış bir tablo
       burada değişmez ve test kırmızıya döner. */
    /* ÖN-KOŞUL: GERÇEK ilanda tabela bu kurulumda DÜŞER. Düşmeseydi aşağıdaki
       iddia sahte ilanı değil, zaten olan bir şeyi ölçerdi. */
    expect(gorunurSiparisTurleri(["menu-uretici"])).not.toContain("tabela");

    vi.resetModules();
    vi.doMock("@tezgah/templates/identity", async (asil) => {
      const g = await asil<typeof import("@tezgah/templates/identity")>();
      return {
        ...g,
        siparisSektoru: (t: ProductType): Sektor | null => (t === "tabela" ? null : g.siparisSektoru(t)),
      };
    });
    const { gorunurSiparisTurleri: sahte } = await import("./gorunurTurler");
    /* menu-uretici kurulumu: gerçek ilanda tabela DÜŞERDİ. */
    expect(sahte(["menu-uretici"])).toContain("tabela");
    vi.doUnmock("@tezgah/templates/identity");
    vi.resetModules();
  });
});

describe("EL YAZIMI İKİNCİ KOPYA YOK — nöbetçi", () => {
  it("hiçbir üretim dosyası tür listesini ELLE yazmaz", async () => {
    /* Bu paket AYNI el yazımı diziyi İKİ yerde buldu (ProjectsPanel ve
       ParseDictPage). Tek seferlik temizlik yetmez: kural nöbetçiye bağlanır,
       yoksa üçüncü kopya sessizce doğar ve şemayla drift eder. */
    const { readFileSync, readdirSync } = await import("node:fs");
    const path = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const ILAN = path.join(SRC, "lib", "gorunurTurler.ts");

    const dosyalar: string[] = [];
    const gez = (d: string): void => {
      for (const g of readdirSync(d, { withFileTypes: true })) {
        const tam = path.join(d, g.name);
        if (g.isDirectory()) gez(tam);
        else if (/\.tsx?$/.test(g.name) && !g.name.includes(".test.")) dosyalar.push(tam);
      }
    };
    gez(SRC);

    /* ÖN-KOŞUL: tarama gerçekten dosya buldu ve ilanı görüyor. */
    expect(dosyalar.length).toBeGreaterThan(30);
    expect(dosyalar).toContain(ILAN);

    /* Desen: aynı satırda ≥4 tür değişmezi = elle sayılmış liste. TYPE_ICON
       gibi Record<ProductType,…> haritaları satır başına 4 anahtar taşıyabilir
       ama onlar EKSİKSİZLİĞİ tipten alır (Record exhaustive) — bu yüzden
       yalnız DİZİ köşeli parantezi aranır. */
    const desen = /\[[^\]]*("(?:menu|flyer|trifold|fidelite|vitrophanie|tabela|tisort|onluk|diger)"[^\]]*){4,}\]/;
    const elleYazanlar = dosyalar
      .filter((f) => f !== ILAN)
      .filter((f) => desen.test(readFileSync(f, "utf8")));
    expect(
      elleYazanlar.map((f) => path.relative(SRC, f)),
      "Tür listesi elle yazılmış: şemaya yeni tür eklendiği gün burası SESSİZCE " +
        "eksik kalır. SIPARIS_TURLERI / gorunurSiparisTurleri kullanın.",
    ).toEqual([]);
  });
});
