/* KURULUMUN DOĞUŞ VARSAYILANLARI (K-1/D — sektörsüz dil).

   ÖLÇÜLEN YARA: yeni müşteri İKİ alanını da Fransa/Avrupa varsayarak doğurur —
   `currency: body.currency ?? "EUR"` ve `menu_language: body.menu_language ?? "fr"`
   (clients.ts ve intake.ts'te AYRI AYRI yazılı). Bir Türk ozalitçi/tabelacı
   kurulumunda operatör açtığı HER müşteride bu iki alanı elle çevirmek zorunda;
   çevirmeyi unuttuğu müşteri euro fiyatlı ve Fransızca çıktılı doğar ve bunu
   söyleyen hiçbir şey yoktur. Bir önceki paket TL'yi ifade edilebilir kıldı;
   bu paket onu VARSAYILAN yapılabilir kılar.

   NİYE İŞ KOLU İLANINDAN TÜRETİLMEDİ (kendi notumun düzeltmesi): TODO'ya
   "kurulum ilanına bağla, `dogusKatalogu` emsali" diye yazmıştım — YANLIŞTI.
   `TEZGAH_IS_KOLLARI` bir MESLEK ilanıdır, ÜLKE/PARA ilanı değil: Fransa'daki
   bir tabelacı da `tabelaci`dır ve euro yazar. Meslekten para birimi türetmek
   uydurma olurdu. Dipnot farklıydı — orada bağ gerçekti (menü dipnotu menü
   işine aittir); burada bağ YOK.

   KİMLİK-BİLGİSİ-KAPILI, DEĞER BOŞ (K-1'in verdiği biçim): iki ayrı ortam
   değişkeni. TANIMSIZ → bugünkü değerler BİREBİR (EUR/fr); tek-operatörlü
   yerel kurulum hiçbir şey yapmadan aynı şeyi görür. Değeri KURULUMU YAPAN
   yazar — hangi kiracının hangi para biriminde çalıştığı uygulayıcının
   uyduracağı bir şey değildir.

   FAIL-LOUD: tanınmayan değer SESSİZCE yok sayılmaz, uygulama ayağa kalkmaz
   (`kurulum-dogrulama.ts` deseni). Sessiz yok sayma, `TEZGAH_PARA_BIRIMI=TL`
   yazan bir kurulumcuya "oldu" der ve müşteriler yine euro doğardı — bu
   reponun defalarca ölçtüğü "sessiz genişleme" sınıfı.

   MEVCUT MÜŞTERİLERE DOKUNMAZ: yalnız DOĞUŞ anı. Geriye dönük veri düzenlemek
   ürün sahibinin kararıdır (geri döndürülemez veri). */

import {
  CurrencySchema,
  MenuLanguageSchema,
  type Currency,
  type MenuLanguage,
} from "@tezgah/shared";

export const PARA_BIRIMI_ENV = "TEZGAH_PARA_BIRIMI";
export const CIKTI_DILI_ENV = "TEZGAH_CIKTI_DILI";

/** Bugünkü doğuş değerleri — ilan yokken BİREBİR bunlar döner. */
export const VARSAYILAN_PARA_BIRIMI: Currency = "EUR";
export const VARSAYILAN_CIKTI_DILI: MenuLanguage = "fr";

export interface DogusVarsayilanlari {
  currency: Currency;
  menu_language: MenuLanguage;
  /** "varsayilan" = ilan yok · "yapilandirma" = en az biri ilan edilmiş */
  kaynak: "varsayilan" | "yapilandirma";
}

function oku<T extends string>(
  env: string,
  ham: string | undefined,
  gecerli: readonly T[],
  varsayilan: T,
): { deger: T; ilanli: boolean } {
  if (ham === undefined) return { deger: varsayilan, ilanli: false };
  const metin = ham.trim();
  if (metin === "") {
    throw new Error(`${env} ilan edilmiş ama boş — değeri yazın ya da değişkeni tamamen kaldırın`);
  }
  if (!(gecerli as readonly string[]).includes(metin)) {
    throw new Error(
      `${env}: tanınmayan değer ${JSON.stringify(metin)} — geçerli değerler: ${gecerli.join(", ")}`,
    );
  }
  return { deger: metin as T, ilanli: true };
}

/**
 * Kurulumun doğuş varsayılanlarını okur ve doğrular.
 *
 * Ortam HER ÇAĞRIDA yeniden okunur (modül yüklenirken dondurulmaz) — kurulum
 * ilanlarının bu repodaki ortak sözleşmesi budur; denetim yalnız doğrular.
 */
export function dogusVarsayilanlari(): DogusVarsayilanlari {
  const para = oku(
    PARA_BIRIMI_ENV,
    process.env[PARA_BIRIMI_ENV],
    CurrencySchema.options,
    VARSAYILAN_PARA_BIRIMI,
  );
  const dil = oku(
    CIKTI_DILI_ENV,
    process.env[CIKTI_DILI_ENV],
    MenuLanguageSchema.removeDefault().options,
    VARSAYILAN_CIKTI_DILI,
  );
  return {
    currency: para.deger,
    menu_language: dil.deger,
    kaynak: para.ilanli || dil.ilanli ? "yapilandirma" : "varsayilan",
  };
}
