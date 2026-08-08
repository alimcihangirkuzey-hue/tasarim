/* KURULUMUN İŞ KOLLARI — modül sınırı katmanı (K-1/C, ürün sahibi kararı
   2026-08-06: "sistemin verilebilir parçası ... kiracı-başına marka/şablon").

   NE YAPAR: bu kurulumun hangi iş kollarında çalıştığını ilan eder. 7.1/481'in
   "kullanıcı yalnızca yaptığı işi görür" görünürlük hükmünün en küçük
   karşılığıdır: bir tabelacıya menü şablonları gösterilmez.

   KİMLİK-BİLGİSİ-KAPILI, DEĞER BOŞ (K-1'in verdiği biçim): yapılandırma
   `TEZGAH_IS_KOLLARI` ortam değişkenidir. TANIMSIZ/BOŞ → TÜM iş kolları
   etkindir; yani bugünkü davranış BİREBİR korunur ve tek-operatörlü yerel
   kurulum hiçbir şey yapmadan çalışmaya devam eder. Kiralama/satış, fiyat,
   lisans metni ve modülün ticari adı ÜRÜN SAHİBİNİN kararıdır ve burada
   TEMSİL EDİLMEZ — bu dosya yalnız mekanizmadır.

   GÖRÜNÜRLÜK ≠ YETKİ (kayıtlı sınır): bu katman yalnız MANUEL şablon
   seçicinin gördüğünü daraltır. Sipariş→belge köprüsü (siparisSablonlari)
   DOKUNULMADAN kalır — kapalı bir iş kolunun şablonu, sipariş kaleminden
   hâlâ üretilebilir. 7.1/481 "görünürlük" der, "entitlement" demez; gerçek
   yetki katmanı ayrı bir pakettir ve ürün kararı ister.

   FAIL-LOUD: tanınmayan iş kolu adı SESSİZCE atlanmaz — uygulama ayağa
   kalkmaz. Bu reponun kendi deseni (registry-core yük-zamanı doğrulaması:
   "yanlış aile gösteren köprü uygulamayı ayağa kaldırmaz"). Sessiz atlama,
   yanlış yazılmış tek bir harf yüzünden kiracıya YANLIŞ ŞABLON KÜMESİ
   göstermek demek olurdu ve bunu kimse fark etmezdi.

   NEREDE GERÇEKLEŞİR (2026-08-06 düzeltmesi): yukarıdaki "ayağa kalkmaz"
   cümlesi bir süre YALNIZ BURADA yazılıydı — doğrulama bu fonksiyonun
   içindeydi ve fonksiyon YALNIZ istek anında çağrılıyordu. Ölçüldü: bozuk
   değerle boot BAŞARILI, uç 500, /api/health 200 ve arayüz sorgusu düştüğü
   için daraltma HİÇ uygulanmıyordu (sessiz atlama değil, sessiz GENİŞLEME).
   Güvence artık `kurulum-dogrulama.ts` ile buildApp'in ilk işidir; oradaki
   nöbetçi, ortamla yapılandırılan her ilanın denetime yazılı olmasını arar. */

import { SEKTORLER, type Sektor } from "@tezgah/templates/identity";

export const IS_KOLLARI_ENV = "TEZGAH_IS_KOLLARI";

export interface IsKollariIlani {
  /** Bu kurulumda etkin iş kolları — SEKTORLER ilan sırasında, tekrarsız */
  aktif: readonly Sektor[];
  /** Sistemin tanıdığı tüm iş kolları (arayüz "hepsi mi" ayrımını buradan yapar) */
  tumu: readonly Sektor[];
  /** "varsayilan" = yapılandırma yok, hepsi etkin · "yapilandirma" = daraltılmış */
  kaynak: "varsayilan" | "yapilandirma";
}

/**
 * Ortam değişkenini okur ve doğrular.
 *
 * Her çağrıda YENİDEN okunur (modül yüklenirken dondurulmaz): sunucu testleri
 * env'i test başına değiştirir ve dondurulmuş bir değer o testleri sessizce
 * yanlış ölçerdi.
 */
export function isKollariIlani(ham = process.env[IS_KOLLARI_ENV]): IsKollariIlani {
  const metin = (ham ?? "").trim();
  if (metin === "") {
    return { aktif: SEKTORLER, tumu: SEKTORLER, kaynak: "varsayilan" };
  }

  const istenen = metin
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "");

  const taninmayan = istenen.filter((s) => !(SEKTORLER as readonly string[]).includes(s));
  if (taninmayan.length > 0) {
    throw new Error(
      `${IS_KOLLARI_ENV}: tanınmayan iş kolu ${taninmayan.map((s) => `"${s}"`).join(", ")} — ` +
        `geçerli değerler: ${SEKTORLER.join(", ")}`
    );
  }

  /* Boş kalan liste (ör. "TEZGAH_IS_KOLLARI=,,") yapılandırma HATASIDIR,
     "hiçbir şey gösterme" talebi değil: hiçbir şablonun görünmediği bir
     kurulum sessizce kullanılamaz hâle gelirdi. */
  if (istenen.length === 0) {
    throw new Error(`${IS_KOLLARI_ENV} tanımlı ama hiçbir iş kolu içermiyor — değişkeni ya kaldırın ya doldurun`);
  }

  /* Sıra İLAN sırasıdır, yazım sırası değil — aynı kurulum farklı yazımda
     farklı sıralanmasın (teknik ilanı paketiyle aynı gerekçe). */
  return {
    aktif: SEKTORLER.filter((s) => istenen.includes(s)),
    tumu: SEKTORLER,
    kaynak: "yapilandirma",
  };
}
