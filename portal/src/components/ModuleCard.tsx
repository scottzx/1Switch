interface Module {
  id: string;
  name: string;
  description: string;
  type: 'link' | 'route' | 'external';
  url?: string;
  status: 'available' | 'coming-soon';
  icon?: string;
}

interface ModuleCardProps {
  module: Module;
}

export default function ModuleCard({ module }: ModuleCardProps) {
  const isAvailable = module.status === 'available';

  const handleClick = () => {
    if (!isAvailable) return;
    if (module.type === 'external' && module.url) {
      window.open(module.url, '_blank', 'noopener,noreferrer');
    }
  };

  const cardContent = (
    <div
      className={`
        relative p-5 rounded-xl bg-surface-card border border-edge
        transition-all duration-200
        ${isAvailable
          ? 'hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer group'
          : 'opacity-50 cursor-not-allowed'
        }
      `}
      onClick={isAvailable ? handleClick : undefined}
    >
      {/* 待开发徽章 */}
      {!isAvailable && (
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-content-tertiary/20 text-content-tertiary text-xs font-medium">
          待开发
        </div>
      )}

      {/* 图标 */}
      <div className="mb-3">
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center text-xl
          ${isAvailable
            ? 'bg-gradient-to-br from-claw-500 to-claw-600 shadow-glow-claw'
            : 'bg-surface-elevated'
          }
        `}>
          {module.icon || '📦'}
        </div>
      </div>

      {/* 名称 */}
      <h3 className={`
        font-semibold mb-1
        ${isAvailable ? 'text-content-primary group-hover:text-claw-500 transition-colors' : 'text-content-secondary'}
      `}>
        {module.name}
      </h3>

      {/* 描述 */}
      <p className="text-sm text-content-tertiary leading-relaxed">
        {module.description}
      </p>

      {/* 跳转指示器 */}
      {isAvailable && module.type !== 'external' && (
        <div className="mt-3 flex items-center gap-1 text-claw-500 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <span>进入</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}

      {isAvailable && module.type === 'external' && (
        <div className="mt-3 flex items-center gap-1 text-claw-500 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span>新窗口打开</span>
        </div>
      )}
    </div>
  );

  if (!isAvailable) {
    return cardContent;
  }

  if (module.type === 'external') {
    return (
      <a
        href={module.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {cardContent}
      </a>
    );
  }

  return (
    <a href={module.url} className="block">
      {cardContent}
    </a>
  );
}
