import ModuleCard from './ModuleCard';

interface Module {
  id: string;
  name: string;
  description: string;
  type: 'link' | 'route' | 'external';
  url?: string;
  status: 'available' | 'coming-soon';
  icon?: string;
}

interface ModuleSectionProps {
  title: string;
  icon: string;
  modules: Module[];
}

export default function ModuleSection({ title, icon, modules }: ModuleSectionProps) {
  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <h2 className="text-lg font-semibold text-content-primary">{title}</h2>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </div>
    </div>
  );
}
