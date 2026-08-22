import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, XCircle, Clock, FileWarning, Search, Filter, Send, X } from 'lucide-react';
import { api, ApiError } from '../lib/api';

interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  remarks: string | null;
  attachment_url: string | null;
  status: string;
  ai_recommendation: string | null;
  ai_reasoning: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface LeaveAllocation {
  id: string;
  employee_id: string;
  leave_type: string;
  allocated_days: string;
  used_days: string;
  year: number;
}

export const Leave = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'MY_LEAVES' | 'TEAM_REQUESTS'>(user?.role === 'EMPLOYEE' ? 'MY_LEAVES' : 'TEAM_REQUESTS');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Request form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ leave_type: 'PAID', start_date: '', end_date: '', remarks: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqs, allocs] = await Promise.all([
        api.get<LeaveRequest[]>('/leave-requests'),
        api.get<LeaveAllocation[]>(`/leave-allocations?year=${new Date().getFullYear()}`),
      ]);
      setRequests(reqs);
      setAllocations(allocs);
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleDecision = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(requestId);
    try {
      await api.patch(`/leave-requests/${requestId}/decision`, { status });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      await api.post('/leave-requests', formData);
      setShowForm(false);
      setFormData({ leave_type: 'PAID', start_date: '', end_date: '', remarks: '' });
      fetchData();
    } catch (err) {
      if (err instanceof ApiError) setFormError(err.message);
      else setFormError('Failed to submit request');
    } finally {
      setFormLoading(false);
    }
  };

  const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const leaveTypeLabel = (t: string) => {
    switch (t) {
      case 'PAID': return 'Paid Time Off';
      case 'SICK': return 'Sick Leave';
      case 'UNPAID': return 'Unpaid Leave';
      default: return t;
    }
  };

  const getRemaining = (type: string) => {
    const alloc = allocations.find(a => a.leave_type === type);
    if (!alloc) return null;
    return parseFloat(alloc.allocated_days) - parseFloat(alloc.used_days);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Time-Off Management</h2>
          <p className="text-slate-500">Apply for leave and view request statuses.</p>
        </div>
        {user?.role === 'EMPLOYEE' && (
          <button onClick={() => setShowForm(true)} className="btn btn-primary px-4 py-2">Request Time Off</button>
        )}
      </div>

      {/* Request Time Off Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Request Time Off</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            {formError && <div className="p-2 rounded bg-red-50 border border-red-200 text-sm text-red-700">{formError}</div>}
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type</label>
                <select value={formData.leave_type} onChange={e => setFormData({ ...formData, leave_type: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="PAID">Paid Time Off</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input type="date" required value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input type="date" required value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks (optional)</label>
                <textarea value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm resize-none h-20" placeholder="Reason for leave..." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline px-4 py-2">Cancel</button>
                <button type="submit" disabled={formLoading} className="btn btn-primary px-4 py-2 gap-2 disabled:opacity-70">
                  {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {loading ? (
        <div className="text-center py-12 text-slate-500">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          Loading...
        </div>
      ) : (
        <>
          {activeTab === 'TEAM_REQUESTS' && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center bg-slate-50/50">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="text" placeholder="Search employee..." className="pl-9 h-9 w-full rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <button className="btn btn-outline h-9 px-3 gap-2"><Filter className="h-4 w-4"/> Filter</button>
              </div>

              {requests.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No leave requests found.</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b">
                    <tr>
                      <th className="px-6 py-3 font-medium">Type & Dates</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">AI Recommendation</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{leaveTypeLabel(req.leave_type)}</div>
                          <div className="text-slate-500 text-xs">{formatDate(req.start_date)} — {formatDate(req.end_date)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                            req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>{req.status}</span>
                        </td>
                        <td className="px-6 py-4">
                          {req.ai_recommendation === 'APPROVE' && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approve Recommended
                            </div>
                          )}
                          {req.ai_recommendation === 'REVIEW' && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                              <FileWarning className="h-3.5 w-3.5" /> Needs Review
                            </div>
                          )}
                          {req.ai_recommendation === 'REJECT' && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              <XCircle className="h-3.5 w-3.5" /> Reject Suggested
                            </div>
                          )}
                          {!req.ai_recommendation && (
                            <span className="text-xs text-slate-400">Pending AI analysis</span>
                          )}
                          {req.ai_reasoning && (
                            <div className="text-xs text-slate-500 mt-1 max-w-[200px] truncate" title={req.ai_reasoning}>
                              {req.ai_reasoning}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {req.status === 'PENDING' ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleDecision(req.id, 'REJECTED')}
                                disabled={actionLoading === req.id}
                                className="btn btn-outline h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 disabled:opacity-50"
                              >Reject</button>
                              <button
                                onClick={() => handleDecision(req.id, 'APPROVED')}
                                disabled={actionLoading === req.id}
                                className="btn btn-primary h-8 px-3 disabled:opacity-50"
                              >Approve</button>
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
              )}
            </div>
          )}

          {activeTab === 'MY_LEAVES' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1 space-y-4">
                <div className="card p-5 border-blue-100 bg-blue-50/50">
                  <h3 className="font-medium text-blue-900 mb-1">Paid Time Off</h3>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-blue-700">{getRemaining('PAID') ?? '—'}</span>
                    <span className="text-sm text-blue-600 mb-1">days remaining</span>
                  </div>
                </div>
                <div className="card p-5 border-green-100 bg-green-50/50">
                  <h3 className="font-medium text-green-900 mb-1">Sick Leave</h3>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-green-700">{getRemaining('SICK') ?? '—'}</span>
                    <span className="text-sm text-green-600 mb-1">days remaining</span>
                  </div>
                </div>
              </div>
              <div className="col-span-2 card p-6">
                <h3 className="font-medium text-lg mb-4">Request History</h3>
                {requests.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Clock className="mx-auto h-8 w-8 text-slate-400 mb-3" />
                    <p>You have no recent time-off requests.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.map(req => (
                      <div key={req.id} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                        <div>
                          <div className="font-medium text-sm">{leaveTypeLabel(req.leave_type)}</div>
                          <div className="text-xs text-slate-500">{formatDate(req.start_date)} — {formatDate(req.end_date)}</div>
                        </div>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>{req.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
