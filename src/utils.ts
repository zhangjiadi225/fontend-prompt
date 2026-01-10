import * as path from "node:path";

/**
 * 将输入转换为非空字符串，如果不是字符串或为空则返回 undefined
 */
export function asNonEmptyString(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const s = value.trim();
    return s.length ? s : undefined;
}

/**
 * 将数值限制在 [min, max] 范围内
 */
export function clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
}

/**
 * 检查 haystack 中是否包含 needles 中的任意一个字符串（不区分大小写）
 */
export function includesAny(haystack: string, needles: string[]): boolean {
    const h = haystack.toLowerCase();
    return needles.some((n) => h.includes(n.toLowerCase()));
}

/**
 * 生成安全的绝对路径，确保路径在当前工作目录（cwd）下
 */
export function safeResolveUnderCwd(p: string | undefined): string {
    const cwd = process.cwd();
    const target = path.resolve(cwd, p ?? ".");
    const rel = path.relative(cwd, target);
    if (rel.startsWith("..") || (path.isAbsolute(rel) && rel.includes(":"))) {
        // 允许绝对路径，但必须在 CWD 下（虽然上面 path.isAbsolute(rel) 在 rel 为相对路径时通常为 false，除了 windows 跨盘符）
        // 这里的逻辑主要是防止路径遍历攻击
        // 如果 rel 开始于 ".."，说明在 CWD 之外
        throw new Error("scan_project: rootDir must be within the server working directory (安全限制：必须在当前工作目录下)");
    }
    return target;
}
