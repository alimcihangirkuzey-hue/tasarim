/* Belge dışa aktarımı — YÖNLENDİRME TEK KAYNAK.

   Bir belgenin hangi uca gideceği (garment / svg / pdf) manifest'in
   `production_channels` beyanından doğar; kararı `exportRouteOf` verir ve
   sunucu bekçileri de AYNI kaynağı okur (journal 2026-07-26-render-kanal-bekcisi).
   Bu dosya o üç yollu dallanmanın TEK kopyasıdır: editörün tekil "Export"
   düğmesi ve Sipariş Defteri'nin toplu dışa aktarımı buradan geçer.

   Ayrı yazılsalardı yeni bir kanal (ör. decoupe'nin ikinci yolu) eklendiğinde
   biri güncellenir, diğeri sessizce eski dallanmada kalırdı — bu reponun kendi
   dersi: "bir sınıf hatayı bir dalda kapatmak, kardeş dalların ölçüldüğü
   anlamına gelmez" (TODO 2026-07-27, menu-grid-cells pageCount ayrışması). */

import { exportRouteOf, type LayoutWarning, type ProductionChannel } from "@tezgah/templates";
import type { ExportRecordDTO } from "@tezgah/shared";
import { api } from "../api";

/**
 * Belgeyi ilan edilen kanalına göre dışa aktarır.
 *
 * `warnings` YALNIZ pdf yolunda taşınır — sunucunun blocker backstop'u onu
 * okur (exports.ts: "asıl kapı web modalındadır, bu denetim UI hatalarına
 * karşı savunmadır; sunucu tam analiz KOŞAMAZ — tam registry react taşır").
 * Yani boş dizi göndermek bekçiyi ATLATIR: çağıran, uyarıları gerçekten
 * hesaplamakla yükümlüdür.
 */
export async function belgeDisaAktar(
  id: string,
  channels: readonly ProductionChannel[],
  mode: unknown,
  warnings: readonly LayoutWarning[],
): Promise<ExportRecordDTO[]> {
  const rota = exportRouteOf(channels, mode);
  if (rota === "garment") {
    const res = await api.exportGarment(id);
    return [res.record];
  }
  if (rota === "svg") {
    return [await api.exportSvg(id)];
  }
  return api.exportDocument(id, warnings as unknown[]);
}
