/* Şablon-bağımsız analiz erişimi: uyarılar + sayfa sayısı (editör paneli için) */

import {
  analyzeGrid,
  analyzeList,
  type LayoutWarning,
} from "@tezgah/templates";
import type { ClientDTO, DocumentState } from "@tezgah/shared";

export interface DocAnalysis {
  warnings: LayoutWarning[];
  pages: number;
}

export function analyzeDoc(client: ClientDTO, doc: DocumentState): DocAnalysis {
  if (doc.template_id === "menu-liste-premium") {
    const a = analyzeList(client, doc);
    return { warnings: a.warnings, pages: a.pages.length };
  }
  const a = analyzeGrid(client, doc);
  return { warnings: a.warnings, pages: 1 };
}
