import { OptimizeArgs, WorkflowGate, WorkflowStep } from "../../types.js";
import { DEFAULT_DATA } from "../default-data.js";
import * as fs from "fs";
import * as path from "path";

function loadLocalGates(): Record<string, any> | null {
  try {
    const filePath = path.join(
      process.cwd(),
      ".shared/frontend-prompt/data/gates.json",
    );
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

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
  const t = DEFAULT_DATA.workflow;
  const localGates = loadLocalGates();
  const gatesData = localGates || t.gates; // Use local or default

  const taskType = args.taskType ?? "new_feature";
  const requireApprovalGates = args.requireApprovalGates ?? true;
  const gateMarker = "<<<MCP:GATE";

  // Reconstruct gates lists based on the data source
  // The default data is flat map of ID -> Gate.
  // We need to map task types to lists of gates.
  // Hardcoding the relationship here as it correlates with steps logic which is code.
  // If user provides local gates, they can follow the same ID structure.

  // Helper to get gate by ID from the data source
  const getGate = (id: string): WorkflowGate => {
    const g = (gatesData as any)[id];
    return {
      id,
      title: g?.title || id,
      when: g?.when || "",
    };
  };

  const gatesByType: Record<string, WorkflowGate[]> = {
    new_feature: [
      getGate("new_feature_design"),
      getGate("new_feature_plan"),
      getGate("new_feature_accept"),
    ],
    optimize_existing: [getGate("opt_change_doc"), getGate("opt_plan")],
    refactor: [getGate("refactor_doc"), getGate("refactor_migration")],
    bugfix: [getGate("bugfix_plan")],
    performance: [getGate("perf_plan")],
    ui_polish: [getGate("ui_polish_plan")],
    dependency_upgrade: [getGate("dep_upgrade_plan")],
    test_addition: [getGate("test_plan")],
  };

  const gates = gatesByType[taskType] ?? gatesByType.new_feature;

  // Ideally steps should also be data-driven, but for now we keep them in code using default strings
  // to avoid over-complicating the verification.
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
