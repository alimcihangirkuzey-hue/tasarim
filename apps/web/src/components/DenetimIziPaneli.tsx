/* MAKİNE KANALI DENETİM İZİ paneli (journal 2026-07-28-denetim-izi-ekrani).

   "İz yazılıyor ama kimse okumuyor" borcunun ekran yarısı: integration_events
   v14'ten beri /render'ın her kararını (üretim + beş ret kodu) kaydediyordu
   (ADR-008), okuma ucu da açıktı (GET /api/documents/:id/integration-events) —
   ama operatör bir makine isteğinin NEDEN reddedildiğini ancak veritabanına
   bakarak görebiliyordu. Bu panel o cevabı editöre taşır.

   NEDEN PROPS-GÜDÜMLÜ AYRI BİLEŞEN (sorgu EditorPage'de): (a) export-geçmişi
   panelinin deseni birebir — veri sayfada, sunum küçük parçada; (b) test
   edilebilirlik — props alan bileşen provider'sız çıplak render ile ölçülür
   (bileşen-testi altyapısının ölçtüğü en ucuz sınıf); 907 satırlık EditorPage'i
   panel testleri için render etmek gerekmez.

   FİLTRE BİLEREK YOK (v1): uç filtresizdir ve repoda filtreli-liste deseni hiç
   yoktur (ölçüldü) — uçta olmayan yeteneği ekrana koymak süs olurdu. Tavan da
   ucun ilanıdır (LIMIT 100, şerhli): 100 satır göründüğünde "son 100" ibaresi
   basılır — sessiz kırpma değil, ilanlı tavan. */

import type { IntegrationEventDTO } from "@tezgah/shared";
import { t, tf } from "../i18n";

/** Ucun belgeli tavanı (render.ts LIMIT 100). Satır sayısı tavana çarptığında
    ibare gösterilir; uç toplam sayıyı DÖNDÜRMEDİĞİ için "daha fazlası var mı"
    bilinemez — ibare bu belirsizliği dürüstçe söyler ("en az" değil "son"). */
const UC_TAVANI = 100;

export function DenetimIziPaneli({ rows }: { rows: IntegrationEventDTO[] }): React.ReactNode {
  /* İz yoksa panel yok — exports panelinin görünürlük sözleşmesi birebir
     (boş başlıklı kutu gürültüdür; iz doğduğu an panel de doğar). */
  if (rows.length === 0) return null;

  return (
    <div className="epanel">
      <h3>{t("iz.title")}</h3>
      {rows.map((r) => (
        <div className="row" key={r.id} style={{ fontSize: 13 }}>
          {r.outcome === "uretildi" ? (
            <span className="pill ok">{t("iz.uretildi")}</span>
          ) : (
            /* Ret satırının kimliği error_code'dur: operatörün düzeltebileceği
               şey sebeptir, HTTP durum kodu değil — kod pill'de, durum muted.
               Sınıflar styles.css'in mevcut sözlüğünden (pill.ok/pill.red). */
            <span className="pill red">{r.error_code}</span>
          )}
          <span className="muted">HTTP {r.http_status}</span>
          {r.variant && <span className="muted">{r.variant}</span>}
          {typeof r.payload.pages === "number" && (
            <span className="muted">{tf("iz.pages", { n: r.payload.pages })}</span>
          )}
          <span className="muted">{new Date(r.created_at).toLocaleTimeString("tr-TR")}</span>
        </div>
      ))}
      {rows.length >= UC_TAVANI && <div className="muted">{t("iz.tavan")}</div>}
    </div>
  );
}
