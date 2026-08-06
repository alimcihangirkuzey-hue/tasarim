/* TOPLU DIŞA AKTARIM (K-1/B — çoklu proje hızı).

   ÖLÇÜLEN YARA — İKİ PARÇA:
   (1) Gövde ProjectsPanel'in içindeydi ve TEK BİR TESTİ YOKTU (bu turda arandı:
       `topluAktar`/`bulk_export` geçen sıfır test dosyası). Kardeşi topluBaslat
       bir kütüphanedir ve ölçülür — aynı başlığın iki yarısından biri ölçülüyor,
       diğeri ölçülmüyordu.
   (2) Sonuç SAYI veriyordu, GEREKÇE vermiyordu: "5 üretildi · 0 engelli · 3
       düştü". Hangi üçü? Neden? `catch { dusen += 1 }` gerekçeyi yutuyordu.
       K-1/B'nin tezi HIZ'dır; bir şey düşünce operatör N belgeyi tek tek açıp
       aramak zorundaysa toplu yol kazandırdığını geri alır. */

import { describe, expect, it, vi } from "vitest";
import type { OrderItemDTO } from "@tezgah/shared";
import {
  aktarimSonucVerisi,
  topluAktar,
  type AktarimAdimlari,
  type AktarimMetinleri,
} from "./topluAktarim";

function kalem(id: string, document_id: string | null): OrderItemDTO {
  return {
    id,
    project_id: "prj_1",
    product_type: "tabela",
    qty: 1,
    width_cm: 100,
    height_cm: 50,
    details: {},
    status: "tasarimda",
    document_id,
    notes: "",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  } as unknown as OrderItemDTO;
}

const METIN: AktarimMetinleri = {
  kayitsizSablon: "Şablon kayıtlı değil",
  bloklu: (g) => g.join(" · "),
  hata: (e) => (e as Error).message,
};

/** Her belgeyi TEMİZ sayan adımlar (aksi belirtilmedikçe). */
function adimlar(over: Partial<AktarimAdimlari> = {}): AktarimAdimlari {
  return {
    hazirla: vi.fn(async () => ({ kayitli: true, blockerlar: [] as string[] })),
    aktar: vi.fn(async () => undefined),
    ...over,
  };
}

describe("toplu aktarım turu", () => {
  it("ÖN-KOŞUL: temiz kurulumda HER belgeli kalem aktarılır", () => {
    /* Bu satır olmadan aşağıdaki "düşen" iddiaları, hiçbir şeyi aktarmayan
       bozuk bir turla da yeşil kalırdı. */
    return topluAktar([kalem("a", "doc_a"), kalem("b", "doc_b")], adimlar(), METIN).then((o) => {
      expect(o).toMatchObject({ aktarilan: 2, bloklu: 0, dusen: 0 });
      expect(o.satirlar.every((s) => s.durum === "aktarildi" && s.gerekce === null)).toBe(true);
    });
  });

  it("BELGESİZ kalem sayıma GİRMEZ — düğme zaten belgeli sayısını yazar", async () => {
    const a = adimlar();
    const o = await topluAktar([kalem("a", "doc_a"), kalem("b", null)], a, METIN);
    expect(o.satirlar).toHaveLength(1);
    expect(a.hazirla).toHaveBeenCalledTimes(1);
  });

  it("DÜŞEN kalemin GEREKÇESİ taşınır — sessizce yutulmaz", async () => {
    /* Yaranın kendisi. */
    const a = adimlar({
      aktar: vi.fn(async () => {
        throw new Error("Failed to launch the browser process");
      }),
    });
    const o = await topluAktar([kalem("a", "doc_a")], a, METIN);
    expect(o.dusen).toBe(1);
    expect(o.satirlar[0]!.gerekce).toBe("Failed to launch the browser process");
  });

  it("ENGELLİ kalemin gerekçesi BLOCKER metinleridir", async () => {
    const a = adimlar({
      hazirla: vi.fn(async () => ({ kayitli: true, blockerlar: ["Logo eksik", "Ürün taştı"] })),
    });
    const o = await topluAktar([kalem("a", "doc_a")], a, METIN);
    expect(o).toMatchObject({ aktarilan: 0, bloklu: 1, dusen: 0 });
    expect(o.satirlar[0]!.gerekce).toBe("Logo eksik · Ürün taştı");
  });

  it("ENGELLİ kalem AKTARILMAZ — blocker kapısı atlatılmaz", async () => {
    /* Toplu yol tekil yoldan daha gevşek olamaz. */
    const a = adimlar({
      hazirla: vi.fn(async () => ({ kayitli: true, blockerlar: ["Logo eksik"] })),
    });
    await topluAktar([kalem("a", "doc_a")], a, METIN);
    expect(a.aktar).not.toHaveBeenCalled();
  });

  it("KAYITSIZ ŞABLON düşer ve nedeni SÖYLENİR", async () => {
    const a = adimlar({ hazirla: vi.fn(async () => ({ kayitli: false, blockerlar: [] })) });
    const o = await topluAktar([kalem("a", "doc_a")], a, METIN);
    expect(o.dusen).toBe(1);
    expect(o.satirlar[0]!.gerekce).toBe("Şablon kayıtlı değil");
    expect(a.aktar).not.toHaveBeenCalled();
  });

  it("DÜŞEN kalem TURU DURDURMAZ — kalanlar koşar", async () => {
    let n = 0;
    const a = adimlar({
      aktar: vi.fn(async () => {
        n += 1;
        if (n === 1) throw new Error("ilk patladı");
      }),
    });
    const o = await topluAktar([kalem("a", "doc_a"), kalem("b", "doc_b")], a, METIN);
    expect(o).toMatchObject({ aktarilan: 1, dusen: 1 });
  });

  it("SIRAYLA koşar — paralel DEĞİL", async () => {
    /* Paralel gönderim aynı projeye eşzamanlı yazma yaratırdı (topluBaslat ile
       aynı gerekçe). Eşzamanlılık sayacıyla ölçülür, yorumla değil. */
    let acik = 0;
    let enFazla = 0;
    const a = adimlar({
      aktar: vi.fn(async () => {
        acik += 1;
        enFazla = Math.max(enFazla, acik);
        await Promise.resolve();
        acik -= 1;
      }),
    });
    await topluAktar([kalem("a", "doc_a"), kalem("b", "doc_b"), kalem("c", "doc_c")], a, METIN);
    expect(enFazla).toBe(1);
  });

  it("HAZIRLAMA hatası da GEREKÇELİ düşer", async () => {
    const a = adimlar({
      hazirla: vi.fn(async () => {
        throw new Error("belge okunamadı");
      }),
    });
    const o = await topluAktar([kalem("a", "doc_a")], a, METIN);
    expect(o.satirlar[0]).toMatchObject({ durum: "dusen", gerekce: "belge okunamadı" });
  });

  it("SATIRLAR kalem SIRASINI korur", async () => {
    const o = await topluAktar(
      [kalem("a", "doc_a"), kalem("b", "doc_b"), kalem("c", "doc_c")],
      adimlar(),
      METIN,
    );
    expect(o.satirlar.map((s) => s.item.id)).toEqual(["a", "b", "c"]);
  });
});

describe("sonuç verisi — DİZE DEĞİL, YAPI", () => {
  /* ESKİ HÂLİ BİR DİZE ÜRETİYORDU (`aktarimOzetMetni`) ve satırları "\n" ile
     birleştiriyordu. Sunum bir toast'tı ve `.toast` kuralında `white-space`
     YOKTUR → tarayıcı o satır sonlarını BOŞLUĞA çevirir; yani gerekçeler alt
     alta değil tek uzun satır hâlinde akıyordu. Artık yapı dönüyor ve
     satırların ayrı görünmesi ayrı DOM elemanlarına bağlı. */
  const bas = (o: { aktarilan: number; bloklu: number; dusen: number }) =>
    `${o.aktarilan} üretildi · ${o.bloklu} engelli · ${o.dusen} düştü`;
  const ad = (it: OrderItemDTO) => `Kalem ${it.id}`;

  it("BAŞLIK sayıları taşır", async () => {
    const o = await topluAktar([kalem("a", "doc_a")], adimlar(), METIN);
    expect(aktarimSonucVerisi(o, bas, ad).baslik).toBe("1 üretildi · 0 engelli · 0 düştü");
  });

  it("HER KALEM kendi satırı — gerekçe DİZEYE GÖMÜLMEZ", async () => {
    /* "Oldu" bilgisi bir SAYIDIR; "olmadı" bilgisi bir ADRESTİR. Adres artık
       ayrıştırılabilir bir alanda durur, metin içinde aranmaz. */
    const a = adimlar({
      hazirla: vi.fn(async (id: string) =>
        id === "doc_b" ? { kayitli: true, blockerlar: ["Logo eksik"] } : { kayitli: true, blockerlar: [] },
      ),
    });
    const o = await topluAktar([kalem("a", "doc_a"), kalem("b", "doc_b")], a, METIN);
    const veri = aktarimSonucVerisi(o, bas, ad);
    expect(veri.satirlar).toEqual([
      { ad: "Kalem a", durum: "tamam", gerekce: null },
      { ad: "Kalem b", durum: "engelli", gerekce: "Logo eksik" },
    ]);
  });

  it("DURUM ÇEVİRİSİ TAM — üç aktarım durumu üç panel durumuna düşer", async () => {
    /* Tablo `Record<AktarimDurumu, ...>` olduğu için yeni bir durum doğduğunda
       DERLENMEZ; bu test o eşlemenin bugünkü hâlini çivileyip yönünü de
       ölçer (engelli ile düşen birbirine karışmasın — biri sistemin kapısı,
       diğeri bir arıza). */
    const a = adimlar({
      hazirla: vi.fn(async (id: string) => {
        if (id === "doc_b") return { kayitli: true, blockerlar: ["Logo eksik"] };
        if (id === "doc_c") throw new Error("500");
        return { kayitli: true, blockerlar: [] };
      }),
    });
    const o = await topluAktar(
      [kalem("a", "doc_a"), kalem("b", "doc_b"), kalem("c", "doc_c")],
      a,
      METIN,
    );
    expect(aktarimSonucVerisi(o, bas, ad).satirlar.map((s) => s.durum)).toEqual([
      "tamam",
      "engelli",
      "dusen",
    ]);
  });

  it("SIRA KORUNUR — panel turun gerçek sırasını gösterir", async () => {
    const o = await topluAktar(
      [kalem("z", "doc_z"), kalem("a", "doc_a")],
      adimlar(),
      METIN,
    );
    expect(aktarimSonucVerisi(o, bas, ad).satirlar.map((s) => s.ad)).toEqual(["Kalem z", "Kalem a"]);
  });
});
