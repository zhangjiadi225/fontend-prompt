import { zh, Locale } from "./locales/zh.js";
import { en } from "./locales/en.js";

export const locales = { zh, en };

export type Lang = "zh" | "en";

export function getLocale(lang: Lang = "zh"): Locale {
  return locales[lang] || locales.zh;
}
