import { useState, useEffect } from 'react';
import { User, LogOut, RefreshCw, ChevronDown, Check, FileText, ExternalLink } from 'lucide-react';
import useQingflow from '../hooks/useQingflow';
import type { QingflowUser, QingflowWorkspace } from '../types';

// OAuth 配置
const QINGFLOW_LOGIN_URL = 'https://openclaw-login.qingflow.com';
const CALLBACK_URL = '/app/iclaw/qingflow-callback';
const QINGFLOW_TOKEN_FILE = '~/.openclaw/qingflow-token';

interface AuthPanelProps {
  onAuthChange?: (isAuthenticated: boolean) => void;
}

export function AuthPanel({ onAuthChange }: AuthPanelProps) {
  const qingflow = useQingflow();
  const [user, setUser] = useState<QingflowUser | null>(null);
  const [workspaces, setWorkspaces] = useState<QingflowWorkspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<QingflowWorkspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);

  // Auth mode
  const [authMode, setAuthMode] = useState<'token' | 'password'>('token');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // 监听 postMessage 接收 OAuth callback
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'QINGFLOW_TOKEN') {
        const receivedToken = event.data.token as string;
        setLoggingIn(true);
        setError(null);

        try {
          // 保存 token 到文件
          await qingflow.executeCommand(`mkdir -p ~/.openclaw && echo "${receivedToken}" > ~/.openclaw/qingflow-token`);

          // 使用 token 登录
          const result = await qingflow.authUseToken(receivedToken);
          if (result.ok) {
            await checkAuthStatus();
          } else {
            setError(result.error || '登录失败');
          }
        } catch (err) {
          setError('登录失败');
        } finally {
          setLoggingIn(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [qingflow]);

  // 打开浏览器登录
  const handleBrowserLogin = () => {
    const oauthUrl = `${QINGFLOW_LOGIN_URL}/?redirect_uri=${encodeURIComponent(CALLBACK_URL)}`;
    window.open(oauthUrl, 'qingflow_oauth', 'width=600,height=700');
  };

  const checkAuthStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await qingflow.authWhoami();
      if (result.ok && result.data) {
        setUser(result.data as QingflowUser);
        onAuthChange?.(true);

        // Load workspaces
        const wsResult = await qingflow.listWorkspaces();
        if (wsResult.ok && wsResult.data) {
          const wsData = wsResult.data as { workspaces?: QingflowWorkspace[] };
          setWorkspaces(wsData.workspaces || []);
          const currentWs = wsData.workspaces?.find((ws) => ws.is_current);
          if (currentWs) {
            setCurrentWorkspace(currentWs);
          }
        }
      } else {
        setUser(null);
        onAuthChange?.(false);
      }
    } catch (err) {
      setError('Failed to check auth status');
      setUser(null);
      onAuthChange?.(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoggingIn(true);
    setError(null);
    try {
      let result;
      if (authMode === 'token') {
        result = await qingflow.authUseToken(token);
      } else {
        result = await qingflow.authLogin(email, password);
      }

      if (result.ok) {
        await checkAuthStatus();
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('Login failed');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLoginFromFile = async () => {
    setLoggingIn(true);
    setError(null);
    try {
      // Read token from file using shell command
      const result = await qingflow.executeCommand(`cat ${QINGFLOW_TOKEN_FILE}`);
      if (result.ok && result.data) {
        const lines = Array.isArray(result.data) ? result.data : [result.data];
        const tokenStr = lines.join('').trim();
        if (tokenStr) {
          const tokenResult = await qingflow.authUseToken(tokenStr);
          if (tokenResult.ok) {
            await checkAuthStatus();
          } else {
            setError(tokenResult.error || 'Login failed');
          }
        } else {
          setError('Token file is empty');
        }
      } else {
        setError(result.error || 'Failed to read token file');
      }
    } catch (err) {
      setError('Failed to load token from file');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await qingflow.authLogout();
      setUser(null);
      setWorkspaces([]);
      setCurrentWorkspace(null);
      onAuthChange?.(false);
    } catch (err) {
      setError('Logout failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceSwitch = async (ws: QingflowWorkspace) => {
    setLoading(true);
    try {
      const result = await qingflow.selectWorkspace(ws.id.toString());
      if (result.ok) {
        setCurrentWorkspace(ws);
        // Refresh data with new workspace
        await checkAuthStatus();
      } else {
        setError(result.error || 'Failed to switch workspace');
      }
    } catch (err) {
      setError('Failed to switch workspace');
    } finally {
      setLoading(false);
      setShowWorkspaceDropdown(false);
    }
  };

  if (loading && !user) {
    return (
      <div className="flex items-center justify-center p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
        <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
        <span className="ml-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          检查认证状态...
        </span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px' }}>
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            <User size={20} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div>
            <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              轻流MCP
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              连接轻流工作区
            </p>
          </div>
        </div>

        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-error)' }}
          >
            {error}
          </div>
        )}

        {/* Auth Mode Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setAuthMode('token')}
            className="flex-1 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              backgroundColor: authMode === 'token' ? 'var(--bg-elevated)' : 'transparent',
              color: authMode === 'token' ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            Token 登录
          </button>
          <button
            onClick={() => setAuthMode('password')}
            className="flex-1 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              backgroundColor: authMode === 'password' ? 'var(--bg-elevated)' : 'transparent',
              color: authMode === 'password' ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            密码登录
          </button>
        </div>

        {authMode === 'token' ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                User Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="输入 Token"
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                邮箱
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码"
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>
        )}

        {/* Load from file button */}
        <button
          onClick={handleLoginFromFile}
          disabled={loggingIn}
          className="w-full mt-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
        >
          <FileText size={14} />
          使用 ~/.openclaw/qingflow-token 登录
        </button>

        {/* Browser OAuth login button */}
        <button
          onClick={handleBrowserLogin}
          disabled={loggingIn}
          className="w-full mt-2 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
        >
          <ExternalLink size={14} />
          {loggingIn ? '登录中...' : '浏览器登录'}
        </button>

        <button
          onClick={handleLogin}
          disabled={loggingIn}
          className="w-full mt-2 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
        >
          {loggingIn ? (
            <span className="flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin" />
              登录中...
            </span>
          ) : (
            '连接轻流'
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            <User size={20} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {user.name || user.email}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {user.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Workspace Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
              }}
            >
              <span className="max-w-[120px] truncate">{currentWorkspace?.name || '选择工作区'}</span>
              <ChevronDown size={12} />
            </button>

            {showWorkspaceDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowWorkspaceDropdown(false)}
                />
                <div
                  className="absolute right-0 top-full mt-1 z-20 py-1 rounded-lg shadow-lg min-w-[160px]"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                  }}
                >
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => handleWorkspaceSwitch(ws)}
                      className="w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-[var(--bg-card-hover)]"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <span className="truncate">{ws.name}</span>
                      {currentWorkspace?.id === ws.id && <Check size={14} style={{ color: 'var(--accent-primary)' }} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            title="退出登录"
          >
            <LogOut size={16} />
          </button>

          <button
            onClick={checkAuthStatus}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            title="刷新"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div
          className="mt-3 p-2 rounded-lg text-xs"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-error)' }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

export default AuthPanel;
