import type { TemplateEntry } from "../types.js";
import { manifest } from "./manifest.js";
import { MenuTrifoldTemplate } from "./Template.js";

export { analyzeTrifold } from "./analyze.js";
export const menuTrifold: TemplateEntry = {
  manifest,
  Component: MenuTrifoldTemplate,
  pageCount: () => 2,
};
