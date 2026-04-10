import { useTranslation } from 'react-i18next';
import ModuleCard from './ModuleCard';

interface Module {
  id: string;
  nameKey: string;
  descriptionKey: string;
  type: 'link' | 'route' | 'external';
  url?: string;
  status: 'available' | 'coming-soon';
  badge?: string;
}

interface ModuleSectionProps {
  titleKey: string;
  modules: Module[];
}

export default function ModuleSection({ titleKey, modules }: ModuleSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="mb-12">
      {/* Section Header - Dieter Rams: typography-driven hierarchy */}
      <div className="mb-6 pb-3 border-b border-edge">
        <h2 className="text-xs font-medium text-content-tertiary uppercase tracking-widest">
          {t(titleKey)}
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
