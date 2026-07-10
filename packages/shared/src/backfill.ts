/* desc_fr → içerik çipi backfill YARDIMCISI — F7-A (Adım 5). SAF.
   Eski kataloglardaki serbest metin açıklamayı (ör. Arriva "Sauce tomate,
   mozzarella, salami") çip adaylarına böler — operatör intake/edit sırasında
   öneri olarak görür. KATALOG MUTASYONU YOK (M5): bu yalnız araç; mevcut
   kataloglara TOPLU UYGULAMA YAPILMAZ. Arriva/gerçek katalog backfill'i ileride
   klon kabulüyle AYRI koşuda yapılır (arşiv sabitliği). */

/** Virgül/noktalı virgülle böl, kırp, tekilleştir (büyük/küçük harf duyarsız) →
    çip aday listesi. Boş/yalnız-ayırıcı → boş liste. İlk görülme sırası + casing
    korunur (öneri olarak sunulur; kesinleşen çip kütüphaneye ayrıca girer). */
export function suggestChipsFromDesc(desc: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of desc.split(/[,;]/)) {
    const s = raw.trim();
    if (!s) continue;
    const key = s.toLocaleLowerCase("fr-FR");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}
