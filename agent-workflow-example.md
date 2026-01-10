---
description: 前端开发辅助工作流 (理解项目、优化需求、评分)
---

当用户发布前端开发相关的任务（如“新增页面”、“优化性能”、“理解项目”）时，请参考以下工作流使用 `@jdzhang225gmail/fontend-prompt` 工具。

### 1. 项目扫描 (理解上下文)
如果任务涉及对现有代码的理解或修改，**第一步**必须先扫描项目结构：

```bash
npx -y @jdzhang225gmail/fontend-prompt scan --depth 3
```

- 将输出的 JSON（目录树与关键文件列表）作为上下文理解项目架构。
- 如果扫描结果显示存在 `claude.md` 或 `CLAUDE.md`，请优先阅读该文件。

### 2. 需求优化 (生成开发方案)
在开始写代码之前，先将用户的模糊需求转化为详细的开发方案：

```bash
npx -y @jdzhang225gmail/fontend-prompt optimize "<用户的原始需求>" --type <new_feature|optimize_existing|bugfix>
```

- **严格执行**工具输出的 "Workflow" 和 "Guardrails"。
- 如果输出中包含 "Gate" (审批关口)，必须在对应步骤停下来询问用户确认。

### 3. Prompt 质量自测 (可选)
如果你不确定生成的方案是否足够好，或者用户提供的 Prompt 太简单，可以先评分：

```bash
npx -y @jdzhang225gmail/fontend-prompt score "<原始 Prompt>"
```
