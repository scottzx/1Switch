import { useState, useEffect } from 'react';
import { Search, RefreshCw, Grid3X3, List, ChevronRight } from 'lucide-react';
import useQingflow from '../hooks/useQingflow';
import type { QingflowApp } from '../types';

interface AppBrowserProps {
  onAppSelect?: (app: QingflowApp) => void;
  selectedAppKey?: string;
}

export function AppBrowser({ onAppSelect, selectedAppKey }: AppBrowserProps) {
  const qingflow = useQingflow();
  const [apps, setApps] = useState<QingflowApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await qingflow.listApps();
      if (result.ok && result.data) {
        const data = result.data as { apps?: QingflowApp[] };
        setApps(data.apps || []);
      } else {
        setError(result.error || 'Failed to load apps');
      }
    } catch (err) {
      setError('Failed to load apps');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      loadApps();
      return;
    }

    setSearching(true);
    setError(null);
    try {
      const result = await qingflow.searchApps(searchKeyword);
      if (result.ok && result.data) {
        const data = result.data as { apps?: QingflowApp[] };
        setApps(data.apps || []);
      } else {
        setError(result.error || 'Search failed');
      }
    } catch (err) {
      setError('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4" style={{ borderBottom: '1px solid var(--border-primary)' }}>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            <Search size={16} style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="搜索应用..."
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
          >
            {searching ? <RefreshCw size={16} className="animate-spin" /> : '搜索'}
          </button>
          <button
            onClick={loadApps}
            disabled={loading}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            title="刷新"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 mt-3">
          <button
            onClick={() => setViewMode('grid')}
            className="p-1.5 rounded transition-colors"
            style={{
              backgroundColor: viewMode === 'grid' ? 'var(--bg-elevated)' : 'transparent',
              color: viewMode === 'grid' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
            }}
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className="p-1.5 rounded transition-colors"
            style={{
              backgroundColor: viewMode === 'list' ? 'var(--bg-elevated)' : 'transparent',
              color: viewMode === 'list' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
            }}
          >
            <List size={16} />
          </button>
          <span className="ml-auto text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {apps.length} 个应用
          </span>
        </div>
      </div>

      {/* App List */}
      <div className="flex-1 overflow-auto p-4">
        {loading && apps.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        ) : error && apps.length === 0 ? (
          <div
            className="flex items-center justify-center h-32 rounded-lg"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            <p className="text-sm" style={{ color: 'var(--text-error)' }}>
              {error}
            </p>
          </div>
        ) : apps.length === 0 ? (
          <div
            className="flex items-center justify-center h-32 rounded-lg"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {searchKeyword ? '未找到匹配的应用' : '暂无可用应用'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-3">
            {apps.map((app) => (
              <button
                key={app.app_key}
                onClick={() => onAppSelect?.(app)}
                className="p-4 rounded-xl text-left transition-all"
                style={{
                  backgroundColor:
                    selectedAppKey === app.app_key ? 'var(--bg-elevated)' : 'var(--bg-card)',
                  border:
                    selectedAppKey === app.app_key
                      ? '2px solid var(--accent-primary)'
                      : '1px solid var(--border-primary)',
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    {app.icon || '📋'}
                  </div>
                  {selectedAppKey === app.app_key && (
                    <ChevronRight size={16} style={{ color: 'var(--accent-primary)' }} />
                  )}
                </div>
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {app.name}
                </p>
                {app.description && (
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>
                    {app.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {apps.map((app) => (
              <button
                key={app.app_key}
                onClick={() => onAppSelect?.(app)}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all"
                style={{
                  backgroundColor:
                    selectedAppKey === app.app_key ? 'var(--bg-elevated)' : 'var(--bg-card)',
                  border:
                    selectedAppKey === app.app_key
                      ? '1px solid var(--accent-primary)'
                      : '1px solid var(--border-primary)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                >
                  {app.icon || '📋'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {app.name}
                  </p>
                  {app.description && (
                    <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {app.description}
                    </p>
                  )}
                </div>
                {selectedAppKey === app.app_key && (
                  <ChevronRight size={16} style={{ color: 'var(--accent-primary)' }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AppBrowser;
