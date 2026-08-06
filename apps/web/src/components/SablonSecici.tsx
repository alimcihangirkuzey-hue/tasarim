/* ŞABLON SEÇİCİ — N seçenekli, GERÇEK iptalli (K-1/A, tek tık akışı).

   ÖLÇÜLEN YARA (`2026-08-06-sablon-secim-sorusu` paketinin kendi açık bulgusu):
   ≥2 şablonlu bir türde seçim bir `window.confirm` ile yapılıyordu ve bunun
   İKİ ayrı bedeli vardı:

   1. OPERATÖR VAZGEÇEMİYORDU. İşletim sistemi kutusunun "İptal"i turu iptal
      etmiyor, İKİNCİ ŞABLONU seçiyordu. Yani "yanlış düğmeye bastım" diyen
      operatörün önündeki tek çıkış, istemediği şablonla bir belge açmaktı —
      ve toplu turda bu, N belgenin tamamı demekti.
   2. ÜÇÜNCÜ ŞABLON SIĞMIYORDU. `confirm` iki cevap taşır. Önceki paket bunu
      sessiz bırakmamak için fırlatan bir ön-koşul + nöbetçi koymuştu: üçüncü
      şablon eklendiği gün SÜRÜM DURACAKTI. Doğru davranıştı ama çözüm değildi.

   BU BİLEŞEN İKİSİNİ DE KAPATIR: seçenek sayısı ilandan gelir (2 de olur 5 de),
   her seçenek KENDİ düğmesidir ve "Vazgeç" gerçekten vazgeçer — çağıran `null`
   alır, hiçbir belge açılmaz.

   NEDEN SÖZ (PROMISE) TABANLI: çağıran yerler `useMutation` gövdeleridir ve
   akış `await`'lidir (`topluBaslat` türe göre sırayla sorar). Bir modal'ı
   olay-geri-çağırma biçiminde bağlamak, o akışı ikiye bölmeyi ve turun
   durumunu bileşende elle taşımayı gerektirirdi. `sor()` bir söz döndürür;
   akış olduğu gibi kalır.

   ASILI KALMA RİSKİ KAPATILDI — bu bileşenin en önemli güvencesi: söz
   tabanlı bir modal, bileşen çözülürse (operatör başka sayfaya geçerse)
   asla çözülmeyen bir söz bırakır ve `topluBaslat` SONSUZA DEK bekler —
   düğme "Başlatılıyor…" hâlinde kilitli kalırdı. Çözülme anında bekleyen
   soru VAZGEÇ olarak çözülür: tur temiz kapanır, sayı raporda görünür. */

import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "../i18n";
import { sablonAdi } from "../lib/sablonSorusu";

/** Seçicinin çalışması için gereken en az seçenek. */
export const ASGARI_SECENEK = 2;

interface AcikSoru {
  turAdi: string;
  secenekler: readonly string[];
  cevapla: (secim: string | null) => void;
}

export interface SablonSecici {
  /**
   * Operatöre şablonu sorar.
   *
   * @param turAdi ürün türünün çevrilmiş adı (çağıran i18n'den verir)
   * @param secenekler İLAN sırasında şablon kimlikleri
   * @returns seçilen kimlik, ya da VAZGEÇİLDİYSE `null`
   */
  sor: (turAdi: string, secenekler: readonly string[]) => Promise<string | null>;
  /** Modal — çağıran bileşen ağacına koyar; açık soru yoksa `null`. */
  eleman: JSX.Element | null;
}

export function useSablonSecici(): SablonSecici {
  const [soru, setSoru] = useState<AcikSoru | null>(null);
  /* Bekleyen sorunun kendisi ref'te de tutulur: çözülme (unmount) temizliği
     state'i OKUYAMAZ (efekt kapanışı ilk render'ın state'ini görürdü). */
  const bekleyen = useRef<AcikSoru | null>(null);

  useEffect(
    () => () => {
      /* ÇÖZÜLME = VAZGEÇME. Bkz. dosya başlığı: çözülmeyen söz turu kilitler. */
      bekleyen.current?.cevapla(null);
      bekleyen.current = null;
    },
    [],
  );

  const sor = useCallback(
    (turAdi: string, secenekler: readonly string[]): Promise<string | null> => {
      /* AZ SEÇENEKTE FIRLATIR, SESSİZCE SEÇMEZ: tek seçenekli türde soru
         sormak çağıranın hatasıdır (`topluPlan` onları `hazir` kovasına
         ayırır). Burada sessizce ilkini döndürmek, o hatayı operatöre
         "soru sorulmadı" diye gösterirdi — hangi kovanın kaydığı görünmezdi. */
      if (secenekler.length < ASGARI_SECENEK) {
        throw new Error(
          `şablon seçici en az ${ASGARI_SECENEK} seçenek bekler, ${secenekler.length} geldi ` +
            `(${secenekler.join(", ")}) — tek seçenekli tür sorusuz koşar`,
        );
      }
      return new Promise<string | null>((resolve) => {
        const acik: AcikSoru = {
          turAdi,
          secenekler,
          cevapla: (secim) => {
            bekleyen.current = null;
            setSoru(null);
            resolve(secim);
          },
        };
        bekleyen.current = acik;
        setSoru(acik);
      });
    },
    [],
  );

  return {
    sor,
    eleman: soru === null ? null : <SablonSeciciModal soru={soru} />,
  };
}

function SablonSeciciModal({ soru }: { soru: AcikSoru }): JSX.Element {
  /* ESC = VAZGEÇ. Klavyeyle açılan bir kutunun klavyeyle kapanmaması,
     `window.confirm`'den geriye gitmek olurdu. */
  useEffect(() => {
    const esc = (e: KeyboardEvent): void => {
      if (e.key === "Escape") soru.cevapla(null);
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [soru]);

  return (
    <div
      className="modal-back"
      /* Zemine tıklamak vazgeçmektir; kutunun İÇİNE tıklamak kapatmaz
         (yoksa seçeneğe uzanan el kutuyu kapatabilirdi). */
      onClick={() => soru.cevapla(null)}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0 }}>{soru.turAdi} — {t("orders.template_pick_title")}</h3>
        <div className="muted" style={{ fontSize: 13 }}>{t("orders.template_pick_hint")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {soru.secenekler.map((tid) => (
            <button
              key={tid}
              onClick={() => soru.cevapla(tid)}
              style={{ textAlign: "left", padding: "10px 12px" }}
            >
              <strong>{sablonAdi(tid)}</strong>
              {/* KİMLİK DE GÖRÜNÜR: kayıtsız bir şablonda `sablonAdi` kimliğin
                  kendisini döndürür ve iki satır aynı olur — operatör "bu ne"
                  diye sorabilir. Uydurma ad üretmiyoruz, gizlemiyoruz da. */}
              <div className="muted" style={{ fontSize: 11 }}>{tid}</div>
            </button>
          ))}
        </div>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="ghost" onClick={() => soru.cevapla(null)}>
            {t("orders.template_pick_cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
