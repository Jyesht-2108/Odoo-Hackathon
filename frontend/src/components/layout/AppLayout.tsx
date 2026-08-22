import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { CopilotWidget } from '../CopilotWidget';

export const AppLayout = () => {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6 relative">
          <Outlet />
          <CopilotWidget />
        </main>
      </div>
    </div>
  );
};
