/* /mockup/:docId?scene=scn_… — mimar kararı #5: canlı önizleme ve Puppeteer JPG
   AYNI bu sayfayı kullanır. Tasarımın 0. sayfası (net boyut, bleed kırpılmış)
   sahne fotoğrafı üzerine homografiyle bindirilir.

   F8-D: "BASKI PROVASI DEĞİL" damgası YALNIZ bu sayfada, KOŞULSUZ render —
   JPG = bu sayfanın ekran görüntüsü olduğundan damga piksele gömülü çıkar;
   print/preview AYRI bileşendir (PrintPage), damga oraya yapısal olarak
   sızamaz (ADR-005: mockup ≠ baskı provası). Çözünürlük tavanı MOCKUP_MAX_W
   (shared — server JPG rotasıyla AYNI sabit; anti-kaçış H2). Sahne katmanları
   (shadow/overlay, F8-D H3) settings'ten CSS olarak basılır. */

import { useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TEMPLATES, currentFormat } from "@tezgah/templates";
import { MOCKUP_MAX_W, mockupWatermarkText, quadTransform } from "@tezgah/shared";
import { api } from "../api";

const MM_PX = 96 / 25.4;

export function MockupPage() {
  const { id = "" } = useParams();
  const [sp] = useSearchParams();
  const sceneId = sp.get("scene") ?? "";

  const docQ = useQuery({ queryKey: ["document", id], queryFn: () => api.document(id), enabled: !!id });
  const clientId = docQ.data?.client_id;
  const clientQ = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => api.client(clientId!),
    enabled: !!clientId,
  });
  const scenesQ = useQuery({
    queryKey: ["scenes", clientId],
    queryFn: () => api.clientScenes(clientId!),
    enabled: !!clientId,
  });

  const doc = docQ.data;
  const client = clientQ.data;
  const scene = scenesQ.data?.find((s) => s.id === sceneId);
  const entry = doc ? TEMPLATES[doc.template_id] : undefined;

  const geom = useMemo(() => {
    if (!doc || !entry || !scene?.photo_px || !client) return null;
    const size = entry.pageSizeMM
      ? entry.pageSizeMM(client, doc)
      : (() => {
          const fmtId = currentFormat(entry.manifest, doc);
          const fmt = (entry.manifest.formats as Record<string, { w_mm: number; h_mm: number }>)[fmtId];
          return { w_mm: fmt.w_mm, h_mm: fmt.h_mm, bleed_mm: entry.manifest.bleed_mm };
        })();
    const B = size.bleed_mm;
    const designW = Math.round(size.w_mm * MM_PX);
    const designH = Math.round(size.h_mm * MM_PX);
    const pw = scene.photo_px.w || MOCKUP_MAX_W;
    const ph = scene.photo_px.h || 1200;
    const dispW = Math.min(MOCKUP_MAX_W, pw);
    const scale = dispW / pw;
    let css: string | null = null;
    try {
      css = quadTransform(designW, designH, scene.quad).css;
    } catch {
      css = null;
    }
    return { B, designW, designH, pw, ph, dispW, dispH: Math.round(ph * scale), scale, css };
  }, [doc, entry, scene, client]);

  useEffect(() => {
    if (!doc || !client || !scene || !geom?.css) return;
    void document.fonts.ready.then(() => {
      window.__PAGE_SIZE__ = { w: geom.dispW, h: geom.dispH, pages: 1 };
      window.__PRINT_READY__ = true;
    });
  }, [doc, client, scene, geom]);

  if (!doc || !client || !scene || !entry || !geom) return null;
  if (!scene.photo_urls || !geom.css) {
    return <p style={{ fontFamily: "sans-serif" }}>Sahne çözülemedi.</p>;
  }

  const { shadow, overlay } = scene.settings;
  const watermark = mockupWatermarkText(client.menu_language); // Δ2: çıktı dilini izler

  return (
    <div style={{ margin: 0 }}>
      <style>{`html, body { margin: 0; padding: 0; background: #000; }`}</style>
      <div
        style={{
          position: "relative",
          width: geom.dispW,
          height: geom.dispH,
          overflow: "hidden",
        }}
      >
        <img
          src={scene.photo_urls.master}
          width={geom.dispW}
          height={geom.dispH}
          style={{ display: "block" }}
          alt=""
        />
        {/* foto-px uzayı → ekran ölçeği; içinde tasarım → quad homografisi */}
        <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `scale(${geom.scale})` }}>
          <div
            style={{
              width: geom.designW,
              height: geom.designH,
              transformOrigin: "0 0",
              transform: geom.css,
              mixBlendMode: scene.settings.blend,
              opacity: scene.settings.opacity,
              overflow: "hidden",
              /* F8-D H3: gölge — filter transform'lu elemanda quad'la birlikte
                 eğilir (perspektifle uyumlu); opacity=0 → katman kapalı */
              filter:
                shadow.opacity > 0
                  ? `drop-shadow(0 ${shadow.dy_px}px ${shadow.blur_px}px rgba(0,0,0,${shadow.opacity}))`
                  : undefined,
            }}
          >
            {/* net tasarım: bleed negatif kenar boşluğuyla kırpılır */}
            <div style={{ marginLeft: -geom.B * MM_PX, marginTop: -geom.B * MM_PX, lineHeight: 0 }}>
              <entry.Component client={client} doc={doc} mode="print" pageIndex={0} cropMarks={false} />
            </div>
          </div>
        </div>

        {/* F8-D H3: ışık/vinyet tabakası — foto+tasarım üstü, damga altı */}
        {overlay.opacity > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: overlay.color,
              opacity: overlay.opacity,
              mixBlendMode: "soft-light",
              pointerEvents: "none",
            }}
          />
        )}

        {/* F8-D H1: "BASKI PROVASI DEĞİL" damgası — KOŞULSUZ (bu sayfa = yalnız
            mockup kanalı; JPG'ye piksel olarak gömülür, sökülemez). Soluk
            diyagonal + sağ-alt köşe bandı; mockup'ın işini gölgelemez. */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }}>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%) rotate(-24deg)",
              fontSize: Math.max(24, Math.round(geom.dispW * 0.05)),
              fontWeight: 700,
              letterSpacing: "0.25em",
              color: "rgba(255,255,255,0.13)",
              textShadow: "0 0 2px rgba(0,0,0,0.15)",
              whiteSpace: "nowrap",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            MOCKUP
          </div>
          <div
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              background: "rgba(17,17,17,0.72)",
              color: "#ffffff",
              fontSize: Math.max(11, Math.round(geom.dispW * 0.011)),
              padding: "6px 12px",
              fontFamily: "system-ui, sans-serif",
              letterSpacing: "0.04em",
              borderTopLeftRadius: 6,
            }}
          >
            {watermark}
          </div>
        </div>
      </div>
    </div>
  );
}
