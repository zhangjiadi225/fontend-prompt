#!/usr/bin/env node
import { cac } from "cac";

import { buildOptimizedPromptPackage } from "./skills/optimize.js";
import { scoreFrontendPrompt } from "./skills/score.js";
import { OptimizeArgs } from "./types.js";
import * as path from "path";
import * as fs from "fs/promises";
import { formatThoughtPath } from "./formatter.js";

// 读取 package.json 获取版本号
// const pkg = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf-8"));
// 为了避免 ESM 路径问题，暂时硬编码，或者用 simple import
const version = "0.3.0";

const cli = cac("fontend-skill");




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
    .option("--save <path>", "将结果保存到文件")
    .action(async (prompt, options) => {
        // printSkillBanner("需求优化 (Optimize)"); // Banner 移除了，由 Thought Path 替代
        try {
            const args: OptimizeArgs = {
                userPrompt: prompt,
                projectContext: options.context,
                techStack: options.stack,
                framework: options.framework,
                language: options.lang,
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
                    "组装最终 Prompt Package"
                ],
                result
            );

            // 注入思考路径到结果对象
            result.thought_trace = thought;

            if (options.save) {
                await fs.writeFile(options.save, JSON.stringify(result, null, 2), "utf-8");
                console.log(`结果已保存至: ${options.save}`);
            } else {
                // 输出包含 thought_trace 的完整 JSON
                console.log(JSON.stringify(result, null, 2));
            }
        } catch (e: any) {
            console.error("优化失败:", e.message);
            process.exit(1);
        }
    });

cli
    .command("score <prompt>", "对 Prompt 质量进行评分")
    .action((prompt) => {
        // printSkillBanner("Prompt 评分 (Score)");
        try {
            const result = scoreFrontendPrompt({ prompt });

            // 生成思考路径
            const thought = formatThoughtPath(
                "Score Prompt",
                { prompt },
                [
                    "分析 Prompt 关键特征 (Signals)",
                    "计算维度得分 (Clarity, Context, Constraints, Quality, Process)",
                    "识别缺失要素 (Missing Elements)",
                    "生成改进建议 (Suggestions)"
                ],
                result
            );

            // 注入思考路径到结果对象
            result.thought_trace = thought;

            console.log(JSON.stringify(result, null, 2));
        } catch (e: any) {
            console.error("评分失败:", e.message);
            process.exit(1);
        }
    });

cli.help();
cli.version(version);

cli.parse();
