import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { frpApi, FrpStatus } from './services/api';
import './styles/index.css';

type Status = 'idle' | 'checking' | 'connecting' | 'disconnecting';

function App() {
  const { t } = useTranslation();
  const [frpStatus, setFrpStatus] = useState<FrpStatus | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [localPort, setLocalPort] = useState('22');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setStatus('checking');
    try {
      const res = await frpApi.status();
      setFrpStatus(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setStatus('idle');
    }
  };

  const connect = async () => {
    setStatus('connecting');
    try {
      const res = await frpApi.connect({ local_port: parseInt(localPort) });
      if (res.data.success) {
        setFrpStatus({
          connected: true,
          server: res.data.server || null,
          remote_port: res.data.remote_port || null,
          local_port: res.data.local_port || null,
          token: res.data.token || null,
          link: res.data.link || null,
          command: res.data.command || null,
          error: null,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStatus('idle');
    }
  };

  const disconnect = async () => {
    setStatus('disconnecting');
    try {
      await frpApi.disconnect();
      setFrpStatus({
        connected: false,
        server: null,
        remote_port: null,
        local_port: null,
        token: null,
        link: null,
        command: null,
        error: null,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setStatus('idle');
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isLoading = status !== 'idle';

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-2xl font-medium tracking-tight text-gray-900">{t('header.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('header.subtitle')}</p>
        </div>

        {/* Main Content */}
        <div className="grid gap-8">
          {/* Status Section */}
          <div className="grid gap-4">
            <div className="text-xs text-gray-400 uppercase tracking-widest">{t('status.label')}</div>
            <div className="h-px bg-gray-200" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {frpStatus?.connected ? t('status.connected') : t('status.disconnected')}
              </span>
              <div
                className={`w-2 h-2 rounded-full ${
                  frpStatus?.connected ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
            </div>
          </div>

          {/* Connection Form */}
          {!frpStatus?.connected && (
            <div className="grid gap-4">
              <div className="text-xs text-gray-400 uppercase tracking-widest">{t('form.localPort')}</div>
              <div className="h-px bg-gray-200" />
              <input
                type="number"
                value={localPort}
                onChange={(e) => setLocalPort(e.target.value)}
                placeholder={t('form.localPortPlaceholder')}
                className="h-10 px-3 border border-gray-300 text-sm focus:outline-none focus:border-gray-500"
              />
              <button
                onClick={connect}
                disabled={isLoading}
                className="h-10 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
              >
                {status === 'connecting' ? t('actions.connecting') : t('actions.connect')}
              </button>
            </div>
          )}

          {/* Connection Info */}
          {frpStatus?.connected && (
            <div className="grid gap-4">
              <div className="text-xs text-gray-400 uppercase tracking-widest">{t('connection.label')}</div>
              <div className="h-px bg-gray-200" />
              <div className="grid gap-3">
                {/* Server */}
                {frpStatus.server && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{t('connection.server')}</span>
                    <span className="text-sm font-mono text-gray-900">{frpStatus.server}</span>
                  </div>
                )}
                {/* Remote Port */}
                {frpStatus.remote_port && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{t('connection.remotePort')}</span>
                    <span className="text-sm font-mono text-gray-900">{frpStatus.remote_port}</span>
                  </div>
                )}
                {/* Local Port */}
                {frpStatus.local_port && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{t('connection.localPort')}</span>
                    <span className="text-sm font-mono text-gray-900">{frpStatus.local_port}</span>
                  </div>
                )}
                {/* Token */}
                {frpStatus.token && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400">{t('connection.token')}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-900">{frpStatus.token}</span>
                      <button
                        onClick={() => copyToClipboard(frpStatus.token!, 'token')}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        {copiedField === 'token' ? t('copySuccess') : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
                {/* SSH Command */}
                {frpStatus.command && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400">{t('connection.sshCommand')}</span>
                    <div className="flex items-center justify-between gap-2 bg-gray-50 p-2">
                      <span className="text-xs font-mono text-gray-700 break-all">{frpStatus.command}</span>
                      <button
                        onClick={() => copyToClipboard(frpStatus.command!, 'command')}
                        className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-600"
                      >
                        {copiedField === 'command' ? t('copySuccess') : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {frpStatus?.error && (
            <div className="bg-red-50 p-4">
              <div className="text-xs text-red-400 mb-1">{t('error.label')}</div>
              <div className="text-sm text-red-700">{frpStatus.error}</div>
            </div>
          )}

          {/* Actions */}
          {frpStatus?.connected && (
            <div className="grid gap-4">
              <div className="text-xs text-gray-400 uppercase tracking-widest">{t('actions.label')}</div>
              <div className="h-px bg-gray-200" />
              <button
                onClick={disconnect}
                disabled={isLoading}
                className="h-10 bg-white border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {status === 'disconnecting' ? t('actions.disconnecting') : t('actions.disconnect')}
              </button>
            </div>
          )}

          {/* Refresh */}
          <div className="pt-4">
            <button
              onClick={checkStatus}
              disabled={isLoading}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              {t('refresh')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
