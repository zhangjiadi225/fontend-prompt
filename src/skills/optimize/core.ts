import {
  ChatMessage,
  OptimizeArgs,
  OptimizedPromptPackage,
} from "../../types.js";
import { buildWorkflowDefinition } from "./workflow.js";
import { buildStructuredTemplate } from "./template.js";
import { DEFAULT_DATA } from "../default-data.js";

/**
 * 根据上下文生成 guardrails 列表
 */
function buildGuardrails(args: OptimizeArgs): string[] {
  const g = DEFAULT_DATA.guardrails;
  const rails = [g.standard_practice, g.no_speculation, g.structured_output];

  if (!args.language || args.language === "ts") {
    rails.push(g.ts_default);
  }
  if (args.framework) {
    rails.push(g.framework_practice.replace("{{framework}}", args.framework));
  }
  if (args.styling) {
    rails.push(g.styling_req.replace("{{styling}}", args.styling));
  }
  return rails;
}

/**
 * 根据缺失的上下文信息生成澄清问题列表
 */
function buildClarifyingQuestions(args: OptimizeArgs): string[] {
  const q = DEFAULT_DATA.questions;
  const questions: string[] = [];

  if (!args.framework) questions.push(q.framework);
  if (!args.techStack) questions.push(q.techStack);
  if (!args.language) questions.push(q.language);
  if (!args.styling) questions.push(q.styling);
  if (!args.stateManagement) questions.push(q.stateManagement);
  if (!args.router) questions.push(q.router);
  questions.push(q.api);

  return questions;
}

/**
 * 核心逻辑：将用户的 raw prompt 转换为优化的 prompt package。
 */
export function buildOptimizedPromptPackage(
  args: OptimizeArgs,
): OptimizedPromptPackage {
  const outputLanguage = args.outputLanguage ?? "zh";
  const outputFormat = args.outputFormat ?? "both";
  const codeStyle = args.codeStyle ?? "diff";
  const requireApprovalGates = args.requireApprovalGates ?? true;
  const t = DEFAULT_DATA.core;

  // 1. 构建工作流（含自动推断任务类型）
  const workflow = buildWorkflowDefinition(args);
  const resolvedTaskType = workflow.taskType;

  // 2. 构建 guardrails 和澄清问题
  const guardrails = buildGuardrails(args);
  const clarifyingQuestions = buildClarifyingQuestions(args);

  // 3. 组装 system / user 消息
  const system: string[] = [];
  system.push(t.system_prompt);

  const user: string[] = [];
  user.push(`## ${t.original_question}`);
  user.push(args.userPrompt.trim());
  if (args.projectContext?.trim()) {
    user.push(`\n## ${t.project_context}`);
    user.push(args.projectContext.trim());
  }

  user.push(`\n## ${t.structured_template}`);
  user.push(buildStructuredTemplate(args, resolvedTaskType));

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
      taskType: resolvedTaskType,
      requireApprovalGates,
      outputLanguage,
      outputFormat,
      codeStyle,
    },
  };
}
