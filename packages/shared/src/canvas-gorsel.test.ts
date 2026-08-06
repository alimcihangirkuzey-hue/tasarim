/* CANVAS GÖRSEL ARACI (K-1/A — sürükle-bırak yüzeyi).

   ÜRÜN SAHİBİ YÖNLENDİRMESİ (2026-08-06, birebir): "butarz flayerler sürükle
   bırak ve tıklama ile yapılmalı" — ve örnek olarak fotoğraf ağırlıklı
   takeaway menüleri gösterildi (pizza/dürüm/içecek hücreleri).

   ÖLÇÜLEN BOŞLUK: `/atolye` gerçekten sürüklenebilen, katmanlı, geri
   alınabilir bir yüzey — ama araç kümesi `select · rect · ellipse · text`
   idi: FOTOĞRAF KOYULAMIYORDU. Gösterilen örneklerin neredeyse tamamı
   fotoğraf hücresidir; yani yüzey vardı, örneklerin ana malzemesi yoktu.

   BU DOSYA ÇEKİRDEĞİ ÖLÇER (saf — Konva yok). Render tarafı AtolyePage'te. */

import { describe, expect, it } from "vitest";
import {
  CANVAS_MIN_SIZE,
  CANVAS_TOOLS,
  CanvasShapeSchema,
  EMPTY_CANVAS,
  GORSEL_UZUN_KENAR,
  canvasReduce,
  gorselBaslangicKutusu,
  oraniKoru,
  type CanvasState,
} from "./canvas.js";

const AT = { x: 100, y: 100 };

function ekle(over: Record<string, unknown> = {}, state: CanvasState = EMPTY_CANVAS): CanvasState {
  return canvasReduce(state, {
    type: "add",
    id: "sh_1",
    kind: "image",
    at: AT,
    asset: "ast_1",
    ...over,
  } as never);
}

describe("ön-koşul", () => {
  it("GÖRSEL aracı ilan edilmiş", () => {
    /* Bu satır olmadan aşağıdaki testler, aracı hiç tanımayan bir reducer'la
       "eklemedi" diyerek yanlış sebepten yeşil kalabilirdi. */
    expect(CANVAS_TOOLS).toContain("image");
  });

  it("ŞEMA görsel türünü ve kaynağını kabul eder", () => {
    const s = CanvasShapeSchema.parse({ id: "a", kind: "image", x: 0, y: 0, w: 10, h: 10, asset: "ast_1" });
    expect(s.asset).toBe("ast_1");
  });

  it("BOŞ kaynak şemada REDDEDİLİR", () => {
    expect(() =>
      CanvasShapeSchema.parse({ id: "a", kind: "image", x: 0, y: 0, w: 10, h: 10, asset: "" }),
    ).toThrow();
  });
});

describe("görsel ekleme", () => {
  it("KAYNAKLI görsel eklenir ve seçili olur", () => {
    const st = ekle();
    const sh = st.layers[0]!.shapes;
    expect(sh).toHaveLength(1);
    expect(sh[0]).toMatchObject({ kind: "image", asset: "ast_1" });
    expect(st.selectedId).toBe("sh_1");
  });

  it("KAYNAKSIZ görsel EKLENMEZ — boş kutu çizilmez", () => {
    /* Kaynağı olmayan görsel sahnede boş bir kutu olarak durur ve operatör
       onu "bozuk" sanır; oysa hiçbir şey bozulmamıştır. */
    const st = canvasReduce(EMPTY_CANVAS, { type: "add", id: "sh_1", kind: "image", at: AT });
    expect(st.layers[0]!.shapes).toHaveLength(0);
    expect(st).toBe(EMPTY_CANVAS);
  });

  it("DİĞER türler kaynaksız da eklenir — kapı YALNIZ görsele", () => {
    /* Kapının fazla geniş olmadığını ölçer: rect hâlâ tek tıkla düşer. */
    const st = canvasReduce(EMPTY_CANVAS, { type: "add", id: "sh_r", kind: "rect", at: AT });
    expect(st.layers[0]!.shapes).toHaveLength(1);
  });

  it("KİLİTLİ katmanda görsel de EKLENMEZ — korkuluk ortak", () => {
    const kilitli: CanvasState = {
      ...EMPTY_CANVAS,
      layers: [{ ...EMPTY_CANVAS.layers[0]!, locked: true }],
    };
    expect(ekle({}, kilitli).layers[0]!.shapes).toHaveLength(0);
  });

  it("SAHNE SINIRINA kelepçelenir — diğer şekillerle aynı korkuluk", () => {
    const st = ekle({ at: { x: 5000, y: 5000 } });
    const s = st.layers[0]!.shapes[0]!;
    expect(s.x + s.w).toBeLessThanOrEqual(900);
    expect(s.y + s.h).toBeLessThanOrEqual(600);
  });

  it("URL DEĞİL KİMLİK saklanır", () => {
    /* URL bir sunum ayrıntısıdır; taşınan/yeniden adlandırılan dosyada belge
       sessizce kırılırdı. */
    const s = ekle().layers[0]!.shapes[0]!;
    expect(s.asset).toBe("ast_1");
    expect(JSON.stringify(s)).not.toMatch(/https?:|\/assets\//);
  });
});

describe("doğal orana göre başlangıç kutusu", () => {
  it("YATAY görselde genişlik uzun kenar", () => {
    expect(gorselBaslangicKutusu({ w: 1200, h: 600 })).toEqual({
      w: GORSEL_UZUN_KENAR,
      h: Math.round(GORSEL_UZUN_KENAR / 2),
    });
  });

  it("DİKEY görselde yükseklik uzun kenar", () => {
    expect(gorselBaslangicKutusu({ w: 600, h: 1200 })).toEqual({
      w: Math.round(GORSEL_UZUN_KENAR / 2),
      h: GORSEL_UZUN_KENAR,
    });
  });

  it("KARE görsel kare doğar", () => {
    const k = gorselBaslangicKutusu({ w: 800, h: 800 });
    expect(k.w).toBe(k.h);
  });

  it("ÖLÇÜ BİLİNMİYORSA varsayılan kutu — oran UYDURULMAZ", () => {
    expect(gorselBaslangicKutusu(undefined)).toEqual({ w: 160, h: 120 });
    expect(gorselBaslangicKutusu({ w: 0, h: 0 })).toEqual({ w: 160, h: 120 });
  });

  it("AŞIRI İNCE görselde asgari boyutun ALTINA düşmez", () => {
    const k = gorselBaslangicKutusu({ w: 4000, h: 10 });
    expect(k.h).toBeGreaterThanOrEqual(CANVAS_MIN_SIZE);
  });

  it("EKLEME doğal oranı KULLANIR — kare foto kare kutuda doğar", () => {
    const s = ekle({ dogalOlcu: { w: 800, h: 800 } }).layers[0]!.shapes[0]!;
    expect(s.w).toBe(s.h);
  });
});

describe("en-boy oranı korunur (K-3 dilim 2)", () => {
  it("ÖN-KOŞUL: eklenen görsel doğal oranını SAKLAR", () => {
    /* Bu satır olmadan aşağıdaki koruma testleri, oranı hiç bilmeyen bir
       şekille "koruyor" diyerek yanlış sebepten yeşil kalırdı. */
    const s = ekle({ dogalOlcu: { w: 640, h: 360 } }).layers[0]!.shapes[0]!;
    expect(s.oran).toBeCloseTo(640 / 360, 6);
  });

  it("SIĞDIRIR, TAŞIRMAZ — kullanıcının kutusundan büyümez", () => {
    expect(oraniKoru(200, 50, 2)).toEqual({ w: 100, h: 50 });
    expect(oraniKoru(100, 200, 2)).toEqual({ w: 100, h: 50 });
  });

  it("GEÇERSİZ oranda dokunmaz", () => {
    expect(oraniKoru(100, 40, 0)).toEqual({ w: 100, h: 40 });
    expect(oraniKoru(100, 40, Number.NaN)).toEqual({ w: 100, h: 40 });
  });

  it("BOYUTLANDIRMA oranı BOZMAZ", () => {
    const st = ekle({ dogalOlcu: { w: 640, h: 360 } });
    const s = st.layers[0]!.shapes[0]!;
    const n = canvasReduce(st, { type: "resize", id: s.id, x: s.x, y: s.y, w: 400, h: 400 })
      .layers[0]!.shapes[0]!;
    expect(n.w / n.h).toBeCloseTo(640 / 360, 6);
  });

  it("ORAN BİRİKEREK KAYMAZ — altı boyutlandırma sonunda hâlâ aynı", () => {
    /* ÖLÇÜLEN YARA (ilk uygulamamda): yükseklik de ızgaraya yapıştırılınca
       oran her seferinde biraz kayıyordu ve kayma BİRİKİYORDU —
       1.7778 → 1.8750. Yükseklik artık doğal orandan TÜRETİLİR. */
    let st = ekle({ dogalOlcu: { w: 640, h: 360 } });
    for (let i = 0; i < 6; i++) {
      const s = st.layers[0]!.shapes[0]!;
      st = canvasReduce(st, { type: "resize", id: s.id, x: s.x, y: s.y, w: s.w + 37, h: s.h + 11 });
    }
    const son = st.layers[0]!.shapes[0]!;
    expect(son.w / son.h).toBeCloseTo(640 / 360, 6);
  });

  it("DİĞER türlerde serbest boyutlandırma SÜRÜYOR — kural yalnız görsele", () => {
    const st = canvasReduce(EMPTY_CANVAS, { type: "add", id: "r1", kind: "rect", at: AT });
    const n = canvasReduce(st, { type: "resize", id: "r1", x: 0, y: 0, w: 300, h: 40 })
      .layers[0]!.shapes[0]!;
    expect({ w: n.w, h: n.h }).toEqual({ w: 300, h: 40 });
  });

  it("ASGARİ BOYUTUN altına düşmez", () => {
    const st = ekle({ dogalOlcu: { w: 640, h: 360 } });
    const s = st.layers[0]!.shapes[0]!;
    const n = canvasReduce(st, { type: "resize", id: s.id, x: s.x, y: s.y, w: 1, h: 1 })
      .layers[0]!.shapes[0]!;
    expect(n.w).toBeGreaterThanOrEqual(CANVAS_MIN_SIZE);
    expect(n.h).toBeGreaterThanOrEqual(CANVAS_MIN_SIZE);
  });

  it("ORANI OLMAYAN görsel (ölçüsüz eklenmiş) serbest boyutlanır — sessiz varsayım yok", () => {
    /* Doğal ölçü bilinmiyorsa oran UYDURULMAZ; koruma da uygulanmaz. */
    const st = ekle({ dogalOlcu: undefined });
    const s = st.layers[0]!.shapes[0]!;
    expect(s.oran).toBeUndefined();
    const n = canvasReduce(st, { type: "resize", id: s.id, x: s.x, y: s.y, w: 300, h: 40 })
      .layers[0]!.shapes[0]!;
    expect({ w: n.w, h: n.h }).toEqual({ w: 300, h: 40 });
  });
});
