/**
 * 格式化思考路径输出 (Markdown)
 * @param skill Skill 名称
 * @param input 原始输入参数
 * @param steps 执行步骤描述列表
 * @param result 最终结果对象
 */
export function formatThoughtPath(
  skill: string,
  input: any,
  steps: string[],
  result: any,
): string {
  const timestamp = new Date().toLocaleString("zh-CN");

  // 构建输入摘要
  const inputSummary = Object.entries(input)
    .filter(([_, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) =>
        `- **${k}**: ${typeof v === "object" ? JSON.stringify(v) : v}`,
    )
    .join("\n");

  // 构建步骤列表
  const stepsList = steps.map((step) => `- [x] ${step}`).join("\n");

  return `
# 🧠 思考路径: ${skill}

> **时间**: ${timestamp}
> **工具**: \`@frontend-prompt/${skill.toLowerCase().replace(/\s+/g, "-")}\`

## 1. 🔍 原始输入分析
${inputSummary}

## 2. 🛠️ 执行步骤
${stepsList}

## 3. 🎯 执行结果概要
- **包含字段**: ${Object.keys(result).join(", ")}
- **Prompt 长度**: ${result.optimizedPrompt?.length || 0} 字符
`.trim();
}
