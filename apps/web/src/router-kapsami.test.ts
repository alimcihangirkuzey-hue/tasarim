/* ROUTER KULLANIM YÜZEYİ — NÖBETÇİ (react-router 7 yükseltmesinin şerhi).

   NİYE VAR: 7.18.2'ye yükseltme, `npm audit` sayısını 2 ORTA'dan 2 YÜKSEK'e
   çıkardı ve bu, kararın kendisidir — gizlenmez. Ölçülen durum:

   · 6.30.4'te iki ORTA: (a) `<Link>`/`useNavigate`'te ters-bölü ile AÇIK
     YÖNLENDİRME, (b) `deserializeErrors()` — SSR HYDRATION.
   · 7.18.2'de iki YÜKSEK: RSC MODU CSRF atlatması (7.12.0–8.2.0).
   · Sürüm alanı ölçüldü: yayınlanmış EN SON kararlı sürüm 7.18.2, ve 8.x
     YAYINLANMAMIŞ. Yani ÜÇ öneriyi birden karşılayan bir sürüm BUGÜN YOK.

   KARAR VE GEREKÇESİ: uygulama DEKLARATİF moddadır — `BrowserRouter` +
   `Routes`/`Route`/`Link`/`useNavigate`/`useParams`/`useSearchParams`.
   RSC modu, framework modu, veri yönlendiricisi ve SSR YOKTUR. Bu yüzden
   yeni YÜKSEK'in yüzeyi bizde AÇIK DEĞİL; buna karşılık eski ORTA'ların
   AİT OLDUĞU sınıf (Link/useNavigate) bizde canlı bir yoldur ve 7.x'te
   kapalıdır. Sayı kötüleşti, MARUZİYET iyileşti.

   BU DOSYA O İDDİAYI BEYAN OLMAKTAN ÇIKARIR: yukarıdaki gerekçe "bugün RSC
   kullanmıyoruz" varsayımına dayanıyor. Varsayım bir gün sessizce
   bozulabilirdi — biri `createBrowserRouter` ya da bir `@react-router/*`
   framework paketi eklediği gün, advisory'nin yüzeyi AÇILIR ve kimse bunu
   yükseltme kararıyla ilişkilendirmezdi. Nöbetçi o günü KIRMIZI yapar.

   ÖLÇÜMÜN SINIRI DÜRÜSTÇE: advisory metinlerinin TAMAMI okunmadı (ağ yok);
   uygulanabilirlik yargısı advisory BAŞLIĞINA ("RSC Mode…", "SSR
   Hydration") ve aşağıda ÖLÇÜLEN kullanım yüzeyine dayanır. Bu sınır
   burada yazılıdır ki, iddia olduğundan güçlü okunmasın. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

/* RSC / framework / SSR moduna geçişin işaretleri. Biri belirdiği gün
   yukarıdaki "yüzey bizde açık değil" gerekçesi geçersizleşir ve karar
   YENİDEN verilmelidir. */
const YASAK_ISARETLER = [
  "createBrowserRouter",
  "createHashRouter",
  "createMemoryRouter",
  "RouterProvider",
  "StaticRouter",
  "StaticRouterProvider",
  "hydrateRoot",
  "@react-router/",
] as const;

function tsDosyalari(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const tam = path.join(dir, e.name);
    if (e.isDirectory()) tsDosyalari(tam, out);
    else if (/\.tsx?$/.test(e.name)) out.push(tam);
  }
  return out;
}

const DOSYALAR = tsDosyalari(SRC);

describe("ön-koşul — tarama GERÇEKTEN çalışıyor", () => {
  it("kaynak dosyalar bulunuyor ve router GERÇEKTEN kullanılıyor", () => {
    /* Bu satır olmadan aşağıdaki "hiçbir dosyada yok" iddiası, hiçbir dosya
       taramayan bozuk bir tarayıcıyla da yeşil kalırdı — bu deponun daha
       önce ÖLÇTÜĞÜ kör nokta (kurulum ilanı tarayıcısı). */
    expect(DOSYALAR.length).toBeGreaterThan(50);
    const kullanan = DOSYALAR.filter((f) =>
      fs.readFileSync(f, "utf8").includes("react-router-dom"),
    );
    expect(kullanan.length).toBeGreaterThan(5);
  });
});

describe("RSC / framework / SSR modu KULLANILMIYOR", () => {
  it.each(YASAK_ISARETLER)("%s hiçbir kaynak dosyada geçmiyor", (isaret) => {
    /* Kendi dosyasını hariç tutar: liste burada YAZILI olduğu için tarama
       kendi kendini yakalardı (ölçüm aracının kendi kör noktası — bu depoda
       daha önce ödendi). */
    const gecen = DOSYALAR.filter((f) => f !== path.join(SRC, "router-kapsami.test.ts"))
      .filter((f) => fs.readFileSync(f, "utf8").includes(isaret))
      .map((f) => path.relative(SRC, f));
    expect(
      gecen,
      `${isaret} kullanılmaya başlanmış: react-router 7 YÜKSEK advisory'sinin ` +
        `yüzeyi artık açık olabilir — yükseltme kararı YENİDEN verilmeli`,
    ).toEqual([]);
  });
});
