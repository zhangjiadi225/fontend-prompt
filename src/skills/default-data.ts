export const DEFAULT_DATA = {
  guardrails: {
    // Merged high-level standards
    standard_practice:
      "Standards: Strict Types, Error Handling, Boundary Checks, Modern ES6+, Accessibility (WCAG), Performance First.",
    no_speculation:
      "Constraint: Do NOT fabricate logic. If requirements are missing, ask clarifying questions.",
    structured_output:
      "Constraint: Follow strict JSON/Markdown output structure. Respect all Gate stops.",

    // Tech-specific placeholders
    ts_default: "Use TypeScript (Strict Mode). No `any`.",
    framework_practice: "Follow {{framework}} best practices.",
    styling_req: "Styling: {{styling}}.",
  },
  questions: {
    framework: "Framework? (React/Vue/etc)",
    techStack: "Tech Stack? (Vite/Next/Node ver)",
    language: "Language? (TS/JS)",
    styling: "Styling? (Tailwind/CSS Modules)",
    stateManagement: "State Management?",
    router: "Routing?",
    api: "API/Auth details?",
    taskType: "Task Type? (new_feature/refactor/bugfix/etc)",
  },
  workflow: {
    gates: {
      new_feature_design: { title: "Design", when: "Before Implementation Plan" },
      new_feature_plan: { title: "Plan", when: "Before Coding" },
      new_feature_accept: { title: "Acceptance", when: "Before Delivery" },
      opt_change_doc: { title: "Change Doc", when: "Before Coding" },
      opt_plan: { title: "Plan", when: "Before Coding" },
      refactor_doc: { title: "Refactor Doc", when: "Before Migration" },
      refactor_migration: { title: "Migration", when: "Before Execution" },
      bugfix_plan: { title: "Fix Plan", when: "Before Coding" },
      perf_plan: { title: "Optimization Plan", when: "Before Coding" },
      ui_polish_plan: { title: "UI Plan", when: "Before Coding" },
      dep_upgrade_plan: { title: "Upgrade Plan", when: "Before Coding" },
      test_plan: { title: "Test Plan", when: "Before Coding" },
    },
    steps: {
      // Simplified step names
      task_classification: "Classify",
      project_understanding: "Context",
      risk_constraints: "Constraints",
      design: "Design",
      plan: "Plan",
      implementation: "Implement",
      typecheck: "TypeCheck",
      acceptance: "Acceptance",
      docs: "Docs",
      current_understanding: "Analysis",
      change_doc: "ChangeDoc",
      scope_understanding: "Scope",
      refactor_doc: "RefactorDoc",
      migration: "Migration",
      execution: "Execute",
      repro_rootcause: "Repro",
      metrics: "Metrics",
      issues: "Issues",
      risk: "Risk",
      implementation_verification: "Verify",
      implementation_comparison: "Compare",
    },
  },
  template: {
    structure_header: "# Output Structure",
    // Section A
    sec_a_header: "## A. 意图对齐 (Intent Alignment)",
    sec_a_desc: "- 用一句话总结你将要执行的任务。",

    // Section B
    sec_b_header: "## B. 关键确认 (Crucial Validations)",
    sec_b_desc: "- 仅在存在高风险或多歧义时输出 (否则跳过)",

    // Section C
    sec_c_header: "## C. 优化后的提示词 (Refined Prompt)",
    sec_c_desc: "- 将用户的原始指令重写为一份高保真、具备专业上下文的“终极指令”。",

    // Gate instructions - Simplified
    gate_instruction: "- Stop at `<<<MCP:GATE...>>>`. Wait for user.",
    gate_disabled_instruction: "- Mark gates but do not stop.",
    gate_stop: '`<<<MCP:WAIT gate_id="<id>" action="WAIT_FOR_USER_APPROVAL">>>`',
    stop_generating: "🔴 STOP.",

    // Conciseness: Many detailed descriptions removed or merged
    user_story: "- User Stories / Acceptance Criteria",
    ui_desc: "- UI States (Loading/Error/Success)",
    state_desc: "- State Management",
    router_desc: "- Routing / Navigation",
    data_desc: "- Data / API / Error Handling",
    file_change_desc: "- File Changes List",
    tradeoff_desc: "- Trade-offs",
    dev_step: "- Step-by-step Implementation Guide",
    todo_list: "- Checklists",
    verify_plan: "- Verification Plan",
    code_output: "- Code (Diffs/Snippets)",
    ts_check: "- TS Check (tsc)",
    ts_check_skip: "- (Skip TS Check)",
    acceptance_check: "- Acceptance Checklist",
    doc_update: "- Update Documentation (if exists)",
    legacy_desc: "- Current Behavior & Pain Points",
    change_doc_items: [
      "- Problem",
      "- Goal",
      "- Scope",
      "- Risks",
    ],
    refactor_scope_desc: "- Scope & Dependencies",
    refactor_doc_items: [
      "- Goal Structure",
      "- Migration Map",
      "- Strategy",
    ],
    migration_plan_desc: "- Migration Script/Steps",
    refactor_exec: "- Execution Steps",
    repro_desc: "- Repro Steps & Root Cause",
    fix_plan_desc: "- Fix Plan & Impact",
    verification_desc: "- Verification",
    perf_metrics: "- Metrics (LCP/TTI/Bundle)",
    perf_opt: "- Hypotheses & Fixes",
    perf_compare: "- Before/After Comparison",
    ux_issues: "- Issues List",
    ux_fix: "- Fixes",
    upgrade_risk: "- Versions & Breaking Changes",
    upgrade_plan: "- Steps & Rollback",
    upgrade_exec: "- Execution",
    test_scope: "- Test Scope",
    test_exec: "- Test Code",
    wait_gate_title: "Execution",
    gate_need_approval: "APPROVAL REQUIRED",
  },
  core: {
    system_prompt: `Role: Elite Frontend Agent.
Principles:
1. **First Principles**: Best solution for the context.
2. **Security**: Validate inputs.
3. **Performance**: Avoid re-renders/blocking.
4. **KISS**: Simple > Complex.
5. **Alignment**: Align intent before execution.`,
    constraints: "Constraints:",
    task_type: "Type",
    approval_gate: "Gates",
    gate_enabled: "On",
    gate_disabled: "Off",
    original_question: "Request",
    project_context: "Context",
    expected_output: "Output",
    output_intro: "Ask clarifying questions if needed.",
    output_format_req: "Format",
    output_mode: "Mode",
    code_style: "Style",
    must_include: "Must include: Plan/Edge Cases/Errors/A11y/Perf",
    file_change: "File Changes: Path & Content",
    structured_template: "Template",
    clarifying_header: "Clarifications",
  },
};
