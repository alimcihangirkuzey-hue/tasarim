import type { TemplateEntry } from "../types.js";
import { manifest } from "./manifest.js";
import { CarteFideliteTemplate } from "./Template.js";

export { analyzeFidelite } from "./analyze.js";
export const carteFidelite: TemplateEntry = {
  manifest,
  Component: CarteFideliteTemplate,
  pageCount: () => 2,
};
