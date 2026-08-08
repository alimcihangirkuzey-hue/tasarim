/* SESSİZ DÜŞEN YAZMA İŞLEMİNİN GÖRÜNEN YÜZÜ (hataYayini.ts başlığı).

   Uygulamada BİR KEZ kurulur (main.tsx). Kendi `onError`'ı olmayan bir
   mutation düştüğünde gerekçeyi gösterir; kullanıcı kapatana kadar durur.

   NİYE KENDİLİĞİNDEN KAYBOLMUYOR: bu bir bildirim değil, BAŞARISIZ BİR YAZMA
   işlemidir. Kendiliğinden kaybolan bir uyarı, operatör başka yere bakarken
   geçer ve yara (kaydedildi sanmak) aynen sürerdi. */

import { useEffect, useState } from "react";
import { hataDinle, hatayiTemizle, sonHata, type Hata } from "../lib/hataYayini";
import { t } from "../i18n";

export function HataBandi() {
  const [hata, setHata] = useState<Hata | null>(sonHata);

  useEffect(() => hataDinle(setHata), []);

  if (!hata) return null;
  return (
    <div className="toast hata-bandi" role="alert">
      <span>{t("common.write_failed")}: {hata.mesaj}</span>
      <button className="icon" title={t("common.dismiss")} onClick={hatayiTemizle}>
        ✕
      </button>
    </div>
  );
}
