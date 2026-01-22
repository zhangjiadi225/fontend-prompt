import { OptimizeArgs } from "../../types.js";
import { includesAny } from "../../utils.js";
import { DEFAULT_DATA } from "../default-data.js";
import * as fs from "fs";
import * as path from "path";

function loadLocalQuestions(): { id: string; question: string }[] | null {
  try {
    const filePath = path.join(
      process.cwd(),
      ".shared/frontend-prompt/data/questions.json",
    );
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

/**
 * 根据输入生成澄清问题
 */
export function buildClarifyingQuestions(args: OptimizeArgs): string[] {
  const localQuestions = loadLocalQuestions();
  let t = DEFAULT_DATA.questions;

  // If local questions exist, we could potentially use them.
  // However, the logic here relies on specific keys (framework, techStack, etc.) to trigger based on context.
  // If user provides a custom questions.json, it's just a list of {id, question}.
  // Mapping custom questions to logic is hard without a rules engine.
  // Plan: For now, we use the default logic but pull the *text* from the loaded JSON if IDs match.
  // If there are *new* IDs in local questions, we can't easily trigger them automatically without rules.
  // So we only override the text of known IDs.

  if (localQuestions) {
    // Override default strings with local strings if ID matches
    const newT = { ...t };
    for (const q of localQuestions) {
      if (q.id in newT) {
        (newT as any)[q.id] = q.question;
      }
    }
    t = newT;
  }

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
