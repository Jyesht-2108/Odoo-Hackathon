import React from 'react';
import { Users, Briefcase, CalendarCheck, TrendingUp, MoreHorizontal, Download } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';

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
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6 max-w-7xl mx-auto pb-12">
      <motion.div variants={itemVariants} className="flex justify-between items-center border-b border-slate-200/60 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Overview</h2>
          <p className="text-slate-500 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-outline px-4 gap-2"><CalendarCheck className="h-4 w-4"/> Date Range</button>
          <button className="btn btn-primary px-4 gap-2"><Download className="h-4 w-4"/> Export</button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Employees" value="352" change="+15%" icon={Users} trend="up" colorClass="bg-gradient-to-br from-indigo-500 to-violet-600" />
        <StatCard title="Pending Leaves" value="22" change="-10%" icon={CalendarCheck} trend="down" colorClass="bg-gradient-to-br from-amber-400 to-orange-500" />
        <StatCard title="New Hires" value="32" change="+12%" icon={Briefcase} trend="up" colorClass="bg-gradient-to-br from-emerald-400 to-teal-500" />
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
    </motion.div>
  );
};
