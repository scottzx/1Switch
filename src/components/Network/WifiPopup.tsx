import { useState, useEffect } from 'react';
import { networkApi, WifiNetwork } from '../../services/api';
import { Wifi, WifiOff, RefreshCw, Loader2, Lock, Unlock, Signal } from 'lucide-react';

interface WifiPopupProps {
  onClose: () => void;
}

export function WifiPopup({ onClose }: WifiPopupProps) {
  const [wifiStatus, setWifiStatus] = useState<{ connected: boolean; ssid?: string; signal?: number } | null>(null);
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<WifiNetwork | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWifiStatus();
    scanNetworks();
  }, []);

  const loadWifiStatus = async () => {
    try {
      const status = await networkApi.wifiStatus();
      setWifiStatus({
        connected: status.connected,
        ssid: status.ssid,
        signal: status.signal,
      });
    } catch (e) {
      console.error('Failed to get WiFi status:', e);
      setWifiStatus({ connected: false });
    }
  };

  const scanNetworks = async () => {
    setScanning(true);
    setError(null);
    try {
      const result = await networkApi.wifiScan();
      setNetworks(result);
    } catch (e) {
      console.error('Failed to scan WiFi:', e);
      setError('Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedNetwork) return;

    setConnecting(selectedNetwork.ssid);
    setError(null);
    try {
      await networkApi.wifiConnect(selectedNetwork.ssid, password || undefined);
      await loadWifiStatus();
      setSelectedNetwork(null);
      setPassword('');
    } catch (e: any) {
      console.error('Failed to connect:', e);
      setError(e?.response?.data?.error || 'Connection failed');
    } finally {
      setConnecting(null);
    }
  };

  const handleNetworkClick = (network: WifiNetwork) => {
    if (network.security === 'Open' || network.security === '') {
      setSelectedNetwork(network);
      setPassword('');
    } else {
      setSelectedNetwork(network);
      setPassword('');
    }
  };

  const getSignalIcon = (signal: number) => {
    if (signal > 70) return <Signal size={14} className="text-green-500" />;
    if (signal > 40) return <Signal size={14} className="text-yellow-500" />;
    return <Signal size={14} className="text-red-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="absolute top-14 right-4 w-80 max-h-[calc(100vh-8rem)] rounded-xl shadow-xl border flex flex-col"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-primary)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-2">
            {wifiStatus?.connected ? (
              <Wifi size={16} style={{ color: '#22c55e' }} />
            ) : (
              <WifiOff size={16} style={{ color: 'var(--text-tertiary)' }} />
            )}
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Wi-Fi</span>
          </div>
          <button
            onClick={scanNetworks}
            disabled={scanning}
            className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
            style={{ color: 'var(--text-secondary)' }}
            title="Scan"
          >
            <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Current Status */}
        {wifiStatus?.connected && (
          <div className="p-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Connected to</div>
            <div className="flex items-center gap-2">
              <Wifi size={14} style={{ color: '#22c55e' }} />
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{wifiStatus.ssid}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mx-4 mt-3 p-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-overlay)', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {/* Network List */}
        <div className="flex-1 overflow-y-auto p-2">
          {scanning && networks.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
            </div>
          ) : networks.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              No networks found
            </div>
          ) : (
            <div className="space-y-1">
              {networks.map((network, index) => (
                <button
                  key={`${network.bssid || network.ssid}-${index}`}
                  onClick={() => handleNetworkClick(network)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-[var(--bg-overlay)]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {network.security === 'Open' || network.security === '' ? (
                      <Unlock size={14} style={{ color: 'var(--text-tertiary)' }} />
                    ) : (
                      <Lock size={14} style={{ color: 'var(--text-tertiary)' }} />
                    )}
                    <span className="truncate text-sm">{network.ssid}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSignalIcon(network.signal)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Password Input for Selected Network */}
        {selectedNetwork && (
          <div className="p-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="text-sm mb-2 truncate" style={{ color: 'var(--text-primary)' }}>
              Connect to "{selectedNetwork.ssid}"
            </div>
            {(selectedNetwork.security === 'Open' || selectedNetwork.security === '') ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedNetwork(null)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm transition-colors"
                  style={{ backgroundColor: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnect}
                  disabled={connecting !== null}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--primary)', color: 'var(--text-inverse)' }}
                >
                  {connecting ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Connect'}
                </button>
              </div>
            ) : (
              <>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-3 py-2 rounded-lg text-sm mb-2"
                  style={{
                    backgroundColor: 'var(--bg-overlay)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-primary)',
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleConnect()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedNetwork(null)}
                    className="flex-1 px-4 py-2 rounded-lg text-sm transition-colors"
                    style={{ backgroundColor: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConnect}
                    disabled={connecting !== null || !password}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'var(--primary)', color: 'var(--text-inverse)' }}
                  >
                    {connecting ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Connect'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
