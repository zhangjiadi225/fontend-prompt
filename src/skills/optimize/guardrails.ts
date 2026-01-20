import { OptimizeArgs } from "../../types.js";
import { getLocale } from "../../i18n.js";

/**
 * 构建前端开发 Guardrails（约束/原则）
 */
export function buildFrontendGuardrails(args: OptimizeArgs): string[] {
  const t = getLocale(args.outputLanguage).guardrails;
  const guardrails: string[] = [
    t.frontend_practice,
    t.no_fabrication,
    t.no_new_deps,
    t.no_placeholder,
    t.no_inline_logic,
    t.executable_deliverable,
    t.maintainability,
    t.security,
    t.structured_output,
    t.kiss,
    t.no_assumptions,
  ];

  if (args.language === "ts") {
    guardrails.push(t.ts_default);
  }
  if (args.framework) {
    guardrails.push(t.framework_practice(args.framework));
  }
  if (args.styling) {
    guardrails.push(t.styling_req(args.styling));
  }
  if (args.constraints?.length) {
    guardrails.push(...args.constraints);
  }

  return guardrails;
}
