/* AÇILIŞ SIRASI — DOĞRULAMA YAN ETKİDEN ÖNCE (K-1/C modül sınırı).

   ÖLÇÜLEN YARA (komutla, bu turda): kurulum ilanları doğrulanıyor ve bozuk
   yapılandırmada sunucu gerçekten ayağa kalkmıyor — ama REDDEDİLEN BOOT,
   kiracının veri ağacını ÇOKTAN YAZMIŞ oluyordu. Temiz bir dizinle ölçüm
   (`TEZGAH_DATA_DIR=<yeni>`, `TEZGAH_IS_KOLLARI=tabelacii`):

     önce dizin var mı → HAYIR
     sonuç             → RED ("kurulum ilanı geçersiz (is-kollari)")
     sonra dizin var mı→ EVET
     içerik            → app.db · app.db-shm · app.db-wal · assets · exports · fonts

   Yani ret dürüsttü ama GEÇ geldi: şema göçleri uygulanmış, WAL açılmış, dizin
   ağacı kurulmuştu. Sebep sıradaydı, kodun yanlışlığında değil: `index.ts`
   `./db.js`'i STATİK import ediyordu ve `db.ts` MODÜL YÜKLENİRKEN `ensureDirs()`
   çağırıp veritabanını açıyor. Statik import'lar gövdeden önce koştuğu için,
   doğrulamayı gövdenin ilk satırına koymak da bunu değiştirmezdi.

   NE DEĞİŞTİ: doğrulama, yan etkili modüller YÜKLENMEDEN önce koşuyor; `db` ve
   `app` DİNAMİK import ile, ancak doğrulama geçtikten sonra yükleniyor.

   BU BİR ÜRÜN KARARI DEĞİLDİR ve K-2'nin açık kararına DOKUNMAZ. "Boş/yanlış
   yazılmış bir veri dizininde kurulum ne yapmalı" (dur · uyar · sessiz kal)
   ürün sahibindedir ve burada cevaplanmadı: bu dosya yalnız şunu söyler —
   REDDEDİLEN bir açılış, kiracının diskine yazmış olmamalıdır. Geçerli
   yapılandırmada davranış BİREBİR aynıdır (aynı sıra: doğrula → migrate →
   buildApp).

   `buildApp` DOĞRULAMAYI YİNE ÇAĞIRIR ve bu bilinçli: okuma saf ve
   idempotenttir, ve `app.inject()` ile koşan rota testleri açılış sırasından
   GEÇMEZ — oradaki güvenceyi kaldırmak, testlerin gördüğü uygulamayı gerçek
   kurulumdan farklı kılardı. */

import type { FastifyInstance } from "fastify";
import { kurulumuDogrula } from "./kurulum-dogrulama.js";

/**
 * Gerçek açılış sırası: doğrula → göç → kuruluş.
 *
 * NİYE AYRI DOSYA: `index.ts` bir giriş noktasıdır (import edildiği anda
 * dinlemeye başlar), yani sırası TEST EDİLEMEZDİ. Sıra buraya alınınca
 * ölçülebilir hâle geldi — ve bu dilimin bütün iddiası SIRAYLA ilgilidir.
 */
export async function acilisSirasi(): Promise<FastifyInstance> {
  /* İLK İŞ. Bu satırdan sonra gelen HER dinamik import, yalnız yapılandırma
     geçerliyse yüklenir; yükleme anında disk yazan bir modül (db.ts →
     ensureDirs + Database) bozuk kurulumda hiç çalışmaz. */
  kurulumuDogrula();

  const { migrate } = await import("./db.js");
  migrate();

  const { buildApp } = await import("./app.js");
  return buildApp();
}
