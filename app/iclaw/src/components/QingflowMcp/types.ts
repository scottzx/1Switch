// Qingflow MCP Type Definitions

export interface QingflowUser {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

export interface QingflowWorkspace {
  id: number;
  name: string;
  qf_version: string;
  is_current?: boolean;
}

export interface QingflowApp {
  app_key: string;
  name: string;
  description?: string;
  icon?: string;
  accessible_views?: QingflowView[];
  create_time?: string;
  update_time?: string;
}

export interface QingflowView {
  view_id: string;
  name: string;
  type?: string;
}

export interface QingflowSchemaField {
  field_id: string;
  name: string;
  type: string;
  required?: boolean;
  options?: { label: string; value: string }[];
}

export interface QingflowSchema {
  fields: QingflowSchemaField[];
  layout?: unknown;
}

export interface QingflowRecord {
  id: string;
  fields: Record<string, unknown>;
  create_time?: string;
  update_time?: string;
}

export interface QingflowRecordList {
  records: QingflowRecord[];
  totalCount: number;
  pageSize?: number;
  pageToken?: string;
}

export interface QingflowTask {
  task_id: string;
  app_key: string;
  app_name?: string;
  record_id: string;
  workflow_node_id: string;
  node_name: string;
  title: string;
  task_box: 'todo' | 'initiated' | 'cc' | 'done';
  flow_status: string;
  create_time: string;
  update_time: string;
}

export interface QingflowAnalyzeResult {
  rows: Record<string, unknown>[];
  totals?: Record<string, unknown>;
  safe_for_final_conclusion: boolean;
  rows_truncated?: boolean;
}

// CLI Command Result
export interface CliCommandResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  warnings?: string[];
}

// Task box types
export type TaskBoxType = 'todo' | 'initiated' | 'cc' | 'done';

// Flow status types
export type FlowStatusType =
  | 'all'
  | 'in_progress'
  | 'approved'
  | 'rejected'
  | 'pending_fix'
  | 'urged'
  | 'overdue'
  | 'due_soon'
  | 'unread'
  | 'ended';

// Analysis DSL types
export interface AnalysisDimension {
  field_id: string;
  alias?: string;
  bucket?: unknown;
}

export interface AnalysisMetric {
  op: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct_count';
  field_id?: string;
  alias?: string;
}

export interface AnalysisFilter {
  field_id: string;
  op: 'eq' | 'neq' | 'in' | 'not_in' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'contains' | 'is_null' | 'not_null';
  value: unknown;
}

export interface AnalysisSort {
  by: string;
  order: 'asc' | 'desc';
}

export interface AnalysisDSL {
  dimensions: AnalysisDimension[];
  metrics: AnalysisMetric[];
  filters?: AnalysisFilter[];
  sort?: AnalysisSort[];
}
