import { OptimizeArgs } from "../../types.js";
import { buildWorkflowDefinition } from "./workflow.js";
import { getLocale } from "../../i18n.js";

/**
 * 构建结构化的输出模板（Markdown），这是提示词的核心部分
 */
export function buildStructuredTemplate(args: OptimizeArgs) {
  const taskType = args.taskType ?? "new_feature";
  const requireApprovalGates = args.requireApprovalGates ?? true;
  const language = args.language ?? "ts";
  const t = getLocale(args.outputLanguage).template;

  const workflow = buildWorkflowDefinition(args);

  const gateLine = t.gate_instruction(requireApprovalGates);

  const base = [
    t.structure_header,
    "## - Machine readable workflow",
    `- mcp_workflow: ${JSON.stringify({ task_type: workflow.taskType, require_approval_gates: workflow.requireApprovalGates, gates: workflow.gates }, null, 0)}`,
    `- gate_marker_prefix: ${workflow.gateMarker} id="..." action="WAIT_FOR_USER_APPROVAL">>>`,
    t.task_classification_header,
    `- task_type: <new_feature|optimize_existing|refactor|bugfix|performance|ui_polish|dependency_upgrade|test_addition>`,
    `- ${t.goal}: <...>`,
    `- ${t.non_goal}: <...>`,
    "",
    t.implementation_plan_header,
    "- [ ] Phase 1: <...>",
    "- [ ] Phase 2: <...>",
    "",
    t.task_list_header,
    "- [ ] Create/Modify `src/components/...` <!-- id: 1 -->",
    "- [ ] Update `package.json` <!-- id: 2 -->",
    "",
    t.project_understanding_header,
    t.project_understanding_desc,
    "",
    t.risk_constraints_header,
    t.risk_constraints_desc,
    "",
    gateLine,
    `- ${t.gate_stop}`,
  ];

  if (taskType === "new_feature") {
    return [
      ...base,
      "",
      '<<<MCP:GATE id="new_feature_design" action="WAIT_FOR_USER_APPROVAL">>>',
      t.stop_generating,
      `## 5. ${workflow.gates.find((g) => g.id === "new_feature_design")?.title} **[${t.gate_need_approval}]**`,
      t.user_story,
      t.ui_desc,
      t.state_desc,
      t.router_desc,
      t.data_desc,
      t.file_change_desc,
      t.tradeoff_desc,
      '<<<MCP:WAIT gate_id="new_feature_design" action="WAIT_FOR_USER_APPROVAL">>>',
      "",
      '<<<MCP:GATE id="new_feature_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      t.stop_generating,
      `## 6. ${workflow.gates.find((g) => g.id === "new_feature_plan")?.title} **[${t.gate_need_approval}]**`,
      t.dev_step,
      t.todo_list,
      t.verify_plan,
      '<<<MCP:WAIT gate_id="new_feature_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      "",
      `## 7. ${t.wait_gate_title}`,
      t.code_output,
      "",
      "## 8. TypeScript Check",
      t.ts_check(language === "ts"),
      "",
      '<<<MCP:GATE id="new_feature_accept" action="WAIT_FOR_USER_APPROVAL">>>',
      t.stop_generating,
      `## 9. ${workflow.gates.find((g) => g.id === "new_feature_accept")?.title} **[${t.gate_need_approval}]**`,
      t.acceptance_check,
      '<<<MCP:WAIT gate_id="new_feature_accept" action="WAIT_FOR_USER_APPROVAL">>>',
      "",
      "## 10. Documentation",
      t.doc_update,
    ].join("\n");
  }

  if (taskType === "optimize_existing") {
    return [
      ...base,
      "",
      `## 5. ${workflow.steps.find((s) => s.id === "current_understanding")?.title}`,
      t.legacy_desc,
      "",
      '<<<MCP:GATE id="opt_change_doc" action="WAIT_FOR_USER_APPROVAL">>>',
      t.stop_generating,
      `## 6. ${workflow.gates.find((g) => g.id === "opt_change_doc")?.title} **[${t.gate_need_approval}]**`,
      ...t.change_doc_items,
      '<<<MCP:WAIT gate_id="opt_change_doc" action="WAIT_FOR_USER_APPROVAL">>>',
      "",
      '<<<MCP:GATE id="opt_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      t.stop_generating,
      `## 7. ${workflow.gates.find((g) => g.id === "opt_plan")?.title} **[${t.gate_need_approval}]**`,
      t.todo_list,
      t.verify_plan,
      '<<<MCP:WAIT gate_id="opt_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      "",
      `## 8. ${t.wait_gate_title}`,
      t.code_output,
      t.ts_check(language === "ts"),
      t.perf_compare,
    ].join("\n");
  }

  if (taskType === "refactor") {
    return [
      ...base,
      "",
      `## 5. ${workflow.steps.find((s) => s.id === "scope_understanding")?.title}`,
      t.refactor_scope_desc,
      "",
      '<<<MCP:GATE id="refactor_doc" action="WAIT_FOR_USER_APPROVAL">>>',
      `## 6. ${workflow.gates.find((g) => g.id === "refactor_doc")?.title} **[${t.gate_need_approval}]**`,
      ...t.refactor_doc_items,
      '<<<MCP:WAIT gate_id="refactor_doc" action="WAIT_FOR_USER_APPROVAL">>>',
      "",
      '<<<MCP:GATE id="refactor_migration" action="WAIT_FOR_USER_APPROVAL">>>',
      `## 7. ${workflow.gates.find((g) => g.id === "refactor_migration")?.title} **[${t.gate_need_approval}]**`,
      t.migration_plan_desc,
      '<<<MCP:WAIT gate_id="refactor_migration" action="WAIT_FOR_USER_APPROVAL">>>',
      "",
      `## 8. ${t.wait_gate_title}`,
      t.refactor_exec,
    ].join("\n");
  }

  if (taskType === "bugfix") {
    return [
      ...base,
      "",
      `## 5. ${workflow.steps.find((s) => s.id === "repro_rootcause")?.title}`,
      t.repro_desc,
      "",
      '<<<MCP:GATE id="bugfix_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      `## 6. ${workflow.gates.find((g) => g.id === "bugfix_plan")?.title} **[${t.gate_need_approval}]**`,
      t.fix_plan_desc,
      '<<<MCP:WAIT gate_id="bugfix_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      "",
      `## 7. ${t.wait_gate_title}`,
      t.verification_desc,
    ].join("\n");
  }

  if (taskType === "performance") {
    return [
      ...base,
      "",
      `## 5. ${workflow.steps.find((s) => s.id === "metrics")?.title}`,
      t.perf_metrics,
      "",
      '<<<MCP:GATE id="perf_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      `## 6. ${workflow.gates.find((g) => g.id === "perf_plan")?.title} **[${t.gate_need_approval}]**`,
      t.perf_opt,
      '<<<MCP:WAIT gate_id="perf_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      "",
      `## 7. ${t.wait_gate_title}`,
      t.perf_compare,
    ].join("\n");
  }

  if (taskType === "ui_polish") {
    return [
      ...base,
      "",
      `## 5. ${workflow.steps.find((s) => s.id === "issues")?.title}`,
      t.ux_issues,
      "",
      '<<<MCP:GATE id="ui_polish_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      `## 6. ${workflow.gates.find((g) => g.id === "ui_polish_plan")?.title} **[${t.gate_need_approval}]**`,
      t.ux_fix,
      '<<<MCP:WAIT gate_id="ui_polish_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      "",
      `## 7. ${t.wait_gate_title}`,
      t.acceptance_check,
    ].join("\n");
  }

  if (taskType === "dependency_upgrade") {
    return [
      ...base,
      "",
      `## 5. ${workflow.steps.find((s) => s.id === "risk")?.title}`,
      t.upgrade_risk,
      "",
      '<<<MCP:GATE id="dep_upgrade_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      `## 6. ${workflow.gates.find((g) => g.id === "dep_upgrade_plan")?.title} **[${t.gate_need_approval}]**`,
      t.upgrade_plan,
      '<<<MCP:WAIT gate_id="dep_upgrade_plan" action="WAIT_FOR_USER_APPROVAL">>>',
      "",
      `## 7. ${t.wait_gate_title}`,
      t.upgrade_exec,
    ].join("\n");
  }

  return [
    ...base,
    "",
    '<<<MCP:GATE id="test_plan" action="WAIT_FOR_USER_APPROVAL">>>',
    `## 5. ${workflow.gates.find((g) => g.id === "test_plan")?.title} **[${t.gate_need_approval}]**`,
    t.test_scope,
    '<<<MCP:WAIT gate_id="test_plan" action="WAIT_FOR_USER_APPROVAL">>>',
    "",
    `## 6. ${t.wait_gate_title}`,
    t.test_exec,
  ].join("\n");
}
