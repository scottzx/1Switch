import { useState, useEffect } from 'react';
import { networkApi } from '../../services/api';

interface LanPopupProps {
  onClose: () => void;
}

export function LanPopup({ onClose }: LanPopupProps) {
  const [lanStatus, setLanStatus] = useState<{ connected: boolean; ip: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLanStatus();
  }, []);

  const loadLanStatus = async () => {
    try {
      const interfaces = await networkApi.interfaces();
      const ethernet = interfaces.find(i => i.type === 'ethernet' && i.ip);
      if (ethernet) {
        setLanStatus({ connected: true, ip: ethernet.ip });
      } else {
        setLanStatus({ connected: false, ip: '' });
      }
    } catch (e) {
      console.error('Failed to get LAN status:', e);
      setLanStatus({ connected: false, ip: '' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (lanStatus?.ip) {
      await navigator.clipboard.writeText(lanStatus.ip);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      {/* Popup */}
      <div className="fixed top-14 right-4 z-50 w-72 rounded-xl shadow-xl border bg-surface-card border-edge p-4">
        <div className="flex items-center gap-2 mb-3">
          {/* LAN icon */}
          <svg className="w-4 h-4 text-content-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="16" y="16" width="6" height="6" rx="1" />
            <rect x="2" y="16" width="6" height="6" rx="1" />
            <rect x="9" y="2" width="6" height="6" rx="1" />
            <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
            <path d="M12 12V8" />
          </svg>
          <span className="font-medium text-content-primary">LAN</span>
        </div>

        {loading ? (
          <div className="text-sm text-content-tertiary">Loading...</div>
        ) : lanStatus?.connected ? (
          <div>
            <div className="text-sm mb-2 text-content-secondary">Connected</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-lg text-sm bg-surface-elevated text-content-primary">
                {lanStatus.ip}
              </code>
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg transition-colors bg-surface-elevated"
                style={{ color: copied ? 'var(--text-content-tertiary)' : 'var(--text-content-secondary)' }}
                title="Copy IP"
              >
                {copied ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-content-tertiary">Not Connected</div>
        )}
      </div>
    </>
  );
}
