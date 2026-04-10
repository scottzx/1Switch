interface Module {
  id: string;
  name: string;
  description: string;
  type: 'link' | 'route' | 'external';
  url?: string;
  status: 'available' | 'coming-soon';
  badge?: string;
}

interface ModuleCardProps {
  module: Module;
  gridArea?: string;
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
        relative flex flex-col h-full
        bg-surface-card border border-edge
        rounded px-5 py-5
        transition-all duration-150
        ${isAvailable
          ? 'hover:shadow-card-hover cursor-pointer'
          : 'opacity-50 cursor-not-allowed'
        }
      `}
      onClick={isAvailable ? handleClick : undefined}
    >
      {/* Header row: name + status */}
      <div className="flex items-start justify-between mb-3">
        <h3 className={`
          text-sm font-medium tracking-wide uppercase
          ${isAvailable ? 'text-content-primary' : 'text-content-tertiary'}
        `}>
          {module.name}
        </h3>

        {/* Status indicator */}
        {isAvailable ? (
          <div className="w-2 h-2 rounded-full bg-accent mt-1 flex-shrink-0" />
        ) : (
          <span className="text-2xs font-medium text-content-tertiary uppercase tracking-wider">
            Soon
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-content-secondary leading-relaxed flex-grow">
        {module.description}
      </p>

      {/* Footer: type indicator */}
      {isAvailable && (
        <div className="mt-4 pt-3 border-t border-edge-secondary flex items-center justify-between">
          <span className="text-2xs text-content-tertiary uppercase tracking-wider">
            {module.type === 'external' ? 'External' : 'Internal'}
          </span>
          <svg
            className="w-3 h-3 text-content-tertiary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={module.type === 'external' ? "M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" : "M9 5l7 7-7 7"}
            />
          </svg>
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
        className="block h-full"
      >
        {cardContent}
      </a>
    );
  }

  return (
    <a href={module.url} className="block h-full">
      {cardContent}
    </a>
  );
}
