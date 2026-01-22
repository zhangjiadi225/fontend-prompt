import * as fs from "fs/promises";
import * as path from "path";

export interface InitArgs {
  ai: string;
  force?: boolean;
}

import { DEFAULT_DATA } from "./default-data.js";
import { generateSkillScripts } from "./init-scripts.js";

// SKILL.md 模板 - 符合 Antigravity Skills 官方规范
const SKILL_MD_CONTENT = `---
name: frontend-prompt
description: 前端开发辅助 Skill。将模糊需求转化为结构化开发方案，自动检测项目技术栈，生成审批流、工作流和澄清问题。Use when starting frontend development tasks like adding pages, fixing bugs, or optimizing code.
---

# Frontend Prompt Skill

帮助 Agent 将模糊的前端开发需求转化为专业的结构化方案。

## When to use this skill

- 用户提出前端开发任务时（新增页面、修复 Bug、优化性能、重构等）
- 需要将模糊需求转化为结构化方案时
- 需要查询前端开发最佳实践和规范时

## How to use it

### 1. 优化需求 (推荐)

使用 npm 包将需求转化为详细开发方案：

\`\`\`bash
npx -y @jdzhang225gmail/frontend-prompt optimize "<用户需求>" --fields optimizedPrompt,workflow
\`\`\`

**输出字段说明：**
- \`optimizedPrompt\`: 优化后的完整 Prompt
- \`workflow\`: 工作流步骤和审批关口
- \`guardrails\`: 开发守则清单
- \`clarifyingQuestions\`: 需要向用户确认的问题

### 2. 查询本地规范数据

搜索 guardrails、gates 和 questions：

\`\`\`bash
node .agent/skills/frontend-prompt/scripts/index.js search "<关键词>"
\`\`\`

## Decision tree

\`\`\`
用户需求
    │
    ├─ UI/UX 相关？
    │   ├─ 是 → 先获取设计建议 → 再运行 optimize
    │   └─ 否 → 直接运行 optimize
    │
    ├─ 需求是否清晰？
    │   ├─ 是 → 执行 optimize 输出的 workflow
    │   └─ 否 → 使用 clarifyingQuestions 向用户确认
    │
    └─ workflow 包含 gates？
        ├─ 是 → 在 gate 节点暂停并请求用户确认
        └─ 否 → 继续执行
\`\`\`

## Guardrails

执行时应遵循 \`optimize\` 命令输出中的 \`guardrails\` 列表，主要包括：

- **禁止凭空捏造** - 信息不足时必须反问用户
- **禁止引入新依赖** - 无明确理由不得引入新 npm 包
- **禁止占位符代码** - 必须输出完整可执行代码
- **KISS 原则** - 优先选择最简单的实现方案

## Approval Gates

如果 workflow 输出包含 \`gates\`，这是审批关口。Agent 必须在对应步骤：

1. 完成当前阶段的输出
2. 暂停并提示用户审批
3. 等待用户确认后才继续下一阶段

常见的 gate 节点包括：设计方案确认、开发计划确认、变更说明确认等。
`;

export async function handleInit(args: InitArgs) {
  const cwd = process.cwd();

  if (args.ai !== "antigravity") {
    console.error("Currently only 'antigravity' is supported for --ai flag.");
    process.exit(1);
  }

  try {
    // 1. 创建 .agent/skills/frontend-prompt 目录结构
    const skillDir = path.join(cwd, ".agent/skills/frontend-prompt");
    const scriptsDir = path.join(skillDir, "scripts");
    const resourcesDir = path.join(skillDir, "resources/data");

    await fs.mkdir(skillDir, { recursive: true });
    await fs.mkdir(scriptsDir, { recursive: true });
    await fs.mkdir(resourcesDir, { recursive: true });

    console.log(`✅ Created skill directory: ${skillDir}`);

    // 2. 生成 SKILL.md
    const skillMdPath = path.join(skillDir, "SKILL.md");
    let shouldWriteSkillMd = true;

    try {
      await fs.access(skillMdPath);
      // File exists
      if (!args.force) {
        console.warn(
          `SKILL.md already exists at ${skillMdPath}. Use --force to overwrite.`,
        );
        shouldWriteSkillMd = false;
      }
    } catch {
      // File does not exist, safe to write
    }

    if (shouldWriteSkillMd) {
      await fs.writeFile(skillMdPath, SKILL_MD_CONTENT, "utf-8");
      console.log(`✅ Generated: ${skillMdPath}`);
    }

    // 3. 生成数据文件 (resources/data/)

    // Guardrails
    const guardrailsList = Object.entries(DEFAULT_DATA.guardrails).map(
      ([key, content]) => ({
        id: key,
        content: content,
        description: key,
      }),
    );
    await fs.writeFile(
      path.join(resourcesDir, "guardrails.json"),
      JSON.stringify(guardrailsList, null, 2),
      "utf-8",
    );

    // Gates
    const gatesData = DEFAULT_DATA.workflow.gates;
    await fs.writeFile(
      path.join(resourcesDir, "gates.json"),
      JSON.stringify(gatesData, null, 2),
      "utf-8",
    );

    // Questions
    const questionsList = Object.entries(DEFAULT_DATA.questions).map(
      ([key, question]) => ({
        id: key,
        question: question,
      }),
    );
    await fs.writeFile(
      path.join(resourcesDir, "questions.json"),
      JSON.stringify(questionsList, null, 2),
      "utf-8",
    );

    console.log(`✅ Generated data files in: ${resourcesDir}`);

    // 4. 生成脚本文件 (scripts/)
    await generateSkillScripts(skillDir);

    console.log(
      "\n🎉 Init complete! Skill 已生成到 .agent/skills/frontend-prompt/",
    );
    console.log("   Antigravity 会自动发现并使用此 Skill。\n");
  } catch (error: any) {
    console.error("Failed to initialize:", error.message);
    process.exit(1);
  }
}
