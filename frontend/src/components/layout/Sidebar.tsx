import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Clock, Settings, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = () => {
  const { user } = useAuth();
  
  return (
    <div className="flex h-screen w-64 flex-col border-r border-slate-200/60 bg-white/60 backdrop-blur-xl">
      <div className="flex h-16 items-center px-6 border-b border-slate-200/60">
        <div className="flex items-center gap-3 font-bold text-xl text-slate-800 tracking-tight">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
            D
          </div>
          Dayflow
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          <p className="px-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 mt-4">Main</p>
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                isActive ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'
              }`
            }
          >
            <LayoutDashboard className={`h-5 w-5 ${location.pathname === '/' ? 'text-indigo-600' : 'text-slate-400'}`} />
            Dashboard
          </NavLink>
          
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 mt-6">People</p>
          {(user?.role === 'ADMIN' || user?.role === 'HR') && (
            <>
              <NavLink
                to="/employees"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Users className="h-4 w-4" />
                Directory
              </NavLink>
              <NavLink
                to="/onboard"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <UserPlus className="h-4 w-4" />
                Onboard Employee
              </NavLink>
            </>
          )}

          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 mt-6">Time & Leave</p>
          <NavLink
            to="/leave"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-accent/10 text-accent' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <Calendar className="h-4 w-4" />
            Leave
          </NavLink>
          <NavLink
            to="/attendance"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-accent/10 text-accent' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <Clock className="h-4 w-4" />
            Attendance
          </NavLink>
          
          {user?.role === 'ADMIN' && (
            <>
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 mt-6">System</p>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Settings className="h-4 w-4" />
                Settings & RBAC
              </NavLink>
            </>
          )}
        </nav>
      </div>
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium">
            {user?.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user?.name}</span>
            <span className="text-xs text-slate-500">{user?.role}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
