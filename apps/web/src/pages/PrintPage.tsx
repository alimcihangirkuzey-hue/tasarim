/* /print/:documentId?variant=print|preview — Puppeteer'ın açtığı sayfa (CONSTITUTION §9.1).
   Aynı şablon bileşeni mode:"print" ile çizilir (M3, tek render kaynağı).
   print  : bleed + crop marks (sayfa boyutu = net + 2×bleed)
   preview: net boyut, işaretsiz (bleed'li çizim negatif kenar boşluğuyla kırpılır) */

import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TEMPLATES } from "@tezgah/templates";
import { api } from "../api";

declare global {
  interface Window {
    __PRINT_READY__?: boolean;
    __PAGE_SIZE__?: { w: number; h: number; pages: number };
  }
}

export function PrintPage() {
  const { id = "" } = useParams();
  const [sp] = useSearchParams();
  const variant = sp.get("variant") === "preview" ? "preview" : "print";

  const docQ = useQuery({ queryKey: ["document", id], queryFn: () => api.document(id), enabled: !!id });
  const clientId = docQ.data?.client_id;
  const clientQ = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => api.client(clientId!),
    enabled: !!clientId,
  });

  const doc = docQ.data;
  const client = clientQ.data;
  const entry = doc ? TEMPLATES[doc.template_id] : undefined;

  useEffect(() => {
    if (!doc || !client || !entry) return;
    /* cm-bazlı tipler (vitro/tabela/garment) gerçek ölçüyü pageSizeMM'den verir */
    const size = entry.pageSizeMM
      ? entry.pageSizeMM(client, doc)
      : (() => {
          const fmtId =
            typeof doc.params["format"] === "string" &&
            entry.manifest.formats[doc.params["format"] as string]
              ? (doc.params["format"] as string)
              : entry.manifest.defaultFormat;
          const fmt = entry.manifest.formats[fmtId];
          return { w_mm: fmt.w_mm, h_mm: fmt.h_mm, bleed_mm: entry.manifest.bleed_mm };
        })();
    const bleed = size.bleed_mm;
    const pages = entry.pageCount ? entry.pageCount(client, doc) : 1;
    const w = variant === "print" ? size.w_mm + 2 * bleed : size.w_mm;
    const h = variant === "print" ? size.h_mm + 2 * bleed : size.h_mm;

    void document.fonts.ready.then(() => {
      window.__PAGE_SIZE__ = { w, h, pages };
      window.__PRINT_READY__ = true;
    });
  }, [doc, client, entry, variant]);

  if (docQ.isError || clientQ.isError) {
    return <p style={{ fontFamily: "sans-serif" }}>Belge yüklenemedi.</p>;
  }
  if (!doc || !client || !entry) return null;

  const bleed = entry.pageSizeMM
    ? entry.pageSizeMM(client, doc).bleed_mm
    : entry.manifest.bleed_mm;
  const pages = entry.pageCount ? entry.pageCount(client, doc) : 1;

  return (
    <div className={`print-root variant-${variant}`}>
      <style>{`
        html, body { margin: 0; padding: 0; background: #fff; }
        .print-root { margin: 0; }
        .sheet { page-break-after: always; overflow: hidden; position: relative; }
        .variant-preview .sheet svg { margin: -${bleed}mm 0 0 -${bleed}mm; }
        @media print { .sheet { break-after: page; } }
      `}</style>
      {Array.from({ length: pages }, (_, p) => (
        <div className="sheet" key={p}>
          <entry.Component
            client={client}
            doc={doc}
            mode="print"
            pageIndex={p}
            cropMarks={variant === "print"}
          />
        </div>
      ))}
    </div>
  );
}
