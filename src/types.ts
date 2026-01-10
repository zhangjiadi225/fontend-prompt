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

export type ScoreArgs = {
  /** 待评分的提示词 */
  prompt: string;
};

export type ScanProjectArgs = {
  /** 根目录路径 */
  rootDir?: string;
  /** 最大扫描深度 */
  maxDepth?: number;
  /** 最大文件条目数 */
  maxEntries?: number;
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
