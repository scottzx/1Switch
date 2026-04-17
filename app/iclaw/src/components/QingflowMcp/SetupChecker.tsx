import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, ExternalLink, Download } from 'lucide-react';
import { execApi } from '../../services/api';
import { useTerminalStore } from '../../stores/terminalStore';

// OAuth 配置
const QINGFLOW_LOGIN_URL = 'https://openclaw-login.qingflow.com';
const CALLBACK_URL = `${window.location.origin}/app/iclaw/qingflow-callback`;

interface SetupStatus {
  pythonVenvInstalled: boolean | null;
  mcpInstalled: boolean | null;
  tokenInjected: boolean | null;
  userEmail: string | null;
  cliAuthenticated: boolean | null;
  loading: boolean;
  installingPython: boolean;
  installingMcp: boolean;
  authenticating: boolean;
}

interface SetupCheckerProps {
  onComplete: () => void;
}

export function SetupChecker({ onComplete }: SetupCheckerProps) {
  const [status, setStatus] = useState<SetupStatus>({
    pythonVenvInstalled: null,
    mcpInstalled: null,
    tokenInjected: null,
    userEmail: null,
    cliAuthenticated: null,
    loading: false,
    installingPython: false,
    installingMcp: false,
    authenticating: false,
  });

  const { addTab, appendOutput, setStatus: setTabStatus } = useTerminalStore();

  // 一次性检测所有初始化状态 - 合并成一条命令，一次 exec 调用
  const checkAllStatus = async () => {
    const cmd = [
      'dpkg -l python3.12-venv 2>/dev/null | grep "^ii" > /dev/null && echo VENV_OK || echo VENV_FAIL',
      // 检查三个 MCP 包是否安装
      'which qingflow && echo QINGFLOW_OK || echo QINGFLOW_FAIL',
      'which qingflow-app-user-mcp && echo USER_MCP_OK || echo USER_MCP_FAIL',
      'which qingflow-app-builder-mcp && echo BUILDER_MCP_OK || echo BUILDER_MCP_FAIL',
      'test -f ~/.openclaw/workspace/config/mcporter.json && echo TOKEN_OK || echo TOKEN_FAIL',
      // 检查认证缓存文件是否存在
      'test -f ~/.qingflow-mcp/setup-complete && cat ~/.qingflow-mcp/setup-complete || echo ""',
    ].join('; ');

    try {
      const result = await execApi.execCommand(cmd);
      const lines = result.output.split('\n').filter(l => l.trim());

      // 尝试解析认证缓存中的用户信息
      let cliAuthenticated = false;
      let userEmail: string | null = null;

      // 找到包含 qingflow 响应的行（以 { 开头）
      const authCacheLine = lines.find(l => l.trim().startsWith('{'));
      if (authCacheLine) {
        try {
          const authData = JSON.parse(authCacheLine);
          if (authData.email) {
            cliAuthenticated = true;
            userEmail = authData.email;
          }
        } catch {
          // JSON 解析失败，忽略
        }
      }

      setStatus((prev) => ({
        ...prev,
        pythonVenvInstalled: lines.includes('VENV_OK'),
        // 三个 MCP 包都安装才算安装完成
        mcpInstalled: lines.includes('QINGFLOW_OK') && lines.includes('USER_MCP_OK') && lines.includes('BUILDER_MCP_OK'),
        tokenInjected: lines.includes('TOKEN_OK'),
        cliAuthenticated,
        userEmail: userEmail || (lines.includes('TOKEN_OK') ? 'Token 已配置' : null),
      }));
    } catch (e) {
      console.error('[checkAllStatus] failed:', e);
      // 设置为默认值（允许重新认证）
      setStatus((prev) => ({
        ...prev,
        pythonVenvInstalled: false,
        mcpInstalled: false,
        tokenInjected: false,
        cliAuthenticated: false,
        userEmail: null,
      }));
    }
  };

  useEffect(() => {
    checkAllStatus();
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

    // 串行执行三个安装命令
    const installCmd = [
      'sudo npm install -g @qingflow-tech/qingflow-cli',
      'sudo npm install -g @qingflow-tech/qingflow-app-user-mcp',
      'sudo npm install -g @qingflow-tech/qingflow-app-builder-mcp',
    ].join(' && ');

    execApi.streamCommand(
      installCmd,
      (data) => appendOutput(tabId, data.content),
      (data) => {
        if (data.status === 'running') setTabStatus(tabId, 'running');
      },
      async (data) => {
        setTabStatus(tabId, data.exitCode === 0 ? 'done' : 'error', data.exitCode);

        if (data.exitCode === 0) {
          setStatus((prev) => ({
            ...prev,
            mcpInstalled: true,
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

  // 处理 OAuth credential
  const handleOAuthToken = async (credential: string) => {
    // 保存 credential 到 mcporter.json，CLI 期望 x-qingflow-client-id 在 mcpServers.qingflow.headers 下
    const mcporterConfig = JSON.stringify({
      mcpServers: {
        "qingflow-user": {
          command: "/usr/bin/qingflow-app-user-mcp",
          env: {
            QINGFLOW_MCP_DEFAULT_BASE_URL: "https://qingflow.com/api",
          }
        },
        "qingflow-builder": {
          command: "/usr/bin/qingflow-app-builder-mcp",
          env: {
            QINGFLOW_MCP_DEFAULT_BASE_URL: "https://qingflow.com/api",
          }
        },
        "qingflow-cli": {
          command: "/usr/bin/qingflow",
          env: {
            QINGFLOW_MCP_DEFAULT_BASE_URL: "https://qingflow.com/api",
          }
        },
        "qingflow": {
          headers: {
            "x-qingflow-client-id": credential
          }
        }
      }
    }, null, 2);

    await new Promise<void>((resolve) => {
      execApi.streamCommand(
        `mkdir -p ~/.openclaw/workspace/config && echo '${mcporterConfig.replace(/'/g, "'\\''")}' > ~/.openclaw/workspace/config/mcporter.json`,
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
  };

  // Step 4: CLI 认证 - 使用 use-credential 从 mcporter.json 读取认证
  const handleAuthenticate = () => {
    setStatus((prev) => ({ ...prev, authenticating: true }));

    // 使用 auth use-credential 从 mcporter.json 读取 x_qingflow_client_id 进行认证
    new Promise<void>((resolve, reject) => {
      const outputLines: string[] = [];

      execApi.streamCommand(
        `qingflow auth use-credential 2>&1`,
        (authData) => {
          outputLines.push(authData.content);
        },
        () => {},
        (doneData) => {
          if (doneData.exitCode === 0) {
            // 认证成功
            resolve();
            return;
          }
          // 认证失败，输出错误信息
          console.log('[Auth] use-credential failed:', outputLines.join(''));
          reject(new Error('Auth failed'));
        }
      );
    })
      .then(() => {
        // 认证成功后，使用 whoami 获取用户信息并保存缓存
        return new Promise<void>((resolve) => {
          const outputLines: string[] = [];
          execApi.streamCommand(
            'qingflow auth whoami --json 2>&1',
            (data) => {
              outputLines.push(data.content);
            },
            () => {},
            (doneData) => {
              if (doneData.exitCode === 0 && outputLines.length > 0) {
                const combinedOutput = outputLines.filter(l => l.trim()).join('').trim();
                // 保存用户信息到缓存文件
                const escapedJson = combinedOutput.replace(/'/g, "'\\''");
                execApi.streamCommand(
                  `mkdir -p ~/.qingflow-mcp && echo '${escapedJson}' > ~/.qingflow-mcp/setup-complete`,
                  () => {},
                  () => {},
                  () => {
                    setStatus((prev) => ({
                      ...prev,
                      cliAuthenticated: true,
                      authenticating: false,
                    }));
                    onComplete();
                    resolve();
                  }
                );
              } else {
                setStatus((prev) => ({
                  ...prev,
                  cliAuthenticated: true,
                  authenticating: false,
                }));
                onComplete();
                resolve();
              }
            }
          );
        });
      })
      .catch(() => {
        setStatus((prev) => ({
          ...prev,
          cliAuthenticated: false,
          authenticating: false,
        }));
      });
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

  const { pythonVenvInstalled, mcpInstalled, tokenInjected, userEmail, cliAuthenticated, installingPython, installingMcp, authenticating } = status;
  const canProceed = cliAuthenticated;

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

          {pythonVenvInstalled !== true && (
            <button
              onClick={handleInstallPythonVenv}
              disabled={pythonVenvInstalled === null || installingPython}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: pythonVenvInstalled === null ? 'var(--bg-elevated)' : '#22c55e', color: pythonVenvInstalled === null ? 'var(--text-tertiary)' : 'white' }}
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
                步骤 2：安装 MCP 工具
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {mcpInstalled === null ? '检测中...' : mcpInstalled ? '已安装' : '命令行工具'}
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

        {/* Step 4: CLI 认证 */}
        <div
          className="p-4 rounded-lg"
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
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                步骤 4：CLI 认证
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {cliAuthenticated === null
                  ? tokenInjected
                    ? '认证中...'
                    : '等待登录'
                  : cliAuthenticated
                    ? '已认证'
                    : '认证失败'}
              </p>
            </div>

            {tokenInjected && cliAuthenticated !== true && (
              <button
                onClick={handleAuthenticate}
                disabled={authenticating}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{ backgroundColor: '#22c55e', color: 'white' }}
              >
                {authenticating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    认证中...
                  </>
                ) : (
                  '认证'
                )}
              </button>
            )}
          </div>
        </div>

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
