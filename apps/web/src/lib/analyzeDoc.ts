/* Şablon-bağımsız analiz erişimi: uyarılar + sayfa sayısı (editör paneli için) */

import {
  analyzeFidelite,
  analyzeFlyer,
  analyzeGrid,
  analyzeList,
  analyzeTrifold,
  type LayoutWarning,
} from "@tezgah/templates";
import type { ClientDTO, DocumentState } from "@tezgah/shared";

export interface DocAnalysis {
  warnings: LayoutWarning[];
  pages: number;
}

export function analyzeDoc(client: ClientDTO, doc: DocumentState): DocAnalysis {
  switch (doc.template_id) {
    case "menu-liste-premium": {
      const a = analyzeList(client, doc);
      return { warnings: a.warnings, pages: a.pages.length };
    }
    case "menu-trifold": {
      const a = analyzeTrifold(client, doc);
      return { warnings: a.warnings, pages: 2 };
    }
    case "flyer": {
      const a = analyzeFlyer(client, doc);
      return { warnings: a.warnings, pages: 2 };
    }
    case "carte-fidelite": {
      const a = analyzeFidelite(client, doc);
      return { warnings: a.warnings, pages: 2 };
    }
    default: {
      const a = analyzeGrid(client, doc);
      return { warnings: a.warnings, pages: 1 };
    }
  }
}
