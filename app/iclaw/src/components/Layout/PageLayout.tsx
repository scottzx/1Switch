import { ReactNode } from 'react';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PageLayout({ children, className = '' }: PageLayoutProps) {
  return (
    <div className={`h-full overflow-y-auto scroll-container ${className}`}>
      {children}
    </div>
  );
}
