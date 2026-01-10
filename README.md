# 前端提示词 Skills (CLI)

这是一个**前端开发辅助 CLI 工具**。它通过**零 Token 消耗**的本地分析，将模糊的需求转化为**专业、结构化、带审批流的前端开发方案**，供 Agent 或开发者直接使用。

## 🌟 核心特性

- **纯 CLI 工具**: 无需常驻服务，即用即走。

- **结构化输出**: 生成包含文件变更、审批关口、校验步骤的标准 Prompt。

---

## 🚀 安装 (推荐)

为了获得极速体验（避免每次 `npx` 下载），请**全局安装**：

```bash
npm install -g @jdzhang225gmail/fontend-prompt
```

安装后，即可使用 `fontend-prompt` 命令。

---

## 📖 使用指南


### 1. 优化需求 (Optimize)
将你的“一句话需求”转化为详细的开发方案。

```bash
fontend-prompt optimize "给后台增加一个用户管理页面"
```

### 2. 评分 (Score)
看看你的 Prompt 写得好不好，缺什么信息。

```bash
fontend-prompt score "帮我写个页面"
```

---

## 🤖 在 Agent 中使用 (Antigravity / Claude Code)

为了让 Agent 更流畅地调用本工具，请告诉它直接使用命令行。

**添加到 `.cursorrules` 或 Agent 系统提示词：**


> "当需要规划新功能时，请运行命令 `fontend-prompt optimize '<需求>'`，并根据输出结果执行。"

---

## 📦 本地开发与构建

如果你想二次开发：

```bash
npm install
npm run build

# 本地测试
node dist/cli.js --help
```

---

## 许可

MIT
