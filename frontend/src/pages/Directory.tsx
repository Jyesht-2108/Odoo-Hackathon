import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, Mail, Phone, Briefcase, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MOCK_EMPLOYEES = [
  { id: 1, name: 'Alice Smith', role: 'Senior Developer', department: 'Engineering', email: 'alice@dayflow.com', phone: '+1 234 567 890', status: 'PRESENT', burnoutRisk: 89 },
  { id: 2, name: 'Bob Jones', role: 'HR Manager', department: 'Human Resources', email: 'bob@dayflow.com', phone: '+1 987 654 321', status: 'ON_LEAVE', burnoutRisk: 72 },
  { id: 3, name: 'Charlie Davis', role: 'Product Manager', department: 'Product', email: 'charlie@dayflow.com', phone: '+1 555 123 456', status: 'ABSENT', burnoutRisk: 15 },
  { id: 4, name: 'Diana Prince', role: 'UX Designer', department: 'Design', email: 'diana@dayflow.com', phone: '+1 555 987 654', status: 'PRESENT', burnoutRisk: 22 },
  { id: 5, name: 'Ethan Hunt', role: 'DevOps Engineer', department: 'Engineering', email: 'ethan@dayflow.com', phone: '+1 444 333 222', status: 'PRESENT', burnoutRisk: 41 },
];

export const Directory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'bg-green-500 ring-green-100';
      case 'ON_LEAVE': return 'bg-yellow-400 ring-yellow-100';
      case 'ABSENT': return 'bg-red-500 ring-red-100';
      default: return 'bg-slate-300 ring-slate-100';
    }
  };

  const filtered = MOCK_EMPLOYEES.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Employee Directory</h2>
          <p className="text-slate-500">View and manage team members across the organization.</p>
        </div>
        {(user?.role === 'ADMIN' || user?.role === 'HR') && (
          <button onClick={() => navigate('/onboard')} className="btn btn-primary px-4 py-2">
            + Add Employee
          </button>
        )}
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search employees..."
            className="pl-10 h-10 w-full rounded-md border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-outline h-10 px-4 gap-2">
          <Filter className="h-4 w-4" /> Filter By Dept
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
        {filtered.map((emp) => (
          <div 
            key={emp.id} 
            className="card p-5 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
            onClick={() => navigate(`/profile/${emp.id}`)}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="relative">
                <div className="h-14 w-14 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xl font-bold">
                  {emp.name.substring(0, 2).toUpperCase()}
                </div>
                <span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full ring-2 ring-white ${getStatusColor(emp.status)}`}></span>
              </div>
              <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                {emp.department}
              </span>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">{emp.name}</h3>
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                <Briefcase className="h-3.5 w-3.5" /> {emp.role}
              </p>
            </div>

            <div className="mt-5 space-y-2 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="truncate">{emp.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="h-4 w-4 text-slate-400" />
                <span>{emp.phone}</span>
              </div>
            </div>

            {(user?.role === 'ADMIN' || user?.role === 'HR') && emp.burnoutRisk > 70 && (
              <div className="mt-4 bg-rose-50 border border-rose-100 rounded-lg p-2.5 flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                  <AlertTriangle className="h-3.5 w-3.5" /> High Risk
                </div>
                <div className="text-xs font-bold text-rose-700">{emp.burnoutRisk}% Score</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
