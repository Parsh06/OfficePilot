import type { AIToolDefinition } from '../types';
import { READ_TOOL_DEFINITIONS, executeReadTool } from './readTools';
import { CONTEXT_TOOL_DEFINITION, executeUserWorkContextTool } from './contextTool';
import { CALCULATION_TOOL_DEFINITIONS, executeCalculationTool } from './calculationTools';
import { WRITE_TOOL_DEFINITIONS, executeWriteTool } from './writeTools';

export {
  READ_TOOL_DEFINITIONS,
  executeReadTool,
  CONTEXT_TOOL_DEFINITION,
  executeUserWorkContextTool,
  CALCULATION_TOOL_DEFINITIONS,
  executeCalculationTool,
  WRITE_TOOL_DEFINITIONS,
  executeWriteTool,
};

export const ALL_AI_TOOLS: AIToolDefinition[] = [
  CONTEXT_TOOL_DEFINITION,
  ...CALCULATION_TOOL_DEFINITIONS,
  ...READ_TOOL_DEFINITIONS,
  ...WRITE_TOOL_DEFINITIONS,
];

export function getAllAIToolDefinitions(): AIToolDefinition[] {
  return ALL_AI_TOOLS;
}

export async function executeAITool(
  name: string,
  args: Record<string, any>,
  userId: string
): Promise<any> {
  if (name === 'getUserWorkContext') {
    return executeUserWorkContextTool(args, userId);
  }

  // Check if it's a write tool
  const isWrite = WRITE_TOOL_DEFINITIONS.some((t) => t.name === name);
  if (isWrite) {
    return executeWriteTool(name, args, userId);
  }

  // Check if it's a calculation tool
  const isCalc = CALCULATION_TOOL_DEFINITIONS.some((t) => t.name === name);
  if (isCalc) {
    return executeCalculationTool(name, args, userId);
  }

  // Default to read tool
  return executeReadTool(name, args, userId);
}
