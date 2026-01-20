#!/usr/bin/env node
import { cac } from "cac";

import { buildOptimizedPromptPackage } from "./skills/optimize/index.js";
import { buildVerificationPrompt } from "./skills/verify.js";
import { ProjectContext, detectProjectContext } from "./context-analyzer.js";
import { OptimizeArgs } from "./types.js";
import * as path from "path";
import * as fs from "fs/promises";
import { formatThoughtPath } from "./formatter.js";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pkg = require("../package.json");
const version = pkg.version;

const cli = cac("frontend-prompt");

function printSkillBanner(skillName: string) {
  console.error(`============= [Frontend Prompt Skill] =============`);
  console.error(`🚀 正在执行: ${skillName}`);
  console.error(`===================================================`);
}

cli
  .command("optimize <prompt>", "将原始需求转化为结构化 Prompt")
  .option("--context <string>", "项目上下文")
  .option("--stack <string>", "技术栈")
  .option("--framework <string>", "框架")
  .option("--lang <string>", "语言 (ts/js)", { default: "ts" })
  .option("--type <string>", "任务类型 (new_feature 等)")
  .option("--fields <string>", "指定输出字段 (如: optimizedPrompt,workflow)")
  .option("--save <path>", "将结果保存到文件")
  .action(async (prompt, options) => {
    // printSkillBanner("需求优化 (Optimize)"); // Banner 移除了，由 Thought Path 替代
    try {
      // 1. 自动检测项目上下文
      const detectedContext = await detectProjectContext(process.cwd());

      const args: OptimizeArgs = {
        userPrompt: prompt,
        projectContext: options.context,
        techStack: options.stack || detectedContext.techStackSummary,
        framework: options.framework || detectedContext.framework,
        language: (options.lang as "ts" | "js") || detectedContext.language,
        styling: detectedContext.styling,
        stateManagement: detectedContext.stateManagement,
        router: detectedContext.router,
        taskType: options.type,
        outputLanguage: "zh",
      };

      const result = buildOptimizedPromptPackage(args);

      // 生成思考路径
      const thought = formatThoughtPath(
        "Optimize Requirement",
        args,
        [
          "解析用户输入与参数",
          "加载前端开发最佳实践守则 (Guardrails)",
          "识别任务类型并构建工作流 (Workflow)",
          "生成澄清问题 (Clarifying Questions)",
          "组装最终 Prompt Package",
        ],
        result,
      );

      // 注入思考路径到结果对象 (如果未指定 fields 或 fields 包含 thought_trace)
      if (!options.fields || options.fields.includes("thought_trace")) {
        result.thought_trace = thought;
      }

      let finalOutput: any = result;

      // 如果指定了 fields，则进行过滤
      if (options.fields) {
        const fields = options.fields.split(",").map((f: string) => f.trim());
        finalOutput = {};
        for (const field of fields) {
          if (field in result) {
            finalOutput[field] = result[field as keyof typeof result];
          }
        }
      }

      if (options.save) {
        await fs.writeFile(
          options.save,
          JSON.stringify(finalOutput, null, 2),
          "utf-8",
        );
        console.log(`结果已保存至: ${options.save}`);
      } else {
        // 输出最终 JSON
        console.log(JSON.stringify(finalOutput, null, 2));
      }
    } catch (e: any) {
      console.error("优化失败:", e.message);
      process.exit(1);
    }
  });

cli.help();
cli.version(version);

cli.parse();
