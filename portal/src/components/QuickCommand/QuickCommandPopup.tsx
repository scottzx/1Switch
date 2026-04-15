import { useState } from 'react';
import { api } from '../../services/api';

interface QuickCommandPopupProps {
  onClose: () => void;
}

export function QuickCommandPopup({ onClose }: QuickCommandPopupProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDeployTtyd = async () => {
    setLoading(true);
    setResult(null);
    try {
      await api.post('/api/system/ttyd/deploy', {});
      setResult({ type: 'success', text: '部署成功' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setResult({ type: 'error', text: `失败: ${msg}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-[10vh]">
        <div className="w-full h-full rounded-xl shadow-2xl border border-black bg-surface-card overflow-hidden flex flex-col max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-black shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <span className="font-semibold text-content-primary text-base">快捷指令</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-elevated text-content-tertiary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="grid grid-cols-4 auto-rows-min gap-6">
              <div className="bg-white rounded-xl p-6 flex flex-col border border-black">
                {/* 标题行：icon + 标题 */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <span className="font-medium text-content-primary text-sm">部署 Web Terminal</span>
                </div>

                {/* 分隔线 */}
                <div className="border-t border-black/10 mb-3" />

                {/* 内容行：描述 + 按钮 */}
                <div className="flex items-center justify-between gap-4">
                  <div className="text-xs text-content-tertiary leading-relaxed flex-1">
                    将 ttyd 服务部署为 ttyd + tmux 模式，监听 7681 端口
                  </div>
                  <button
                    onClick={handleDeployTtyd}
                    disabled={loading}
                    className="w-9 h-9 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 hover:bg-green-500/30 disabled:opacity-50 transition-colors shrink-0"
                  >
                    {loading ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {/* 结果 */}
                {result && (
                  <>
                    <div className="border-t border-black/10 mt-3 mb-2" />
                  <div className={`text-xs px-2 py-1 rounded-lg ${
                    result.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {result.text}
                  </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
