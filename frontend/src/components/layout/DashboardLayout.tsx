import React from 'react';
import { AppSidebar } from './AppSidebar';
import { HeaderTopbar } from './HeaderTopbar';

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ title, subtitle, actions, children }) => {
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    return localStorage.getItem('elevate_sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('elevate_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Collapsible Left Sidebar */}
      <AppSidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out">
        <HeaderTopbar title={title} subtitle={subtitle} actions={actions} />

        <main className="p-8 flex-1 max-w-[1400px] w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};
