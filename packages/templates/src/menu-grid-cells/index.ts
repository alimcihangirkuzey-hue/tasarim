import type { TemplateEntry } from "../types.js";
import { manifest } from "./manifest.js";
import { MenuGridCellsTemplate } from "./Template.js";
import { analyzeGrid } from "./analyze.js";

export { analyzeGrid } from "./analyze.js";
export const menuGridCells: TemplateEntry = {
  manifest,
  Component: MenuGridCellsTemplate,
  /* FAZ4 §8: multipage akışında gerçek sayfa sayısı (PDF sayfa sayısı = editör) */
  pageCount: (client, doc) => analyzeGrid(client, doc).pages,
};
