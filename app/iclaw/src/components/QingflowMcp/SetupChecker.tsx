import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, ExternalLink, Download } from 'lucide-react';
import { execApi } from '../../services/api';
import { useTerminalStore } from '../../stores/terminalStore';

// OAuth 配置
const QINGFLOW_LOGIN_URL = 'https://openclaw-login.qingflow.com';
const CALLBACK_URL = `${window.location.origin}/app/iclaw/qingflow-callback`;

interface Workspace {
  id: number;
  name: string;
  is_current?: boolean;
}

interface SetupStatus {
  pythonVenvInstalled: boolean | null;
  mcpInstalled: boolean | null;
  mcpVersion: string | null;
  tokenInjected: boolean | null;
  userEmail: string | null;
  cliAuthenticated: boolean | null;
  currentWorkspace: string | null;
  loading: boolean;
  installingPython: boolean;
  installingMcp: boolean;
  authenticatingCli: boolean;
  showWorkspaceSelector: boolean;
  workspaces: Workspace[];
  selectedWorkspaceId: number | null;
}

interface SetupCheckerProps {
  onComplete: () => void;
}

export function SetupChecker({ onComplete }: SetupCheckerProps) {
  const [status, setStatus] = useState<SetupStatus>({
    pythonVenvInstalled: null,
    mcpInstalled: null,
    mcpVersion: null,
    tokenInjected: null,
    userEmail: null,
    cliAuthenticated: null,
    currentWorkspace: null,
    loading: false,
    installingPython: false,
    installingMcp: false,
    authenticatingCli: false,
    showWorkspaceSelector: false,
    workspaces: [],
    selectedWorkspaceId: null,
  });

  const { addTab, appendOutput, setStatus: setTabStatus } = useTerminalStore();

  // 检测 Python venv 状态（检查 python3.12-venv 包是否安装）
  const checkPythonVenv = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      let output = '';
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(output.includes('ii'));
        }
      }, 5000);
      execApi.streamCommand(
        'dpkg -l python3.12-venv 2>/dev/null | grep "^ii" || echo "NOT_INSTALLED"',
        (data) => { output += data.content; },
        () => {},
        () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(output.includes('ii'));
          }
        }
      );
    });
  };

  // 检测 MCP 安装状态
  const checkMcpInstalled = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      }, 5000);
      execApi.streamCommand(
        'which qingflow',
        () => {},
        () => {},
        (data) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(data.exitCode === 0);
          }
        }
      );
    });
  };

  // 获取 MCP 版本
  const getMcpVersion = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      execApi.streamCommand(
        'qingflow --version 2>&1 || echo "not found"',
        (output) => {
          const match = output.content.match(/(\d+\.\d+\.\d+)/);
          if (match) {
            resolve(match[1]);
          }
        },
        () => {},
        () => {
          resolve(null);
        }
      );
    });
  };

  // 检测 Token 状态
  const checkTokenInjected = async (): Promise<{ injected: boolean; email: string | null }> => {
    return new Promise((resolve) => {
      let outputContent = '';
      execApi.streamCommand(
        'cat ~/.openclaw/qingflow-token 2>/dev/null || echo ""',
        (data) => {
          outputContent += data.content;
        },
        () => {},
        () => {
          const token = outputContent.trim();
          if (token) {
            execApi.streamCommand(
              'qingflow auth whoami --json 2>&1 || echo "{}"',
              (userData) => {
                try {
                  const user = JSON.parse(userData.content);
                  resolve({ injected: true, email: user.email || user.name || '已登录' });
                } catch {
                  resolve({ injected: true, email: '已登录' });
                }
              },
              () => {},
              () => {
                resolve({ injected: true, email: 'Token 已配置' });
              }
            );
          } else {
            resolve({ injected: false, email: null });
          }
        }
      );
    });
  };

  // 初始化检测 - 各自独立更新状态
  useEffect(() => {
    // 检测 Python venv
    checkPythonVenv().then((installed) => {
      setStatus((prev) => ({ ...prev, pythonVenvInstalled: installed }));
    });

    // 检测 MCP
    checkMcpInstalled().then((installed) => {
      setStatus((prev) => ({ ...prev, mcpInstalled: installed }));
      if (installed) {
        getMcpVersion().then((version) => {
          setStatus((prev) => ({ ...prev, mcpVersion: version }));
        });
      }
    });

    // 检测 Token
    checkTokenInjected().then((tokenStatus) => {
      setStatus((prev) => ({
        ...prev,
        tokenInjected: tokenStatus.injected,
        userEmail: tokenStatus.email,
      }));
    });
  }, []);

  // 安装 Python venv
  const handleInstallPythonVenv = async () => {
    const tabId = addTab('install python3-venv', '安装 Python 依赖');
    setStatus((prev) => ({ ...prev, installingPython: true }));

    execApi.streamCommand(
      'sudo apt install -y python3.12-venv',
      (data) => appendOutput(tabId, data.content),
      (data) => {
        if (data.status === 'running') setTabStatus(tabId, 'running');
      },
      async (data) => {
        setTabStatus(tabId, data.exitCode === 0 ? 'done' : 'error', data.exitCode);

        if (data.exitCode === 0) {
          setStatus((prev) => ({
            ...prev,
            pythonVenvInstalled: true,
            installingPython: false,
          }));
        } else {
          setStatus((prev) => ({ ...prev, installingPython: false }));
        }
      }
    );
  };

  // 安装 MCP
  const handleInstallMcp = async () => {
    const tabId = addTab('install qingflow-cli', '安装 qingflow-cli');
    setStatus((prev) => ({ ...prev, installingMcp: true }));

    execApi.streamCommand(
      'npm install -g @josephyan/qingflow-cli',
      (data) => appendOutput(tabId, data.content),
      (data) => {
        if (data.status === 'running') setTabStatus(tabId, 'running');
      },
      async (data) => {
        setTabStatus(tabId, data.exitCode === 0 ? 'done' : 'error', data.exitCode);

        if (data.exitCode === 0) {
          const version = await getMcpVersion();
          setStatus((prev) => ({
            ...prev,
            mcpInstalled: true,
            mcpVersion: version,
            installingMcp: false,
          }));
        } else {
          setStatus((prev) => ({ ...prev, installingMcp: false }));
        }
      }
    );
  };

  // 打开浏览器登录
  const handleBrowserLogin = () => {
    const oauthUrl = `${QINGFLOW_LOGIN_URL}/?redirect_uri=${encodeURIComponent(CALLBACK_URL)}`;
    window.open(oauthUrl, 'qingflow_oauth', 'width=600,height=700');
  };

  // 处理 OAuth token
  const handleOAuthToken = async (token: string) => {
    await new Promise<void>((resolve) => {
      execApi.streamCommand(
        `mkdir -p ~/.openclaw && echo "${token}" > ~/.openclaw/qingflow-token`,
        () => {},
        () => {},
        () => {
          resolve();
        }
      );
    });

    // 清除 sessionStorage
    sessionStorage.removeItem('qingflow_oauth_token');

    setStatus((prev) => ({
      ...prev,
      tokenInjected: true,
      userEmail: '登录中...',
    }));

    // 获取用户信息
    execApi.streamCommand(
      'qingflow auth whoami --json 2>&1 || echo "{}"',
      (data) => {
        try {
          const user = JSON.parse(data.content);
          setStatus((prev) => ({
            ...prev,
            userEmail: user.email || user.name || '已登录',
          }));
        } catch {
          setStatus((prev) => ({ ...prev, userEmail: '已登录' }));
        }
      },
      () => {},
      () => {}
    );

    // 显示工作区选择器
    execApi.streamCommand(
      'qingflow workspace list --json 2>&1 || echo "{}"',
      (data) => {
        try {
          const result = JSON.parse(data.content);
          const workspaces = (result.workspaces || []) as Workspace[];
          if (workspaces.length > 0) {
            setStatus((prev) => ({
              ...prev,
              showWorkspaceSelector: true,
              workspaces: workspaces,
              selectedWorkspaceId: workspaces.find((ws) => ws.is_current)?.id || workspaces[0].id,
            }));
          } else {
            setStatus((prev) => ({ ...prev, cliAuthenticated: false }));
          }
        } catch {
          setStatus((prev) => ({ ...prev, cliAuthenticated: false }));
        }
      },
      () => {},
      () => {
        setStatus((prev) => ({ ...prev, cliAuthenticated: false }));
      }
    );
  };

  // 选择工作区并认证
  const handleWorkspaceSelect = (wsId: number) => {
    const ws = status.workspaces.find((w) => w.id === wsId);
    if (!ws) return;

    setStatus((prev) => ({ ...prev, selectedWorkspaceId: wsId, authenticatingCli: true }));

    // 保存工作区 ID 到文件缓存
    execApi.streamCommand(
      `mkdir -p ~/.openclaw && echo "${wsId}" > ~/.openclaw/workspace-id`,
      () => {},
      () => {},
      () => {}
    );

    // 读取 token 文件
    execApi.streamCommand(
      'cat ~/.openclaw/qingflow-token 2>/dev/null || echo ""',
      (data) => {
        const token = data.content.trim();
        if (token) {
          execApi.streamCommand(
            `qingflow auth use-token --token "${token}" --ws-id ${wsId} --json 2>&1 || echo "{}"`,
            (authData) => {
              try {
                JSON.parse(authData.content);
                setStatus((prev) => ({
                  ...prev,
                  cliAuthenticated: true,
                  currentWorkspace: ws.name,
                  showWorkspaceSelector: false,
                  authenticatingCli: false,
                }));
              } catch {
                setStatus((prev) => ({ ...prev, cliAuthenticated: false, authenticatingCli: false }));
              }
            },
            () => {},
            () => {
              setStatus((prev) => ({ ...prev, cliAuthenticated: false, authenticatingCli: false }));
            }
          );
        } else {
          setStatus((prev) => ({ ...prev, cliAuthenticated: false, authenticatingCli: false }));
        }
      },
      () => {},
      () => {}
    );
  };

  // 监听 OAuth token（来自 postMessage 或 sessionStorage）
  useEffect(() => {
    // 1. 检查是否已有 token
    const savedToken = sessionStorage.getItem('qingflow_oauth_token');
    if (savedToken) {
      handleOAuthToken(savedToken);
    }

    // 2. 监听 postMessage（弹窗回调）
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'QINGFLOW_TOKEN') {
        handleOAuthToken(event.data.token);
      }
    };
    window.addEventListener('message', handleMessage);

    // 3. 监听 sessionStorage 变化（同窗口内）
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'qingflow_oauth_token' && e.newValue) {
        handleOAuthToken(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const { pythonVenvInstalled, mcpInstalled, mcpVersion, tokenInjected, userEmail, cliAuthenticated, currentWorkspace, installingPython, installingMcp } = status;
  const canProceed = mcpInstalled && cliAuthenticated;

  return (
    <div
      className="h-full flex flex-col rounded-xl overflow-hidden"
      style={{ backgroundColor: 'var(--bg-card)' }}
    >
      {/* Header */}
      <div className="p-6" style={{ borderBottom: '1px solid var(--border-primary)' }}>
        <h2 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
          🔧 轻流MCP 初始化
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
          完成以下设置后即可使用轻流MCP
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-4 overflow-auto">
        {/* Step 1: Python 依赖 */}
        <div
          className="p-4 rounded-lg flex items-center justify-between"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <div className="flex items-center gap-3">
            {pythonVenvInstalled === null ? (
              <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
            ) : pythonVenvInstalled ? (
              <CheckCircle size={18} style={{ color: 'var(--text-success)' }} />
            ) : (
              <XCircle size={18} style={{ color: 'var(--text-error)' }} />
            )}
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                步骤 1：安装 Python 依赖
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {pythonVenvInstalled === null ? '检测中...' : pythonVenvInstalled ? 'python3.12-venv 已安装' : '需要 python3.12-venv'}
              </p>
            </div>
          </div>

          {!pythonVenvInstalled && (
            <button
              onClick={handleInstallPythonVenv}
              disabled={installingPython}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#22c55e', color: 'white' }}
            >
              {installingPython ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  安装中...
                </>
              ) : (
                <>
                  <Download size={14} />
                  安装
                </>
              )}
            </button>
          )}
        </div>

        {/* Step 2: MCP */}
        <div
          className="p-4 rounded-lg flex items-center justify-between"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <div className="flex items-center gap-3">
            {mcpInstalled === null ? (
              <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
            ) : mcpInstalled ? (
              <CheckCircle size={18} style={{ color: 'var(--text-success)' }} />
            ) : (
              <XCircle size={18} style={{ color: 'var(--text-tertiary)' }} />
            )}
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                步骤 2：安装 qingflow-cli
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {mcpInstalled === null ? '检测中...' : mcpInstalled ? (mcpVersion ? `qingflow-cli v${mcpVersion}` : '已安装') : '命令行工具'}
              </p>
            </div>
          </div>

          {!mcpInstalled && (
            <button
              onClick={handleInstallMcp}
              disabled={!pythonVenvInstalled || installingMcp}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              style={{
                backgroundColor: pythonVenvInstalled ? '#22c55e' : 'var(--bg-elevated)',
                color: pythonVenvInstalled ? 'white' : 'var(--text-tertiary)',
                cursor: pythonVenvInstalled ? 'pointer' : 'not-allowed',
              }}
              title={!pythonVenvInstalled ? '请先完成步骤 1' : ''}
            >
              {installingMcp ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  安装中...
                </>
              ) : (
                <>
                  <Download size={14} />
                  安装
                </>
              )}
            </button>
          )}
        </div>

        {/* Step 3: Token 配置 */}
        <div
          className="p-4 rounded-lg flex items-center justify-between"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <div className="flex items-center gap-3">
            {tokenInjected === null ? (
              <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
            ) : tokenInjected ? (
              <CheckCircle size={18} style={{ color: 'var(--text-success)' }} />
            ) : (
              <XCircle size={18} style={{ color: 'var(--text-error)' }} />
            )}
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                步骤 3：登录轻流账号
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {tokenInjected === null ? '检测中...' : tokenInjected ? (userEmail || '已配置') : '配置 Token'}
              </p>
            </div>
          </div>

          {!tokenInjected && (
            <button
              onClick={handleBrowserLogin}
              disabled={!mcpInstalled}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              style={{
                backgroundColor: mcpInstalled ? '#22c55e' : 'var(--bg-elevated)',
                color: mcpInstalled ? 'white' : 'var(--text-tertiary)',
                cursor: mcpInstalled ? 'pointer' : 'not-allowed',
              }}
              title={!mcpInstalled ? '请先完成步骤 2' : ''}
            >
              <ExternalLink size={14} />
              登录
            </button>
          )}
        </div>

        {/* 工作区选择器 */}
        {tokenInjected && status.showWorkspaceSelector && (
          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  选择工作区
                </p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  请选择要连接的工作区
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {status.workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => handleWorkspaceSelect(ws.id)}
                  disabled={status.authenticatingCli}
                  className="w-full p-3 text-left text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center justify-between"
                  style={{
                    backgroundColor: status.selectedWorkspaceId === ws.id ? 'var(--accent-primary)' : 'var(--bg-card)',
                    color: status.selectedWorkspaceId === ws.id ? 'white' : 'var(--text-primary)',
                  }}
                >
                  <span>{ws.name}</span>
                  {ws.is_current && <span className="text-xs opacity-70">当前</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: CLI 认证 */}
        {!status.showWorkspaceSelector && (
          <div
            className="p-4 rounded-lg flex items-center justify-between"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            <div className="flex items-center gap-3">
              {cliAuthenticated === null ? (
                tokenInjected ? (
                  <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
                ) : (
                  <XCircle size={18} style={{ color: 'var(--text-tertiary)' }} />
                )
              ) : cliAuthenticated ? (
                <CheckCircle size={18} style={{ color: 'var(--text-success)' }} />
              ) : (
                <XCircle size={18} style={{ color: 'var(--text-tertiary)' }} />
              )}
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  步骤 4：CLI 认证
                </p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {cliAuthenticated === null
                    ? tokenInjected
                      ? '认证中...'
                      : '等待登录'
                    : cliAuthenticated
                      ? currentWorkspace
                        ? `已认证：${currentWorkspace}`
                        : '已认证'
                      : '认证失败'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 提示信息 */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            💡 提示：请按顺序完成以上步骤。
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6" style={{ borderTop: '1px solid var(--border-primary)' }}>
        <button
          onClick={onComplete}
          disabled={!canProceed}
          className="w-full py-3 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: canProceed ? 'var(--accent-primary)' : 'var(--bg-elevated)',
            color: canProceed ? 'white' : 'var(--text-tertiary)',
          }}
        >
          {canProceed ? '开始使用 →' : '请先完成以上设置'}
        </button>
      </div>
    </div>
  );
}

export default SetupChecker;
