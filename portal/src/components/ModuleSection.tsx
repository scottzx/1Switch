import ModuleCard from './ModuleCard';

interface Module {
  id: string;
  name: string;
  description: string;
  type: 'link' | 'route' | 'external';
  url?: string;
  status: 'available' | 'coming-soon';
  badge?: string;
}

interface ModuleSectionProps {
  title: string;
  modules: Module[];
}

export default function ModuleSection({ title, modules }: ModuleSectionProps) {
  return (
    <section className="mb-12">
      {/* Section Header - Dieter Rams: typography-driven hierarchy */}
      <div className="mb-6 pb-3 border-b border-edge">
        <h2 className="text-xs font-medium text-content-tertiary uppercase tracking-widest">
          {title}
        </h2>
      </div>

      {/* Module Grid - 6 columns on desktop */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {modules.map((module) => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </div>
    </section>
  );
}
