/* TUR SONUCU PANELİ — kalıcı, satır satır (K-1/B, çoklu proje hızı).

   ÖLÇÜLEN YARA: `2026-08-06-toplu-aktarim-gerekcesi` paketi düşen/engelli
   kalemin GEREKÇESİNİ üretmeyi başardı (önceden `catch { dusen += 1 }` ile
   tamamen yutuluyordu) ama sunumu tek bir TOAST'a bağladı. Üç ayrı bedeli
   bu turda tek tek okundu:

   1. SATIR SONLARI HİÇ GÖRÜNMÜYORDU. Özet `"\n"` ile birleştirilmiş tek bir
      dizeydi ve `.toast` kuralında (styles.css:159-163) `white-space`
      YOKTUR — tarayıcı varsayılanı `normal`, yani satır sonları BOŞLUĞA
      çevrilir. Yani gerekçeler alt alta değil, tek bir uzun satır hâlinde
      akıyordu. ÖLÇÜMÜN SINIRI DÜRÜSTÇE: bunu jsdom'da hesaplanmış stille
      doğrulamak mümkün değil (jsdom stylesheet uygulamaz); iddia stilin
      METNİNE dayanır — o yüzden çözüm de CSS'e bağlı bir söz vermiyor,
      her satır KENDİ elemanı oluyor.
   2. 4,5 SANİYEDE KAYBOLUYORDU. Toast bir zamanlayıcıyla siliniyor
      (ProjectsPanel: `setTimeout(..., 4500)`). Sekiz kalemlik bir turda
      operatörün okuması gereken şey, okumaya vakit bulamadan gidiyordu.
   3. UZUNLUKTA DUVARA DÖNÜYORDU. `max-width: 80vw`, sabit konumlu, kaydırma
      YOK: 15 sorunlu kalem ekranı kaplar ve altı taşarsa erişilemez.

   BU PANEL: sonuç yapısal olarak gelir (dize birleştirme YOK), her satır
   kendi elemanıdır, kaydırılabilir, ve operatör KAPATANA kadar durur.

   DOKTRİN KORUNDU — "başarılılar SAYIYLA, sorunlular ADIYLA": başlık
   sayıları taşır, liste yalnız sorunlu satırları gösterir. Kalıcı panelde
   yer var diye 20 başarılı satırı da dizmek, 2 sorunlu satırı gömerdi.
   (Kaynak: `aktarimOzetMetni`'nin kendi gerekçesi; o işlev bu panele
   dönüştüğü için KALDIRILDI, ölü sözleşme bırakılmadı.) */

import { t } from "../i18n";

export type TurSatirDurumu = "tamam" | "engelli" | "dusen";

export interface TurSatiri {
  /** Operatörün tanıyacağı ad (çağıran üretir — bu katman kalem bilmez). */
  ad: string;
  durum: TurSatirDurumu;
  /** "tamam" satırlarında null. */
  gerekce: string | null;
}

export interface TurSonucuVerisi {
  /** Sayıları taşıyan tek satır (çağıran i18n'den üretir). */
  baslik: string;
  satirlar: readonly TurSatiri[];
}

const ROZET: Record<TurSatirDurumu, string> = {
  tamam: "ok",
  engelli: "warn",
  dusen: "red",
};

/** Sorunlu satırlar — panelin listelediği küme. */
export function sorunluSatirlar(satirlar: readonly TurSatiri[]): TurSatiri[] {
  return satirlar.filter((s) => s.durum !== "tamam");
}

export function TurSonucu({ veri, onKapat }: { veri: TurSonucuVerisi; onKapat: () => void }) {
  const sorunlu = sorunluSatirlar(veri.satirlar);
  return (
    <div className="tur-sonucu">
      <div className="row" style={{ gap: 8 }}>
        <strong style={{ fontSize: 13 }}>{veri.baslik}</strong>
        <span style={{ flex: 1 }} />
        <button className="icon" onClick={onKapat} title={t("orders.result_close")}>
          ✕
        </button>
      </div>
      {sorunlu.length === 0 ? (
        /* SESSİZ BOŞLUK YOK: sorunsuz turda da panel bir şey SÖYLER. Boş bir
           kutu, "sonuç gelmedi" ile "her şey yolunda"yı aynı gösterirdi. */
        <div className="muted" style={{ fontSize: 12 }}>{t("orders.result_all_ok")}</div>
      ) : (
        <div className="tur-sonucu-liste">
          {sorunlu.map((s, i) => (
            /* Anahtar İNDEKSLE kurulur ve bu bilinçli: aynı ad iki kez
               geçebilir (aynı türden iki kalem aynı özeti üretir) ve liste
               yeniden SIRALANMAZ — tur bittiğinde donar. */
            <div key={`${i}-${s.ad}`} className="tur-sonucu-satir">
              <span className={`pill ${ROZET[s.durum]}`}>{t(`orders.result_${s.durum}`)}</span>
              <span style={{ fontWeight: 560 }}>{s.ad}</span>
              {/* GEREKÇE KENDİ ELEMANINDA: satır sonu karakterine ve onu
                  koruyan bir CSS kuralına bağlı DEĞİL. Yaranın kökü buydu. */}
              <span className="muted" style={{ fontSize: 12 }}>{s.gerekce ?? ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
