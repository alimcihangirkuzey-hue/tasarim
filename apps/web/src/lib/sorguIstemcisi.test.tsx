// @vitest-environment jsdom
/* SESSİZ DÜŞEN YAZMA İŞLEMLERİ (K-1/B — operatörün gerçek hızı yalancı
   başarıyla değil, güvenilir geri bildirimle artar).

   ÖLÇÜLEN YARA (bu turda SAYILDI, tahmin değil): apps/web'de 50 `useMutation`
   var, 39'unda `onError` YOK; ve QueryClient'ta genel yakalayıcı da yoktu
   (main.tsx `defaultOptions` yalnız `queries` taşıyordu, `mutationCache` hiç
   yoktu). React Query mutation reddini KENDİ İÇİNDE yakalar — `mutate()`
   fırlatmaz. Yani kaydet · sil · yükle · kataloğa yaz düştüğünde EKRANDA
   HİÇBİR ŞEY OLMUYORDU: operatör kaydettiğini sanıyordu.

   BU DOSYA UYGULAMANIN KENDİ İSTEMCİSİNİ ölçer (`istemciKur`), kopyasını
   değil — kurulum artık davranış taşıyor ve kopyayı ölçmek, doğru kopya +
   yanlış uygulama hâlini gizlerdi. */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import { istemciKur } from "./sorguIstemcisi";
import { hataYayiniSifirla } from "./hataYayini";
import { HataBandi } from "../components/HataBandi";

function Deneme({ onError }: { onError?: () => void }) {
  const m = useMutation({
    mutationFn: async () => {
      throw new Error("Sunucu hatası (500)");
    },
    ...(onError ? { onError } : {}),
  });
  return <button onClick={() => m.mutate()}>çalıştır</button>;
}

function kur(props: { onError?: () => void } = {}) {
  return render(
    <QueryClientProvider client={istemciKur()}>
      <Deneme {...props} />
      <HataBandi />
    </QueryClientProvider>,
  );
}

beforeEach(() => hataYayiniSifirla());
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("sessiz düşen mutation", () => {
  it("ÖN-KOŞUL: bandda başlangıçta hiçbir şey yok", () => {
    kur();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("onError'ı OLMAYAN mutation düşünce GEREKÇE görünür", async () => {
    kur();
    fireEvent.click(screen.getByText("çalıştır"));
    const bant = await screen.findByRole("alert");
    /* Mesaj uydurulmaz: http()'nin ürettiği gerekçe aynen taşınır. */
    expect(bant.textContent).toContain("Sunucu hatası (500)");
    expect(bant.textContent).toContain("İşlem kaydedilemedi");
  });

  it("KENDİ onError'I OLAN mutation bandı AÇMAZ (çift bildirim yok)", async () => {
    /* React Query genel yakalayıcıyı yerel onError ile BİRLİKTE çağırır.
       Ayrım yapılmasaydı, gerekçesini kendi diliyle söyleyen 11 mutation aynı
       hatayı iki kez gösterirdi. */
    const yerel = vi.fn();
    kur({ onError: yerel });
    fireEvent.click(screen.getByText("çalıştır"));
    await waitFor(() => expect(yerel).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("BANT KAPATILABİLİR ve kapanınca kalmaz", async () => {
    kur();
    fireEvent.click(screen.getByText("çalıştır"));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByTitle("Kapat"));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("KENDİLİĞİNDEN KAYBOLMAZ — başarısız yazma bir bildirim değildir", async () => {
    vi.useFakeTimers();
    try {
      kur();
      fireEvent.click(screen.getByText("çalıştır"));
      await vi.advanceTimersByTimeAsync(0);
      expect(screen.queryByRole("alert")).not.toBeNull();
      await vi.advanceTimersByTimeAsync(60_000);
      expect(screen.queryByRole("alert"), "bant zamanla kayboldu").not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("İKİNCİ hata birincinin yerine geçer (yığılmaz)", async () => {
    kur();
    fireEvent.click(screen.getByText("çalıştır"));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByText("çalıştır"));
    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1));
  });
});

describe("nöbetçi — düzeltme UYGULAMAYA fiilen bağlı", () => {
  /* Yukarıdaki testler FABRİKAYI ölçer. Fabrika doğru olup uygulama onu
     kullanmasaydı hepsi yeşil kalır, operatör yine hiçbir şey görmezdi —
     "kopya doğru, uygulama yanlış" tam da bu paketin kaçınmak istediği hâl. */
  function kaynaklar(): Array<[string, string]> {
    const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const cikti: Array<[string, string]> = [];
    const gez = (d: string): void => {
      for (const g of readdirSync(d, { withFileTypes: true })) {
        const tam = path.join(d, g.name);
        if (g.isDirectory()) gez(tam);
        else if (/\.tsx?$/.test(g.name) && !g.name.includes(".test."))
          cikti.push([path.relative(SRC, tam), readFileSync(tam, "utf8")]);
      }
    };
    gez(SRC);
    return cikti;
  }

  it("ÖN-KOŞUL: tarama main.tsx'i buluyor", () => {
    expect(kaynaklar().map(([f]) => f)).toContain("main.tsx");
  });

  it("main.tsx istemciyi FABRİKADAN alır ve bandı MONTE eder", () => {
    const main = kaynaklar().find(([f]) => f === "main.tsx")![1];
    expect(main, "istemciKur() kullanılmıyor").toContain("istemciKur()");
    expect(main, "HataBandi monte edilmemiş").toContain("<HataBandi />");
  });

  it("HİÇBİR üretim dosyası kendi QueryClient'ını KURMAZ", () => {
    /* Kendi istemcisini kuran ekran, genel yakalayıcıyı ATLAR ve o ekrandaki
       her sessiz düşüş geri gelir. */
    const kacanlar = kaynaklar()
      .filter(([f]) => f !== "lib/sorguIstemcisi.ts")
      .filter(([, s]) => /new QueryClient\s*\(/.test(s))
      .map(([f]) => f);
    expect(
      kacanlar,
      "Bu dosyalar kendi QueryClient'ını kuruyor; sessiz düşen mutation'lar " +
        "orada yine görünmez olur. lib/sorguIstemcisi.ts → istemciKur() kullanın.",
    ).toEqual([]);
  });
});
