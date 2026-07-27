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
    /* menu-grid-cells ARTIK AÇIK (journal 2026-07-26-uyari-kaynagi-durustlugu):
       bu aile bugüne dek default dalın analyzeGrid fallback'inden geliyordu ve
       sonuç DOĞRUYDU — ama doğruluğu tesadüfe benziyordu: aynı fallback,
       analizi OLMAYAN şablonlara da grid matematiğini uyguluyordu. Kaynağı açık
       ilan etmek, fallback'i dürüstleştirmenin ön koşuludur (aşağıdaki default). */
    case "menu-grid-cells": {
      const a = analyzeGrid(client, doc);
      return { warnings: a.warnings, pages: 1 };
    }
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
      /* UYARI KAYNAĞI DÜRÜSTLÜĞÜ (4.7; journal 2026-07-26-uyari-kaynagi-durustlugu,
         bulgu F1-latent-yara-iddiasi).

         BU DALA BUGÜN KİM DÜŞÜYOR — ÖLÇÜLDÜ: yalnız `kabul-fabrika`. TEMPLATES
         11 id taşır, 10'u yukarıda ADLA yakalanır. kabul-fabrika prototipli
         üretildiği için KÖPRÜLÜdür ve pageCount ilan etmez. Yani aşağıdaki iki
         düzeltme BUGÜN SIFIR DAVRANIŞ DEĞİŞTİRİR; kapattıkları ayrışma LATENT'tir,
         ölçülmüş bir vaka değildir. Bunu açıkça yazıyorum: doktrini "ilan !=
         davranış" olan bir paketin kendi yorumu, ölçülmemişi ölçülmüş gibi
         anlatamaz. Değer, "kanayan yarayı kapatmak" değil; ilan ile davranışın
         ayrışabildiği kolu kapatıp kapsamı nöbetçiyle çivilemektir.

         (1) FALLBACK KALDIRILDI. Köprüsüz id eskiden analyzeGrid'e düşerdi: analizi
         OLMAYAN şablona menu-grid-cells KAPASİTE MATEMATİĞİNİN uyarıları
         gösterilirdi. Yol gerçektir ama bugün boştur — emitter PROTOTİPSİZ dalda
         entry'yi köprüsüz üretir (apps/server/src/factory.ts; pin
         factory.test.ts:123) ve generated/ altındaki tek şablon prototiplidir.
         Fabrika-motor paketi yarayı kapattığını ilan ederken kendi yorumunda
         "köprüsüz id'lerde eski davranış aynen (donuk)" diyerek bu kolu bilerek
         açık bırakmıştı. Analizi olmayan şablona uydurma uyarı göstermek,
         göstermemekten kötüdür: operatör düzeltemeyeceği uyarıyı düzeltmeye
         çalışır ve gerçek uyarılara olan güveni aşınır. Kaynak yoksa uyarı da
         YOKTUR — uydurma değil, ölçülmüş yokluk.

         (2) pages ARTIK İLANDAN. Eskiden 1'e sabitti. entry.pageCount (types.ts)
         11 id'nin 10'unda ilan edilir (8 kaynak dosya; vitrophanie tek ilanla üç
         id'yi kapsar) ve PrintPage/PresentPage onu JENERİK okur;
         bu dal okumuyordu — aynı belge için baskı N, editör paneli 1 diyebilirdi.
         Emitter bugün pageCount emit etmediği için ayrışma henüz doğmadı; bu okuma
         KARDEŞ TÜKETİCİLERLE TUTARLILIK bağıdır, yeni bir ilan değildir. */
      const entry = TEMPLATES[doc.template_id];
      const pages = entry?.pageCount?.(client, doc) ?? 1;
      if (entry?.warnings) return { warnings: entry.warnings(client, doc), pages };
      return { warnings: [], pages };
    }
  }
}
