import { OptimizeArgs } from "../../types.js";

export type TaskType =
  | "new_feature"
  | "optimize_existing"
  | "refactor"
  | "bugfix"
  | "performance"
  | "ui_polish"
  | "dependency_upgrade"
  | "test_addition";

export interface WorkflowStep {
  id: string;
  label: string;
  isGate: boolean;
  gateTitle?: string;
  gateWhen?: string;
}

export interface WorkflowDefinition {
  taskType: TaskType;
  steps: WorkflowStep[];
}

const TASK_TYPE_KEYWORDS: Array<{ type: TaskType; keywords: string[] }> = [
  {
    type: "bugfix",
    keywords: ["修复", "bug", "fix", "错误", "报错", "异常", "崩溃", "不工作", "失效", "故障"],
  },
  {
    type: "performance",
    keywords: ["性能", "慢", "卡顿", "渲染慢", "performance", "提速", "加速", "内存泄漏", "优化性能", "加载慢"],
  },
  {
    type: "refactor",
    keywords: ["重构", "refactor", "重写", "整理代码", "重新组织", "代码清理"],
  },
  {
    type: "ui_polish",
    keywords: ["样式", "ui", "ux", "美化", "界面", "设计稿", "布局", "视觉", "css", "动画"],
  },
  {
    type: "dependency_upgrade",
    keywords: ["升级", "依赖", "版本", "upgrade", "dependency", "迁移", "migrate", "包更新"],
  },
  {
    type: "test_addition",
    keywords: ["测试", "test", "单元测试", "e2e", "jest", "vitest", "cypress", "spec"],
  },
  {
    type: "optimize_existing",
    keywords: ["优化", "改进", "improve", "optimize", "enhance", "调整", "完善"],
  },
];

const WORKFLOW_STEPS: Record<TaskType, WorkflowStep[]> = {
  new_feature: [
    { id: "task_classification", label: "Classify", isGate: false },
    { id: "project_understanding", label: "Context", isGate: false },
    { id: "design", label: "Design", isGate: true, gateTitle: "Design", gateWhen: "Before Implementation Plan" },
    { id: "plan", label: "Plan", isGate: true, gateTitle: "Plan", gateWhen: "Before Coding" },
    { id: "implementation", label: "Implement", isGate: false },
    { id: "typecheck", label: "TypeCheck", isGate: false },
    { id: "acceptance", label: "Acceptance", isGate: true, gateTitle: "Acceptance", gateWhen: "Before Delivery" },
    { id: "docs", label: "Docs", isGate: false },
  ],
  bugfix: [
    { id: "repro_rootcause", label: "Repro & RootCause", isGate: false },
    { id: "plan", label: "Fix Plan", isGate: true, gateTitle: "Fix Plan", gateWhen: "Before Coding" },
    { id: "implementation", label: "Implement", isGate: false },
    { id: "typecheck", label: "TypeCheck", isGate: false },
    { id: "verification", label: "Verify", isGate: false },
  ],
  performance: [
    { id: "metrics", label: "Measure Metrics", isGate: false },
    { id: "plan", label: "Optimization Plan", isGate: true, gateTitle: "Optimization Plan", gateWhen: "Before Coding" },
    { id: "implementation", label: "Implement", isGate: false },
    { id: "verification", label: "Before/After Compare", isGate: false },
  ],
  refactor: [
    { id: "scope_understanding", label: "Scope & Deps", isGate: false },
    { id: "refactor_doc", label: "RefactorDoc", isGate: true, gateTitle: "Refactor Doc", gateWhen: "Before Migration" },
    { id: "migration", label: "Migration Plan", isGate: true, gateTitle: "Migration", gateWhen: "Before Execution" },
    { id: "execution", label: "Execute", isGate: false },
    { id: "typecheck", label: "TypeCheck", isGate: false },
  ],
  optimize_existing: [
    { id: "current_understanding", label: "Analysis", isGate: false },
    { id: "change_doc", label: "Change Doc", isGate: true, gateTitle: "Change Doc", gateWhen: "Before Coding" },
    { id: "plan", label: "Plan", isGate: true, gateTitle: "Plan", gateWhen: "Before Coding" },
    { id: "implementation", label: "Implement", isGate: false },
    { id: "typecheck", label: "TypeCheck", isGate: false },
  ],
  ui_polish: [
    { id: "issues", label: "Issues List", isGate: false },
    { id: "plan", label: "UI Plan", isGate: true, gateTitle: "UI Plan", gateWhen: "Before Coding" },
    { id: "implementation", label: "Implement", isGate: false },
    { id: "verification", label: "Visual Verify", isGate: false },
  ],
  dependency_upgrade: [
    { id: "risk", label: "Versions & Breaking Changes", isGate: false },
    { id: "plan", label: "Upgrade Plan", isGate: true, gateTitle: "Upgrade Plan", gateWhen: "Before Coding" },
    { id: "implementation", label: "Implement", isGate: false },
    { id: "verification", label: "Verify", isGate: false },
  ],
  test_addition: [
    { id: "scope", label: "Test Scope", isGate: false },
    { id: "plan", label: "Test Plan", isGate: true, gateTitle: "Test Plan", gateWhen: "Before Coding" },
    { id: "implementation", label: "Write Tests", isGate: false },
    { id: "verification", label: "Run & Verify", isGate: false },
  ],
};

/**
 * 从用户输入文本推断任务类型（评分机制：匹配关键词最多的类型获胜）
 */
export function inferTaskType(userPrompt: string): TaskType {
  const lower = userPrompt.toLowerCase();
  let bestType: TaskType = "new_feature";
  let bestScore = 0;

  for (const { type, keywords } of TASK_TYPE_KEYWORDS) {
    const score = keywords.filter((k) => lower.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  return bestType;
}

/**
 * 构建工作流定义（含自动推断任务类型 + 对应步骤）
 */
export function buildWorkflowDefinition(args: OptimizeArgs): WorkflowDefinition {
  const taskType: TaskType = (args.taskType as TaskType) ?? inferTaskType(args.userPrompt);
  const steps = WORKFLOW_STEPS[taskType] ?? WORKFLOW_STEPS.new_feature;
  return { taskType, steps };
}
