import { OptimizeArgs } from "../../types.js";
import { DEFAULT_DATA } from "../default-data.js";
import * as fs from "fs";
import * as path from "path";

function loadLocalGuardrails(): { id: string; content: string }[] | null {
  try {
    const filePath = path.join(
      process.cwd(),
      ".shared/frontend-prompt/data/guardrails.json",
    );
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    }
  } catch (e) {
    // Ignore error, fallback to default
  }
  return null;
}

/**
 * 构建前端开发 Guardrails（约束/原则）
 */
export function buildFrontendGuardrails(args: OptimizeArgs): string[] {
  const localData = loadLocalGuardrails();
  let guardrails: string[] = [];

  if (localData && Array.isArray(localData)) {
    // Use local configuration
    guardrails = localData.map((item) => item.content);
  } else {
    // Use defaults
    const t = DEFAULT_DATA.guardrails;
    guardrails = [
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
      guardrails.push(
        t.framework_practice.replace("{{framework}}", args.framework),
      );
    }
    if (args.styling) {
      guardrails.push(t.styling_req.replace("{{styling}}", args.styling));
    }
  }

  // Always append dynamic constraints passed via args, if any
  if (args.constraints?.length) {
    guardrails.push(...args.constraints);
  }

  // Handle placeholders in locally loaded guardrails if needed?
  // For simplicity, we only do replacement on defaults or if user puts {{framework}} in JSON.
  // Let's support it generally.
  return guardrails.map((g) => {
    let text = g;
    if (args.framework) {
      text = text.replace("{{framework}}", args.framework);
    }
    if (args.styling) {
      text = text.replace("{{styling}}", args.styling);
    }
    return text;
  });
}
