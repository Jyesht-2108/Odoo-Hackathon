import React, { useState } from 'react';
import { useAuth, type Role } from '../context/AuthContext';
import { Shield, Save, UserCog } from 'lucide-react';

const FEATURES = [
  { id: 'dashboard', name: 'Dashboard view' },
  { id: 'directory', name: 'Employee Directory' },
  { id: 'onboard', name: 'Onboard New Employees' },
  { id: 'leave_self', name: 'Request Time-Off' },
  { id: 'leave_approve', name: 'Approve Time-Off' },
  { id: 'attendance_self', name: 'Log Attendance' },
  { id: 'attendance_view', name: 'View Global Attendance' },
  { id: 'rbac', name: 'Access Control (Settings)' }
];

const INITIAL_USERS = [
  { id: 1, name: 'Alice Smith', email: 'alice@dayflow.com', role: 'EMPLOYEE' as Role },
  { id: 2, name: 'Bob Jones', email: 'bob@dayflow.com', role: 'HR' as Role },
  { id: 3, name: 'Jyesht Doe', email: 'jyesht@dayflow.com', role: 'ADMIN' as Role },
];

export const Settings = () => {
  const { user } = useAuth();
  
  // Mock state for Role definitions
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({
    ADMIN: { dashboard: true, directory: true, onboard: true, leave_self: true, leave_approve: true, attendance_self: true, attendance_view: true, rbac: true },
    HR: { dashboard: true, directory: true, onboard: true, leave_self: true, leave_approve: true, attendance_self: true, attendance_view: true, rbac: false },
    EMPLOYEE: { dashboard: true, directory: false, onboard: false, leave_self: true, leave_approve: false, attendance_self: true, attendance_view: false, rbac: false }
  });

  // Mock state for User assignments
  const [users, setUsers] = useState(INITIAL_USERS);

  const handleToggle = (role: string, feature: string) => {
    setPermissions(prev => ({ ...prev, [role]: { ...prev[role], [feature]: !prev[role][feature] } }));
  };

  const handleRoleChange = (userId: number, newRole: Role) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-8 text-center text-slate-500">
        <Shield className="mx-auto h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-lg font-medium text-slate-900">Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-12">
      <div className="flex justify-between items-center border-b pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Settings & Security</h2>
          <p className="text-slate-500">Manage platform permissions and user assignments.</p>
        </div>
        <button className="btn btn-primary px-4 py-2 gap-2">
          <Save className="h-4 w-4" /> Save All Changes
        </button>
      </div>

      {/* Section 1: User Role Assignment */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <UserCog className="h-5 w-5 text-blue-600" />
              User Role Assignment
            </div>
            <p className="text-sm text-slate-500 mt-1">Assign base roles (Employee, HR, Admin) to specific users in your organization.</p>
          </div>
          <button 
            onClick={() => window.location.href = '/onboard'}
            className="btn btn-outline gap-2 px-3 h-9"
          >
            + Add New User
          </button>
        </div>
        
        <div className="card overflow-hidden mt-4">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Employee Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">System Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900">{u.name}</td>
                  <td className="px-6 py-4 text-slate-500">{u.email}</td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                      className="block w-48 rounded-md border border-slate-300 px-3 py-1.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                      disabled={u.email === user.email} // Don't let the current admin demote themselves
                    >
                      <option value="EMPLOYEE">Employee</option>
                      <option value="HR">HR Officer</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Role Permissions Matrix */}
      <section className="space-y-4 pt-6 border-t border-slate-200">
        <div className="flex items-center gap-2 text-lg font-semibold text-slate-800">
          <Shield className="h-5 w-5 text-blue-600" />
          Role Permissions Matrix
        </div>
        <p className="text-sm text-slate-500 mb-4">Define exactly what features each system role is allowed to access.</p>

        <div className="card overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b">
              <tr>
                <th className="px-6 py-4 font-medium w-1/3">Feature / Page</th>
                <th className="px-6 py-4 font-medium text-center border-l">Admin</th>
                <th className="px-6 py-4 font-medium text-center border-l">HR</th>
                <th className="px-6 py-4 font-medium text-center border-l">Employee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {FEATURES.map((feature) => (
                <tr key={feature.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900">{feature.name}</td>
                  {['ADMIN', 'HR', 'EMPLOYEE'].map((r) => (
                    <td key={`${r}-${feature.id}`} className="px-6 py-4 text-center border-l">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={permissions[r][feature.id]}
                          onChange={() => handleToggle(r, feature.id)}
                          disabled={r === 'ADMIN' && feature.id === 'rbac'} 
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
};
