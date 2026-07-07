import type { TemplateEntry } from "../types.js";
import { manifest } from "./manifest.js";
import { MenuGridCellsTemplate } from "./Template.js";

export { analyzeGrid } from "./analyze.js";
export const menuGridCells: TemplateEntry = {
  manifest,
  Component: MenuGridCellsTemplate,
};
