// @vitest-environment jsdom
/* DenetimIziPaneli testleri (journal 2026-07-28-denetim-izi-ekrani).

   Panel BİLEREK props-güdümlü tasarlandı ve bu dosya o kararın karşılığını
   alıyor: provider'sız, mock'suz, router'sız ÇIPLAK render — bileşen-testi
   altyapısının ölçtüğü en ucuz test sınıfı. Sorgu EditorPage'de yaşar; buradaki
   iş yalnız "verilen satırlar doğru sunuluyor mu" ölçümüdür. */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { IntegrationEventDTO } from "@tezgah/shared";
import { DenetimIziPaneli } from "./DenetimIziPaneli";

/* vitest globals kapalı → RTL oto-cleanup kaydolmaz; elle kurulur
   (EditorPage.test.tsx reçetesinin aynısı). */
afterEach(cleanup);

function satir(kismi: Partial<IntegrationEventDTO>): IntegrationEventDTO {
  return {
    id: "iev_x",
    channel: "render",
    contract_v: 1,
    outcome: "reddedildi",
    http_status: 400,
    error_code: "invalid_params",
    document_id: "doc_1",
    client_id: "cli_1",
    template_id: "vitro-bandeau",
    variant: "print",
    target: "pdf",
    sha256: null,
    filepath: null,
    payload: {},
    created_at: "2026-07-28T10:00:00.000Z",
    ...kismi,
  };
}

describe("DenetimIziPaneli", () => {
  it("iz yoksa panel YOK (exports panelinin görünürlük sözleşmesi)", () => {
    const { container } = render(<DenetimIziPaneli rows={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("ret satırı error_code'u KIRMIZI pill'de gösterir — operatörün düzelteceği şey sebeptir", () => {
    render(
      <DenetimIziPaneli
        rows={[satir({ id: "iev_1", error_code: "channel_not_declared", http_status: 400 })]}
      />
    );
    const pill = screen.getByText("channel_not_declared");
    expect(pill.className).toBe("pill red");
    expect(screen.getByText("HTTP 400")).toBeTruthy();
    expect(screen.getByText("Makine kanalı izi")).toBeTruthy();
  });

  it("üretim satırı YEŞİL pill + sayfa sayısı (payload'dan)", () => {
    render(
      <DenetimIziPaneli
        rows={[
          satir({
            id: "iev_2",
            outcome: "uretildi",
            error_code: null,
            http_status: 201,
            sha256: "abc",
            filepath: "data/exports/x.pdf",
            payload: { pages: 3 },
          }),
        ]}
      />
    );
    const pill = screen.getByText("üretildi");
    expect(pill.className).toBe("pill ok");
    expect(screen.getByText("3 sayfa")).toBeTruthy();
  });

  it("100 satırda TAVAN ibaresi görünür, 99'da görünmez — ilanlı tavan, sessiz kırpma değil", () => {
    /* Uç toplam sayıyı döndürmez; 100 satır "en az 100 vardı" demektir. İbare
       tam da bu belirsizliği söyler. 99'da ibare basmak yanlış alarm olurdu. */
    const cok = (n: number) => Array.from({ length: n }, (_, i) => satir({ id: `iev_${i}` }));
    const r1 = render(<DenetimIziPaneli rows={cok(99)} />);
    expect(screen.queryByText(/Son 100 kayıt/)).toBeNull();
    r1.unmount();
    render(<DenetimIziPaneli rows={cok(100)} />);
    expect(screen.getByText(/Son 100 kayıt/)).toBeTruthy();
  });
});
