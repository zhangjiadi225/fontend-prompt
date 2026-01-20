import {
  ChatMessage,
  OptimizeArgs,
  WorkflowGate,
  WorkflowStep,
  OptimizedPromptPackage,
} from "../types.js";
import { includesAny } from "../utils.js";

/**
 * 构建前端开发 Guardrails（约束/原则）
 */
function buildFrontendGuardrails(args: OptimizeArgs): string[] {
  const guardrails: string[] = [
    "输出必须面向前端开发实践（UI、交互、状态、路由、可访问性、性能、工程化），不要泛泛而谈。",
    "如果关键信息不足，**严禁**凭空捏造业务逻辑，必须立刻停止并反问用户。",
    "禁止在没有明确理由的情况下引入新的 npm 包，优先使用原生 API 或现有依赖。",
    "禁止输出 '占位符' 代码（如 `// ...rest of code`），除非文件超过 200 行，否则必须输出完整代码。",
    "禁止在 tsx/jsx 中编写内联长逻辑，必须提取为 hook 或 helper 函数。",
    "给出可执行的交付物（代码/文件结构/命令/步骤），避免只给概念。",
    "优先考虑可维护性：类型、安全边界、错误处理、可测试性与可扩展性。",
    "遵循安全与隐私：不要输出或要求提供密钥、token、个人敏感信息。",
    "严格按要求的结构化模板输出；必须在需要审批的 gate 停止并等待用户确认。",
    "**KISS 原则**: 优先选择最简单的实现方案。除非用户明确要求，否则**禁止**过度设计（如不必要的工厂模式、复杂的抽象层）。",
    "**禁止隐性假设**: 如果需求未明确（如鉴权、样式库、错误处理），必须在“澄清问题”阶段询问，严禁根据“惯例”自作主张。",
  ];

  if (args.language === "ts") {
    guardrails.push(
      "默认使用 TypeScript，类型定义清晰，避免 any；必要时用类型收窄。 ",
    );
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

/**
 * 构建工作流定义，包含审批关口（Gates）和步骤（Steps）
 */
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
      {
        id: "new_feature_design",
        title: "新功能设计方案",
        when: "设计方案完成后，开始开发方案/实现之前",
      },
      {
        id: "new_feature_plan",
        title: "开发方案与 TODO",
        when: "开发步骤与 TODO 列表输出后，开始写代码之前",
      },
      {
        id: "new_feature_accept",
        title: "交付与验收",
        when: "TS 校验/实现完成后，等待用户验收",
      },
    ],
    optimize_existing: [
      {
        id: "opt_change_doc",
        title: "变更说明文档",
        when: "Before/After/Scope 文档输出后，开始改代码之前",
      },
      {
        id: "opt_plan",
        title: "实施计划与 TODO",
        when: "实施计划输出后，开始改代码之前",
      },
    ],
    refactor: [
      {
        id: "refactor_doc",
        title: "重构说明文档",
        when: "映射表与原则确定后，执行迁移之前",
      },
      {
        id: "refactor_migration",
        title: "迁移脚本/迁移方案",
        when: "脚本与运行方式确认后，执行迁移之前",
      },
    ],
    bugfix: [
      {
        id: "bugfix_plan",
        title: "修复方案",
        when: "根因定位后，开始改代码之前",
      },
    ],
    performance: [
      {
        id: "perf_plan",
        title: "性能优化方案",
        when: "指标与瓶颈确认后，开始改代码之前",
      },
    ],
    ui_polish: [
      {
        id: "ui_polish_plan",
        title: "UI 调整方案",
        when: "问题清单确认后，开始改代码之前",
      },
    ],
    dependency_upgrade: [
      {
        id: "dep_upgrade_plan",
        title: "升级方案与回滚计划",
        when: "风险评估后，开始升级之前",
      },
    ],
    test_addition: [
      {
        id: "test_plan",
        title: "测试补充方案",
        when: "用例范围确认后，开始写测试之前",
      },
    ],
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
      {
        id: "change_doc",
        title: "变更说明文档（Markdown）",
        gateId: "opt_change_doc",
      },
      { id: "plan", title: "实施计划与 TODO", gateId: "opt_plan" },
      { id: "implementation", title: "实施与验证" },
    );
  } else if (taskType === "refactor") {
    steps.push(
      { id: "scope_understanding", title: "重构范围与现状理解" },
      {
        id: "refactor_doc",
        title: "重构说明文档（Markdown）",
        gateId: "refactor_doc",
      },
      {
        id: "migration",
        title: "迁移方案与脚本",
        gateId: "refactor_migration",
      },
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

/**
 * 构建结构化的输出模板（Markdown），这是提示词的核心部分
 */
function buildStructuredTemplate(args: OptimizeArgs) {
  const taskType = args.taskType ?? "new_feature";
  const requireApprovalGates = args.requireApprovalGates ?? true;
  const language = args.language ?? "ts";

  const workflow = buildWorkflowDefinition(args);

  const gateLine = requireApprovalGates
    ? "- 遇到 `<<<MCP:GATE ...>>>` 标记时，**必须完全停止生成**。严禁输出后续章节的任何字符，直到用户明确回复“同意/继续”。"
    : "- 允许一次性输出完整内容，但仍需标注原本的 gate 节点。";

  const base = [
    "# 输出结构（必须严格遵守）",
    "## - Machine readable workflow",
    `- mcp_workflow: ${JSON.stringify({ task_type: workflow.taskType, require_approval_gates: workflow.requireApprovalGates, gates: workflow.gates }, null, 0)}`,
    `- gate_marker_prefix: ${workflow.gateMarker} id="..." action="WAIT_FOR_USER_APPROVAL">>>`,
    "## 0. 任务分类",
    "- task_type: <new_feature|optimize_existing|refactor|bugfix|performance|ui_polish|dependency_upgrade|test_addition>",
    "- 目标: <一句话>",
    "- 非目标: <明确不做什么>",
    "",
    "## 1. 实施计划 (Implementation Plan)（必须先做）",
    "- [ ] Phase 1: <阶段名称>",
    "- [ ] Phase 2: <阶段名称>",
    "",
    "## 2. 任务清单 (Task List)（细化到文件粒度）",
    "- [ ] Create/Modify `src/components/...` <!-- id: 1 -->",
    "- [ ] Update `package.json` <!-- id: 2 -->",
    "",
    "## 3. 项目理解",
    "- 显式陈述你对当前项目架构的理解（技术栈/目录结构/关键约定）。",
    "- 如果你还不了解项目结构：先调用工具 `scan_project` 获取目录树与关键文件，然后基于结果总结架构。",
    "- 列出与你要改动最相关的文件/目录（最多 10 个）。",
    "- 如需进一步定位：提出要用户提供的入口文件/路由/组件/接口契约。",
    "",
    "## 4. 风险与约束确认",
    "- 兼容性: 浏览器范围/移动端/SSR/SEO（如适用）",
    "- 依赖限制: 是否允许新增依赖",
    "- 质量门槛: a11y/性能/测试要求",
    "",
    gateLine,
    '- 当你到达 gate 节点并完成该章节后，输出一行：`<<<MCP:WAIT gate_id="<id>" action="WAIT_FOR_USER_APPROVAL">>>`，然后立刻停止。',
  ];

  if (taskType === "new_feature") {
    return [
      ...base,
      "",
      '<<<MCP:GATE id="new_feature_design" action="WAIT_FOR_USER_APPROVAL">>>',
      "🔴 STOP GENERATING HERE. WAIT FOR USER APPROVAL.",
      "## 5. 新功能设计方案 **[GATE: NEED USER APPROVAL]**",
      "- 用户故事/验收标准（可测试、可验收）",
      "- UI/交互说明（状态：loading/empty/error/success）",
      "- 状态设计（本地/全局/服务端状态）",
      "- 路由与导航（如适用）",
      "- 数据流与接口契约（如适用：字段、错误码、鉴权、缓存策略）",
      "- 文件变更预告（新增/修改的文件路径清单）",
      "- 关键决策与备选方案（trade-offs）",
      '<<<MCP:WAIT gate_id="new_feature_design" action="WAIT_FOR_USER_APPROVAL">>>',
      "",
      '<<<MCP:GATE id="new_feature_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      "🔴 STOP GENERATING HERE. WAIT FOR USER APPROVAL.",
      "## 6. 开发方案与 TODO 流程 **[GATE: NEED USER APPROVAL]**",
      "- 开发步骤（可分 PR/commit 阶段）",
      "- TODO 列表（使用 Markdown checklist）",
      "- 验证计划（本地运行/手动测试点/测试用例）",
      '<<<MCP:WAIT gate_id="new_feature_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      "",
      "## 7. 开发实现（通过 gate 后才输出）",
      "- 按你在第 6 步承诺的方式输出代码（diff/full_files/snippets）",
      "",
      "## 8. TypeScript 校验与问题修复（如适用）",
      language === "ts"
        ? "- 先执行 TS 校验（例如 tsc --noEmit 或 npm script），贴出关键错误并修复后再继续。"
        : "- 如非 TS 项目则跳过此步骤。",
      "",
      '<<<MCP:GATE id="new_feature_accept" action="WAIT_FOR_USER_APPROVAL">>>',
      "🔴 STOP GENERATING HERE. WAIT FOR USER APPROVAL.",
      "## 9. 交付与验收 **[GATE: NEED USER APPROVAL]**",
      "- 给出验收清单（按验收标准逐条核对）",
      "- 提示用户验收：通过/不通过/需要调整",
      '<<<MCP:WAIT gate_id="new_feature_accept" action="WAIT_FOR_USER_APPROVAL">>>',
      "",
      "## 10. 文档更新（条件触发）",
      "- 若 `scan_project` 显示存在 `claude.md/CLAUDE.md`：将本次新功能的描述追加到对应文档的合适位置。",
      "- 若不存在：跳过文档更新。",
    ].join("\n");
  }

  if (taskType === "optimize_existing") {
    return [
      ...base,
      "",
      "## 5. 现状理解（老功能逻辑）",
      "- 描述当前功能的输入/输出/关键分支/异常路径",
      "- 列出当前痛点（性能/可维护性/体验/bug 风险）",
      "",
      '<<<MCP:GATE id="opt_change_doc" action="WAIT_FOR_USER_APPROVAL">>>',
      "🔴 STOP GENERATING HERE. WAIT FOR USER APPROVAL.",
      "## 6. 变更说明文档（Markdown） **[GATE: NEED USER APPROVAL]**",
      "- 标题：<优化主题>",
      "- Before：当前行为与问题点",
      "- After：目标行为与改动收益",
      "- Scope：改动范围（文件、模块、接口）",
      "- Out of Scope：明确不改哪些",
      "- 风险与回滚：可能风险、回滚策略",
      "- 验收点：如何验证优化确实生效",
      '<<<MCP:WAIT gate_id="opt_change_doc" action="WAIT_FOR_USER_APPROVAL">>>',
      "",
      '<<<MCP:GATE id="opt_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      "🔴 STOP GENERATING HERE. WAIT FOR USER APPROVAL.",
      "## 7. 实施计划与 TODO **[GATE: NEED USER APPROVAL]**",
      "- TODO checklist",
      "- 测试/验证计划",
      '<<<MCP:WAIT gate_id="opt_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      "",
      "## 8. 实施与验证（通过 gate 后才输出）",
      "- 输出代码变更",
      "- 如果是 TS 项目：执行 TS 校验并修复",
      "- 输出对比结果（Before/After，包含指标/体验变化）",
    ].join("\n");
  }

  if (taskType === "refactor") {
    return [
      ...base,
      "",
      "## 5. 重构范围与现状理解",
      "- 列出重构范围内的模块/目录/入口",
      "- 描述现有结构与主要依赖关系（数据流、组件层级、耦合点）",
      "",
      '<<<MCP:GATE id="refactor_doc" action="WAIT_FOR_USER_APPROVAL">>>',
      "## 6. 重构说明文档（Markdown） **[GATE: NEED USER APPROVAL]**",
      "- Before：当前结构、主要问题",
      "- After：目标结构、约束与原则",
      "- 目录/文件迁移映射表：old_path -> new_path（详细）",
      "- 兼容策略：过渡层/adapter/别名/弃用计划（如需要）",
      "- 风险与回滚：如何逐步落地",
      '<<<MCP:WAIT gate_id="refactor_doc" action="WAIT_FOR_USER_APPROVAL">>>',
      "",
      '<<<MCP:GATE id="refactor_migration" action="WAIT_FOR_USER_APPROVAL">>>',
      "## 7. 迁移方案与脚本（如涉及大范围移动） **[GATE: NEED USER APPROVAL]**",
      "- 提供一个一次性迁移脚本（js/ts/py）方案：做文件移动、import 路径更新（或至少生成迁移清单）",
      "- 说明脚本运行方式与注意事项",
      '<<<MCP:WAIT gate_id="refactor_migration" action="WAIT_FOR_USER_APPROVAL">>>',
      "",
      "## 8. 执行重构（通过 gate 后才输出）",
      "- 按映射表实施变更",
      "- 运行 TS 校验/构建/测试（如存在）并修复",
      "- 输出最终结构与关键文件变化摘要",
    ].join("\n");
  }

  if (taskType === "bugfix") {
    return [
      ...base,
      "",
      "## 5. 复现与根因定位",
      "- 复现步骤、预期 vs 实际",
      "- 根因分析（涉及代码位置）",
      "",
      '<<<MCP:GATE id="bugfix_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      "## 6. 修复方案 **[GATE: NEED USER APPROVAL]**",
      "- 修复点与影响范围",
      "- 是否需要补充测试用例",
      '<<<MCP:WAIT gate_id="bugfix_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      "",
      "## 7. 实施与验证（通过 gate 后才输出）",
      "- 输出代码变更",
      "- 验证结果与回归检查点",
    ].join("\n");
  }

  if (taskType === "performance") {
    return [
      ...base,
      "",
      "## 5. 性能目标与指标",
      "- 明确指标：LCP/CLS/INP/TTI、bundle size、渲染次数、接口耗时等",
      "",
      '<<<MCP:GATE id="perf_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      "## 6. 优化方案 **[GATE: NEED USER APPROVAL]**",
      "- 瓶颈假设与验证方法",
      "- 改动点与预期收益",
      '<<<MCP:WAIT gate_id="perf_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      "",
      "## 7. 实施与对比（通过 gate 后才输出）",
      "- 输出代码变更",
      "- Before/After 数据对比",
    ].join("\n");
  }

  if (taskType === "ui_polish") {
    return [
      ...base,
      "",
      "## 5. 体验问题清单",
      "- 视觉/布局/交互/动效/可访问性问题",
      "",
      '<<<MCP:GATE id="ui_polish_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      "## 6. 调整方案（含截图/描述） **[GATE: NEED USER APPROVAL]**",
      "- 每个问题的改法与验收点",
      '<<<MCP:WAIT gate_id="ui_polish_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      "",
      "## 7. 实施与验收（通过 gate 后才输出）",
      "- 输出代码变更",
      "- 验收清单",
    ].join("\n");
  }

  if (taskType === "dependency_upgrade") {
    return [
      ...base,
      "",
      "## 5. 升级范围与风险评估",
      "- 目标依赖/版本区间",
      "- Breaking changes 风险与迁移成本",
      "",
      '<<<MCP:GATE id="dep_upgrade_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      "## 6. 升级方案与回滚计划 **[GATE: NEED USER APPROVAL]**",
      "- 升级步骤与验证方式",
      "- 回滚方案",
      '<<<MCP:WAIT gate_id="dep_upgrade_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      "",
      "## 7. 实施与验证（通过 gate 后才输出）",
      "- 输出代码变更",
      "- 构建/测试/TS 校验结果",
    ].join("\n");
  }

  return [
    ...base,
    "",
    '<<<MCP:GATE id="test_plan" action="WAIT_FOR_USER_APPROVAL">>>',
    "## 5. 测试补充方案 **[GATE: NEED USER APPROVAL]**",
    "- 测试范围与优先级（单测/组件/E2E）",
    "- 用例列表与覆盖目标",
    '<<<MCP:WAIT gate_id="test_plan" action="WAIT_FOR_USER_APPROVAL">>>',
    "",
    "## 6. 实施与验证（通过 gate 后才输出）",
    "- 输出测试代码与必要的轻量重构",
    "- 运行结果与覆盖说明",
  ].join("\n");
}

/**
 * 根据输入生成澄清问题
 */
function buildClarifyingQuestions(args: OptimizeArgs): string[] {
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
    questions.push(
      "你使用的前端框架/运行环境是什么？（React/Vue/Angular/Svelte/Next.js/Nuxt 等）",
    );
  }
  if (!args.techStack) {
    questions.push(
      "项目技术栈有哪些约束？（Vite/Webpack/Next、Node 版本、包管理器、Monorepo 等）",
    );
  }
  if (!args.language && !includesAny(combined, ["typescript", "ts"])) {
    questions.push("代码希望用 TypeScript 还是 JavaScript？");
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
    ])
  ) {
    questions.push(
      "样式/组件库有要求吗？（Tailwind/CSS Modules/SCSS/Styled-Components/Antd/MUI 等）",
    );
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
    ])
  ) {
    questions.push(
      "状态管理方案是什么？（Redux/Zustand/Context/Pinia 等，或无需全局状态）",
    );
  }
  if (
    !args.router &&
    !includesAny(combined, ["react router", "next", "nuxt", "vue-router"])
  ) {
    questions.push(
      "路由方案是什么？（React Router/Next App Router/Vue Router 等）",
    );
  }
  if (!includesAny(combined, ["api", "接口", "endpoint", "graphql", "rest"])) {
    questions.push(
      "是否需要对接接口？若需要：接口协议（REST/GraphQL）、关键字段、错误码、鉴权方式是什么？",
    );
  }
  if (!includesAny(combined, ["a11y", "accessibility", "无障碍", "aria"])) {
    questions.push(
      "是否需要无障碍（a11y）要求？例如键盘可用、ARIA、对比度、读屏支持等。",
    );
  }
  if (!includesAny(combined, ["responsive", "mobile", "适配", "breakpoint"])) {
    questions.push("需要响应式/移动端适配吗？支持哪些断点与浏览器范围？");
  }
  if (
    !includesAny(combined, ["test", "jest", "vitest", "cypress", "playwright"])
  ) {
    questions.push("需要测试吗？（单测/组件测试/E2E）使用什么测试框架？");
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
    questions.push(
      "本次属于哪种任务类型？（新功能开发/老功能优化/重构/修复 bug/性能优化/UI 打磨/依赖升级/补测试）",
    );
  }

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
  const mustAskClarifyingQuestions = args.mustAskClarifyingQuestions ?? true;
  const taskType = args.taskType ?? "new_feature";
  const requireApprovalGates = args.requireApprovalGates ?? true;

  const workflow = buildWorkflowDefinition(args);

  const guardrails = buildFrontendGuardrails(args);
  const clarifyingQuestions = buildClarifyingQuestions(args);

  const system: string[] = [];
  system.push(
    outputLanguage === "zh"
      ? `你是由 Google DeepMind 研发的 Elite Frontend Agent。你不仅是资深工程师，更是追求极致代码美学与工程规范的技术专家。

你的核心思维模式：
1. **First Principles**: 不要照搬现有代码，思考最适合当前场景的方案。
2. **Security First**: 默认假设输入是不安全的，必须做校验。
3. **Performance Obsessed**: 对任何可能导致重渲染或阻塞主线程的操作保持敏感。
4. **Anti-Overengineering**: 抵制复杂性诱惑。如果一个简单的函数能解决问题，不要写一个类。如果原生 CSS 能解决，不要引入新的库。
5. **Plan First**: 在写任何代码之前，必须先通过 \`Implementation Plan\` 和 \`Task List\` 验证你的思路。盲目编码是严格禁止的。

你的任务是把需求落地为**达到生产环境标准**的代码。这意味着：代码必须包含完整的类型定义、错误处理、边界情况覆盖，并符合现代前端最佳实践。`
      : "You are an Elite Frontend Agent. Your task is to implement requirements with production-grade quality, including full types, error handling, and best practices.",
  );
  system.push(
    outputLanguage === "zh"
      ? "你必须遵守以下约束："
      : "You must follow these constraints:",
  );
  for (const g of guardrails) system.push(`- ${g}`);
  system.push(
    outputLanguage === "zh"
      ? `- 任务类型: ${taskType}`
      : `- Task type: ${taskType}`,
  );
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
  user.push(
    "- 必须包含：方案/关键决策/边界情况/错误处理/可访问性/性能注意事项",
  );
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
