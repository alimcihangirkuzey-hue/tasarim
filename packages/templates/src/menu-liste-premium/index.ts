import type { TemplateEntry } from "../types.js";
import { manifest } from "./manifest.js";
import { MenuListePremiumTemplate } from "./Template.js";

export { analyzeList } from "./analyze.js";
export const menuListePremium: TemplateEntry = {
  manifest,
  Component: MenuListePremiumTemplate,
};
