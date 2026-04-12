export interface TerminalOutput {
  type: 'stdout' | 'stderr';
  content: string;
}

export interface SSEEvent {
  status?: 'running' | 'done';
  exitCode?: number;
  line?: string;
  type?: 'stdout' | 'stderr';
  content?: string;
}
