import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, XCircle, Clock, FileWarning, Search, Filter } from 'lucide-react';

const MOCK_REQUESTS = [
  { id: 1, name: 'Alice Smith', type: 'Paid Time Off', dates: 'Aug 24 - Aug 25', status: 'PENDING', recommendation: 'APPROVE', reason: 'No overlaps, sufficient balance.' },
  { id: 2, name: 'Bob Jones', type: 'Sick Leave', dates: 'Aug 28', status: 'PENDING', recommendation: 'REVIEW', reason: 'Missing medical certificate, requested 3 times this month.' },
  { id: 3, name: 'Charlie Davis', type: 'Unpaid Leave', dates: 'Sep 1 - Sep 5', status: 'APPROVED', recommendation: 'APPROVE', reason: 'Approved by HR earlier.' },
];

export const Leave = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'MY_LEAVES' | 'TEAM_REQUESTS'>(user?.role === 'EMPLOYEE' ? 'MY_LEAVES' : 'TEAM_REQUESTS');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Time-Off Management</h2>
          <p className="text-slate-500">Apply for leave and view request statuses.</p>
        </div>
        {user?.role === 'EMPLOYEE' && (
          <button className="btn btn-primary px-4 py-2">Request Time Off</button>
        )}
      </div>

      {(user?.role === 'ADMIN' || user?.role === 'HR') && (
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('TEAM_REQUESTS')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'TEAM_REQUESTS'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Team Requests
            </button>
            <button
              onClick={() => setActiveTab('MY_LEAVES')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'MY_LEAVES'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              My Leaves
            </button>
          </nav>
        </div>
      )}

      {activeTab === 'TEAM_REQUESTS' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center bg-slate-50/50">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search employee..." className="pl-9 h-9 w-full rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <button className="btn btn-outline h-9 px-3 gap-2"><Filter className="h-4 w-4"/> Filter</button>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b">
              <tr>
                <th className="px-6 py-3 font-medium">Employee</th>
                <th className="px-6 py-3 font-medium">Type & Dates</th>
                <th className="px-6 py-3 font-medium">AI Recommendation</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_REQUESTS.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900">{req.name}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{req.type}</div>
                    <div className="text-slate-500 text-xs">{req.dates}</div>
                  </td>
                  <td className="px-6 py-4">
                    {req.recommendation === 'APPROVE' && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve Recommended
                      </div>
                    )}
                    {req.recommendation === 'REVIEW' && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                        <FileWarning className="h-3.5 w-3.5" /> Needs Review
                      </div>
                    )}
                    <div className="text-xs text-slate-500 mt-1 max-w-[200px] truncate" title={req.reason}>
                      {req.reason}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {req.status === 'PENDING' ? (
                      <div className="flex justify-end gap-2">
                        <button className="btn btn-outline h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">Reject</button>
                        <button className="btn btn-primary h-8 px-3">Approve</button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                        {req.status === 'APPROVED' ? <CheckCircle2 className="h-4 w-4 text-green-500"/> : <XCircle className="h-4 w-4 text-red-500"/>}
                        {req.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'MY_LEAVES' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 space-y-4">
            <div className="card p-5 border-blue-100 bg-blue-50/50">
              <h3 className="font-medium text-blue-900 mb-1">Paid Time Off</h3>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-blue-700">12</span>
                <span className="text-sm text-blue-600 mb-1">days remaining</span>
              </div>
            </div>
            <div className="card p-5 border-green-100 bg-green-50/50">
              <h3 className="font-medium text-green-900 mb-1">Sick Leave</h3>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-green-700">4</span>
                <span className="text-sm text-green-600 mb-1">days remaining</span>
              </div>
            </div>
          </div>
          <div className="col-span-2 card p-6">
            <h3 className="font-medium text-lg mb-4">Request History</h3>
            <div className="text-center py-12 text-slate-500">
              <Clock className="mx-auto h-8 w-8 text-slate-400 mb-3" />
              <p>You have no recent time-off requests.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
