import {
  ChatMessage,
  OptimizeArgs,
  OptimizedPromptPackage,
} from "../../types.js";
import { buildWorkflowDefinition } from "./workflow.js";
import { buildFrontendGuardrails } from "./guardrails.js";
import { buildClarifyingQuestions } from "./questions.js";
import { buildStructuredTemplate } from "./template.js";
import { DEFAULT_DATA } from "../default-data.js";

/**
 * 核心逻辑：将用户的 raw prompt 转换为优化的 prompt package。
 */
export function buildOptimizedPromptPackage(
  args: OptimizeArgs,
): OptimizedPromptPackage {
  const outputLanguage = args.outputLanguage ?? "zh";
  const outputFormat = args.outputFormat ?? "both";
  const codeStyle = args.codeStyle ?? "diff";
  const mustAskClarifyingQuestions = args.mustAskClarifyingQuestions ?? true;
  const taskType = args.taskType ?? "new_feature";
  const requireApprovalGates = args.requireApprovalGates ?? true;
  const t = DEFAULT_DATA.core;

  const workflow = buildWorkflowDefinition(args);

  const guardrails = buildFrontendGuardrails(args);
  const clarifyingQuestions = buildClarifyingQuestions(args);

  const system: string[] = [];
  system.push(t.system_prompt);
  system.push(t.constraints);
  for (const g of guardrails) system.push(`- ${g}`);
  system.push(`- ${t.task_type}: ${taskType}`);
  system.push(
    `- ${t.approval_gate}: ${requireApprovalGates ? t.gate_enabled : t.gate_disabled}`,
  );

  const user: string[] = [];
  user.push(`## ${t.original_question}`);
  user.push(args.userPrompt.trim());
  if (args.projectContext?.trim()) {
    user.push(`\n## ${t.project_context}`);
    user.push(args.projectContext.trim());
  }
  user.push(`\n## ${t.expected_output}`);
  user.push(t.output_intro);

  user.push(`\n## ${t.output_format_req}`);
  user.push(`- ${t.output_mode}: ${outputFormat}`);
  user.push(`- ${t.code_style}: ${codeStyle}`);
  user.push(`- ${t.must_include}`);
  user.push(`- ${t.file_change}`);

  user.push(`\n## ${t.structured_template}`);
  user.push(buildStructuredTemplate(args));

  if (mustAskClarifyingQuestions && clarifyingQuestions.length) {
    user.push(`\n## ${t.clarifying_header}`);
    for (const q of clarifyingQuestions) user.push(`- ${q}`);
  }

  const messages: ChatMessage[] = [
    { role: "system", content: system.join("\n") },
    { role: "user", content: user.join("\n") },
  ];

  const optimizedPrompt = messages
    .map((m) => `[${m.role.toUpperCase()}]\n${m.content}`)
    .join("\n\n");

  const checklist = [
    "信息完整性：技术栈/框架/样式方案/状态/路由/接口/兼容性/测试要求",
    "交付物可执行：代码、文件结构、命令、步骤",
    "质量保障：类型/错误处理/边界情况/可访问性/性能",
    "变更控制：不引入不必要依赖；说明权衡与替代方案",
  ];

  return {
    optimizedPrompt,
    messages,
    workflow,
    guardrails,
    clarifyingQuestions,
    checklist,
    meta: {
      framework: args.framework ?? null,
      techStack: args.techStack ?? null,
      language: args.language ?? null,
      styling: args.styling ?? null,
      stateManagement: args.stateManagement ?? null,
      router: args.router ?? null,
      taskType,
      requireApprovalGates,
      outputLanguage,
      outputFormat,
      codeStyle,
    },
  };
}
