/* Şablon-bağımsız analiz erişimi: uyarılar + sayfa sayısı (editör paneli için) */

import {
  analyzeEnseigne,
  analyzeFidelite,
  analyzeFlyer,
  analyzeGrid,
  analyzeList,
  analyzeTrifold,
  analyzeVitro,
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
    case "vitro-bandeau":
    case "vitro-centre":
    case "vitro-colonne": {
      const a = analyzeVitro(client, doc);
      return { warnings: a.warnings, pages: 1 };
    }
    case "enseigne-panneau": {
      const a = analyzeEnseigne(client, doc);
      return { warnings: a.warnings, pages: 1 };
    }
    default: {
      const a = analyzeGrid(client, doc);
      return { warnings: a.warnings, pages: 1 };
    }
  }
}
