/* SAHNE TÜRÜ SEÇİCİSİNİN GÖRÜNÜRLÜĞÜ (K-1/C modül sınırı).

   ÖLÇÜLEN YARA: 7.1/481'in "kullanıcı yalnızca yaptığı işi görür" hükmü şu
   ana kadar dört yüzeye uygulandı — şablon seçicisi, rehber kartları,
   sipariş türü seçicisi ve Açılış Takımı preseti. Sahne (mockup) türü
   seçicisi ATLANMIŞTI: tabelacıya daraltılmış bir kurulumda operatör hâlâ
   "Giyim" sahnesi kurabiliyordu — modül kiralanan işletmenin hiç yapmadığı
   iş. Aynı sınıfın BEŞİNCİ yeri.

   SEKTÖR TÜRETİLİR, YAZILMAZ — ve zincir ölçüldü:
     SceneKind → o türü TERCİH EDEN şablon (`manifest.mockup_tercihi
     .sahne_turleri`) → şablonun materyali (`manifest.type`) → iş kolu
     (`HEDEF_SEKTOR`)
   İkinci bir tablo YOKTUR. Sahne türünü elle bir iş koluna bağlamak
   (ör. "vitrine → cam-giydirme") ölçülmemiş bir olguyu kod hâline
   getirmek olurdu — `dogus-varsayilanlari` paketinin düzelttiği hatanın
   aynısı (meslekten para birimi türetmek).

   BUGÜNKÜ TÜRETİMİN ZAYIFLIĞI AÇIKÇA (ölçüldü, tahmin değil):
     garment → tekstil-baski   ·   vitrine · facade · generic → İLANSIZ
   Yani `mockup_tercihi` ilanı SEYREKTİR: kayıt defterinde onu ilan eden tek
   şablon `garment`tır. Sonuç: bu süzgeç bugün EN FAZLA BİR türü gizler.
   Bunu "sahne seçicisi iş koluna bağlandı" diye geniş okumak yanlış olurdu;
   bağlanan şey MEKANİZMADIR, kapsamı ilan büyüdükçe büyür.

   KAÇIŞ KAPISI ASLA KAPANMAZ: hiçbir şablonun ilan etmediği tür (bugün üçü)
   HER kurulumda görünür — süzgecin onlar hakkında söyleyeceği bir şey yoktur
   ve sessizce kaybolmaları yanlış olurdu (`gorunurSiparisTurleri` ve
   `gorunurSablonlar` ile aynı sözleşme). Liste bu yüzden hiçbir
   yapılandırmada boşalamaz.

   ÇOK SEKTÖRLÜ TÜRDE DARALTILMAZ: bir sahne türünü FARKLI iş kollarından
   şablonlar ilan ederse tür tek bir iş koluna atfedilemez ve GİZLENMEZ.
   Kuşkuda görünür taraf seçilir: görünürlük daraltması, operatörün
   yapabildiği bir işi elinden almaya dönüşemez. */

import { SceneKindSchema, type SceneKind } from "@tezgah/shared";
import { listTemplates } from "@tezgah/templates";
import { HEDEF_SEKTOR, type Sektor } from "@tezgah/templates/identity";

/** Şemadan türetilmiş tam tür listesi — ilan sırasıyla. */
export const SAHNE_TURLERI: readonly SceneKind[] = SceneKindSchema.options;

/**
 * Sahne türünün iş kolu — kayıt defterinden TÜRETİLİR.
 *
 * @returns tek bir iş koluna atfedilebiliyorsa o; ilan eden şablon yoksa
 *   ya da birden fazla iş kolu ilan ediyorsa `null` (daraltılamaz)
 */
export function sahneTuruSektoru(kind: SceneKind): Sektor | null {
  const sektorler = new Set<Sektor>();
  for (const e of listTemplates()) {
    const tercih = e.manifest.mockup_tercihi;
    if (!tercih) continue;
    if ((tercih.sahne_turleri as readonly string[]).includes(kind)) {
      sektorler.add(HEDEF_SEKTOR[e.manifest.type]);
    }
  }
  return tekSektorAtfi(sektorler);
}

/**
 * Toplanan iş kolu kümesinden ATIF kararı — SAF, kayıt defterinden bağımsız.
 *
 * NİYE AYRI: kural ("yalnız tek iş kolu ilan ediyorsa daralt") kayıt
 * defterinin bugünkü içeriğiyle ÖLÇÜLEMEZ — bugün hiçbir sahne türünü iki
 * farklı iş kolundan şablon ilan etmiyor, yani `size === 1` ile `size >= 1`
 * AYNI sonucu verir. Bu ölçüldü: kuralı bozan bir negatif kontrol hiçbir
 * testi kırmızıya döndürmedi. Karar buraya ayrıldı ki sentetik kümeyle
 * doğrudan sınanabilsin — ilan defteri büyüyene kadar beklemek, kuralı
 * ÖLÇÜLMEDEN yeşil bırakmak olurdu.
 *
 * KUŞKUDA GÖRÜNÜR TARAF: iki iş kolu ilan ediyorsa tür tek bir kola
 * atfedilemez ve GİZLENMEZ — görünürlük daraltması, operatörün yapabildiği
 * bir işi elinden almaya dönüşemez.
 */
export function tekSektorAtfi(sektorler: ReadonlySet<Sektor>): Sektor | null {
  return sektorler.size === 1 ? [...sektorler][0]! : null;
}

/**
 * Kurulumun iş kollarına göre görünür sahne türleri.
 *
 * @param aktif undefined → süzme YOK (bugünkü davranış birebir; yapılandırma
 *   yapılmamış kurulum ve uç henüz yanıtlamamışken de bu yol geçerlidir)
 * @param korunanTur iş kolu kapalı olsa bile görünür kalması gereken tür
 *   (seçili olan) — `gorunurSablonlar` ile aynı sözleşme: select'in değeri
 *   listede olmazsa tarayıcı ilk seçeneği gösterir ve operatör sahnesinin
 *   türünü YANLIŞ görür. Görünürlük daraltması veri yanlış göstermesine
 *   dönüşemez.
 */
export function gorunurSahneTurleri(
  aktif: readonly Sektor[] | undefined,
  korunanTur?: SceneKind,
): SceneKind[] {
  if (!aktif) return [...SAHNE_TURLERI];
  return SAHNE_TURLERI.filter((k) => {
    if (k === korunanTur) return true;
    const s = sahneTuruSektoru(k);
    return s === null || aktif.includes(s);
  });
}
