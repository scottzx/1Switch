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
  mcpVersion: string | null;
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
    mcpVersion: null,
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
      'which qingflow && echo MCP_OK || echo MCP_FAIL',
      'test -f ~/.qingflow-mcp/qingflow-token && echo TOKEN_OK || echo TOKEN_FAIL',
    ].join('; ');

    try {
      const result = await execApi.execCommand(cmd);
      const lines = result.output.split('\n').filter(l => l.trim());

      setStatus((prev) => ({
        ...prev,
        pythonVenvInstalled: lines.includes('VENV_OK'),
        mcpInstalled: lines.includes('MCP_OK'),
        tokenInjected: lines.includes('TOKEN_OK'),
        userEmail: lines.includes('TOKEN_OK') ? 'Token 已配置' : null,
      }));
    } catch (e) {
      console.error('checkAllStatus failed:', e);
    }
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
        `mkdir -p ~/.qingflow-mcp && echo "${token}" > ~/.qingflow-mcp/qingflow-token`,
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

  // Step 4: CLI 认证
  const handleAuthenticate = () => {
    setStatus((prev) => ({ ...prev, authenticating: true }));

    // 先测试 SSE 流是否正常工作
    console.log('[Auth] Testing SSE stream...');
    execApi.streamCommand(
      'echo "SSE_TEST_OK" && sleep 0.5 && echo "SSE_TEST_DONE"',
      (data) => console.log('[Auth] test output:', data.content),
      (status) => console.log('[Auth] test status:', status),
      (done) => console.log('[Auth] test done:', done)
    ).onerror = (e) => console.log('[Auth] test SSE error:', e);

    // 读取 token 并认证
    execApi.streamCommand(
      'cat ~/.qingflow-mcp/qingflow-token 2>/dev/null || echo ""',
      (data) => {
        const token = data.content.trim();
        console.log('[Auth] token file content:', token ? 'has token (length=' + token.length + ')' : 'empty');
        if (!token) {
          setStatus((prev) => ({ ...prev, cliAuthenticated: false, authenticating: false }));
          return;
        }

        // 使用 Promise 包装 streamCommand，等待命令完成后解析结果
        new Promise<void>((resolve) => {
          const outputLines: string[] = [];

          execApi.streamCommand(
            `qingflow auth use-token --token "${token}" --json 2>&1 || echo '{"ok":false}'`,
            (authData) => {
              // 收集所有输出行
              console.log('[Auth] output line:', authData.content);
              outputLines.push(authData.content);
            },
            (statusData) => {
              console.log('[Auth] status:', statusData);
            },
            (doneData) => {
              console.log('[Auth] done:', doneData);
              console.log('[Auth] all output lines:', outputLines);
              // 命令完成后，收集所有非空输出并拼接成一个完整的 JSON 字符串
              if (doneData.exitCode === 0 && outputLines.length > 0) {
                // 过滤掉空行，拼接所有内容
                const combinedOutput = outputLines.filter(l => l.trim()).join('').trim();
                console.log('[Auth] combined output:', combinedOutput);
                try {
                  const result = JSON.parse(combinedOutput);
                  console.log('[Auth] parsed result:', result);
                  if (result.ok !== false) {
                    // 认证成功，保存缓存并完成
                    execApi.streamCommand(
                      'mkdir -p ~/.qingflow-mcp && echo "OK" > ~/.qingflow-mcp/setup-complete',
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
                    return;
                  }
                } catch (e) {
                  console.log('[Auth] JSON parse error:', e, 'combinedOutput:', combinedOutput);
                  // JSON 解析失败，尝试其他方式
                }
              }
              console.log('[Auth] failed - exitCode:', doneData.exitCode, 'outputLength:', outputLines.length);
              setStatus((prev) => ({ ...prev, cliAuthenticated: false, authenticating: false }));
              resolve();
            }
          ).onerror = (e) => {
            console.log('[Auth] SSE error:', e);
          };
        });
      },
      () => {},
      () => {
        setStatus((prev) => ({ ...prev, cliAuthenticated: false, authenticating: false }));
      }
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

  const { pythonVenvInstalled, mcpInstalled, mcpVersion, tokenInjected, userEmail, cliAuthenticated, installingPython, installingMcp, authenticating } = status;
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

            {tokenInjected && cliAuthenticated === null && (
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
