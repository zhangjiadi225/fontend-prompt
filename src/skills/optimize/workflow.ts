import { OptimizeArgs } from "../../types.js";
import { DEFAULT_DATA } from "../default-data.js";

interface WorkflowDefinition {
  taskType: string;
}

/**
 * 构建工作流定义 (Simplified: No Rigid Gates)
 */
export function buildWorkflowDefinition(args: OptimizeArgs): WorkflowDefinition {
  const taskType = args.taskType ?? "new_feature";
  return { taskType };
}
