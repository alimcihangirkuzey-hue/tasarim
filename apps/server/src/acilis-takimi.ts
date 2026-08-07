/* AÇILIŞ TAKIMININ KURULUM İLANI (K-1/A × K-1/C).

   ÖLÇÜLEN YARA: K-1/A'nın başlığı **"paket şablonları"** (çoğul) — "bir müşteri
   + bir preset → N belge". Sistemde bugün TEK ve DEĞİŞTİRİLEMEZ bir takım var:
   `OPENING_KIT` bir kod sabitidir (`packages/shared/src/orders.ts`) ve içeriği
   menü · flyer · sadakat kartı · vitrophanie'dir — dördü de MENÜ/MATBAA işi.
   Bir tabelacıya kiralanan kurulumda `preset-kapsami` bu dörtlüyü iş koluna
   göre SÜZÜYOR ve geriye HİÇBİR KALEM KALMIYOR; uç 409 döndürüyor, yani o
   kiracıda "Açılış Takımı" düğmesi HİÇ ÇALIŞMIYOR. Daraltma doğruydu, ama
   sonucu şuydu: K-1/A'nın ana kaldıracı, K-1'in hedef kesiminin bir kısmında
   kullanılamaz.

   ÜRÜN KARARI UYDURULMADI — MEKANİZMA YAZILDI, DEĞER BOŞ. "Bir tabelacının
   açılış takımında ne olmalı" sorusunun cevabı ÜRÜN/İÇERİK kararıdır ve K-1'de
   hiç sorulmadı bile (`preset-kapsami.ts` bunu zaten yazıyordu). Bu dosya o
   cevabı VERMEZ; kurulumu yapanın onu YAZABİLECEĞİ yeri açar. Repodaki beş
   kardeşiyle aynı desen: `TEZGAH_IS_KOLLARI` · `TEZGAH_PARA_BIRIMI` ·
   `TEZGAH_CIKTI_DILI` · `TEZGAH_DATA_DIR` · `TEZGAH_KURULUM_KUNYESI`.

   DEĞER BOŞ → DAVRANIŞ BİREBİR: tanımsız/boş ilanda takım `OPENING_KIT.items`
   olarak kalır — `details` alanları (menü a3, flyer 21x21) dahil. Bugünkü
   kurulum hiçbir şey yapmadan aynı dört kalemi üretmeye devam eder.

   YAZIM SIRASI KORUNUR — ve bu, `is-kollari`den BİLEREK AYRILAN bir karardır.
   Orada sıra ilan sırasına çekilir çünkü o bir KÜME'dir (hangi iş kolları
   etkin). Burada ilan bir İŞ LİSTESİDİR: operatör kalemleri yazdığı sırada
   görmek ister ve aynı türden iki kalem (iki ayrı tabela) meşrudur. Tekrarı
   yasaklamak ya da sırayı yeniden dizmek, kurulumcunun yazdığını sessizce
   değiştirmek olurdu.

   FAIL-LOUD, ÜÇ AYRI SEBEPLE (bu reponun deseni: yanlış yapılandırma boot'u
   geçemez — `kurulum-dogrulama.ts`):
   1. TANINMAYAN ürün türü → ayağa kalkmaz. Sessizce atlamak, kurulumcunun
      yazdığı kalemi yok sayıp "takım hazır" demek olurdu.
   2. TASARLANAMAZ tür (`siparisSablonlari` boş — bugün `diger`) → ayağa
      kalkmaz. Böyle bir kalem hiçbir zaman belgeye dönüşemez; takıma koymak,
      operatöre her turda "tasarlanamaz" satırı üretmek demektir.
   3. İLAN EDİLMİŞ AMA BOŞ (`TEZGAH_ACILIS_TAKIMI=,,`) → ayağa kalkmaz. Bu bir
      "takım istemiyorum" talebi değil, yazım hatasının biçimidir; niyet buysa
      değişken kaldırılır (`is-kollari` ile aynı gerekçe).

   İŞ KOLUYLA ÇELİŞKİ DE FAIL-LOUD — AMA YALNIZ AÇIKÇA İLAN EDİLMİŞ TAKIMDA.
   Kurulumcu hem `TEZGAH_IS_KOLLARI=tabelaci` hem takımda `menu` yazdıysa,
   süzgeç o kalemi SESSİZCE düşürürdü: yazdığı şey ile aldığı şey farklı olur
   ve bunu söyleyen hiçbir şey olmazdı. Çelişki kurulum anında söylenir.
   VARSAYILAN takım bu denetime GİRMEZ: `OPENING_KIT` kurulumcunun yazdığı bir
   şey değildir ve bugün tabelacı kurulumunda tamamen süzülmesi KAYITLI ve
   kasıtlı davranıştır (uç 409 ile gerekçesini söyler). Yazılmamış bir şeyi
   çelişki saymak, bugünkü kurulumları geriye dönük bozardı. */

import {
  OPENING_KIT,
  ProductTypeSchema,
  pricingInputsOf,
  type PresetItem,
  type ProductType,
} from "@tezgah/shared";
import { siparisSablonlari, siparisSektoru } from "@tezgah/templates/identity";
import { isKollariIlani, type IsKollariIlani } from "./is-kollari.js";

export const ACILIS_TAKIMI_ENV = "TEZGAH_ACILIS_TAKIMI";

/** İlan edilebilir ürün türleri — şemadan TÜRER, elle yazılmaz. */
export const TAKIM_TURLERI: readonly ProductType[] = ProductTypeSchema.options;

/** Takıma konabilecek türler: tasarlanabilir olanlar (şablon seçeneği ≥ 1). */
export function tasarlanabilirTurler(): ProductType[] {
  return TAKIM_TURLERI.filter((t) => siparisSablonlari(t).length > 0);
}

/**
 * Bu türe BİÇİM yazılabilir mi — girdi ilanından okunur.
 *
 * Ölçüldü: `format` alanı `menu · flyer · trifold · fidelite` türlerinde var
 * (ve ZORUNLU); diğerlerinde hiç yok. Elle bir liste yazmak ikinci kopya
 * olurdu ve ilan büyüdüğü gün sessizce ayrışırdı.
 */
export function bicimAlirMi(tur: ProductType): boolean {
  return pricingInputsOf(tur).some((g) => g.alan === "format");
}

export interface AcilisTakimiIlani {
  kalemler: readonly PresetItem[];
  /** "varsayilan" = yapılandırma yok (OPENING_KIT) · "yapilandirma" = ilan edilmiş */
  kaynak: "varsayilan" | "yapilandirma";
}

/**
 * Ortam değişkenini okur ve doğrular.
 *
 * Her çağrıda YENİDEN okunur (modül yüklenirken dondurulmaz): kardeş ilanlarla
 * aynı gerekçe — testler env'i test başına değiştirir ve dondurulmuş bir değer
 * onları sessizce yanlış ölçerdi.
 */
export function acilisTakimiIlani(ham = process.env[ACILIS_TAKIMI_ENV]): AcilisTakimiIlani {
  const metin = (ham ?? "").trim();
  if (metin === "") {
    return { kalemler: OPENING_KIT.items, kaynak: "varsayilan" };
  }

  const yazilan = metin
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "");

  /* `tur:bicim` — iki parçadan fazlası yazım hatasıdır; sessizce kırpmak
     kurulumcuya yazdığından farklı bir takım verirdi. */
  const cozulen = yazilan.map((ham) => {
    const parca = ham.split(":");
    if (parca.length > 2) {
      throw new Error(
        `${ACILIS_TAKIMI_ENV}: "${ham}" iki noktadan fazlasını taşıyor — biçim "tur" ya da "tur:bicim"`,
      );
    }
    return { tur: (parca[0] ?? "").trim(), bicim: parca.length === 2 ? (parca[1] ?? "").trim() : null };
  });

  if (yazilan.length === 0) {
    throw new Error(
      `${ACILIS_TAKIMI_ENV} tanımlı ama hiçbir kalem içermiyor — değişkeni ya kaldırın ya doldurun`,
    );
  }

  const tasarlanabilir = tasarlanabilirTurler();
  const taninmayan = cozulen.map((c) => c.tur).filter((s) => !(TAKIM_TURLERI as readonly string[]).includes(s));
  if (taninmayan.length > 0) {
    throw new Error(
      `${ACILIS_TAKIMI_ENV}: tanınmayan ürün türü ${taninmayan.map((s) => `"${s}"`).join(", ")} — ` +
        `geçerli değerler: ${tasarlanabilir.join(", ")}`,
    );
  }

  /* Tanınan ama TASARLANAMAZ tür ayrı bir mesaj hak eder: kurulumcu geçerli bir
     ürün türü yazmıştır, sorun yazımda değil o türün şablonunun olmamasındadır.
     İkisini tek mesajda birleştirmek, "yanlış mı yazdım" diye aratırdı. */
  const tasarlanamaz = cozulen
    .map((c) => c.tur as ProductType)
    .filter((t) => !tasarlanabilir.includes(t));
  if (tasarlanamaz.length > 0) {
    throw new Error(
      `${ACILIS_TAKIMI_ENV}: ${tasarlanamaz.map((s) => `"${s}"`).join(", ")} tasarlanamaz ` +
        `(şablon seçeneği yok) — takıma konan kalem belgeye dönüşebilmelidir; ` +
        `tasarlanabilir türler: ${tasarlanabilir.join(", ")}`,
    );
  }

  /* `details` YOKTUR VE BU BİR SINIRDIR, gizlenmiyor: varsayılan takımın menü
     kalemi `{format:"a3"}` taşır, ilan edilen kalem taşımaz. Sonuç, ölçüsüz
     `vitrophanie`nin bugün zaten yaptığı şeydir — kalem `olcu_bekliyor`
     doğar ve eksik alan rozetiyle görünür. Biçimi de ilana taşımak (ör.
     "menu:a3") ayrı bir dilimdir; buraya sıkıştırmak, doğrulanmamış bir
     ayrıştırma dilini sessizce eklemek olurdu. */
  /* BİÇİM YAZILABİLİRLİĞİ İLANDAN OKUNUR, UYDURULMAZ: bir türe biçim
     yazılabilmesi, o türün girdi ilanında `format` alanının bulunmasına
     bağlıdır. Taşımayan türe biçim yazmak (ör. "tabela:a3") sessizce
     yutulursa kurulumcu yazdığının işe yaradığını sanır — hiçbir yere
     gitmeyen bir değerdir. */
  for (const c of cozulen) {
    if (c.bicim === null) continue;
    if (c.bicim === "") {
      throw new Error(`${ACILIS_TAKIMI_ENV}: "${c.tur}:" biçim taşımıyor — iki noktayı ya doldurun ya kaldırın`);
    }
    if (!bicimAlirMi(c.tur as ProductType)) {
      throw new Error(
        `${ACILIS_TAKIMI_ENV}: "${c.tur}" türü BİÇİM TAŞIMAZ (girdi ilanında \`format\` yok) — ` +
          `biçim yazılabilen türler: ${TAKIM_TURLERI.filter(bicimAlirMi).join(", ")}`,
      );
    }
  }

  return {
    kalemler: cozulen.map((c) => ({
      product_type: c.tur as ProductType,
      ...(c.bicim === null ? {} : { details: { format: c.bicim } }),
    })),
    kaynak: "yapilandirma",
  };
}

/**
 * İLAN EDİLEN takım ile iş kolu ilanı çelişiyor mu — çelişiyorsa fırlatır.
 *
 * Süzgeç (`acilisTakimiKalemleri`) bu kalemleri sessizce düşürürdü: kurulumcu
 * dört kalem yazar, ikisini alır ve bunu söyleyen hiçbir şey olmaz.
 *
 * VARSAYILAN takım denetlenmez (bkz. dosya başlığı) — yazılmamış bir şey
 * çelişki üretemez.
 */
export function dogrulaTakimKapsami(
  takim: AcilisTakimiIlani = acilisTakimiIlani(),
  kollar: IsKollariIlani = isKollariIlani(),
): void {
  if (takim.kaynak === "varsayilan" || kollar.kaynak === "varsayilan") return;

  const disarida = takim.kalemler
    .map((k) => ({ tur: k.product_type, sektor: siparisSektoru(k.product_type) }))
    /* Sektörü OLMAYAN tür (iş kolundan bağımsız) her kurulumda geçerlidir —
       süzgeçle aynı kaçış kapısı; burada da çelişki saymayız. */
    .filter((x) => x.sektor !== null && !kollar.aktif.includes(x.sektor));

  if (disarida.length > 0) {
    throw new Error(
      `${ACILIS_TAKIMI_ENV}: ${disarida.map((x) => `"${x.tur}" (${x.sektor})`).join(", ")} ` +
        `bu kurulumun iş kollarında değil (${kollar.aktif.join(", ")}) — ` +
        `süzgeç onları sessizce düşürürdü; ya takımdan ya iş kolu ilanından çıkarın`,
    );
  }
}
