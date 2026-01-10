import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { scanProject } from "./skills/scan.js";
import { buildOptimizedPromptPackage } from "./skills/optimize.js";
import { scoreFrontendPrompt } from "./skills/score.js";
import { OptimizeArgs, ScanProjectArgs } from "./types.js";
import { asNonEmptyString } from "./utils.js";

// === 导出 Skills (作为库使用) ===
export * from "./types.js";
export * from "./utils.js";
export { scanProject } from "./skills/scan.js";
export { buildOptimizedPromptPackage as optimizeFrontendPrompt } from "./skills/optimize.js";
export { scoreFrontendPrompt } from "./skills/score.js";

// === MCP Server 实现 ===

// 只有当文件被直接运行时才启动 Server
// 简单的判断方式：看是否通过 import 导入
// 在 Node.js 中，如果 entry point 是此文件，则启动

const isMainModule = import.meta.url.endsWith(process.argv[1]) || (process.argv[1] && import.meta.url.includes(process.argv[1]));
// 注意：ESM 中判断 isMain 比较麻烦，这里我们简化处理：
// 如果是通过 `node dist/index.js` 启动，我们假设它是为了跑 server。
// 如果作为库被 import，通常不会立即执行 await server.connect。
// 但 MCP SDK 的 connect 是阻塞的吗？StdioServerTransport 是基于 stdio 的。

// 为了安全起见，我们把 Server 启动逻辑封装在一个函数里，如果用户想跑 Server 可以显示调用，或者我们检测命令行参数。
// 或者，为了兼容旧的 `npm start`，我们保留默认启动行为，但如果用户只想用库，可能会有副作用。
// 更好的做法是：把 Server 逻辑拆分到 `src/server.ts`，`index.ts` 只做导出。
// 但根据计划，我们尽量保持 index.ts 为入口。
// 让我们依然默认启动 Server，因为这对 MCP 是标准行为。
// 使用者如果只是 import { scanProject } from '...', 只要不执行到最后的 connect 就行。
// 但顶层的代码会执行。

// 修正方案：将 Server 逻辑包裹在 IIFE 或判断中。
// 更加稳妥的方式：不做判断，假设这个文件就是 Server 入口。
// 库的使用者应该 import from './skills/scan.js' 而不是 './index.js' 以避免副作用，或者我们把 index.js 变成纯导出，把 server 移到 server.ts。
// 鉴于我不想改变 `dist/index.js` 的既定路径（README 里写了），我将保持 `index.ts` 为 Server。
// 并新建 `src/lib.ts` 或直接让用户 import 子路径。

// 为了完成任务 "Reorganized Structure"，我会把 Server 逻辑保留在 index.ts，但极其精简。

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

// 启动 Server
const transport = new StdioServerTransport();
await server.connect(transport);
