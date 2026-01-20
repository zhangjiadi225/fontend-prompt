import * as fs from "fs/promises";
import * as path from "path";

export interface ProjectContext {
  framework?: string;
  language?: "ts" | "js";
  styling?: string;
  stateManagement?: string;
  router?: string;
  techStackSummary?: string;
}

export async function detectProjectContext(
  cwd: string,
): Promise<ProjectContext> {
  const context: ProjectContext = {};
  const pkgPath = path.join(cwd, "package.json");

  try {
    const pkgContent = await fs.readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(pkgContent);
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const depNames = Object.keys(allDeps);

    // Language
    if (depNames.includes("typescript")) {
      context.language = "ts";
    } else {
      // Check for jsconfig/tsconfig presence if not in deps
      const hasTsConfig = await fileExists(path.join(cwd, "tsconfig.json"));
      context.language = hasTsConfig ? "ts" : "js";
    }

    // Framework
    if (depNames.includes("next")) context.framework = "Next.js";
    else if (depNames.includes("nuxt")) context.framework = "Nuxt";
    else if (depNames.includes("react")) context.framework = "React";
    else if (depNames.includes("vue")) context.framework = "Vue";
    else if (depNames.includes("svelte")) context.framework = "Svelte";
    else if (depNames.includes("@angular/core")) context.framework = "Angular";

    // Styling
    const styles = [];
    if (depNames.includes("tailwindcss")) styles.push("Tailwind CSS");
    if (depNames.includes("sass") || depNames.includes("sass-loader"))
      styles.push("SASS/SCSS");
    if (depNames.includes("styled-components"))
      styles.push("Styled Components");
    if (depNames.includes("@emotion/react")) styles.push("Emotion");
    if (depNames.includes("@mui/material")) styles.push("MUI");
    if (depNames.includes("antd")) styles.push("Ant Design");
    if (styles.length > 0) context.styling = styles.join(", ");

    // State Management
    if (depNames.includes("redux") || depNames.includes("@reduxjs/toolkit"))
      context.stateManagement = "Redux";
    else if (depNames.includes("zustand")) context.stateManagement = "Zustand";
    else if (depNames.includes("pinia")) context.stateManagement = "Pinia";
    else if (depNames.includes("mobx")) context.stateManagement = "MobX";
    else if (depNames.includes("recoil")) context.stateManagement = "Recoil";

    // Router
    if (context.framework === "Next.js")
      context.router = "Next.js App Router/Pages Router";
    else if (context.framework === "Nuxt") context.router = "Nuxt Router";
    else if (depNames.includes("react-router-dom"))
      context.router = "React Router";
    else if (depNames.includes("vue-router")) context.router = "Vue Router";

    // Config files detection
    if (
      (await fileExists(path.join(cwd, "tailwind.config.js"))) ||
      (await fileExists(path.join(cwd, "tailwind.config.ts")))
    ) {
      if (!context.styling?.includes("Tailwind")) {
        context.styling = context.styling
          ? `${context.styling}, Tailwind CSS`
          : "Tailwind CSS";
      }
    }
    if (
      (await fileExists(path.join(cwd, "next.config.js"))) ||
      (await fileExists(path.join(cwd, "next.config.mjs"))) ||
      (await fileExists(path.join(cwd, "next.config.ts")))
    ) {
      if (!context.framework) context.framework = "Next.js";
    }
    if (
      (await fileExists(path.join(cwd, "vite.config.js"))) ||
      (await fileExists(path.join(cwd, "vite.config.ts")))
    ) {
      // Just note it in usage, maybe not framework
    }

    // Summary
    const parts = [
      context.framework,
      context.language === "ts" ? "TypeScript" : "JavaScript",
      context.styling,
      context.stateManagement,
      context.router,
    ].filter(Boolean);
    context.techStackSummary = parts.join(" + ");
  } catch (e) {
    // package.json read failed or parse error, just return empty context
  }

  return context;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}
