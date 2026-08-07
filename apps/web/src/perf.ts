/* ÖLÇÜM SAYAÇLARI — paket 6.6 (journal 2026-08-07-performans-adaptif-yogunluk).

   NİÇİN VAR: "her tuş vuruşunda belge yeniden akıyor" bir VARSAYIMDI. Süreyi
   ölçmek onu doğrulamaz — 20 karakterlik yazma yavaşsa bu 20 reflow'dan da,
   tek bir yavaş reflow'dan da, React'in satırları yeniden çizmesinden de
   gelebilir. Ayrım ancak SAYARAK kurulur: kaç reflow, kaç çizim, kaç commit.
   Bu yüzden paketin ilk aracı kronometre değil sayaçtır.

   NİÇİN ÜRÜN KODUNDA: sayaçları testin içinden takamıyoruz. globalReflow
   `@tezgah/templates` içinde saf bir işlev ve onu tarayıcıdan yakalamanın
   yolu yok; çağrı YERİ burada, sayacın da burada olması gerekiyor.

   DAVRANIŞI DEĞİŞTİRMEZ: yalnız sayı artırır, hiçbir kararı okumaz, hiçbir
   dalı değiştirmez. Sayaçlar `window.__TEZGAH_PERF__` üzerinden okunur;
   üretimde de duruyor olması bir maliyet değil (bir nesne, birkaç tamsayı)
   ama ölçümü şarta bağlamamak bir KARAR: ölçüm yalnız "ölçüm modunda"
   çalışsaydı, ölçtüğümüz şey kullanıcının kullandığı kod olmazdı. */

export interface PerfSayaclari {
  /** globalReflow kaç kez çağrıldı (belge ölçeğinde yeniden akıtma) */
  reflow: number;
  /** TasarimPage gövdesi kaç kez koştu (React çizim sayısı) */
  render: number;
  /** Denetçiden gelen prop yazma sayısı (tuş vuruşu başına en az bir) */
  yazma: number;
  /** Bekleyen düzenlemenin belgeye işlendiği an (commit sınırı) */
  commit: number;
  /** Denetçi satır listesi kaç kez çizildi */
  denetciRender: number;
}

export const perf: PerfSayaclari = {
  reflow: 0,
  render: 0,
  yazma: 0,
  commit: 0,
  denetciRender: 0,
};

export function perfArtir(k: keyof PerfSayaclari): void {
  perf[k] += 1;
}

export function perfSifirla(): void {
  for (const k of Object.keys(perf) as Array<keyof PerfSayaclari>) perf[k] = 0;
}

/* Tarayıcı provası buradan okur. Nesne REFERANSI sabit kalır ki prova
   başlangıçta yakalayıp sonuna kadar aynı sayaçları izleyebilsin.

   SAYAÇ NESNESİ İLE İŞLEV AYRI DURUR — bu bir üslup tercihi değil, ölçülmüş
   bir hata düzeltmesi: sıfırlama işlevi sayaç nesnesinin ÜZERİNE konmuştu
   ve perfSifirla tüm anahtarları gezip sıfırladığı için İLK çağrıda kendi
   referansını da 0 yapıyordu ("sifirla is not a function", baseline turu
   yarıda kaldı). Sayaçlar yalnız sayı tutar; API ayrı isimde yaşar. */
if (typeof window !== "undefined") {
  const w = window as unknown as { __TEZGAH_PERF__: PerfSayaclari; __TEZGAH_PERF_SIFIRLA__: () => void };
  w.__TEZGAH_PERF__ = perf;
  w.__TEZGAH_PERF_SIFIRLA__ = perfSifirla;
}
