import React, { useState, useEffect } from 'react';
import { Users, Briefcase, CalendarCheck, TrendingUp, MoreHorizontal, Download, PlayCircle, StopCircle, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const areaData = [
  { name: 'Jan', total: 320 },
  { name: 'Feb', total: 330 },
  { name: 'Mar', total: 340 },
  { name: 'Apr', total: 345 },
  { name: 'May', total: 350 },
  { name: 'Jun', total: 352 },
];

const pieData = [
  { name: 'On Site', value: 50 },
  { name: 'Remote', value: 35 },
  { name: 'Hybrid', value: 15 },
];
const COLORS = ['#4F46E5', '#10B981', '#F59E0B'];

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const StatCard = ({ title, value, change, icon: Icon, trend, colorClass }: any) => (
  <motion.div variants={itemVariants} className="card p-6 flex flex-col gap-4 relative overflow-hidden group">
    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150 ${colorClass}`}></div>
    <div className="flex justify-between items-start relative z-10">
      <div>
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-bold mt-2 text-slate-800 tracking-tight">{value}</h3>
      </div>
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-sm ${colorClass}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
    <div className="flex items-center gap-2 text-sm relative z-10 mt-1">
      <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
        {change}
      </span>
      <span className="text-slate-400 font-medium">vs last month</span>
    </div>
  </motion.div>
);

export const Dashboard = () => {
  const { user } = useAuth();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);
  const [pendingLeaves, setPendingLeaves] = useState<number | null>(null);

  // Fetch today's attendance to determine initial check-in state
  useEffect(() => {
    if (user?.role === 'EMPLOYEE' && user.employee_id) {
      const today = new Date().toISOString().split('T')[0];
      api.get<Array<{ check_in: string | null; check_out: string | null }>>(`/attendance?employee_id=${user.employee_id}&date=${today}`)
        .then(records => {
          if (records.length > 0 && records[0].check_in && !records[0].check_out) {
            setIsCheckedIn(true);
          }
        })
        .catch(() => {});
    }

    // Fetch stats for ADMIN/HR
    if (user?.role === 'ADMIN' || user?.role === 'HR') {
      api.get<Array<any>>('/employees')
        .then(emps => setEmployeeCount(emps.length))
        .catch(() => {});
      api.get<Array<any>>('/leave-requests?status=PENDING')
        .then(reqs => setPendingLeaves(reqs.length))
        .catch(() => {});
    }
  }, [user]);

  const handleCheckIn = async () => {
    setCheckLoading(true);
    try {
      await api.post('/attendance/check-in');
      setIsCheckedIn(true);
    } catch (err: any) {
      alert(err.message || 'Check-in failed');
    } finally {
      setCheckLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckLoading(true);
    try {
      await api.post('/attendance/check-out');
      setIsCheckedIn(false);
    } catch (err: any) {
      alert(err.message || 'Check-out failed');
    } finally {
      setCheckLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6 max-w-7xl mx-auto pb-12">
      <motion.div variants={itemVariants} className="flex justify-between items-center border-b border-slate-200/60 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Overview</h2>
          <p className="text-slate-500 mt-1">Welcome back, {user?.name?.split(' ')[0] || 'there'}! Here's what's happening today.</p>
        </div>
        <div className="flex gap-3">
          {user?.role === 'EMPLOYEE' && (
            <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm mr-2">
              <div className="flex flex-col items-end border-r border-slate-200 pr-3">
                <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
                <span className={`text-xs font-semibold ${isCheckedIn ? 'text-emerald-600' : 'text-slate-600'}`}>
                  {isCheckedIn ? 'Checked In' : 'Checked Out'}
                </span>
              </div>
              <button 
                onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
                disabled={checkLoading}
                className={`btn h-8 px-3 gap-2 disabled:opacity-50 ${isCheckedIn ? 'btn-outline border-rose-200 text-rose-600 hover:bg-rose-50' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'}`}
              >
                {checkLoading ? (
                  <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                ) : isCheckedIn ? (
                  <><StopCircle className="h-4 w-4"/> End Shift</>
                ) : (
                  <><PlayCircle className="h-4 w-4"/> Start Shift</>
                )}
              </button>
            </div>
          )}
          {(user?.role === 'ADMIN' || user?.role === 'HR') && (
            <>
              <button className="btn btn-outline px-4 gap-2"><CalendarCheck className="h-4 w-4"/> Date Range</button>
              <button className="btn btn-primary px-4 gap-2"><Download className="h-4 w-4"/> Export</button>
            </>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Employees" value={employeeCount ?? '—'} change="+15%" icon={Users} trend="up" colorClass="bg-gradient-to-br from-indigo-500 to-violet-600" />
        <StatCard title="Pending Leaves" value={pendingLeaves ?? '—'} change="-10%" icon={CalendarCheck} trend="down" colorClass="bg-gradient-to-br from-amber-400 to-orange-500" />
        <StatCard title="New Hires" value="—" change="+12%" icon={Briefcase} trend="up" colorClass="bg-gradient-to-br from-emerald-400 to-teal-500" />
        <StatCard title="Happiness Rate" value="82%" change="-11%" icon={TrendingUp} trend="down" colorClass="bg-gradient-to-br from-rose-400 to-red-500" />
      </div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-lg text-slate-800">Headcount Growth</h3>
            <select className="text-sm border-0 bg-slate-50 text-slate-600 rounded-lg focus:ring-0 py-1.5 px-3 font-medium cursor-pointer">
              <option>This Year</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} dx={-10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#1E293B', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="total" stroke="#4F46E5" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-semibold text-lg">Working Format</h3>
              <p className="text-sm text-muted-foreground">Current distribution</p>
            </div>
            <button className="text-muted-foreground hover:text-slate-900"><MoreHorizontal className="h-5 w-5"/></button>
          </div>
          <div className="h-[200px] w-full mb-6 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-slate-700">100</span>
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
          </div>
          <div className="space-y-3">
            {pieData.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Burnout Risk AI Section (Admin/HR Only) — placeholder, teammate 4's scope */}
      {(user?.role === 'ADMIN' || user?.role === 'HR') && (
        <motion.div variants={itemVariants} className="card p-6 border-rose-200 bg-rose-50/30">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-rose-900">AI Burnout Risk Alerts</h3>
                <p className="text-sm text-rose-600/80">Predictive analytics based on attendance and leave patterns.</p>
              </div>
            </div>
            <button className="text-sm font-medium text-rose-600 hover:text-rose-700">View All Risks</button>
          </div>
          <div className="text-center py-6 text-rose-600/60 text-sm">
            Burnout scoring will be available once teammate 4's analytics module is integrated.
          </div>
        </motion.div>
      )}

    </motion.div>
  );
};
