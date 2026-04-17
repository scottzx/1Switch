import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { execApi } from '../../services/api';

interface Workspace {
  id: number;
  name: string;
  is_current?: boolean;
}

interface WorkspaceSelectorProps {
  onComplete: () => void;
}

export function WorkspaceSelector({ onComplete }: WorkspaceSelectorProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = () => {
    setLoading(true);
    execApi.streamCommand(
      'qingflow workspace list --json 2>&1 || echo "{}"',
      (data) => {
        try {
          const result = JSON.parse(data.content);
          const list = (result.workspaces || []) as Workspace[];
          setWorkspaces(list);
          const current = list.find((ws) => ws.is_current) || list[0];
          if (current) {
            setSelectedId(current.id);
          }
        } catch {
          setWorkspaces([]);
        }
        setLoading(false);
      },
      () => {},
      () => {
        setLoading(false);
      }
    );
  };

  const handleSelect = () => {
    if (!selectedId) return;
    const ws = workspaces.find((w) => w.id === selectedId);
    if (!ws) return;

    setAuthenticating(true);

    // 保存工作区 ID
    execApi.streamCommand(
      `mkdir -p ~/.qingflow-mcp && echo "${selectedId}" > ~/.qingflow-mcp/workspace-id`,
      () => {},
      () => {},
      () => {}
    );

    // 读取 token 并认证
    execApi.streamCommand(
      'cat ~/.qingflow-mcp/qingflow-token 2>/dev/null || echo ""',
      (data) => {
        const token = data.content.trim();
        if (token) {
          execApi.streamCommand(
            `qingflow auth use-token --token "${token}" --ws-id ${selectedId} --json 2>&1 || echo "{}"`,
            (authData) => {
              try {
                JSON.parse(authData.content);
                onComplete();
              } catch {
                setAuthenticating(false);
              }
            },
            () => {},
            () => {
              setAuthenticating(false);
            }
          );
        } else {
          setAuthenticating(false);
        }
      },
      () => {},
      () => {
        setAuthenticating(false);
      }
    );
  };

  return (
    <div
      className="h-full flex flex-col rounded-xl overflow-hidden"
      style={{ backgroundColor: 'var(--bg-card)' }}
    >
      {/* Header */}
      <div className="p-6" style={{ borderBottom: '1px solid var(--border-primary)' }}>
        <h2 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
          选择工作区
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
          请选择要连接的工作区
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        ) : (
          <div className="space-y-2">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => setSelectedId(ws.id)}
                disabled={authenticating}
                className="w-full p-4 text-left rounded-lg transition-colors flex items-center justify-between"
                style={{
                  backgroundColor: selectedId === ws.id ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                  color: selectedId === ws.id ? 'white' : 'var(--text-primary)',
                  opacity: authenticating ? 0.5 : 1,
                }}
              >
                <div>
                  <p className="text-sm font-medium">{ws.name}</p>
                  {ws.is_current && (
                    <p className="text-xs opacity-70">当前工作区</p>
                  )}
                </div>
                {selectedId === ws.id && (
                  <CheckCircle size={18} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6" style={{ borderTop: '1px solid var(--border-primary)' }}>
        <button
          onClick={handleSelect}
          disabled={!selectedId || authenticating}
          className="w-full py-3 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          style={{
            backgroundColor: selectedId ? 'var(--accent-primary)' : 'var(--bg-elevated)',
            color: selectedId ? 'white' : 'var(--text-tertiary)',
          }}
        >
          {authenticating ? (
            <span className="flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin" />
              认证中...
            </span>
          ) : (
            '确认并继续'
          )}
        </button>
      </div>
    </div>
  );
}

export default WorkspaceSelector;
