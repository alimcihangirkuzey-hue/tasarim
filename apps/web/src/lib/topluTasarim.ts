/* TOPLU TASARIMA BAŞLATMA — TEK GÖVDE (K-1/A).

   Bir kalemi belgeye çeviren zincir ve onu N kaleme uygulayan tur burada
   yaşar. İKİ tüketicisi vardır ve ikisi de AYNI gövdeyi çağırır:
   · Sipariş Defteri'ndeki proje düzeyinde "N kalemi tasarıma başlat" düğmesi
   · Müşteri sayfasındaki "Açılış Takımı" (preset → kalemler → BELGELER)

   NEDEN KÜTÜPHANE: gövde ProjectsPanel'in içinde doğmuştu; ikinci tüketici
   (Açılış Takımı) gelince orada bırakmak, bileşenden bileşene import ya da
   ikinci bir kopya demekti. İkisi de bu reponun tekrar tekrar ödediği bedeldir
   (yapıştır önizlemesi 2026-08-06: elle ikinci kez yazılan özet technique'i
   düşürüyordu). Taşıma sırasında DAVRANIŞ DEĞİŞMEDİ.

   SORU DIŞARIDAN GELİR (`sor`): ≥2 şablon seçeneği olan türde hangisinin
   seçileceğini bu katman BİLMEZ. window.confirm'i içeri gömmek kütüphaneyi
   tarayıcıya ve tek bir soru metnine bağlardı; enjekte edilince tur, soru
   sorulmadan da (testte, ileride sunucuda) koşturulabilir. */

import type { OrderItemDTO, ProductType } from "@tezgah/shared";
import { siparisParamlari, siparisSablonlari } from "@tezgah/templates/identity";
import { api } from "../api";

/**
 * Tek kalemi belgeye çevirir.
 *
 * Yönlendirme (navigate) bu fonksiyonun İŞİ DEĞİLDİR: tekil düğme başarıda
 * editöre gider, toplu tur gitmez (N belgeden birine atlamak keyfî olurdu).
 */
export async function belgeAc(
  clientId: string,
  item: OrderItemDTO,
  templateId: string,
): Promise<string> {
  const doc = await api.createDocument(clientId, templateId, item.project_id);
  const params = siparisParamlari(item);
  if (params) {
    try {
      await api.updateDocument(doc.id, { params });
    } catch (err) {
      /* YETİM TELAFİSİ (journal 2026-07-27-klon-kapisi-yetim-telafi):
         sunucu params'ı 400'lerse (ölçülen yol: sipariş width_cm=5000 —
         OrderItemCreateSchema max taşımıyor, Zod max 2000 reddediyor)
         create edilmiş belge sahipsiz kalıyordu. Geri sarıyoruz: belgeyi
         parametresiz bırakıp kaleme BAĞLAMAK reddedildi — sipariş ölçüsü
         sessizce düşer, belge varsayılan ölçülerle açılır ve operatör yanlış
         ölçüyle tasarlar; silmek + görünür hata, sipariş verisini düzeltmeye
         zorlar. Silme BEST-EFFORT: telafinin kendi hatası asıl hatayı
         örtmemeli — her durumda orijinal hata yeniden fırlar. */
      try {
        await api.deleteDocument(doc.id);
      } catch {
        /* yetim kaldı — asıl hata yine de görünür olacak */
      }
      throw err;
    }
  }
  /* Not: updateOrderItem başarısızlığı telafi EDİLMEZ — o noktada belge
     geçerli params'la yazılmıştır, silmek kullanıcının işini yok ederdi;
     kalem bağı bir sonraki denemede kurulabilir. */
  await api.updateOrderItem(item.id, { document_id: doc.id, status: "tasarimda" });
  return doc.id;
}

/* Toplu başlatma PLANI — saf sınıflandırma, yan etkisiz.
   Dört kova AYRIK ve TÜKETİCİ: her kalem tam bir kovaya düşer. */
export interface TopluPlan {
  /** belgesi yok + tam 1 şablon seçeneği → sorusuz koşar */
  hazir: OrderItemDTO[];
  /** belgesi yok + ≥2 şablon → tür başına BİR KEZ sorulur (kalem başına değil) */
  secimli: OrderItemDTO[];
  /** 0 şablon seçeneği → bu tür tasarlanamaz (ör. "diger") */
  tasarlanamaz: OrderItemDTO[];
  /** document_id dolu → zaten tasarımda, tekrar açmak mükerrer belge üretirdi */
  zaten: OrderItemDTO[];
}

export function topluPlan(items: readonly OrderItemDTO[]): TopluPlan {
  const plan: TopluPlan = { hazir: [], secimli: [], tasarlanamaz: [], zaten: [] };
  for (const it of items) {
    if (it.document_id) plan.zaten.push(it);
    else {
      const n = siparisSablonlari(it.product_type).length;
      if (n === 0) plan.tasarlanamaz.push(it);
      else if (n === 1) plan.hazir.push(it);
      else plan.secimli.push(it);
    }
  }
  return plan;
}

export interface TopluSonuc {
  acilan: number;
  dusen: number;
  atlanan: number;
  zaten: number;
}

/**
 * Projedeki kalemleri sırayla belgeye çevirir.
 *
 * SIRAYLA koşar, paralel değil: her kalem createDocument + updateDocument +
 * updateOrderItem üçlüsüdür; paralel gönderim aynı projeye eşzamanlı yazma
 * yaratır ve bir kalemin 400'ü diğerinin telafisiyle karışırdı.
 *
 * Düşen kalem turu DURDURMAZ ama SAYILIR: bir bozuk sipariş bütün turu rehin
 * alamaz, sessiz kısmi başarı da olmaz.
 *
 * @param sor ≥2 seçenekli tür için şablon seçer. TÜR BAŞINA BİR KEZ çağrılır
 *   (kalem başına değil) — aynı türden N kalem tek cevabı paylaşır.
 */
export async function topluBaslat(
  clientId: string,
  items: readonly OrderItemDTO[],
  sor: (tur: ProductType, secenekler: readonly string[]) => string,
): Promise<TopluSonuc> {
  const plan = topluPlan(items);
  const kosacak: Array<{ item: OrderItemDTO; templateId: string }> = plan.hazir.map((item) => ({
    item,
    templateId: siparisSablonlari(item.product_type)[0]!,
  }));

  const secim = new Map<ProductType, string>();
  for (const item of plan.secimli) {
    if (!secim.has(item.product_type)) {
      secim.set(item.product_type, sor(item.product_type, siparisSablonlari(item.product_type)));
    }
    kosacak.push({ item, templateId: secim.get(item.product_type)! });
  }

  let acilan = 0;
  let dusen = 0;
  for (const { item, templateId } of kosacak) {
    try {
      await belgeAc(clientId, item, templateId);
      acilan += 1;
    } catch {
      /* Gerekçe kalem düzeyinde yutulur ama SAYILIR. */
      dusen += 1;
    }
  }
  return { acilan, dusen, atlanan: plan.tasarlanamaz.length, zaten: plan.zaten.length };
}
