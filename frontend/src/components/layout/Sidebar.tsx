import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Clock, Settings, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';

export const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  const containerVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5, ease: "easeOut", staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }
  };

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants}
      className="flex h-screen w-64 flex-col border-r border-slate-200/60 bg-white/60 backdrop-blur-xl"
    >
      <div className="flex h-16 items-center px-6 border-b border-slate-200/60">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
          className="flex items-center gap-3 font-bold text-xl text-slate-800 tracking-tight"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
            D
          </div>
          Dayflow
        </motion.div>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          <motion.p variants={itemVariants} className="px-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 mt-4">Main</motion.p>
          <motion.div variants={itemVariants}>
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
          </motion.div>
          
          <motion.p variants={itemVariants} className="px-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 mt-6">People</motion.p>
          {(user?.role === 'ADMIN' || user?.role === 'HR') && (
            <>
              <motion.div variants={itemVariants}>
                <NavLink
                  to="/employees"
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                      isActive ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <Users className={`h-5 w-5 ${location.pathname === '/employees' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  Directory
                </NavLink>
              </motion.div>
              <motion.div variants={itemVariants}>
                <NavLink
                  to="/onboard"
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                      isActive ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <UserPlus className={`h-5 w-5 ${location.pathname === '/onboard' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  Onboard Employee
                </NavLink>
              </motion.div>
            </>
          )}

          <motion.p variants={itemVariants} className="px-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 mt-6">Time & Leave</motion.p>
          <motion.div variants={itemVariants}>
            <NavLink
              to="/leave"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  isActive ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'
                }`
              }
            >
              <Calendar className={`h-5 w-5 ${location.pathname === '/leave' ? 'text-indigo-600' : 'text-slate-400'}`} />
              Leave
            </NavLink>
          </motion.div>
          <motion.div variants={itemVariants}>
            <NavLink
              to="/attendance"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  isActive ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'
                }`
              }
            >
              <Clock className={`h-5 w-5 ${location.pathname === '/attendance' ? 'text-indigo-600' : 'text-slate-400'}`} />
              Attendance
            </NavLink>
          </motion.div>
          
          {user?.role === 'ADMIN' && (
            <>
              <motion.p variants={itemVariants} className="px-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 mt-6">System</motion.p>
              <motion.div variants={itemVariants}>
                <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                      isActive ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <Settings className={`h-5 w-5 ${location.pathname === '/settings' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  Settings & RBAC
                </NavLink>
              </motion.div>
            </>
          )}
        </nav>
      </div>
      <motion.div variants={itemVariants} className="border-t border-slate-200/60 p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium">
            {user?.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user?.name}</span>
            <span className="text-xs text-slate-500">{user?.role}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
