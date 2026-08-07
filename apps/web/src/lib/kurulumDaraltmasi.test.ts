/* KURULUMUN DARALTMASI TEK KAPIDAN OKUNUR — ÖLÇÜLDÜ, SONRA ÇİVİLENDİ (K-1/C).

   ÖLÇÜLEN YARA: `is-kollari` ilanının arayüz okuması ALTI dosyada el
   yazımıyla kopyalanmıştı (DocumentsPanel · ProjectsPanel · ScenesPanel ·
   EditorPage · ParseDictPage · SiparisPage) — her biri hem sorgu anahtarını
   (`["isKollari"]`) hem de "kaynak varsayılansa daraltma yok" eşlemesini
   yeniden yazıyordu. Altısı bugün birbirinin aynısıydı; yani kopya HENÜZ
   ayrışmamıştı ve tam da bu yüzden hiçbir kapı kırmızı değildi.

   NİYE SESSİZ BİR SINIF: daraltmanın YANLIŞ yazılması ekranda bir şeyin
   EKSİLMESİ değil FAZLA GÖRÜNMESİ demektir — tabelacıya menü şablonu
   göstermek hiçbir hata üretmez, yalnızca modül sınırını sessizce siler.
   Anahtarın yanlış yazılması ise daha da sessizdir: react-query
   tekilleştirmesi anahtara bağlıdır, farklı yazan yüzey kendi isteğini kurar
   ve iki ekran aynı anda FARKLI daraltma gösterebilir.

   BU DOSYANIN İŞİ: (a) türetme kuralının kendisini sentetik girdiyle ölçmek,
   (b) yedinci bir yüzeyin okumayı yeniden EL YAZMASINI engellemek. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SEKTORLER, type Sektor } from "@tezgah/templates/identity";
import {
  KURULUM_DARALTMASI_ANAHTARI,
  daraltmaKumesi,
  type KurulumDaraltmasiIlani,
} from "./kurulumDaraltmasi";

const BU_DOSYA = fileURLToPath(import.meta.url);
const WEB_SRC = path.resolve(path.dirname(BU_DOSYA), "..");
const ILAN_DOSYASI = path.join(WEB_SRC, "lib", "kurulumDaraltmasi.ts");

/** Sorgu anahtarının el yazımı kopyası. */
const ELDE_ANAHTAR = /queryKey:\s*\[\s*"isKollari"\s*\]/;
/** "kaynak varsayılansa daraltma yok" eşlemesinin el yazımı kopyası. */
const ELDE_TERNARY = /kaynak\s*===\s*"yapilandirma"/;

function kaynakDosyalari(): Array<{ ad: string; tam: string; kaynak: string }> {
  const bulunan: Array<{ ad: string; tam: string; kaynak: string }> = [];
  const gez = (dizin: string): void => {
    for (const g of fs.readdirSync(dizin, { withFileTypes: true })) {
      const tam = path.join(dizin, g.name);
      if (g.isDirectory()) gez(tam);
      /* KENDİNİ TARAMAZ: yukarıdaki iki desen METİN OLARAK bu dosyada duruyor
         (ve durmak zorunda). Kendi kaynağını okuyan bir nöbetçi, kendi
         örnekleriyle beslenir — `yokluk-iddiasi.test.ts`'te ölçülmüş
         kör nokta, aynısı burada tekrarlanmasın diye tam yolla dışlanır. */
      else if (tam !== BU_DOSYA && /\.tsx?$/.test(g.name)) {
        bulunan.push({ ad: path.relative(WEB_SRC, tam), tam, kaynak: fs.readFileSync(tam, "utf8") });
      }
    }
  };
  gez(WEB_SRC);
  return bulunan;
}

describe("türetme kuralı — sentetik girdiyle ölçülür", () => {
  it("yapılandırılmış ilan DARALTMA kümesini verir", () => {
    const ilan: KurulumDaraltmasiIlani = {
      aktif: ["tabelaci"] as Sektor[],
      tumu: SEKTORLER,
      kaynak: "yapilandirma",
    };
    expect(daraltmaKumesi(ilan)).toEqual(["tabelaci"]);
  });

  it("KAYNAK AYIRT EDİCİ: `varsayilan` daraltılmış bir kümeyle gelse bile süzme YOK", () => {
    /* BU SATIR SENTETİKTİR VE BİLEREK ÖYLE. Sunucu bugün `varsayilan`
       kaynağında `aktif` olarak TÜM iş kollarını döndürür — yani gerçek
       veriyle `undefined` ile `SEKTORLER` aynı sonucu üretir ve kuralın
       ayırt ediciliği ÖLÇÜLEMEZ (aşağıdaki kayıtlı ölçüme bakın). Kuralı
       gerçekten sınamanın tek yolu, sunucunun bugün üretmediği bir ilanı
       elde kurmaktır: kaynak `varsayilan` ama küme dar. */
    const ilan: KurulumDaraltmasiIlani = {
      aktif: ["tabelaci"] as Sektor[],
      tumu: SEKTORLER,
      kaynak: "varsayilan",
    };
    expect(daraltmaKumesi(ilan)).toBeUndefined();
  });

  it("ilan YOKKEN (uç henüz yanıtlamadı) süzme YOK", () => {
    expect(daraltmaKumesi(undefined)).toBeUndefined();
  });

  it("anahtar TEK İLAN ve gerçekten kullanılan değer", () => {
    expect(KURULUM_DARALTMASI_ANAHTARI).toEqual(["isKollari"]);
    expect(fs.readFileSync(ILAN_DOSYASI, "utf8")).toMatch(
      /queryKey:\s*KURULUM_DARALTMASI_ANAHTARI/
    );
  });
});

describe("NÖBETÇİ — yedinci yüzey okumayı EL YAZAMAZ", () => {
  it("tarama konusuz değil: kaynak dosyalar bulunuyor", () => {
    /* Bu satır olmadan aşağıdaki iki iddia, hiçbir dosyayı okumayan bozuk
       bir tarayıcıyla da yeşil kalırdı. */
    const dosyalar = kaynakDosyalari();
    expect(dosyalar.length).toBeGreaterThan(50);
    for (const beklenen of [
      "components/DocumentsPanel.tsx",
      "components/ProjectsPanel.tsx",
      "components/ScenesPanel.tsx",
      "pages/EditorPage.tsx",
      "pages/ParseDictPage.tsx",
      "pages/SiparisPage.tsx",
    ]) {
      expect(dosyalar.map((d) => d.ad), `taramada eksik: ${beklenen}`).toContain(beklenen);
    }
  });

  it("DESENLER GERÇEKTEN EŞLEŞİYOR: yasaklanan biçimin kendisi örnek olarak sınanır", () => {
    /* Nöbetçinin ikinci ön-koşulu: "hiçbir dosyada yok" iddiası, desenler
       hiçbir şeye uymuyorsa da doğru çıkardı.

       POZİTİF KONTROL BİR ÖRNEK OLMAK ZORUNDA, DOSYA DEĞİL — VE BU ÖLÇÜLDÜ:
       ilk yazımda ilan dosyası pozitif kontrol olarak okunuyordu ve test
       KIRMIZI döndü, çünkü ilan dosyası anahtarı artık `queryKey:
       KURULUM_DARALTMASI_ANAHTARI` diye yazıyor — yasaklanan ham biçim orada
       zaten YOK. Yani o kontrol, ölçmek istediği şeyi değil bir yan ürünü
       ölçüyordu. Aşağıdaki örnek, değişiklikten ÖNCEKİ altı kopyanın birebir
       metnidir; desen ona uymuyorsa nöbetçi hiçbir şey korumuyordur. */
    const ONCEKI_BICIM = [
      '  const isKollari = useQuery({ queryKey: ["isKollari"], queryFn: api.isKollari });',
      "  const aktifSektorler =",
      '    isKollari.data?.kaynak === "yapilandirma" ? isKollari.data.aktif : undefined;',
    ].join("\n");
    expect(ONCEKI_BICIM, "anahtar deseni eski biçime uymuyor").toMatch(ELDE_ANAHTAR);
    expect(ONCEKI_BICIM, "ternary deseni eski biçime uymuyor").toMatch(ELDE_TERNARY);

    /* Kuralın GERÇEK evi hâlâ ilan dosyasıdır — ternary orada yazılıdır. */
    expect(fs.readFileSync(ILAN_DOSYASI, "utf8")).toMatch(ELDE_TERNARY);
  });

  it("İLAN DOSYASI DIŞINDA hiçbir yerde el yazımı okuma YOK", () => {
    const ihlaller = kaynakDosyalari()
      .filter((d) => d.tam !== ILAN_DOSYASI)
      .filter((d) => ELDE_ANAHTAR.test(d.kaynak) || ELDE_TERNARY.test(d.kaynak))
      .map((d) => d.ad);
    expect(
      ihlaller,
      "kurulum daraltması el yazımıyla okunuyor — `useKurulumDaraltmasi()` kullanın"
    ).toEqual([]);
  });
});
