#!/usr/bin/env node
import { cac } from "cac";

import { buildOptimizedPromptPackage } from "./skills/optimize.js";
import { scoreFrontendPrompt } from "./skills/score.js";
import { OptimizeArgs } from "./types.js";
import * as path from "path";
import * as fs from "fs/promises";

// 读取 package.json 获取版本号
// const pkg = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf-8"));
// 为了避免 ESM 路径问题，暂时硬编码，或者用 simple import
const version = "0.3.0";

const cli = cac("fontend-skill");



cli
    .command("optimize <prompt>", "将原始需求转化为结构化 Prompt")
    .option("--context <string>", "项目上下文")
    .option("--stack <string>", "技术栈")
    .option("--framework <string>", "框架")
    .option("--lang <string>", "语言 (ts/js)", { default: "ts" })
    .option("--type <string>", "任务类型 (new_feature 等)")
    .option("--save <path>", "将结果保存到文件")
    .action(async (prompt, options) => {
        try {
            const args: OptimizeArgs = {
                userPrompt: prompt,
                projectContext: options.context,
                techStack: options.stack,
                framework: options.framework,
                language: options.lang,
                taskType: options.type,
                outputLanguage: "zh", // 强制默认中文
            };

            const result = buildOptimizedPromptPackage(args);

            if (options.save) {
                await fs.writeFile(options.save, JSON.stringify(result, null, 2), "utf-8");
                console.log(`结果已保存至: ${options.save}`);
            } else {
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
        try {
            const result = scoreFrontendPrompt({ prompt });
            console.log(JSON.stringify(result, null, 2));
        } catch (e: any) {
            console.error("评分失败:", e.message);
            process.exit(1);
        }
    });

cli.help();
cli.version(version);

cli.parse();
