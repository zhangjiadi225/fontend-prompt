# 前端提示词 Skills (CLI)

这是一个**前端开发辅助 CLI 工具**。通过零 Token 消耗的本地分析，将模糊的需求转化为**Intent-Alignment (意图对齐)** 模式的专业 Prompt，供 Agent 或开发者直接使用。

## 🌟 核心特性 (v1.2.0)

- **意图对齐模式**: 独创 "A-B-C" 结构输出 (Intent Alignment -> Crucial Validations -> Refined Prompt)，确保 AI 准确理解。
- **自动任务类型识别**: 支持 8 种任务类型（new_feature / bugfix / performance / refactor / ui_polish / optimize_existing / dependency_upgrade / test_addition），通过关键词评分机制自动推断，无需手动指定。
- **完整工作流步骤**: 每种任务类型对应专属的工作流步骤列表，含审批关口（isGate）标记。
- **动态 Guardrails**: 根据检测到的技术栈（框架、语言、样式）动态生成开发守则列表。
- **澄清问题生成**: 根据缺失的上下文信息自动生成需要向用户确认的问题列表。
- **纯 CLI 工具**: 无需常驻服务，极度轻量，零 Token 消耗。
- **环境感知**: 自动识别当前目录的技术栈（Framework, Language, Styling 等）。
- **双模式支持**: 既可作为 Antigravity Skill 自动调用，也可作为独立 CLI 跨平台使用。

---

## 🚀 安装 (推荐)

为了获得极速体验，请**全局安装**：

```bash
npm install -g @jdzhang225gmail/frontend-prompt
```

安装后，即可使用 `frontend-prompt` 命令。

---

## 📖 使用指南

### 1. 优化需求 (Optimize)

将你的"一句话需求"转化为对齐后的终极指令。

```bash
frontend-prompt optimize "给后台增加一个用户管理页面"
```

#### 输出结构 (A-B-C)

生成的 Prompt 将包含：
*   **A. 意图对齐**: 一句话总结任务。
*   **B. 关键确认**: 仅在引发歧义时出现的高风险确认项。
*   **C. 优化后的提示词**: 包含完整上下文和技术细节的执行指令。

#### 按需输出字段

为了节省 AI 上下文，支持字段过滤：

```bash
# 只获取优化后的 Prompt 和工作流元数据
frontend-prompt optimize "Add login" --fields optimizedPrompt,workflow
```

支持的字段：`optimizedPrompt`, `messages`, `workflow`, `guardrails`, `clarifyingQuestions`, `checklist`, `meta`, `thought_trace`。

---

## 🤖 在 AI Agent 中使用

### Claude Code (推荐)

#### 方式一：初始化为 Skill (自动发现)

在任意目录下运行：

```bash
frontend-prompt init --ai claude-code
```

这会在 `~/.claude/skills/` 目录下生成 `frontend-prompt.md` skill 文件。

**优势**：Claude Code 会**自动发现**并在前端开发任务时**主动调用**此 Skill，无需手动指定。

#### 方式二：作为外部 CLI 调用

如果不想初始化 Skill，可以直接在对话中让 Claude 运行命令：

> "请先运行 `frontend-prompt optimize '<需求>' --fields optimizedPrompt`，并严格遵循其输出的 'Refined Prompt' 执行。"

---

### Antigravity

#### 方式一：初始化为 Skill (自动发现)

在项目目录下运行：

```bash
frontend-prompt init --ai antigravity
```

这会生成符合 [Antigravity Skills 规范](https://antigravity.google/docs/skills) 的目录结构：

```
.agent/skills/frontend-prompt/
├── SKILL.md           # 主入口
├── scripts/           # 本地脚本
└── resources/         # 资源文件
```

**优势**：Antigravity 会**自动发现**并在相关任务时**自动调用**此 Skill。

#### 方式二：作为外部 CLI 调用

如果不想初始化 Skill，可以在 Agent 系统提示词中添加规则：

> "当遇到前端开发任务时，请先运行 `frontend-prompt optimize '<需求>'`，并严格遵循其输出的 'Refined Prompt' 执行。"

---

## 💡 Skill 模式 vs CLI 模式

| 维度         | Skill 模式 (推荐)       | CLI 模式                          |
| ------------ | ----------------------- | --------------------------------- |
| **自动发现** | ✅ Agent 自动识别并调用 | ❌ 需要规则触发                   |
| **平台支持** | Claude Code / Antigravity | 跨平台通用                        |
| **初始化**   | 需要 `init` 命令        | 全局安装即可                      |
| **推荐场景** | 日常开发使用            | 临时使用或其他 Agent              |

---

## 📁 项目结构

```
src/
├── cli.ts                 # CLI 入口
├── context-analyzer.ts    # 项目环境自动检测
├── skills/
│   ├── init.ts            # init 命令
│   ├── default-data.ts    # 核心数据 (模板/Prompt)
│   └── optimize/          # optimize 核心逻辑
│       ├── core.ts        # 编排层
│       ├── template.ts    # A-B-C 模板生成
│       └── workflow.ts    # 工作流定义
└── types.ts               # 类型定义
```

---

## 许可

MIT
