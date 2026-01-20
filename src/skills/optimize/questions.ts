import { OptimizeArgs } from "../../types.js";
import { includesAny } from "../../utils.js";
import { getLocale } from "../../i18n.js";

/**
 * 根据输入生成澄清问题
 */
export function buildClarifyingQuestions(args: OptimizeArgs): string[] {
  const t = getLocale(args.outputLanguage).questions;
  const questions: string[] = [];
  const prompt = (args.userPrompt ?? "").trim();
  const ctx = (args.projectContext ?? "").trim();
  const combined = `${prompt}\n${ctx}`.trim();

  if (
    !args.framework &&
    !includesAny(combined, [
      "react",
      "vue",
      "angular",
      "svelte",
      "next",
      "nuxt",
    ])
  ) {
    questions.push(t.framework);
  }
  if (!args.techStack) {
    questions.push(t.techStack);
  }
  if (!args.language && !includesAny(combined, ["typescript", "ts"])) {
    questions.push(t.language);
  }
  if (
    !args.styling &&
    !includesAny(combined, [
      "tailwind",
      "scss",
      "sass",
      "css modules",
      "styled-components",
      "emotion",
      "antd",
      "mui",
      "chakra",
      "vanilla css",
    ])
  ) {
    questions.push(t.styling);
  }
  if (
    !args.stateManagement &&
    !includesAny(combined, [
      "redux",
      "zustand",
      "recoil",
      "pinia",
      "vuex",
      "mobx",
      "context",
    ])
  ) {
    questions.push(t.stateManagement);
  }
  if (
    !args.router &&
    !includesAny(combined, [
      "react router",
      "next",
      "nuxt",
      "vue-router",
      "vue router",
      "app router",
      "pages router",
    ])
  ) {
    questions.push(t.router);
  }
  if (!includesAny(combined, ["api", "接口", "endpoint", "graphql", "rest"])) {
    questions.push(t.api);
  }
  if (!includesAny(combined, ["a11y", "accessibility", "无障碍", "aria"])) {
    questions.push(t.a11y);
  }
  if (!includesAny(combined, ["responsive", "mobile", "适配", "breakpoint"])) {
    questions.push(t.responsive);
  }
  if (
    !includesAny(combined, ["test", "jest", "vitest", "cypress", "playwright"])
  ) {
    questions.push(t.test);
  }

  if (
    !args.taskType &&
    !includesAny(combined, [
      "新功能",
      "优化",
      "重构",
      "bug",
      "修复",
      "性能",
      "ui",
      "升级",
      "依赖",
      "test",
    ])
  ) {
    questions.push(t.taskType);
  }

  return questions;
}
