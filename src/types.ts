export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OptimizeArgs = {
  /** 用户的原始需求 */
  userPrompt: string;
  /** 项目上下文（可选） */
  projectContext?: string;
  /** 技术栈约束（可选） */
  techStack?: string;
  /** 框架（React/Vue 等） */
  framework?: string;
  /** 语言偏好 */
  language?: "ts" | "js";
  /** 样式方案 */
  styling?: string;
  /** 状态管理 */
  stateManagement?: string;
  /** 路由方案 */
  router?: string;
  /** 其他约束列表 */
  constraints?: string[];
  /** 任务类型 */
  taskType?:
    | "new_feature"
    | "optimize_existing"
    | "refactor"
    | "bugfix"
    | "performance"
    | "ui_polish"
    | "dependency_upgrade"
    | "test_addition";
  /** 输出语言 */
  outputLanguage?: "zh" | "en";
  /** 输出格式 */
  outputFormat?: "step_by_step" | "direct" | "both";
  /** 代码风格 */
  codeStyle?: "diff" | "full_files" | "snippets";
  /** 是否必须询问澄清问题 */
  mustAskClarifyingQuestions?: boolean;
  /** 是否需要审批关口 */
  requireApprovalGates?: boolean;
};

export type WorkflowGate = {
  id: string;
  title: string;
  when: string;
};

export type WorkflowStep = {
  id: string;
  title: string;
  gateId?: string;
};

export interface OptimizedPromptPackage {
  optimizedPrompt: string;
  messages: ChatMessage[];
  workflow: {
    taskType: string;
    requireApprovalGates: boolean;
    gateMarker: string;
    gates: WorkflowGate[];
    steps: WorkflowStep[];
  };
  guardrails: string[];
  clarifyingQuestions: string[];
  checklist: string[];
  meta: {
    framework: string | null;
    techStack: string | null;
    language: string | null;
    styling: string | null;
    stateManagement: string | null;
    router: string | null;
    taskType: string;
    requireApprovalGates: boolean;
    outputLanguage: "zh" | "en";
    outputFormat: "step_by_step" | "direct" | "both";
    codeStyle: "diff" | "full_files" | "snippets";
  };
  /**
   * Skill 执行的思考路径 (Markdown)
   */
  thought_trace?: string;
}
