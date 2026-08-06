/* ROTA TABLOSU — İLAN OLARAK (react-router yükseltmesinin ön koşulu).

   NİYE AYRI DOSYA: tablo `main.tsx`'in içinde, `createRoot(...).render(...)`
   çağrısının ortasındaydı. O dosya import edildiği anda uygulamayı DOM'a
   basar; yani rota davranışı hiçbir testten ÖLÇÜLEMİYORDU. `react-router`
   6→7 majör atlaması tam da bu tabloyu etkiler ve ölçülmeden yükseltmek,
   `sharp` turunun reddettiği şeyin aynısı olurdu: yeni davranışı kendi
   çıktısıyla "doğru" ilan etmek.

   KROMLU / KROMSUZ AYRIMI BİR SÖZLEŞMEDİR, süs değil: print · present ·
   mockup · fiche · atolye rotaları üst bar OLMADAN çizilir (M3/§9.1 — üst
   bar PDF'e basılmaz). Bu ayrım bugüne dek yalnız JSX'in şeklinde yaşıyordu;
   artık ADI VAR ve nöbetçisi var. Yanlışlıkla kromlu tarafa taşınan bir
   print rotası, PDF'in tepesine gezinme çubuğu basardı.

   TABLO VERİ, ELEMAN JSX: yollar ve chrome kararı burada ilan edilir;
   `RotaAgaci` onları tek yerde JSX'e çevirir. İkinci bir yol listesi YOK. */

import React from "react";
import { Route, Routes } from "react-router-dom";
import { ClientListPage } from "./pages/ClientListPage";
import { ClientDetailPage } from "./pages/ClientDetailPage";
import { EditorPage } from "./pages/EditorPage";
import { FichePage } from "./pages/FichePage";
import { MockupPage } from "./pages/MockupPage";
import { PresentPage } from "./pages/PresentPage";
import { PrintPage } from "./pages/PrintPage";
import { ThemesPage } from "./pages/ThemesPage";
import { FontsPage } from "./pages/FontsPage";
import { ParseDictPage } from "./pages/ParseDictPage";
import { IngredientsPage } from "./pages/IngredientsPage";
import { FactoryPage } from "./pages/FactoryPage";
import { FactoryGuidePage } from "./pages/FactoryGuidePage";
import { SiparisPage } from "./pages/SiparisPage";
import { BriefPage } from "./pages/BriefPage";

/* P2 CAP-CANVAS-01: /atolye LAZY — konva chunk'ı YALNIZ bu rotada iner
   (ana bundle Δ=0). Lazy'lik bir BAŞARIM sözleşmesidir ve bu dosyada
   kalır; testte de aynı yoldan geçer. */
const AtolyePage = React.lazy(() => import("./pages/AtolyePage"));

export interface RotaIlani {
  yol: string;
  eleman: React.ReactElement;
}

/** Üst bar OLMADAN çizilen rotalar — çıktı yüzeyleri (M3/§9.1). */
export const KROMSUZ_ROTALAR: readonly RotaIlani[] = [
  { yol: "/print/:id", eleman: <PrintPage /> },
  { yol: "/present/:id", eleman: <PresentPage /> },
  { yol: "/mockup/:id", eleman: <MockupPage /> },
  { yol: "/fiche/:id", eleman: <FichePage /> },
  {
    yol: "/atolye",
    eleman: (
      <React.Suspense fallback={null}>
        <AtolyePage />
      </React.Suspense>
    ),
  },
];

/** Üst barlı (Layout içi) rotalar — operatörün gezindiği yüzeyler. */
export const KROMLU_ROTALAR: readonly RotaIlani[] = [
  { yol: "/", eleman: <ClientListPage /> },
  { yol: "/siparis", eleman: <SiparisPage /> },
  /* F1 P4: menü brief akışı (ayrı yaşam döngüsü — /siparis'e dokunulmadı) */
  { yol: "/brief", eleman: <BriefPage /> },
  { yol: "/clients/:id", eleman: <ClientDetailPage /> },
  { yol: "/editor/:id", eleman: <EditorPage /> },
  { yol: "/settings/themes", eleman: <ThemesPage /> },
  { yol: "/settings/fonts", eleman: <FontsPage /> },
  { yol: "/settings/parse", eleman: <ParseDictPage /> },
  { yol: "/settings/ingredients", eleman: <IngredientsPage /> },
  { yol: "/settings/factory", eleman: <FactoryPage /> },
  { yol: "/settings/factory-guide", eleman: <FactoryGuidePage /> },
];

/**
 * Rota ağacı — İLANDAN türetilir.
 *
 * `layout` DIŞARIDAN gelir: üst bar `main.tsx`'te yaşar ve bu katman onu
 * BİLMEZ. Böylece rota tablosu, üst barın kendi bağımlılıkları olmadan
 * ölçülebilir.
 *
 * YAKALAYICI ROTA (`*`) KROMLU TARAFI SARAR: bilinmeyen bir yol üst barlı
 * kabuğa düşer — operatör kaybolduğunda gezinebilsin diye. Kromsuz tarafa
 * düşseydi boş bir sayfada kalırdı.
 */
export function RotaAgaci({ layout }: { layout: (c: React.ReactNode) => React.ReactElement }) {
  return (
    <Routes>
      {KROMSUZ_ROTALAR.map((r) => (
        <Route key={r.yol} path={r.yol} element={r.eleman} />
      ))}
      <Route
        path="*"
        element={layout(
          <Routes>
            {KROMLU_ROTALAR.map((r) => (
              <Route key={r.yol} path={r.yol} element={r.eleman} />
            ))}
          </Routes>,
        )}
      />
    </Routes>
  );
}
