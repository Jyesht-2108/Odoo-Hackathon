import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, Mail, Phone, Briefcase, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface Employee {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  department: string | null;
  designation: string | null;
  phone: string | null;
  photo_url: string | null;
}

export const Directory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Employee[]>('/employees')
      .then(data => setEmployees(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'bg-green-500 ring-green-100';
      case 'ON_LEAVE': return 'bg-yellow-400 ring-yellow-100';
      case 'ABSENT': return 'bg-red-500 ring-red-100';
      default: return 'bg-slate-300 ring-slate-100';
    }
  };

  const filtered = employees.filter(emp => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

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

      {loading ? (
        <div className="text-center py-12 text-slate-500">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          Loading employees...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No employees found.
        </div>
      ) : (
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
                    {emp.first_name[0]}{emp.last_name[0]}
                  </div>
                </div>
                {emp.department && (
                  <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                    {emp.department}
                  </span>
                )}
              </div>
              
              <div>
                <h3 className="font-semibold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">{emp.first_name} {emp.last_name}</h3>
                {emp.designation && (
                  <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                    <Briefcase className="h-3.5 w-3.5" /> {emp.designation}
                  </p>
                )}
              </div>

              <div className="mt-5 space-y-2 pt-4 border-t border-slate-100">
                {emp.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{emp.phone}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
