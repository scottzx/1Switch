import { useState, useEffect } from 'react';
import { ngrokApi, NgrokStatus } from './services/api';
import './styles/index.css';

type Status = 'idle' | 'checking' | 'starting' | 'stopping' | 'installing';

function App() {
  const [ngrokStatus, setNgrokStatus] = useState<NgrokStatus | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setStatus('checking');
    try {
      const res = await ngrokApi.check();
      setNgrokStatus(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setStatus('idle');
    }
  };

  const startTunnel = async () => {
    setStatus('starting');
    try {
      const res = await ngrokApi.start();
      setNgrokStatus(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setStatus('idle');
    }
  };

  const stopTunnel = async () => {
    setStatus('stopping');
    try {
      const res = await ngrokApi.stop();
      setNgrokStatus(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setStatus('idle');
    }
  };

  const installNgrok = async () => {
    setStatus('installing');
    try {
      await ngrokApi.install();
      await checkStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setStatus('idle');
    }
  };

  const copyToClipboard = () => {
    if (ngrokStatus?.public_url) {
      navigator.clipboard.writeText(ngrokStatus.public_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isLoading = status !== 'idle';

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-2xl font-medium tracking-tight text-gray-900">ngrok</h1>
          <p className="text-sm text-gray-500 mt-1">TCP tunnel manager</p>
        </div>

        {/* Main Content - Grid */}
        <div className="grid gap-8">
          {/* Status Section */}
          <div className="grid gap-4">
            <div className="text-xs text-gray-400 uppercase tracking-widest">Status</div>
            <div className="h-px bg-gray-200" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {ngrokStatus?.installed ? 'Installed' : 'Not installed'}
              </span>
              <div
                className={`w-2 h-2 rounded-full ${
                  ngrokStatus?.running
                    ? 'bg-green-500'
                    : ngrokStatus?.installed
                    ? 'bg-gray-400'
                    : 'bg-gray-200'
                }`}
              />
            </div>
          </div>

          {/* ngrok not installed */}
          {!ngrokStatus?.installed && (
            <div className="grid gap-4">
              <div className="text-xs text-gray-400 uppercase tracking-widest">Setup</div>
              <div className="h-px bg-gray-200" />
              <p className="text-sm text-gray-600">
                ngrok is required but not installed.
              </p>
              <button
                onClick={installNgrok}
                disabled={isLoading}
                className="mt-2 h-10 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
              >
                {status === 'installing' ? 'Installing...' : 'Install ngrok'}
              </button>
            </div>
          )}

          {/* Tunnel URL */}
          {ngrokStatus?.installed && (
            <div className="grid gap-4">
              <div className="text-xs text-gray-400 uppercase tracking-widest">Tunnel</div>
              <div className="h-px bg-gray-200" />

              {ngrokStatus.running && ngrokStatus.public_url ? (
                <div className="grid gap-3">
                  <div className="bg-gray-50 p-4">
                    <div className="text-xs text-gray-400 mb-1">Public URL</div>
                    <div className="font-mono text-sm text-gray-900 break-all">
                      {ngrokStatus.public_url}
                    </div>
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="h-10 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
                  >
                    {copied ? 'Copied' : 'Copy URL'}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-600">Tunnel is not active.</p>
              )}
            </div>
          )}

          {/* Error */}
          {ngrokStatus?.error && (
            <div className="bg-red-50 p-4">
              <div className="text-xs text-red-400 mb-1">Error</div>
              <div className="text-sm text-red-700">{ngrokStatus.error}</div>
            </div>
          )}

          {/* Actions */}
          {ngrokStatus?.installed && (
            <div className="grid gap-4">
              <div className="text-xs text-gray-400 uppercase tracking-widest">Actions</div>
              <div className="h-px bg-gray-200" />
              <button
                onClick={ngrokStatus.running ? stopTunnel : startTunnel}
                disabled={isLoading}
                className={`h-10 text-sm font-medium transition-colors ${
                  ngrokStatus.running
                    ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                } disabled:opacity-50`}
              >
                {status === 'starting' && 'Starting...'}
                {status === 'stopping' && 'Stopping...'}
                {!isLoading && ngrokStatus.running && 'Stop Tunnel'}
                {!isLoading && !ngrokStatus.running && 'Start Tunnel'}
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
              Refresh status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
