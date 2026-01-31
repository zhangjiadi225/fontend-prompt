import * as fs from "fs/promises";
import * as path from "path";

export interface InitArgs {
  ai: string;
  force?: boolean;
}

import { DEFAULT_DATA } from "./default-data.js";
import { generateSkillScripts } from "./init-scripts.js";

// SKILL.md 模板 - 符合 Antigravity Skills 官方规范
const ANTIGRAVITY_SKILL_MD_CONTENT = `---
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

// Claude Code Skill 模板
const CLAUDE_CODE_SKILL_CONTENT = `# Frontend Prompt - 前端开发意图对齐工具

Transform vague frontend requirements into structured, intent-aligned development plans with zero token consumption through local analysis.

## When to use this skill

Use this skill proactively when:
- User requests frontend development tasks (new features, bug fixes, refactoring, UI optimization)
- Requirements are vague or need clarification before implementation
- You need to understand the project's tech stack automatically
- You want to generate structured prompts with intent alignment (A-B-C format)

## How it works

This skill uses the \`frontend-prompt\` CLI tool to:
1. **Auto-detect** the current project's tech stack (framework, language, styling, etc.)
2. **Transform** vague requirements into structured prompts using Intent Alignment methodology
3. **Generate** A-B-C format output:
   - **A. Intent Alignment**: One-sentence task summary
   - **B. Crucial Validations**: High-risk confirmation items (only when ambiguous)
   - **C. Refined Prompt**: Complete execution instructions with context

## Usage

### Basic usage

When the user provides a frontend development request, run:

\`\`\`bash
frontend-prompt optimize "<user requirement>"
\`\`\`

### Optimized usage (recommended)

To save context, request only the fields you need:

\`\`\`bash
frontend-prompt optimize "<user requirement>" --fields optimizedPrompt
\`\`\`

Available fields:
- \`optimizedPrompt\`: The refined prompt with full context (most important)
- \`workflow\`: Workflow metadata
- \`checklist\`: Development checklist
- \`meta\`: Project metadata (tech stack, etc.)
- \`thought_trace\`: Analysis trace for debugging

### Example workflow

\`\`\`bash
# User says: "Add a login page"
frontend-prompt optimize "Add a login page" --fields optimizedPrompt

# The tool will:
# 1. Detect your project uses React + TypeScript + Tailwind
# 2. Generate intent-aligned prompt with:
#    - Clear task definition
#    - Crucial validations (auth method, form validation, etc.)
#    - Detailed implementation instructions
# 3. You follow the "Refined Prompt" section to implement
\`\`\`

## Key principles

When using this skill:

1. **Always run optimize first** before starting implementation on frontend tasks
2. **Follow the Refined Prompt** section in the output - it contains the complete, context-aware instructions
3. **Address Crucial Validations** if present - these are high-risk items that need user confirmation
4. **Trust the auto-detection** - the tool analyzes the project structure automatically

## Installation

The tool should be globally installed:

\`\`\`bash
npm install -g @jdzhang225gmail/frontend-prompt
\`\`\`

If not installed, you can use npx (slower):

\`\`\`bash
npx -y @jdzhang225gmail/frontend-prompt optimize "<requirement>"
\`\`\`

## Output format

The optimize command returns JSON with this structure:

\`\`\`json
{
  "optimizedPrompt": "# A. Intent Alignment\\n...\\n# B. Crucial Validations\\n...\\n# C. Refined Prompt\\n...",
  "workflow": { "steps": [...], "estimatedComplexity": "..." },
  "meta": { "detectedStack": {...}, "projectType": "..." }
}
\`\`\`

Focus on the \`optimizedPrompt\` field - it contains the complete instructions you need to follow.
`;

// Helper function to get Claude Code skills directory
async function getClaudeSkillsDir(): Promise<string> {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (!homeDir) {
    throw new Error("Could not determine home directory");
  }
  return path.join(homeDir, ".claude", "skills");
}

// Handle Claude Code skill initialization
async function handleClaudeCodeInit(args: InitArgs) {
  try {
    const skillsDir = await getClaudeSkillsDir();
    const skillFilePath = path.join(skillsDir, "frontend-prompt.md");

    // Create .claude/skills directory if it doesn't exist
    await fs.mkdir(skillsDir, { recursive: true });
    console.log(`✅ Ensured Claude skills directory exists: ${skillsDir}`);

    // Check if skill file already exists
    let shouldWriteSkill = true;
    try {
      await fs.access(skillFilePath);
      // File exists
      if (!args.force) {
        console.warn(
          `Skill file already exists at ${skillFilePath}. Use --force to overwrite.`,
        );
        shouldWriteSkill = false;
      }
    } catch {
      // File does not exist, safe to write
    }

    if (shouldWriteSkill) {
      await fs.writeFile(skillFilePath, CLAUDE_CODE_SKILL_CONTENT, "utf-8");
      console.log(`✅ Generated Claude Code skill: ${skillFilePath}`);
    }

    console.log(
      "\n🎉 Init complete! Claude Code skill has been installed to ~/.claude/skills/",
    );
    console.log(
      "   Claude Code will automatically discover and use this skill when working on frontend tasks.\n",
    );
    console.log("💡 Usage: When you start a frontend task, Claude will automatically invoke this skill.");
    console.log("   Or you can manually trigger it with: /frontend-prompt\n");
  } catch (error: any) {
    console.error("Failed to initialize Claude Code skill:", error.message);
    process.exit(1);
  }
}

export async function handleInit(args: InitArgs) {
  const cwd = process.cwd();

  if (args.ai !== "antigravity" && args.ai !== "claude-code") {
    console.error("Currently only 'antigravity' and 'claude-code' are supported for --ai flag.");
    process.exit(1);
  }

  // Handle Claude Code skill generation
  if (args.ai === "claude-code") {
    return handleClaudeCodeInit(args);
  }

  // Handle Antigravity skill generation
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
      await fs.writeFile(skillMdPath, ANTIGRAVITY_SKILL_MD_CONTENT, "utf-8");
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
