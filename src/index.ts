import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OptimizeArgs = {
  userPrompt: string;
  projectContext?: string;
  techStack?: string;
  framework?: string;
  language?: "ts" | "js";
  styling?: string;
  stateManagement?: string;
  router?: string;
  constraints?: string[];
  taskType?:
    | "new_feature"
    | "optimize_existing"
    | "refactor"
    | "bugfix"
    | "performance"
    | "ui_polish"
    | "dependency_upgrade"
    | "test_addition";
  outputLanguage?: "zh" | "en";
  outputFormat?: "step_by_step" | "direct" | "both";
  codeStyle?: "diff" | "full_files" | "snippets";
  mustAskClarifyingQuestions?: boolean;
  requireApprovalGates?: boolean;
};

type ScoreArgs = {
  prompt: string;
};

type ScanProjectArgs = {
  rootDir?: string;
  maxDepth?: number;
  maxEntries?: number;
};

type WorkflowGate = {
  id: string;
  title: string;
  when: string;
};

type WorkflowStep = {
  id: string;
  title: string;
  gateId?: string;
};

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const s = value.trim();
  return s.length ? s : undefined;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function includesAny(haystack: string, needles: string[]): boolean {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n.toLowerCase()));
}

function safeResolveUnderCwd(p: string | undefined): string {
  const cwd = process.cwd();
  const target = path.resolve(cwd, p ?? ".");
  const rel = path.relative(cwd, target);
  if (rel.startsWith("..") || path.isAbsolute(rel) && rel.includes(":")) {
    throw new Error("scan_project: rootDir must be within the server working directory");
  }
  return target;
}

async function scanProject(args: ScanProjectArgs) {
  const root = safeResolveUnderCwd(args.rootDir);
  const maxDepth = typeof args.maxDepth === "number" ? clamp(Math.floor(args.maxDepth), 0, 10) : 4;
  const maxEntries = typeof args.maxEntries === "number" ? clamp(Math.floor(args.maxEntries), 50, 5000) : 1200;

  const ignoreNames = new Set(["node_modules", ".git", "dist", "build", ".next", ".nuxt", ".turbo"]);
  const treeLines: string[] = [];
  const filesIndex: string[] = [];
  let entriesCount = 0;

  async function walk(dir: string, depth: number, prefix: string) {
    if (entriesCount >= maxEntries) return;

    let dirents;
    try {
      dirents = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    const filtered = dirents
      .filter((d) => !ignoreNames.has(d.name))
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

    for (let i = 0; i < filtered.length; i++) {
      if (entriesCount >= maxEntries) return;
      const d = filtered[i];
      const isLast = i === filtered.length - 1;
      const connector = isLast ? "└─" : "├─";
      const rel = path.relative(root, path.join(dir, d.name)).replace(/\\/g, "/");
      treeLines.push(`${prefix}${connector} ${d.name}${d.isDirectory() ? "/" : ""}`);
      entriesCount++;
      if (!d.isDirectory()) filesIndex.push(rel);
      if (d.isDirectory() && depth < maxDepth) {
        await walk(path.join(dir, d.name), depth + 1, `${prefix}${isLast ? "   " : "│  "}`);
      }
    }
  }

  treeLines.push(`${path.basename(root) || "."}/`);
  await walk(root, 0, "");

  const claudeCandidates = filesIndex.filter((p) => p.toLowerCase().endsWith("claude.md"));
  const suggestedFiles = [
    "package.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "package-lock.json",
    "tsconfig.json",
    "vite.config.ts",
    "vite.config.js",
    "next.config.js",
    "nuxt.config.ts",
    "eslint.config.js",
    ".eslintrc",
    ".prettierrc",
    "README.md",
    "CLAUDE.md",
  ].filter((f) => filesIndex.some((p) => p.toLowerCase() === f.toLowerCase()));

  return {
    rootDir: root,
    maxDepth,
    maxEntries,
    truncated: entriesCount >= maxEntries,
    tree: treeLines.join("\n"),
    hasClaudeMd: claudeCandidates.length > 0,
    claudeMdPaths: claudeCandidates,
    suggestedFiles,
  };
}

function buildFrontendGuardrails(args: OptimizeArgs): string[] {
  const guardrails: string[] = [
    "输出必须面向前端开发实践（UI、交互、状态、路由、可访问性、性能、工程化），不要泛泛而谈。",
    "如果关键信息不足，先提出澄清问题，不要凭空编造业务规则或接口字段。",
    "除非明确要求，否则不要引入新的第三方依赖；如果必须引入，要说明原因与替代方案。",
    "给出可执行的交付物（代码/文件结构/命令/步骤），避免只给概念。",
    "优先考虑可维护性：类型、安全边界、错误处理、可测试性与可扩展性。",
    "遵循安全与隐私：不要输出或要求提供密钥、token、个人敏感信息。",
    "严格按要求的结构化模板输出；必须在需要审批的 gate 停止并等待用户确认。",
  ];

  if (args.language === "ts") {
    guardrails.push("默认使用 TypeScript，类型定义清晰，避免 any；必要时用类型收窄。 ");
  }
  if (args.framework) {
    guardrails.push(`优先使用 ${args.framework} 的最佳实践与官方推荐写法。`);
  }
  if (args.styling) {
    guardrails.push(`样式实现需符合：${args.styling}。`);
  }
  if (args.constraints?.length) {
    guardrails.push(...args.constraints);
  }

  return guardrails;
}

function buildWorkflowDefinition(args: OptimizeArgs): {
  taskType: NonNullable<OptimizeArgs["taskType"]>;
  requireApprovalGates: boolean;
  gateMarker: string;
  gates: WorkflowGate[];
  steps: WorkflowStep[];
} {
  const taskType = args.taskType ?? "new_feature";
  const requireApprovalGates = args.requireApprovalGates ?? true;
  const gateMarker = "<<<MCP:GATE";

  const gatesByType: Record<string, WorkflowGate[]> = {
    new_feature: [
      { id: "new_feature_design", title: "新功能设计方案", when: "设计方案完成后，开始开发方案/实现之前" },
      { id: "new_feature_plan", title: "开发方案与 TODO", when: "开发步骤与 TODO 列表输出后，开始写代码之前" },
      { id: "new_feature_accept", title: "交付与验收", when: "TS 校验/实现完成后，等待用户验收" },
    ],
    optimize_existing: [
      { id: "opt_change_doc", title: "变更说明文档", when: "Before/After/Scope 文档输出后，开始改代码之前" },
      { id: "opt_plan", title: "实施计划与 TODO", when: "实施计划输出后，开始改代码之前" },
    ],
    refactor: [
      { id: "refactor_doc", title: "重构说明文档", when: "映射表与原则确定后，执行迁移之前" },
      { id: "refactor_migration", title: "迁移脚本/迁移方案", when: "脚本与运行方式确认后，执行迁移之前" },
    ],
    bugfix: [{ id: "bugfix_plan", title: "修复方案", when: "根因定位后，开始改代码之前" }],
    performance: [{ id: "perf_plan", title: "性能优化方案", when: "指标与瓶颈确认后，开始改代码之前" }],
    ui_polish: [{ id: "ui_polish_plan", title: "UI 调整方案", when: "问题清单确认后，开始改代码之前" }],
    dependency_upgrade: [{ id: "dep_upgrade_plan", title: "升级方案与回滚计划", when: "风险评估后，开始升级之前" }],
    test_addition: [{ id: "test_plan", title: "测试补充方案", when: "用例范围确认后，开始写测试之前" }],
  };

  const gates = gatesByType[taskType] ?? gatesByType.new_feature;

  const steps: WorkflowStep[] = [
    { id: "task_classification", title: "任务分类" },
    { id: "project_understanding", title: "项目理解" },
    { id: "risk_constraints", title: "风险与约束确认" },
  ];

  if (taskType === "new_feature") {
    steps.push(
      { id: "design", title: "新功能设计方案", gateId: "new_feature_design" },
      { id: "plan", title: "开发方案与 TODO", gateId: "new_feature_plan" },
      { id: "implementation", title: "开发实现" },
      { id: "typecheck", title: "TypeScript 校验（如适用）" },
      { id: "acceptance", title: "交付与验收", gateId: "new_feature_accept" },
      { id: "docs", title: "文档更新（条件触发：claude.md 存在）" },
    );
  } else if (taskType === "optimize_existing") {
    steps.push(
      { id: "current_understanding", title: "现状理解（老功能逻辑）" },
      { id: "change_doc", title: "变更说明文档（Markdown）", gateId: "opt_change_doc" },
      { id: "plan", title: "实施计划与 TODO", gateId: "opt_plan" },
      { id: "implementation", title: "实施与验证" },
    );
  } else if (taskType === "refactor") {
    steps.push(
      { id: "scope_understanding", title: "重构范围与现状理解" },
      { id: "refactor_doc", title: "重构说明文档（Markdown）", gateId: "refactor_doc" },
      { id: "migration", title: "迁移方案与脚本", gateId: "refactor_migration" },
      { id: "execution", title: "执行重构" },
    );
  } else if (taskType === "bugfix") {
    steps.push(
      { id: "repro_rootcause", title: "复现与根因定位" },
      { id: "plan", title: "修复方案", gateId: "bugfix_plan" },
      { id: "implementation", title: "实施与验证" },
    );
  } else if (taskType === "performance") {
    steps.push(
      { id: "metrics", title: "性能目标与指标" },
      { id: "plan", title: "优化方案", gateId: "perf_plan" },
      { id: "implementation", title: "实施与对比" },
    );
  } else if (taskType === "ui_polish") {
    steps.push(
      { id: "issues", title: "体验问题清单" },
      { id: "plan", title: "调整方案", gateId: "ui_polish_plan" },
      { id: "implementation", title: "实施与验收" },
    );
  } else if (taskType === "dependency_upgrade") {
    steps.push(
      { id: "risk", title: "升级范围与风险评估" },
      { id: "plan", title: "升级方案与回滚计划", gateId: "dep_upgrade_plan" },
      { id: "implementation", title: "实施与验证" },
    );
  } else {
    steps.push(
      { id: "plan", title: "测试补充方案", gateId: "test_plan" },
      { id: "implementation", title: "实施与验证" },
    );
  }

  return {
    taskType,
    requireApprovalGates,
    gateMarker,
    gates,
    steps,
  };
}

function buildStructuredTemplate(args: OptimizeArgs) {
  const taskType = args.taskType ?? "new_feature";
  const requireApprovalGates = args.requireApprovalGates ?? true;
  const language = args.language ?? "ts";

  const workflow = buildWorkflowDefinition(args);

  const gateLine = requireApprovalGates
    ? "- 在标注为 **[GATE: NEED USER APPROVAL]** 的位置必须停止输出后续内容，等待用户明确回复“同意/调整”。"
    : "- 允许一次性输出完整内容，但仍需标注原本的 gate 节点。";

  const base = [
    "# 输出结构（必须严格遵守）",
    "## - Machine readable workflow",
    `- mcp_workflow: ${JSON.stringify({ task_type: workflow.taskType, require_approval_gates: workflow.requireApprovalGates, gates: workflow.gates }, null, 0)}`,
    `- gate_marker_prefix: ${workflow.gateMarker} id=\"...\" action=\"WAIT_FOR_USER_APPROVAL\">>>`,
    "## 0. 任务分类",
    "- task_type: <new_feature|optimize_existing|refactor|bugfix|performance|ui_polish|dependency_upgrade|test_addition>",
    "- 目标: <一句话>",
    "- 非目标: <明确不做什么>",
    "",
    "## 1. 项目理解（必须先做）",
    "- 如果你还不了解项目结构：先调用工具 `scan_project` 获取目录树与关键文件，然后基于结果总结架构。",
    "- 列出与你要改动最相关的文件/目录（最多 10 个）。",
    "- 如需进一步定位：提出要用户提供的入口文件/路由/组件/接口契约。",
    "",
    "## 2. 风险与约束确认",
    "- 兼容性: 浏览器范围/移动端/SSR/SEO（如适用）",
    "- 依赖限制: 是否允许新增依赖",
    "- 质量门槛: a11y/性能/测试要求",
    "",
    gateLine,
    "- 当你到达 gate 节点并完成该章节后，输出一行：`<<<MCP:WAIT gate_id=\"<id>\" action=\"WAIT_FOR_USER_APPROVAL\">>>`，然后立刻停止。",
  ];

  if (taskType === "new_feature") {
    return [
      ...base,
      "",
      "<<<MCP:GATE id=\"new_feature_design\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
      "## 3. 新功能设计方案 **[GATE: NEED USER APPROVAL]**",
      "- 用户故事/验收标准（可测试、可验收）",
      "- UI/交互说明（状态：loading/empty/error/success）",
      "- 状态设计（本地/全局/服务端状态）",
      "- 路由与导航（如适用）",
      "- 数据流与接口契约（如适用：字段、错误码、鉴权、缓存策略）",
      "- 文件变更预告（新增/修改的文件路径清单）",
      "- 关键决策与备选方案（trade-offs）",
      "<<<MCP:WAIT gate_id=\"new_feature_design\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
      "",
      "<<<MCP:GATE id=\"new_feature_plan\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
      "## 4. 开发方案与 TODO 流程 **[GATE: NEED USER APPROVAL]**",
      "- 开发步骤（可分 PR/commit 阶段）",
      "- TODO 列表（使用 Markdown checklist）",
      "- 验证计划（本地运行/手动测试点/测试用例）",
      "<<<MCP:WAIT gate_id=\"new_feature_plan\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
      "",
      "## 5. 开发实现（通过 gate 后才输出）",
      "- 按你在第 4 步承诺的方式输出代码（diff/full_files/snippets）",
      "",
      "## 6. TypeScript 校验与问题修复（如适用）",
      language === "ts"
        ? "- 先执行 TS 校验（例如 tsc --noEmit 或 npm script），贴出关键错误并修复后再继续。"
        : "- 如非 TS 项目则跳过此步骤。",
      "",
      "<<<MCP:GATE id=\"new_feature_accept\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
      "## 7. 交付与验收 **[GATE: NEED USER APPROVAL]**",
      "- 给出验收清单（按验收标准逐条核对）",
      "- 提示用户验收：通过/不通过/需要调整",
      "<<<MCP:WAIT gate_id=\"new_feature_accept\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
      "",
      "## 8. 文档更新（条件触发）",
      "- 若 `scan_project` 显示存在 `claude.md/CLAUDE.md`：将本次新功能的描述追加到对应文档的合适位置。",
      "- 若不存在：跳过文档更新。",
    ].join("\n");
  }

  if (taskType === "optimize_existing") {
    return [
      ...base,
      "",
      "## 3. 现状理解（老功能逻辑）",
      "- 描述当前功能的输入/输出/关键分支/异常路径",
      "- 列出当前痛点（性能/可维护性/体验/bug 风险）",
      "",
      "<<<MCP:GATE id=\"opt_change_doc\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
      "## 4. 变更说明文档（Markdown） **[GATE: NEED USER APPROVAL]**",
      "- 标题：<优化主题>",
      "- Before：当前行为与问题点",
      "- After：目标行为与改动收益",
      "- Scope：改动范围（文件、模块、接口）",
      "- Out of Scope：明确不改哪些",
      "- 风险与回滚：可能风险、回滚策略",
      "- 验收点：如何验证优化确实生效",
      "<<<MCP:WAIT gate_id=\"opt_change_doc\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
      "",
      "<<<MCP:GATE id=\"opt_plan\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
      "## 5. 实施计划与 TODO **[GATE: NEED USER APPROVAL]**",
      "- TODO checklist",
      "- 测试/验证计划",
      "<<<MCP:WAIT gate_id=\"opt_plan\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
      "",
      "## 6. 实施与验证（通过 gate 后才输出）",
      "- 输出代码变更",
      "- 如果是 TS 项目：执行 TS 校验并修复",
      "- 输出对比结果（Before/After，包含指标/体验变化）",
    ].join("\n");
  }

  if (taskType === "refactor") {
    return [
      ...base,
      "",
      "## 3. 重构范围与现状理解",
      "- 列出重构范围内的模块/目录/入口",
      "- 描述现有结构与主要依赖关系（数据流、组件层级、耦合点）",
      "",
      "<<<MCP:GATE id=\"refactor_doc\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
      "## 4. 重构说明文档（Markdown） **[GATE: NEED USER APPROVAL]**",
      "- Before：当前结构、主要问题",
      "- After：目标结构、约束与原则",
      "- 目录/文件迁移映射表：old_path -> new_path（详细）",
      "- 兼容策略：过渡层/adapter/别名/弃用计划（如需要）",
      "- 风险与回滚：如何逐步落地",
      "<<<MCP:WAIT gate_id=\"refactor_doc\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
      "",
      "<<<MCP:GATE id=\"refactor_migration\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
      "## 5. 迁移方案与脚本（如涉及大范围移动） **[GATE: NEED USER APPROVAL]**",
      "- 提供一个一次性迁移脚本（js/ts/py）方案：做文件移动、import 路径更新（或至少生成迁移清单）",
      "- 说明脚本运行方式与注意事项",
      "<<<MCP:WAIT gate_id=\"refactor_migration\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
      "",
      "## 6. 执行重构（通过 gate 后才输出）",
      "- 按映射表实施变更",
      "- 运行 TS 校验/构建/测试（如存在）并修复",
      "- 输出最终结构与关键文件变化摘要",
    ].join("\n");
  }

  if (taskType === "bugfix") {
    return [
      ...base,
      "",
      "## 3. 复现与根因定位",
      "- 复现步骤、预期 vs 实际",
      "- 根因分析（涉及代码位置）",
      "",
      "<<<MCP:GATE id=\"bugfix_plan\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
      "## 4. 修复方案 **[GATE: NEED USER APPROVAL]**",
      "- 修复点与影响范围",
      "- 是否需要补充测试用例",
      "<<<MCP:WAIT gate_id=\"bugfix_plan\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
      "",
      "## 5. 实施与验证（通过 gate 后才输出）",
      "- 输出代码变更",
      "- 验证结果与回归检查点",
    ].join("\n");
  }

  if (taskType === "performance") {
    return [
      ...base,
      "",
      "## 3. 性能目标与指标",
      "- 明确指标：LCP/CLS/INP/TTI、bundle size、渲染次数、接口耗时等",
      "",
      "<<<MCP:GATE id=\"perf_plan\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
      "## 4. 优化方案 **[GATE: NEED USER APPROVAL]**",
      "- 瓶颈假设与验证方法",
      "- 改动点与预期收益",
      "<<<MCP:WAIT gate_id=\"perf_plan\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
      "",
      "## 5. 实施与对比（通过 gate 后才输出）",
      "- 输出代码变更",
      "- Before/After 数据对比",
    ].join("\n");
  }

  if (taskType === "ui_polish") {
    return [
      ...base,
      "",
      "## 3. 体验问题清单",
      "- 视觉/布局/交互/动效/可访问性问题",
      "",
      "<<<MCP:GATE id=\"ui_polish_plan\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
      "## 4. 调整方案（含截图/描述） **[GATE: NEED USER APPROVAL]**",
      "- 每个问题的改法与验收点",
      "<<<MCP:WAIT gate_id=\"ui_polish_plan\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
      "",
      "## 5. 实施与验收（通过 gate 后才输出）",
      "- 输出代码变更",
      "- 验收清单",
    ].join("\n");
  }

  if (taskType === "dependency_upgrade") {
    return [
      ...base,
      "",
      "## 3. 升级范围与风险评估",
      "- 目标依赖/版本区间",
      "- Breaking changes 风险与迁移成本",
      "",
      "<<<MCP:GATE id=\"dep_upgrade_plan\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
      "## 4. 升级方案与回滚计划 **[GATE: NEED USER APPROVAL]**",
      "- 升级步骤与验证方式",
      "- 回滚方案",
      "<<<MCP:WAIT gate_id=\"dep_upgrade_plan\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
      "",
      "## 5. 实施与验证（通过 gate 后才输出）",
      "- 输出代码变更",
      "- 构建/测试/TS 校验结果",
    ].join("\n");
  }

  return [
    ...base,
    "",
    "<<<MCP:GATE id=\"test_plan\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
    "## 3. 测试补充方案 **[GATE: NEED USER APPROVAL]**",
    "- 测试范围与优先级（单测/组件/E2E）",
    "- 用例列表与覆盖目标",
    "<<<MCP:WAIT gate_id=\"test_plan\" action=\"WAIT_FOR_USER_APPROVAL\">>>",
    "",
    "## 4. 实施与验证（通过 gate 后才输出）",
    "- 输出测试代码与必要的轻量重构",
    "- 运行结果与覆盖说明",
  ].join("\n");
}

function buildClarifyingQuestions(args: OptimizeArgs): string[] {
  const questions: string[] = [];
  const prompt = (args.userPrompt ?? "").trim();
  const ctx = (args.projectContext ?? "").trim();
  const combined = `${prompt}\n${ctx}`.trim();

  if (!args.framework && !includesAny(combined, ["react", "vue", "angular", "svelte", "next", "nuxt"])) {
    questions.push("你使用的前端框架/运行环境是什么？（React/Vue/Angular/Svelte/Next.js/Nuxt 等）");
  }
  if (!args.techStack) {
    questions.push("项目技术栈有哪些约束？（Vite/Webpack/Next、Node 版本、包管理器、Monorepo 等）");
  }
  if (!args.language && !includesAny(combined, ["typescript", "ts"])) {
    questions.push("代码希望用 TypeScript 还是 JavaScript？");
  }
  if (!args.styling && !includesAny(combined, ["tailwind", "scss", "sass", "css modules", "styled-components", "emotion", "antd", "mui", "chakra"])) {
    questions.push("样式/组件库有要求吗？（Tailwind/CSS Modules/SCSS/Styled-Components/Antd/MUI 等）");
  }
  if (!args.stateManagement && !includesAny(combined, ["redux", "zustand", "recoil", "pinia", "vuex", "mobx"])) {
    questions.push("状态管理方案是什么？（Redux/Zustand/Context/Pinia 等，或无需全局状态）");
  }
  if (!args.router && !includesAny(combined, ["react router", "next", "nuxt", "vue-router"])) {
    questions.push("路由方案是什么？（React Router/Next App Router/Vue Router 等）");
  }
  if (!includesAny(combined, ["api", "接口", "endpoint", "graphql", "rest"])) {
    questions.push("是否需要对接接口？若需要：接口协议（REST/GraphQL）、关键字段、错误码、鉴权方式是什么？");
  }
  if (!includesAny(combined, ["a11y", "accessibility", "无障碍", "aria"])) {
    questions.push("是否需要无障碍（a11y）要求？例如键盘可用、ARIA、对比度、读屏支持等。");
  }
  if (!includesAny(combined, ["responsive", "mobile", "适配", "breakpoint"])) {
    questions.push("需要响应式/移动端适配吗？支持哪些断点与浏览器范围？");
  }
  if (!includesAny(combined, ["test", "jest", "vitest", "cypress", "playwright"])) {
    questions.push("需要测试吗？（单测/组件测试/E2E）使用什么测试框架？");
  }

  if (!args.taskType && !includesAny(combined, ["新功能", "优化", "重构", "bug", "修复", "性能", "ui", "升级", "依赖", "test"])) {
    questions.push("本次属于哪种任务类型？（新功能开发/老功能优化/重构/修复 bug/性能优化/UI 打磨/依赖升级/补测试）");
  }

  return questions;
}

function buildOptimizedPromptPackage(args: OptimizeArgs) {
  const outputLanguage = args.outputLanguage ?? "zh";
  const outputFormat = args.outputFormat ?? "both";
  const codeStyle = args.codeStyle ?? "diff";
  const mustAskClarifyingQuestions = args.mustAskClarifyingQuestions ?? true;
  const taskType = args.taskType ?? "new_feature";
  const requireApprovalGates = args.requireApprovalGates ?? true;

  const workflow = buildWorkflowDefinition(args);

  const guardrails = buildFrontendGuardrails(args);
  const clarifyingQuestions = buildClarifyingQuestions(args);

  const system: string[] = [];
  system.push(
    outputLanguage === "zh"
      ? "你是资深前端工程师与技术负责人。你的任务是把需求落地为高质量、可维护、可测试的实现方案与代码。"
      : "You are a senior frontend engineer/tech lead. Turn requirements into high-quality, maintainable, testable plans and code.",
  );
  system.push(
    outputLanguage === "zh"
      ? "你必须遵守以下约束："
      : "You must follow these constraints:",
  );
  for (const g of guardrails) system.push(`- ${g}`);
  system.push(outputLanguage === "zh" ? `- 任务类型: ${taskType}` : `- Task type: ${taskType}`);
  system.push(
    outputLanguage === "zh"
      ? `- 审批 gate: ${requireApprovalGates ? "启用（必须停在 gate 等用户同意）" : "关闭（可一次性输出但仍标注 gate）"}`
      : `- Approval gates: ${requireApprovalGates ? "enabled" : "disabled"}`,
  );

  const user: string[] = [];
  user.push("## 原始问题");
  user.push(args.userPrompt.trim());
  if (args.projectContext?.trim()) {
    user.push("\n## 项目上下文");
    user.push(args.projectContext.trim());
  }
  user.push("\n## 期望输出");
  user.push(
    outputLanguage === "zh"
      ? "请先产出澄清问题（如果需要），再给出方案与实现。"
      : "Ask clarifying questions if needed, then provide plan and implementation.",
  );

  user.push("\n## 输出格式要求");
  user.push(`- 输出模式: ${outputFormat}`);
  user.push(`- 代码输出方式: ${codeStyle}`);
  user.push("- 必须包含：方案/关键决策/边界情况/错误处理/可访问性/性能注意事项");
  user.push("- 如果需要新增/修改文件：给出文件路径与内容（或给出清晰 diff）");

  user.push("\n## 强制结构化模板");
  user.push(buildStructuredTemplate(args));

  if (mustAskClarifyingQuestions && clarifyingQuestions.length) {
    user.push("\n## 需要你先确认的问题");
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

function scoreFrontendPrompt(args: ScoreArgs) {
  const prompt = args.prompt.trim();
  const lower = prompt.toLowerCase();

  const signals = {
    hasContext: prompt.length >= 200 || includesAny(lower, ["背景", "上下文", "context", "existing", "现有"]),
    hasStack: includesAny(lower, ["react", "vue", "angular", "svelte", "next", "nuxt", "vite", "webpack"]),
    hasConstraints: includesAny(lower, ["必须", "禁止", "约束", "constraint", "don\u2019t", "do not", "avoid"]),
    hasDeliverables: includesAny(lower, ["输出", "deliver", "code", "diff", "文件", "file", "目录", "structure"]),
    hasEdgeCases: includesAny(lower, ["边界", "edge", "error", "异常", "fallback", "loading"]),
    hasA11y: includesAny(lower, ["a11y", "accessibility", "aria", "无障碍"]),
    hasPerformance: includesAny(lower, ["performance", "性能", "lcp", "cls", "memo", "virtualize", "debounce"]),
    hasTesting: includesAny(lower, ["test", "jest", "vitest", "cypress", "playwright"]),
    hasGates: includesAny(lower, ["<<<mcp:gate", "<<<mcp:wait", "[gate", "need user approval", "审批", "等待用户", "同意后"]),
    hasScanProject: includesAny(lower, ["scan_project", "项目理解", "目录树", "架构"]),
    hasTemplateSections: includesAny(lower, ["## 0.", "## 1.", "## 2.", "## 3."])
      || includesAny(lower, ["输出结构（必须严格遵守）"]),
  };

  const breakdown = {
    clarity: clamp((prompt.length >= 80 ? 20 : 10) + (signals.hasDeliverables ? 10 : 0), 0, 30),
    context: clamp((signals.hasContext ? 20 : 8) + (signals.hasStack ? 10 : 0), 0, 30),
    constraints: clamp((signals.hasConstraints ? 18 : 6) + (signals.hasEdgeCases ? 6 : 0), 0, 30),
    qualityBars: clamp((signals.hasA11y ? 5 : 0) + (signals.hasPerformance ? 5 : 0) + (signals.hasTesting ? 5 : 0), 0, 15),
    process: clamp((signals.hasGates ? 8 : 0) + (signals.hasScanProject ? 6 : 0) + (signals.hasTemplateSections ? 6 : 0), 0, 20),
  };

  const score = clamp(
    breakdown.clarity + breakdown.context + breakdown.constraints + breakdown.qualityBars + breakdown.process,
    0,
    100,
  );

  const missing: string[] = [];
  if (!signals.hasStack) missing.push("框架/构建工具/运行环境（React/Vue/Next/Vite 等）");
  if (!signals.hasConstraints) missing.push("明确约束（必须/禁止/依赖限制/兼容性范围）");
  if (!signals.hasDeliverables) missing.push("明确交付物（要代码/要 diff/要文件结构/要步骤）");
  if (!signals.hasEdgeCases) missing.push("边界情况与错误处理（加载态/空态/失败态）");
  if (!signals.hasA11y) missing.push("可访问性要求（键盘/ARIA/对比度等）");
  if (!signals.hasPerformance) missing.push("性能要求（首屏、列表虚拟化、缓存、避免重复渲染等）");
  if (!signals.hasScanProject) missing.push("项目理解步骤（调用 scan_project/总结目录结构/定位相关文件）");
  if (!signals.hasGates) missing.push("审批 gate（设计方案/实施计划/验收等节点必须等待用户同意）");
  if (!signals.hasTemplateSections) missing.push("结构化模板章节（0/1/2/3... 的固定结构）");

  const suggestions: string[] = [
    "补充项目上下文：现有目录结构、关键组件/页面、接口契约、约定（lint/format）",
    "把需求拆成可验收条目：功能点、交互细节、状态流转、异常路径",
    "增加强约束：不新增依赖/必须 TS/必须支持移动端/必须兼容哪些浏览器",
    "指定输出格式：先问澄清问题，再给方案，然后给代码（diff 或文件内容）",
  ];

  return {
    score,
    breakdown,
    missing,
    suggestions,
  };
}

const server = new Server(
  {
    name: "frontend-prompt-workflow-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "echo",
        description: "Echo back the provided text",
        inputSchema: {
          type: "object",
          properties: {
            text: { type: "string" },
          },
          required: ["text"],
        },
      },
      {
        name: "scan_project",
        description: "Scan project directory tree (read-only) and detect claude.md/CLAUDE.md. Intended for initial architecture understanding.",
        inputSchema: {
          type: "object",
          properties: {
            rootDir: { type: "string" },
            maxDepth: { type: "number" },
            maxEntries: { type: "number" },
          },
        },
      },
      {
        name: "optimize_frontend_prompt",
        description: "Standardize/optimize a raw user question into a frontend-dev prompt package (messages + guardrails + clarifying questions).",
        inputSchema: {
          type: "object",
          properties: {
            userPrompt: { type: "string" },
            projectContext: { type: "string" },
            techStack: { type: "string" },
            framework: { type: "string" },
            language: { type: "string", enum: ["ts", "js"] },
            styling: { type: "string" },
            stateManagement: { type: "string" },
            router: { type: "string" },
            constraints: { type: "array", items: { type: "string" } },
            taskType: {
              type: "string",
              enum: [
                "new_feature",
                "optimize_existing",
                "refactor",
                "bugfix",
                "performance",
                "ui_polish",
                "dependency_upgrade",
                "test_addition",
              ],
            },
            outputLanguage: { type: "string", enum: ["zh", "en"] },
            outputFormat: { type: "string", enum: ["step_by_step", "direct", "both"] },
            codeStyle: { type: "string", enum: ["diff", "full_files", "snippets"] },
            mustAskClarifyingQuestions: { type: "boolean" },
            requireApprovalGates: { type: "boolean" },
          },
          required: ["userPrompt"],
        },
      },
      {
        name: "score_frontend_prompt",
        description: "Score a frontend prompt quality and suggest missing info / improvements.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: { type: "string" },
          },
          required: ["prompt"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "echo") {
    const text = String((request.params.arguments as { text?: unknown } | undefined)?.text ?? "");

    return {
      content: [
        {
          type: "text",
          text,
        },
      ],
    };
  }

  if (request.params.name === "scan_project") {
    const rawArgs = (request.params.arguments ?? {}) as Record<string, unknown>;
    const rootDir = asNonEmptyString(rawArgs.rootDir);
    const maxDepth = typeof rawArgs.maxDepth === "number" ? rawArgs.maxDepth : undefined;
    const maxEntries = typeof rawArgs.maxEntries === "number" ? rawArgs.maxEntries : undefined;

    const result = await scanProject({ rootDir, maxDepth, maxEntries });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  if (request.params.name === "optimize_frontend_prompt") {
    const rawArgs = (request.params.arguments ?? {}) as Record<string, unknown>;
    const userPrompt = asNonEmptyString(rawArgs.userPrompt);
    if (!userPrompt) {
      throw new Error("optimize_frontend_prompt: missing required argument 'userPrompt'");
    }

    const args: OptimizeArgs = {
      userPrompt,
      projectContext: asNonEmptyString(rawArgs.projectContext),
      techStack: asNonEmptyString(rawArgs.techStack),
      framework: asNonEmptyString(rawArgs.framework),
      language: (asNonEmptyString(rawArgs.language) as OptimizeArgs["language"]) ?? undefined,
      styling: asNonEmptyString(rawArgs.styling),
      stateManagement: asNonEmptyString(rawArgs.stateManagement),
      router: asNonEmptyString(rawArgs.router),
      constraints: Array.isArray(rawArgs.constraints)
        ? rawArgs.constraints.map((x) => String(x)).filter((x) => x.trim().length)
        : undefined,
      taskType: (asNonEmptyString(rawArgs.taskType) as OptimizeArgs["taskType"]) ?? undefined,
      outputLanguage: (asNonEmptyString(rawArgs.outputLanguage) as OptimizeArgs["outputLanguage"]) ?? undefined,
      outputFormat: (asNonEmptyString(rawArgs.outputFormat) as OptimizeArgs["outputFormat"]) ?? undefined,
      codeStyle: (asNonEmptyString(rawArgs.codeStyle) as OptimizeArgs["codeStyle"]) ?? undefined,
      mustAskClarifyingQuestions:
        typeof rawArgs.mustAskClarifyingQuestions === "boolean" ? rawArgs.mustAskClarifyingQuestions : undefined,
      requireApprovalGates:
        typeof rawArgs.requireApprovalGates === "boolean" ? rawArgs.requireApprovalGates : undefined,
    };

    const result = buildOptimizedPromptPackage(args);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  if (request.params.name === "score_frontend_prompt") {
    const rawArgs = (request.params.arguments ?? {}) as Record<string, unknown>;
    const prompt = asNonEmptyString(rawArgs.prompt);
    if (!prompt) {
      throw new Error("score_frontend_prompt: missing required argument 'prompt'");
    }

    const result = scoreFrontendPrompt({ prompt });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
