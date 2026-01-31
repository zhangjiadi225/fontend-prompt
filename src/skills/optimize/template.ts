import { OptimizeArgs } from "../../types.js";
import { DEFAULT_DATA } from "../default-data.js";
import { REFERENCE_GUIDE } from "./references.js";

/**
 * 构建结构化的输出模板（Markdown），这是提示词的核心部分
 */
export function buildStructuredTemplate(args: OptimizeArgs) {
  const taskType = args.taskType ?? "new_feature";
  const t = DEFAULT_DATA.template;

  // Output the Intent-Alignment Structure (A-B-C)
  const structure = [
    t.structure_header,
    "",
    t.sec_a_header,
    t.sec_a_desc,
    "",
    t.sec_b_header,
    t.sec_b_desc,
    "",
    t.sec_c_header,
    t.sec_c_desc,
    "```markdown",
    `# Role: ${args.framework} Expert`,
    `# Goal: ${taskType}`,
    "...",
    "```"
  ];

  return [...structure, REFERENCE_GUIDE].join("\n");
}
