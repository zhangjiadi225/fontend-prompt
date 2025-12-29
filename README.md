# 前端提示词流程 MCP Server

这是一个 Model Context Protocol（MCP）服务，用于**标准化前端开发的提示词与工作流**。

它可以把质量参差不齐的用户问题，转换为更适合 AI 安全执行的**结构化、带审批关口（gate）的方案**：

- **先理解项目**（扫描目录树）
- **按任务类型套模板**（新功能 / 优化 / 重构 / 等）
- **审批关口**（宿主在每个 gate 处拦截并让用户确认）
- **TypeScript 校验 + 验收流程**
- **条件触发的文档更新**（仅当存在 `claude.md/CLAUDE.md` 时）

本服务使用 **stdio**（最主流、最容易配置的 MCP 部署方式），应由 MCP 宿主（例如 Claude Desktop）启动。

---

## 环境要求

- 建议 Node.js 18+

---

## 安装与构建

```bash
npm install
npm run build
```

运行（仅用于调试）：

```bash
npm start
```

> 注意：直接运行该服务不会出现交互界面。MCP Server 通常会等待宿主通过 stdio 发送 JSON-RPC 消息。

---

## 在 MCP 宿主中配置（stdio）

### 推荐（最方便）：使用 npx 启动（无需下载源码）

- **command**：`npx`（Windows 某些宿主需要写 `npx.cmd`）
- **args**：`["-y", "<你的npm包名>@<版本>"]`

```json
{
  "mcpServers": {
    "@jdzhang225gmail/fontend-prompt": {
      "command": "npx",
      "args": ["-y", "@jdzhang225gmail/fontend-prompt@0.1.0"]
    }
  }
}
```

### 推荐（稳定）：运行构建后的产物

使用 **Node** 运行 `dist/index.js`。

- **command**：`node`
- **args**：`["d:/web/mcp/dist/index.js"]`

### Claude Desktop 示例（Windows）

在 Claude Desktop 的 MCP 配置中添加类似内容：

```json
{
  "mcpServers": {
    "@jdzhang225gmail/fontend-prompt": {
      "command": "node",
      "args": ["d:/web/mcp/dist/index.js"]
    }
  }
}
```

> Claude Desktop 配置文件的具体位置/名称可能随版本变化。关键是：**宿主通过 `node dist/index.js` 启动这个服务**。

---

## 工具

### 1) `scan_project`

扫描项目目录（只读），输出目录树，并检测是否存在 `claude.md/CLAUDE.md`。

**入参**

```json
{
  "rootDir": ".",
  "maxDepth": 4,
  "maxEntries": 1200
}
```

**出参（JSON 文本）**

- `tree`：目录树
- `hasClaudeMd`：是否存在 `claude.md/CLAUDE.md`
- `claudeMdPaths`：命中的路径
- `suggestedFiles`：检测到的关键配置文件

### 2) `optimize_frontend_prompt`

将原始用户问题转换为一个**提示词包**，包含：

- `messages`：可直接喂给 AI 的 `system` + `user` 消息
- `workflow`：机器可解析的步骤与 gate
- `guardrails`：约束与限制条件
- `clarifyingQuestions`：继续执行前需要追问的澄清问题

**关键入参**

- `userPrompt`（必填）
- `taskType`：
  - `new_feature`
  - `optimize_existing`
  - `refactor`
  - `bugfix`
  - `performance`
  - `ui_polish`
  - `dependency_upgrade`
  - `test_addition`
- `requireApprovalGates`（默认 `true`）：强制在 gate 处停下等待用户确认
- 可选的技术栈提示：`framework`、`language`、`styling`、`router` 等

**示例入参**

```json
{
  "userPrompt": "给后台新增一个用户列表页面，支持搜索、分页、编辑弹窗",
  "taskType": "new_feature",
  "language": "ts",
  "framework": "React",
  "styling": "TailwindCSS",
  "requireApprovalGates": true
}
```

**重要出参字段（重要字段）**

- `workflow.gates[]`：审批关口列表
- `messages[]`：标准化后的提示词

### 3) `score_frontend_prompt`

对提示词质量评分，并识别缺失信息。

**入参**

```json
{ "prompt": "..." }
```

**出参**

- `score`（0-100）
- `missing[]`
- `suggestions[]`

---

## 宿主编排（最佳实践）

为了让 gate 更可靠、做到“像主流 MCP 一样好用”，建议采用：**由宿主拦截**。

### Gate 标记（拦截信号）

强制模板中包含机器可解析标记：

- Gate 开始：

```text
<<<MCP:GATE id="new_feature_design" action="WAIT_FOR_USER_APPROVAL">>>
```

- Gate 停止（推荐把它作为宿主拦截触发信号）：

```text
<<<MCP:WAIT gate_id="new_feature_design" action="WAIT_FOR_USER_APPROVAL">>>
```

### 推荐的宿主行为

1. 调用 `scan_project`（获取目录树 + `hasClaudeMd`）
2. 调用 `optimize_frontend_prompt`
3. 将返回的 `messages` 喂给你的 AI
4. 当 AI 输出包含 `<<<MCP:WAIT ...>>>`：
   - 宿主停止继续
   - 询问用户：**同意 / 调整 / 取消**
5. 用户同意后 -> 宿主开启下一轮 AI，对应 gate 之后的步骤继续执行

---

## 说明 / 常见问题（FAQ）

### 1) `scan_project` 的 rootDir

出于安全考虑，`scan_project.rootDir` 必须位于**服务进程的工作目录（cwd）**之内。

因此，通常建议宿主用**目标前端项目根目录作为工作目录（cwd）**来启动这个 MCP 服务。

### 2) 为什么使用 stdio？

stdio 是 MCP 宿主里支持最广、也最容易配置的传输方式。

---

## 开发

```bash
npm run dev
```

---

## 许可

默认：私有 / 内部使用。
