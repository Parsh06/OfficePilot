export type AIMode = 'ASK' | 'ANALYZE' | 'PLAN';

export type RiskLevel = 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK';

export type AutonomySetting = 'SUGGEST_ONLY' | 'BALANCED' | 'MORE_AUTONOMOUS';

export type ChangeSetStatus =
  | 'draft'
  | 'awaiting_confirmation'
  | 'approved'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'reversed';

export interface ProposedChangeItem {
  id: string;
  entityType: 'SCHEDULE' | 'EXCEPTION' | 'TRIP' | 'EXPENSE' | 'TRAVEL_PROFILE' | 'ACCOMMODATION' | 'TEMPLATE' | 'MEMORY';
  targetDate?: string;
  targetId?: string;
  description: string;
  beforeState: any;
  afterState: any;
}

export interface EstimatedImpact {
  costDelta: number; // negative = savings, positive = increase
  savings: number;
  wfoDiff: number;
  wfhDiff: number;
  travelLegsDiff: number;
  nightsDiff: number;
  convenienceScoreDiff?: number;
  affectedDatesCount: number;
  affectedDates: string[];
}

export interface ChangeSet {
  actionId: string;
  userId: string;
  conversationId?: string;
  title: string;
  description: string;
  riskLevel: RiskLevel;
  requiresConfirmation: boolean;
  affectedRecords: string[];
  proposedChanges: ProposedChangeItem[];
  beforeState: Record<string, any>;
  afterState?: Record<string, any>;
  estimatedImpact: EstimatedImpact;
  status: ChangeSetStatus;
  executionError?: string;
  createdAt: string;
  updatedAt: string;
  executedAt?: string;
}

export interface AIActionRecord {
  actionId: string;
  userId: string;
  conversationId?: string;
  tool: string;
  arguments: Record<string, any>;
  beforeState: any;
  afterState: any;
  approvalStatus: 'AUTO_APPROVED' | 'USER_CONFIRMED' | 'REJECTED';
  riskLevel: RiskLevel;
  executionStatus: 'SUCCESS' | 'FAILED' | 'REVERSED';
  reversible: boolean;
  affectedRecordIds: string[];
  timestamp: string;
  error?: string;
}

export interface AuditLogRecord {
  id: string;
  actionId: string;
  userId: string;
  eventType: 'ACTION_PROPOSED' | 'ACTION_CONFIRMED' | 'ACTION_EXECUTED' | 'ACTION_REVERSED' | 'ACTION_FAILED';
  toolName: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  timestamp: string;
  mode?: AIMode;
  modelUsed?: string;
  toolCallsExecuted?: Array<{
    tool: string;
    args: Record<string, any>;
    resultSummary?: string;
  }>;
  changeSet?: ChangeSet;
  recommendations?: Array<{
    title: string;
    description: string;
    impactAmount?: number;
    actionLink?: string;
    actionLabel?: string;
  }>;
  metrics?: Array<{
    label: string;
    value: string;
    trend?: string;
  }>;
}

export interface AIMemoryItem {
  id: string;
  userId: string;
  category: 'TRAVEL_PREFERENCE' | 'ACCOMMODATION_PREFERENCE' | 'OPTIMIZATION_GOAL' | 'SPENDING_RULE' | 'USER_INSTRUCTION';
  key: string;
  value: string;
  confidence: number;
  source: 'EXPLICIT_USER' | 'VERIFIED_PATTERN';
  createdAt: string;
  updatedAt: string;
}

export interface AIToolParameter {
  type: string;
  description: string;
  enum?: string[];
  required?: boolean;
}

export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, AIToolParameter>;
    required?: string[];
  };
}

export interface AIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface AIToolResult {
  toolCallId: string;
  toolName: string;
  output: any;
  error?: string;
}

export interface AIChatRequest {
  message: string;
  mode?: AIMode;
  autonomySetting?: AutonomySetting;
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  confirmedActionId?: string; // If user clicked "Apply changes"
}

export interface AIChatResponse {
  message: string;
  mode: AIMode;
  modelUsed: string;
  changeSet?: ChangeSet;
  toolCalls?: Array<{
    tool: string;
    args: Record<string, any>;
    resultSummary?: string;
  }>;
  recommendations?: Array<{
    title: string;
    description: string;
    impactAmount?: number;
    actionLink?: string;
    actionLabel?: string;
  }>;
  metrics?: Array<{
    label: string;
    value: string;
    trend?: string;
  }>;
  memoryUpdates?: AIMemoryItem[];
}

export interface AIProvider {
  name: string;
  chat(params: {
    messages: Array<{
      role: 'system' | 'user' | 'assistant' | 'tool';
      content: string;
      name?: string;
      tool_call_id?: string;
      tool_calls?: AIToolCall[];
    }>;
    tools?: AIToolDefinition[];
    modelType: 'FAST' | 'REASONING';
    temperature?: number;
  }): Promise<{
    content: string | null;
    toolCalls?: AIToolCall[];
    modelUsed: string;
    finishReason?: string;
  }>;
}
