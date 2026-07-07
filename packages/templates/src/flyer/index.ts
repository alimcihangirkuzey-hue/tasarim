import type { TemplateEntry } from "../types.js";
import { manifest } from "./manifest.js";
import { FlyerTemplate } from "./Template.js";

export { analyzeFlyer } from "./analyze.js";
export const flyer: TemplateEntry = {
  manifest,
  Component: FlyerTemplate,
  pageCount: () => 2,
};
