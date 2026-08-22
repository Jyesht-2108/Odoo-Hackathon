import React from 'react';
import { Bell, Search } from 'lucide-react';

export const TopNav = () => {
  return (
    <header className="h-16 border-b border-slate-200/60 bg-white/60 backdrop-blur-xl flex items-center justify-between px-6 z-10 relative">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search..."
            className="h-9 w-64 rounded-md border border-input bg-transparent px-8 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative rounded-full p-2 hover:bg-slate-100 transition-colors">
          <Bell className="h-5 w-5 text-slate-600" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive"></span>
        </button>
      </div>
    </header>
  );
};
