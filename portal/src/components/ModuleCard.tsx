import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { systemApi } from '../services/api';

interface Module {
  id: string;
  nameKey: string;
  descriptionKey: string;
  type: 'link' | 'route' | 'external';
  url?: string;
  status: 'available' | 'coming-soon';
  badge?: string;
}

interface ModuleCardProps {
  module: Module;
  gridArea?: string;
}

// Build the display URL for the module
function buildDisplayUrl(module: Module, deviceIp: string): string {
  if (module.type === 'route') {
    return `${window.location.origin}${module.url}`;
  }
  // external: replace hostname with deviceIp, keep the port
  try {
    const u = new URL(module.url!);
    return `http://${deviceIp}:${u.port}${u.pathname}`;
  } catch {
    return module.url ?? '';
  }
}

export default function ModuleCard({ module }: ModuleCardProps) {
  const { t } = useTranslation();
  const isAvailable = module.status === 'available';
  const [deviceIp, setDeviceIp] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isAvailable) return;
    systemApi.getDeviceIp().then(ip => setDeviceIp(ip)).catch(() => setDeviceIp(''));
  }, [isAvailable]);

  const isLoading = deviceIp === null;
  const displayUrl = isLoading ? '' : buildDisplayUrl(module, deviceIp ?? '');

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!displayUrl) return;
    try {
      await navigator.clipboard.writeText(displayUrl);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = displayUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCardClick = () => {
    if (!isAvailable || isLoading) return;
    if (module.type === 'external' && module.url) {
      window.open(module.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={`
        relative flex flex-col h-full
        bg-surface-card border border-edge
        rounded px-5 py-5
        transition-all duration-150
        ${isAvailable ? 'hover:shadow-card-hover' : 'opacity-50 cursor-not-allowed'}
      `}
    >
      {/* Clickable area: name + description */}
      <div
        className="flex-1 cursor-pointer"
        onClick={isAvailable && !isLoading ? handleCardClick : undefined}
      >
        {/* Header row: name + status */}
        <div className="flex items-start justify-between mb-3">
          <h3 className={`text-sm font-medium tracking-wide uppercase ${isAvailable ? 'text-content-primary' : 'text-content-tertiary'}`}>
            {t(module.nameKey)}
          </h3>

          {/* Status indicator */}
          {isAvailable ? (
            <div className="w-2 h-2 rounded-full bg-accent mt-1 flex-shrink-0" />
          ) : (
            <span className="text-2xs font-medium text-content-tertiary uppercase tracking-wider">
              {t('module.soon')}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-content-secondary leading-relaxed">
          {t(module.descriptionKey)}
        </p>
      </div>

      {/* Footer: address + copy button */}
      {isAvailable && (
        <div className="mt-4 pt-3 border-t border-edge-secondary flex items-center justify-between gap-2">
          <span className="text-content-tertiary truncate flex-1 min-w-0" style={{ fontSize: '10px' }} title={displayUrl}>
            {isLoading ? '...' : displayUrl}
          </span>
          <button
            onClick={handleCopy}
            disabled={isLoading || !displayUrl}
            className="flex-shrink-0 p-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-content-tertiary hover:bg-surface-elevated"
            title={isLoading ? 'Loading...' : 'Copy address'}
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
      )}
    </div>
  );
}
