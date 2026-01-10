import * as fs from "node:fs/promises";
import * as path from "node:path";
import { ScanProjectArgs } from "../types.js";
import { safeResolveUnderCwd, clamp } from "../utils.js";

/**
 * 扫描项目目录结构（只读），并检测 claude.md/CLAUDE.md。
 * 用于让 AI 初步理解项目架构。
 */
export async function scanProject(args: ScanProjectArgs) {
    const root = safeResolveUnderCwd(args.rootDir);
    const maxDepth = typeof args.maxDepth === "number" ? clamp(Math.floor(args.maxDepth), 0, 10) : 4;
    const maxEntries = typeof args.maxEntries === "number" ? clamp(Math.floor(args.maxEntries), 50, 5000) : 1200;

    const ignoreNames = new Set(["node_modules", ".git", "dist", "build", ".next", ".nuxt", ".turbo", "coverage"]);
    const treeLines: string[] = [];
    const filesIndex: string[] = [];
    let entriesCount = 0;

    async function walk(dir: string, depth: number, prefix: string) {
        if (entriesCount >= maxEntries) return;

        let dirents;
        try {
            dirents = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            return;
        }

        const filtered = dirents
            .filter((d) => !ignoreNames.has(d.name))
            .sort((a, b) => {
                if (a.isDirectory() && !b.isDirectory()) return -1;
                if (!a.isDirectory() && b.isDirectory()) return 1;
                return a.name.localeCompare(b.name);
            });

        for (let i = 0; i < filtered.length; i++) {
            if (entriesCount >= maxEntries) return;
            const d = filtered[i];
            const isLast = i === filtered.length - 1;
            const connector = isLast ? "└─" : "├─";
            const rel = path.relative(root, path.join(dir, d.name)).replace(/\\/g, "/");
            treeLines.push(`${prefix}${connector} ${d.name}${d.isDirectory() ? "/" : ""}`);
            entriesCount++;
            if (!d.isDirectory()) filesIndex.push(rel);
            if (d.isDirectory() && depth < maxDepth) {
                await walk(path.join(dir, d.name), depth + 1, `${prefix}${isLast ? "   " : "│  "}`);
            }
        }
    }

    treeLines.push(`${path.basename(root) || "."}/`);
    await walk(root, 0, "");

    const claudeCandidates = filesIndex.filter((p) => p.toLowerCase().endsWith("claude.md"));
    const suggestedFiles = [
        "package.json",
        "pnpm-lock.yaml",
        "yarn.lock",
        "package-lock.json",
        "tsconfig.json",
        "vite.config.ts",
        "vite.config.js",
        "next.config.js",
        "nuxt.config.ts",
        "eslint.config.js",
        ".eslintrc",
        ".prettierrc",
        "README.md",
        "CLAUDE.md",
    ].filter((f) => filesIndex.some((p) => p.toLowerCase() === f.toLowerCase()));

    return {
        rootDir: root,
        maxDepth,
        maxEntries,
        truncated: entriesCount >= maxEntries,
        tree: treeLines.join("\n"),
        hasClaudeMd: claudeCandidates.length > 0,
        claudeMdPaths: claudeCandidates,
        suggestedFiles,
    };
}
