/* /mockup/:docId?scene=scn_… — mimar kararı #5: canlı önizleme ve Puppeteer JPG
   AYNI bu sayfayı kullanır. Tasarımın 0. sayfası (net boyut, bleed kırpılmış)
   sahne fotoğrafı üzerine homografiyle bindirilir. */

import { useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TEMPLATES, currentFormat } from "@tezgah/templates";
import { quadTransform } from "@tezgah/shared";
import { api } from "../api";

const MM_PX = 96 / 25.4;
const TARGET_W = 1600;

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
    const pw = scene.photo_px.w || 1600;
    const ph = scene.photo_px.h || 1200;
    const dispW = Math.min(TARGET_W, pw);
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
            }}
          >
            {/* net tasarım: bleed negatif kenar boşluğuyla kırpılır */}
            <div style={{ marginLeft: -geom.B * MM_PX, marginTop: -geom.B * MM_PX, lineHeight: 0 }}>
              <entry.Component client={client} doc={doc} mode="print" pageIndex={0} cropMarks={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
