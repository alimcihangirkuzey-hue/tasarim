/* SEÇİM SORUSU — N seçenekli, GERÇEK vazgeçmeli modal (K-1/A tek tık akışı).

   NEDEN GENEL BİR KATMAN VAR: bu makine `SablonSecici` içinde doğdu ve orada
   ölçülmüş bir yarayı kapattı (`window.confirm`'ün "İptal"i turu iptal etmez,
   İKİNCİ seçeneği seçer). Bu turda AYNI yaranın ikinci yeri ölçüldü —
   müşteri klonlamada `clone.with_docs_confirm`: "İptal" klonu iptal etmiyor,
   "belgesiz klonla" demek oluyordu. İkinci tüketici gelince makineyi
   şablonlara özel bileşende bırakmanın iki yolu vardı ve ikisi de bu deponun
   tekrar tekrar ödediği bedeldir: ya bileşenden bileşene import, ya ELLE
   YAZILAN İKİNCİ KOPYA (söz + çözülme temizliği + Escape + zemin, dört ayrı
   incelik). Makine buraya alındı; `SablonSecici` onun ince bir sarmalayıcısı
   oldu ve KENDİ testleri değişmeden yeşil kaldı — taşımanın kanıtı odur.

   SÖZ (PROMISE) TABANLI: çağıran yerler `useMutation` gövdeleridir ve akış
   `await`'lidir. Modal'ı olay-geri-çağırma biçiminde bağlamak o akışı ikiye
   bölmeyi ve turun durumunu bileşende elle taşımayı gerektirirdi.

   ASILI KALMA KAPATILDI — bu katmanın en önemli güvencesi: söz tabanlı bir
   modal, bileşen çözülürse (operatör başka sayfaya geçerse) asla çözülmeyen
   bir söz bırakır ve çağıran SONSUZA DEK bekler — düğme "çalışıyor" hâlinde
   kilitli kalırdı. Çözülme anında bekleyen soru VAZGEÇ olarak çözülür. */

import { useCallback, useEffect, useRef, useState } from "react";

/** Seçicinin çalışması için gereken en az seçenek. */
export const ASGARI_SECENEK = 2;

export interface SecimSecenegi {
  /** Çağırana dönecek değer. */
  deger: string;
  /** Operatörün okuyacağı ad. */
  ad: string;
  /** İkinci satır — kimlik, sayı, uyarı. Yoksa çizilmez. */
  aciklama?: string | null;
}

export interface SecimIstemi {
  baslik: string;
  /** Tek satırlık açıklama; yoksa çizilmez. */
  ipucu?: string;
  secenekler: readonly SecimSecenegi[];
  vazgecEtiketi: string;
}

interface AcikSoru {
  istem: SecimIstemi;
  cevapla: (secim: string | null) => void;
}

export interface SecimSorusu {
  /**
   * Operatöre sorar.
   *
   * @returns seçilen `deger`, ya da VAZGEÇİLDİYSE `null`
   * @throws seçenek sayısı {@link ASGARI_SECENEK}'ten azsa
   */
  sor: (istem: SecimIstemi) => Promise<string | null>;
  /** Modal — çağıran bileşen ağacına koyar; açık soru yoksa `null`. */
  eleman: JSX.Element | null;
}

export function useSecimSorusu(): SecimSorusu {
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

  const sor = useCallback((istem: SecimIstemi): Promise<string | null> => {
    /* AZ SEÇENEKTE FIRLATIR, SESSİZCE SEÇMEZ: tek seçenekli bir soru
       çağıranın hatasıdır (şablon tarafında `topluPlan` onları sorusuz
       kovaya ayırır; klon tarafında belge yoksa soru HİÇ sorulmaz). Burada
       sessizce ilkini döndürmek, o hatayı operatöre "soru sorulmadı" diye
       gösterirdi — hangi kovanın kaydığı görünmezdi.

       SENKRON FIRLATIR, söz reddetmez: çağıran hatasının `catch` kuyruğuna
       düşmesi onu bir çalışma zamanı arızasıyla eşitlerdi. */
    if (istem.secenekler.length < ASGARI_SECENEK) {
      throw new Error(
        `seçim sorusu en az ${ASGARI_SECENEK} seçenek bekler, ${istem.secenekler.length} geldi ` +
          `(${istem.secenekler.map((s) => s.deger).join(", ")}) — tek seçenekli soru sorulmaz`,
      );
    }
    return new Promise<string | null>((resolve) => {
      const acik: AcikSoru = {
        istem,
        cevapla: (secim) => {
          bekleyen.current = null;
          setSoru(null);
          resolve(secim);
        },
      };
      bekleyen.current = acik;
      setSoru(acik);
    });
  }, []);

  return {
    sor,
    eleman: soru === null ? null : <SecimSorusuModal soru={soru} />,
  };
}

function SecimSorusuModal({ soru }: { soru: AcikSoru }): JSX.Element {
  /* ESC = VAZGEÇ. Klavyeyle açılan bir kutunun klavyeyle kapanmaması,
     `window.confirm`'den geriye gitmek olurdu. */
  useEffect(() => {
    const esc = (e: KeyboardEvent): void => {
      if (e.key === "Escape") soru.cevapla(null);
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [soru]);

  const { istem } = soru;
  return (
    <div
      className="modal-back"
      /* Zemine tıklamak vazgeçmektir; kutunun İÇİNE tıklamak kapatmaz
         (yoksa seçeneğe uzanan el kutuyu kapatabilirdi). */
      onClick={() => soru.cevapla(null)}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0 }}>{istem.baslik}</h3>
        {istem.ipucu && (
          <div className="muted" style={{ fontSize: 13 }}>
            {istem.ipucu}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {istem.secenekler.map((s) => (
            <button
              key={s.deger}
              onClick={() => soru.cevapla(s.deger)}
              style={{ textAlign: "left", padding: "10px 12px" }}
            >
              <strong>{s.ad}</strong>
              {/* AÇIKLAMA VARSA ÇİZİLİR: şablon tarafında bu KİMLİKTİR —
                  kayıtsız bir şablonda ad = kimlik olur ve iki satır aynı
                  görünür; operatör "bu ne" diye sorabilsin diye gizlenmez. */}
              {s.aciklama != null && s.aciklama !== "" && (
                <div className="muted" style={{ fontSize: 11 }}>
                  {s.aciklama}
                </div>
              )}
            </button>
          ))}
        </div>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="ghost" onClick={() => soru.cevapla(null)}>
            {istem.vazgecEtiketi}
          </button>
        </div>
      </div>
    </div>
  );
}
