import { OptimizeArgs, WorkflowGate, WorkflowStep } from "../../types.js";
import { getLocale } from "../../i18n.js";

/**
 * 构建工作流定义，包含审批关口（Gates）和步骤（Steps）
 */
export function buildWorkflowDefinition(args: OptimizeArgs): {
  taskType: NonNullable<OptimizeArgs["taskType"]>;
  requireApprovalGates: boolean;
  gateMarker: string;
  gates: WorkflowGate[];
  steps: WorkflowStep[];
} {
  const t = getLocale(args.outputLanguage).workflow;
  const taskType = args.taskType ?? "new_feature";
  const requireApprovalGates = args.requireApprovalGates ?? true;
  const gateMarker = "<<<MCP:GATE";

  const gatesByType: Record<string, WorkflowGate[]> = {
    new_feature: [
      {
        id: "new_feature_design",
        title: t.gates.new_feature_design.title,
        when: t.gates.new_feature_design.when,
      },
      {
        id: "new_feature_plan",
        title: t.gates.new_feature_plan.title,
        when: t.gates.new_feature_plan.when,
      },
      {
        id: "new_feature_accept",
        title: t.gates.new_feature_accept.title,
        when: t.gates.new_feature_accept.when,
      },
    ],
    optimize_existing: [
      {
        id: "opt_change_doc",
        title: t.gates.opt_change_doc.title,
        when: t.gates.opt_change_doc.when,
      },
      {
        id: "opt_plan",
        title: t.gates.opt_plan.title,
        when: t.gates.opt_plan.when,
      },
    ],
    refactor: [
      {
        id: "refactor_doc",
        title: t.gates.refactor_doc.title,
        when: t.gates.refactor_doc.when,
      },
      {
        id: "refactor_migration",
        title: t.gates.refactor_migration.title,
        when: t.gates.refactor_migration.when,
      },
    ],
    bugfix: [
      {
        id: "bugfix_plan",
        title: t.gates.bugfix_plan.title,
        when: t.gates.bugfix_plan.when,
      },
    ],
    performance: [
      {
        id: "perf_plan",
        title: t.gates.perf_plan.title,
        when: t.gates.perf_plan.when,
      },
    ],
    ui_polish: [
      {
        id: "ui_polish_plan",
        title: t.gates.ui_polish_plan.title,
        when: t.gates.ui_polish_plan.when,
      },
    ],
    dependency_upgrade: [
      {
        id: "dep_upgrade_plan",
        title: t.gates.dep_upgrade_plan.title,
        when: t.gates.dep_upgrade_plan.when,
      },
    ],
    test_addition: [
      {
        id: "test_plan",
        title: t.gates.test_plan.title,
        when: t.gates.test_plan.when,
      },
    ],
  };

  const gates = gatesByType[taskType] ?? gatesByType.new_feature;

  const steps: WorkflowStep[] = [
    { id: "task_classification", title: t.steps.task_classification },
    { id: "project_understanding", title: t.steps.project_understanding },
    { id: "risk_constraints", title: t.steps.risk_constraints },
  ];

  if (taskType === "new_feature") {
    steps.push(
      { id: "design", title: t.steps.design, gateId: "new_feature_design" },
      { id: "plan", title: t.steps.plan, gateId: "new_feature_plan" },
      { id: "implementation", title: t.steps.implementation },
      { id: "typecheck", title: t.steps.typecheck },
      {
        id: "acceptance",
        title: t.steps.acceptance,
        gateId: "new_feature_accept",
      },
      { id: "docs", title: t.steps.docs },
    );
  } else if (taskType === "optimize_existing") {
    steps.push(
      { id: "current_understanding", title: t.steps.current_understanding },
      {
        id: "change_doc",
        title: t.steps.change_doc,
        gateId: "opt_change_doc",
      },
      { id: "plan", title: t.steps.plan, gateId: "opt_plan" },
      { id: "implementation", title: t.steps.implementation_verification },
    );
  } else if (taskType === "refactor") {
    steps.push(
      { id: "scope_understanding", title: t.steps.scope_understanding },
      {
        id: "refactor_doc",
        title: t.steps.refactor_doc,
        gateId: "refactor_doc",
      },
      {
        id: "migration",
        title: t.steps.migration,
        gateId: "refactor_migration",
      },
      { id: "execution", title: t.steps.execution },
    );
  } else if (taskType === "bugfix") {
    steps.push(
      { id: "repro_rootcause", title: t.steps.repro_rootcause },
      { id: "plan", title: t.steps.plan, gateId: "bugfix_plan" },
      { id: "implementation", title: t.steps.implementation_verification },
    );
  } else if (taskType === "performance") {
    steps.push(
      { id: "metrics", title: t.steps.metrics },
      { id: "plan", title: t.steps.plan, gateId: "perf_plan" },
      { id: "implementation", title: t.steps.implementation_comparison },
    );
  } else if (taskType === "ui_polish") {
    steps.push(
      { id: "issues", title: t.steps.issues },
      { id: "plan", title: t.steps.plan, gateId: "ui_polish_plan" },
      { id: "implementation", title: t.steps.implementation },
    );
  } else if (taskType === "dependency_upgrade") {
    steps.push(
      { id: "risk", title: t.steps.risk },
      { id: "plan", title: t.steps.plan, gateId: "dep_upgrade_plan" },
      { id: "implementation", title: t.steps.implementation_verification },
    );
  } else {
    steps.push(
      { id: "plan", title: t.steps.plan, gateId: "test_plan" },
      { id: "implementation", title: t.steps.implementation_verification },
    );
  }

  return {
    taskType,
    requireApprovalGates,
    gateMarker,
    gates,
    steps,
  };
}
