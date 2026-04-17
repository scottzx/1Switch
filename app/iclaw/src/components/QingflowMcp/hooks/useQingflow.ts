import { useCallback } from 'react';
import { execApi } from '../../../services/api';
import type {
  TaskBoxType,
  FlowStatusType,
} from '../types';

interface CommandCallbacks {
  onOutput?: (content: string) => void;
  onStatus?: (status: 'running' | 'done' | 'error') => void;
  onComplete?: (exitCode: number, output: string[]) => void;
}

interface CliResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  warnings?: string[];
}

/**
 * Hook for executing qingflow-cli commands
 */
function useQingflow() {
  const executeCommand = useCallback(
    async (args: string, callbacks?: CommandCallbacks): Promise<CliResult> => {
      const outputLines: string[] = [];

      return new Promise((resolve) => {
        const command = `qingflow ${args}`;

        const es = execApi.streamCommand(
          command,
          (data) => {
            outputLines.push(data.content);
            callbacks?.onOutput?.(data.content);
          },
          (data) => {
            if (data.status === 'running') {
              callbacks?.onStatus?.('running');
            }
          },
          (data) => {
            const exitCode = data.exitCode ?? 0;
            callbacks?.onStatus?.(exitCode === 0 ? 'done' : 'error');
            callbacks?.onComplete?.(exitCode, outputLines);

            if (exitCode === 0) {
              try {
                // Try to parse last line as JSON
                const lastLine = outputLines[outputLines.length - 1];
                const parsed = lastLine ? JSON.parse(lastLine) : { ok: true };
                resolve({ ok: true, data: parsed });
              } catch {
                resolve({ ok: true, data: outputLines });
              }
            } else {
              resolve({
                ok: false,
                error: outputLines.join('\n'),
              });
            }
          }
        );

        es.onerror = () => {
          callbacks?.onStatus?.('error');
          resolve({ ok: false, error: 'SSE connection failed' });
        };
      });
    },
    []
  );

  // Auth commands
  const authWhoami = useCallback(async () => {
    return executeCommand('auth whoami --json');
  }, [executeCommand]);

  const authLogin = useCallback(
    async (email: string, password: string) => {
      return executeCommand(`auth login --email ${email} --password ${password} --json`);
    },
    [executeCommand]
  );

  const authUseToken = useCallback(
    async (token: string, wsId?: string) => {
      const wsArg = wsId ? ` --ws-id ${wsId}` : '';
      return executeCommand(`auth use-token --token ${token}${wsArg} --json`);
    },
    [executeCommand]
  );

  // 从 mcporter.json 读取 x_qingflow_client_id 并使用 use-credential 认证
  const authUseCredential = useCallback(
    async (wsId?: string) => {
      const wsArg = wsId ? ` --ws-id ${wsId}` : '';
      return executeCommand(
        `cat ~/.openclaw/workspace/config/mcporter.json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('x_qingflow_client_id',''))" 2>/dev/null || echo ""`
      ).then(async (result) => {
        if (result.ok && result.data) {
          const clientId = Array.isArray(result.data) ? result.data.join('') : String(result.data);
          const trimmedId = clientId.trim();
          if (trimmedId) {
            return executeCommand(`auth use-credential --credential ${trimmedId}${wsArg} --json`);
          }
        }
        return { ok: false, error: 'Failed to read x_qingflow_client_id from mcporter.json' };
      });
    },
    [executeCommand]
  );

  const authLogout = useCallback(async () => {
    return executeCommand('auth logout --json');
  }, [executeCommand]);

  // Workspace commands
  const listWorkspaces = useCallback(async () => {
    return executeCommand('workspace list --json');
  }, [executeCommand]);

  const selectWorkspace = useCallback(
    async (wsId: string) => {
      return executeCommand(`workspace select --ws-id ${wsId} --json`);
    },
    [executeCommand]
  );

  // App commands
  const listApps = useCallback(async () => {
    return executeCommand('app list --json');
  }, [executeCommand]);

  const searchApps = useCallback(
    async (keyword: string) => {
      return executeCommand(`app search --keyword "${keyword}" --json`);
    },
    [executeCommand]
  );

  const getApp = useCallback(
    async (appKey: string) => {
      return executeCommand(`app get --app-key ${appKey} --json`);
    },
    [executeCommand]
  );

  // Record commands
  const getRecordSchema = useCallback(
    async (appKey: string, schemaMode: 'applicant' | 'browse' = 'browse', viewId?: string) => {
      let cmd = `record schema --app-key ${appKey} --mode ${schemaMode}`;
      if (viewId) {
        cmd += ` --view-id ${viewId}`;
      }
      return executeCommand(`${cmd} --json`);
    },
    [executeCommand]
  );

  const listRecords = useCallback(
    async (appKey: string, viewId?: string, limit = 20) => {
      let cmd = `record list --app-key ${appKey} --limit ${limit}`;
      if (viewId) {
        cmd += ` --view-id ${viewId}`;
      }
      return executeCommand(`${cmd} --json`);
    },
    [executeCommand]
  );

  const getRecord = useCallback(
    async (appKey: string, recordId: string) => {
      return executeCommand(`record get --app-key ${appKey} --record-id ${recordId} --json`);
    },
    [executeCommand]
  );

  const insertRecord = useCallback(
    async (appKey: string, fieldsFile: string) => {
      return executeCommand(`record insert --app-key ${appKey} --fields-file ${fieldsFile} --json`);
    },
    [executeCommand]
  );

  const updateRecord = useCallback(
    async (appKey: string, recordId: string, fieldsFile: string) => {
      return executeCommand(
        `record update --app-key ${appKey} --record-id ${recordId} --fields-file ${fieldsFile} --json`
      );
    },
    [executeCommand]
  );

  const deleteRecord = useCallback(
    async (appKey: string, recordId: string) => {
      return executeCommand(`record delete --app-key ${appKey} --record-id ${recordId} --json`);
    },
    [executeCommand]
  );

  const analyzeRecords = useCallback(
    async (appKey: string, viewId: string, dimensionsFile: string) => {
      return executeCommand(
        `record analyze --app-key ${appKey} --view-id ${viewId} --dimensions-file ${dimensionsFile} --json`
      );
    },
    [executeCommand]
  );

  // Task commands
  const listTasks = useCallback(
    async (taskBox: TaskBoxType = 'todo', flowStatus: FlowStatusType = 'all', limit = 20) => {
      return executeCommand(`task list --task-box ${taskBox} --flow-status ${flowStatus} --limit ${limit} --json`);
    },
    [executeCommand]
  );

  const getTask = useCallback(
    async (appKey: string, recordId: string, workflowNodeId: string) => {
      return executeCommand(
        `task get --app-key ${appKey} --record-id ${recordId} --workflow-node-id ${workflowNodeId} --json`
      );
    },
    [executeCommand]
  );

  const executeTaskAction = useCallback(
    async (
      appKey: string,
      recordId: string,
      workflowNodeId: string,
      action: 'approve' | 'reject' | 'revert' | 'transfer'
    ) => {
      return executeCommand(
        `task action --app-key ${appKey} --record-id ${recordId} --workflow-node-id ${workflowNodeId} --action ${action} --json`
      );
    },
    [executeCommand]
  );

  const getTaskWorkflowLog = useCallback(
    async (appKey: string, recordId: string, workflowNodeId: string) => {
      return executeCommand(
        `task log --app-key ${appKey} --record-id ${recordId} --workflow-node-id ${workflowNodeId} --json`
      );
    },
    [executeCommand]
  );

  return {
    executeCommand,
    // Auth
    authWhoami,
    authLogin,
    authUseToken,
    authUseCredential,
    authLogout,
    // Workspace
    listWorkspaces,
    selectWorkspace,
    // App
    listApps,
    searchApps,
    getApp,
    // Record
    getRecordSchema,
    listRecords,
    getRecord,
    insertRecord,
    updateRecord,
    deleteRecord,
    analyzeRecords,
    // Task
    listTasks,
    getTask,
    executeTaskAction,
    getTaskWorkflowLog,
  };
}

export default useQingflow;
