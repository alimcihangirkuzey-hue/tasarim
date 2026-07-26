/* Şablon-bağımsız analiz erişimi: uyarılar + sayfa sayısı (editör paneli için) */

import {
  TEMPLATES,
  analyzeEnseigne,
  analyzeGarment,
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
    case "garment": {
      const a = analyzeGarment(client, doc);
      return { warnings: a.warnings, pages: a.areas.length };
    }
    default: {
      /* CE bağlaması: fabrika şablonları uyarılarını KENDİ analizlerinden verir
         (entry.warnings köprüsü) — eski hâlde bu dal fabrika belgelerini
         menu-grid-cells analizine yönlendiriyordu ve panel ALAKASIZ kapasite
         matematiğinin uyarılarını gösteriyordu. Köprüsüz id'lerde eski
         davranış aynen (donuk). */
      const entry = TEMPLATES[doc.template_id];
      if (entry?.warnings) return { warnings: entry.warnings(client, doc), pages: 1 };
      const a = analyzeGrid(client, doc);
      return { warnings: a.warnings, pages: 1 };
    }
  }
}
