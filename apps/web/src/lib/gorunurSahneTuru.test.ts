/* SAHNE TÜRÜ GÖRÜNÜRLÜĞÜ (K-1/C — modül sınırı, beşinci yüzey).

   ÖLÇÜLEN YARA: 7.1/481'in "kullanıcı yalnızca yaptığı işi görür" hükmü
   şablon seçicisine, rehber kartlarına, sipariş türü seçicisine ve Açılış
   Takımı presetine uygulanmıştı; SAHNE türü seçicisi atlanmıştı. Tabelacıya
   daraltılmış bir kurulumda operatör hâlâ "Giyim" sahnesi kurabiliyordu.

   SEKTÖR TÜRETİLİR — ve zincir bu turda ÖLÇÜLDÜ (tahmin değil):
     garment → tekstil-baski   ·   vitrine · facade · generic → İLANSIZ
   Yani `mockup_tercihi` ilanı seyrek: kayıt defterinde onu ilan eden TEK
   şablon `garment`. Bu dosyanın en önemli işlerinden biri, o zayıflığı
   GÖRÜNÜR kılmaktır — "sahne seçicisi iş koluna bağlandı" cümlesi, bugün
   en fazla bir türün gizlenebildiği gerçeğini örtemez. */

import { describe, expect, it } from "vitest";
import { SceneKindSchema } from "@tezgah/shared";
import { SEKTORLER } from "@tezgah/templates/identity";
import {
  SAHNE_TURLERI,
  gorunurSahneTurleri,
  sahneTuruSektoru,
  tekSektorAtfi,
} from "./gorunurSahneTuru";

describe("ön-koşul — türetim GERÇEKTEN bir şey buluyor", () => {
  it("TÜR LİSTESİ ŞEMADAN gelir — el yazımı ikinci kopya değil", () => {
    /* Eski hâli `const KINDS = ["vitrine", ...]` idi; şemaya yeni bir tür
       eklendiği gün seçicide sessizce eksik kalırdı. */
    expect(SAHNE_TURLERI).toEqual([...SceneKindSchema.options]);
  });

  it("EN AZ BİR TÜR bir iş koluna atfedilebiliyor", () => {
    /* Bu satır olmadan aşağıdaki daraltma iddiaları, hiçbir türü
       bağlayamayan bozuk bir türetimle de yeşil kalırdı: süzgeç hiçbir şey
       gizlemez, testler "gizlenmedi" der ve mekanizma ölçülmemiş olurdu. */
    const bagli = SAHNE_TURLERI.filter((k) => sahneTuruSektoru(k) !== null);
    expect(bagli.length, "hiçbir sahne türü iş koluna bağlanamadı").toBeGreaterThan(0);
  });
});

describe("türetim — kayıt defterinden okunur", () => {
  it("GARMENT tekstil iş koluna bağlı", () => {
    /* Zincir: garment şablonu `sahne_turleri: ["garment"]` ilan eder,
       `manifest.type` = tekstil, `HEDEF_SEKTOR.tekstil` = tekstil-baski. */
    expect(sahneTuruSektoru("garment")).toBe("tekstil-baski");
  });

  it("İLANSIZ türler NULL döner — uydurma bağ yok", () => {
    /* ÖLÇÜLDÜ: vitrine/facade/generic'i hiçbir şablon `mockup_tercihi` ile
       ilan etmiyor. Onları elle bir iş koluna bağlamak (ör. vitrine →
       cam-giydirme) ölçülmemiş bir olguyu kod hâline getirmek olurdu —
       `dogus-varsayilanlari` paketinin düzelttiği hatanın aynısı. */
    for (const k of ["vitrine", "facade", "generic"] as const) {
      expect(sahneTuruSektoru(k), k).toBeNull();
    }
  });

  it("TÜRETİLEN iş kolu GERÇEKTEN ilan edilmiş bir koldur", () => {
    for (const k of SAHNE_TURLERI) {
      const s = sahneTuruSektoru(k);
      if (s !== null) expect(SEKTORLER, k).toContain(s);
    }
  });
});

describe("süzgeç", () => {
  it("YAPILANDIRMA YOKSA hiçbir şey süzülmez — bugünkü davranış birebir", () => {
    expect(gorunurSahneTurleri(undefined)).toEqual([...SAHNE_TURLERI]);
  });

  it("İŞ KOLU AÇIKSA tür görünür", () => {
    expect(gorunurSahneTurleri(["tekstil-baski"])).toContain("garment");
  });

  it("İŞ KOLU KAPALIYSA tür GİZLENİR", () => {
    /* Yaranın kendisi: tabelacıya daraltılmış kurulumda "Giyim" sahnesi. */
    expect(gorunurSahneTurleri(["tabelaci"])).not.toContain("garment");
  });

  it("İLANSIZ türler HER kurulumda kalır — liste boşalamaz", () => {
    /* Kaçış kapısı: süzgecin onlar hakkında söyleyeceği bir şey yok.
       Boşalsaydı daraltma "sahne kuramıyorum"a dönerdi. */
    const dar = gorunurSahneTurleri([]);
    expect(dar).toEqual(["vitrine", "facade", "generic"]);
    expect(dar.length).toBeGreaterThan(0);
  });

  it("KORUNAN TÜR kapalı iş kolunda bile kalır", () => {
    /* Select'in değeri listede olmazsa tarayıcı ilk seçeneği gösterir ve
       operatör sahnesinin türünü YANLIŞ görür (gorunurSablonlar emsali). */
    expect(gorunurSahneTurleri(["tabelaci"], "garment")).toContain("garment");
  });

  it("SIRA İLAN SIRASIDIR — süzme sırayı bozmaz", () => {
    const dar = gorunurSahneTurleri(["tekstil-baski"]);
    expect(dar).toEqual(SAHNE_TURLERI.filter((k) => dar.includes(k)));
  });
});

describe("bugünkü türetimin ZAYIFLIĞI — görünür kılınıyor", () => {
  it("YALNIZ BİR tür bağlı: süzgeç bugün en fazla birini gizler", () => {
    /* Bu satır bir başarı iddiası DEĞİL, bir SINIR kaydıdır. `mockup_tercihi`
       ilanı yayıldıkça bu sayı büyür ve test o günü söyler — böylece
       "sahne seçicisi iş koluna bağlandı" cümlesi olduğundan geniş
       okunamaz. */
    const bagli = SAHNE_TURLERI.filter((k) => sahneTuruSektoru(k) !== null);
    expect(bagli).toEqual(["garment"]);
  });
});

describe("ATIF KURALI — saf, kayıt defterinden bağımsız ölçülür", () => {
  /* BU BLOĞUN NEDEN VAR OLDUĞU ÖLÇÜLDÜ: kuralı bozan bir negatif kontrol
     (`size === 1` yerine `size >= 1`) HİÇBİR testi kırmızıya döndürmedi —
     çünkü bugün hiçbir sahne türünü iki farklı iş kolundan şablon ilan
     etmiyor, yani iki kural AYNI sonucu veriyor. Kural, ancak sentetik
     kümeyle doğrudan sınanınca ölçülmüş olur. */
  it("TEK iş kolu → o kola atfedilir", () => {
    expect(tekSektorAtfi(new Set(["tabelaci"]))).toBe("tabelaci");
  });

  it("İKİ iş kolu → atfedilemez, GİZLENMEZ", () => {
    /* Kuşkuda görünür taraf: daraltma, operatörün yapabildiği bir işi
       elinden almaya dönüşemez. */
    expect(tekSektorAtfi(new Set(["tabelaci", "tekstil-baski"]))).toBeNull();
  });

  it("BOŞ küme → atfedilemez (ilan eden şablon yok)", () => {
    expect(tekSektorAtfi(new Set())).toBeNull();
  });
});
