// @vitest-environment jsdom
/* IntakeResult — M8 "sessiz değil" alanlarının sonuç ekranı sözleşmesi
   (journal 2026-07-28-m8-sessizlik-cip-ceviri).

   NEDEN BU TEST: POST /api/intake yanıtı skipped_bumps / note_dropped /
   catalog_had_categories alanlarını taşıyordu ama TÜKETİCİSİ SIFIRDI —
   operatör hiçbirini görmüyordu. Sözleşme iki yönlü:
   1. Alanlar doluysa sonuç ekranında GÖRÜNÜR (uyarı/bilgi).
   2. Boş/false ise HİÇBİR ek DOM üretilmez (sıfır-davranış — eski veriyle
      ekran aynen; regresyon bekçisi).

   Sarma: SiparisPage.test.tsx reçetesi — QueryClientProvider(retry:false) +
   MemoryRouter + vi.mock("../api"). IntakeResult useNavigate + useMutation
   kullanır (önizleme yolu); bu testler önizlemeye TIKLAMAZ, mock'lar yalnız
   modül yüklensin diye var. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { IntakeResultData } from "../components/IntakeSummaryStep";
import { IntakeResult } from "./SiparisPage";

vi.mock("../api", () => ({
  api: {
    /* IntakeResult'ın önizleme mutation'ı + SiparisPage modülünün diğer adım
       bileşenlerinin eriştiği uçlar (modül import zinciri için tamlık) */
    clients: vi.fn(),
    client: vi.fn(),
    sectors: vi.fn(),
    ingredients: vi.fn(),
    createIngredient: vi.fn(),
    documents: vi.fn(),
    createDocument: vi.fn(),
    intakeCommit: vi.fn(),
  },
}));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
});

/* Üç yeni alan BOŞ/false — sıfır-davranış temeli (eski veri şekliyle birebir) */
function veri(over: Partial<IntakeResultData> = {}): IntakeResultData {
  return {
    client_id: "cl_1",
    client_name: "Antalya Kebab",
    applied: 2,
    pending: [],
    gaps: [],
    surfaces: 0,
    mergedItems: 0,
    skippedBumps: [],
    noteDrops: [],
    catalogHad: false,
    ...over,
  };
}

function bas(data: IntakeResultData) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <IntakeResult data={data} onNew={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/* tr.json intake.* metinleri (t() aynı dosyadan okur — literal pin, kayarsa test kızarır) */
const SKIPPED_BASLIK = "Sayacı atlanan malzemeler (kütüphanede bulunamadı)";
const NOTE_BASLIK = "Birleşmede düşen kategori notları (mevcut satır değiştirilmedi)";
const CATALOG_BILGI = "Katalog doluydu — yalnız yeni içerik eklendi (mevcutlar değişmedi).";

describe("IntakeResult — M8 sessiz-değil alanları", () => {
  it("SIFIR-DAVRANIŞ: üç alan boşken skipped/note/katalog metinlerinin HİÇBİRİ DOM'da yok", () => {
    bas(veri());
    expect(screen.queryByText(SKIPPED_BASLIK, { exact: false })).toBeNull();
    expect(screen.queryByText(NOTE_BASLIK, { exact: false })).toBeNull();
    expect(screen.queryByText(CATALOG_BILGI, { exact: false })).toBeNull();
    /* Ekranın kendisi normal basılıyor (başarı başlığı) — boş alanlar ekranı bozmaz */
    expect(screen.getByText("Tamam — katalog güncellendi")).toBeTruthy();
  });

  it("ŞERH 4 GÖRÜNÜR: skippedBumps=[c1,c2] → uyarı bloğu + iki liste öğesi", () => {
    bas(veri({ skippedBumps: ["c1", "c2"] }));
    expect(screen.getByText(SKIPPED_BASLIK, { exact: false })).toBeTruthy();
    expect(screen.getByText("c1")).toBeTruthy();
    expect(screen.getByText("c2")).toBeTruthy();
  });

  it("note_dropped GÖRÜNÜR: kategori adı + düşen notun KENDİSİ basılır (bilgi kaybı yok)", () => {
    bas(veri({ noteDrops: [{ label: "Dürümler", note: "Acılı/acısız seçilir" }] }));
    expect(screen.getByText(NOTE_BASLIK, { exact: false })).toBeTruthy();
    expect(screen.getByText(/Dürümler — Acılı\/acısız seçilir/)).toBeTruthy();
  });

  it("ŞERH 1 BİLGİ satırı: catalogHad=true → muted not görünür (uyarı kutusu değil)", () => {
    bas(veri({ catalogHad: true, mergedItems: 3 }));
    const p = screen.getByText(CATALOG_BILGI);
    expect(p.className).toContain("intake-hint"); // muted bilgi satırı — intake-warn DEĞİL
  });
});
