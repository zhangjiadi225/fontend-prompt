import { ScoreArgs } from "../types.js";
import { clamp, includesAny } from "../utils.js";

/**
 * 对前端提示词质量进行评分，并识别缺失信息。
 */
export function scoreFrontendPrompt(args: ScoreArgs) {
    const prompt = args.prompt.trim();
    const lower = prompt.toLowerCase();

    const signals = {
        hasContext: prompt.length >= 200 || includesAny(lower, ["背景", "上下文", "context", "existing", "现有"]),
        hasStack: includesAny(lower, ["react", "vue", "angular", "svelte", "next", "nuxt", "vite", "webpack"]),
        hasConstraints: includesAny(lower, ["必须", "禁止", "约束", "constraint", "don’t", "do not", "avoid"]),
        hasDeliverables: includesAny(lower, ["输出", "deliver", "code", "diff", "文件", "file", "目录", "structure"]),
        hasEdgeCases: includesAny(lower, ["边界", "edge", "error", "异常", "fallback", "loading"]),
        hasA11y: includesAny(lower, ["a11y", "accessibility", "aria", "无障碍"]),
        hasPerformance: includesAny(lower, ["performance", "性能", "lcp", "cls", "memo", "virtualize", "debounce"]),
        hasTesting: includesAny(lower, ["test", "jest", "vitest", "cypress", "playwright"]),
        hasGates: includesAny(lower, ["<<<mcp:gate", "<<<mcp:wait", "[gate", "need user approval", "审批", "等待用户", "同意后"]),
        hasScanProject: includesAny(lower, ["scan_project", "项目理解", "目录树", "架构"]),
        hasTemplateSections: includesAny(lower, ["## 0.", "## 1.", "## 2.", "## 3."]) || includesAny(lower, ["输出结构（必须严格遵守）"]),
    };

    const breakdown = {
        clarity: clamp((prompt.length >= 80 ? 20 : 10) + (signals.hasDeliverables ? 10 : 0), 0, 30),
        context: clamp((signals.hasContext ? 20 : 8) + (signals.hasStack ? 10 : 0), 0, 30),
        constraints: clamp((signals.hasConstraints ? 18 : 6) + (signals.hasEdgeCases ? 6 : 0), 0, 30),
        qualityBars: clamp((signals.hasA11y ? 5 : 0) + (signals.hasPerformance ? 5 : 0) + (signals.hasTesting ? 5 : 0), 0, 15),
        process: clamp((signals.hasGates ? 8 : 0) + (signals.hasScanProject ? 6 : 0) + (signals.hasTemplateSections ? 6 : 0), 0, 20),
    };

    const score = clamp(
        breakdown.clarity + breakdown.context + breakdown.constraints + breakdown.qualityBars + breakdown.process,
        0,
        100,
    );

    const missing: string[] = [];
    if (!signals.hasStack) missing.push("框架/构建工具/运行环境（React/Vue/Next/Vite 等）");
    if (!signals.hasConstraints) missing.push("明确约束（必须/禁止/依赖限制/兼容性范围）");
    if (!signals.hasDeliverables) missing.push("明确交付物（要代码/要 diff/要文件结构/要步骤）");
    if (!signals.hasEdgeCases) missing.push("边界情况与错误处理（加载态/空态/失败态）");
    if (!signals.hasA11y) missing.push("可访问性要求（键盘/ARIA/对比度等）");
    if (!signals.hasPerformance) missing.push("性能要求（首屏、列表虚拟化、缓存、避免重复渲染等）");
    if (!signals.hasScanProject) missing.push("项目理解步骤（调用 scan_project/总结目录结构/定位相关文件）");
    if (!signals.hasGates) missing.push("审批 gate（设计方案/实施计划/验收等节点必须等待用户同意）");
    if (!signals.hasTemplateSections) missing.push("结构化模板章节（0/1/2/3... 的固定结构）");

    const suggestions: string[] = [
        "补充项目上下文：现有目录结构、关键组件/页面、接口契约、约定（lint/format）",
        "把需求拆成可验收条目：功能点、交互细节、状态流转、异常路径",
        "增加强约束：不新增依赖/必须 TS/必须支持移动端/必须兼容哪些浏览器",
        "指定输出格式：先问澄清问题，再给方案，然后给代码（diff 或文件内容）",
    ];

    return {
        score,
        breakdown,
        missing,
        suggestions,
    };
}
