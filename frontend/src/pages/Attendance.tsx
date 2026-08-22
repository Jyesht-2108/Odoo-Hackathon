import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, Download, PlayCircle, StopCircle } from 'lucide-react';
import { api } from '../lib/api';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string | null;
  work_hours: string | null;
  extra_hours: string | null;
}

export const Attendance = () => {
  const { user } = useAuth();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendance = () => {
    const params = user?.role === 'EMPLOYEE' && user.employee_id
      ? `?employee_id=${user.employee_id}`
      : user?.employee_id
        ? `?employee_id=${user.employee_id}`
        : '';

    api.get<AttendanceRecord[]>(`/attendance${params}`)
      .then(data => {
        setRecords(data);
        // Check if already checked in today
        const today = new Date().toISOString().split('T')[0];
        const todayRecord = data.find(r => r.date === today);
        if (todayRecord && todayRecord.check_in && !todayRecord.check_out) {
          setIsCheckedIn(true);
        } else {
          setIsCheckedIn(false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAttendance(); }, [user]);

  const handleCheckIn = async () => {
    setCheckLoading(true);
    try {
      await api.post('/attendance/check-in');
      setIsCheckedIn(true);
      fetchAttendance();
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
      fetchAttendance();
    } catch (err: any) {
      alert(err.message || 'Check-out failed');
    } finally {
      setCheckLoading(false);
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatHours = (val: string | null) => {
    if (!val || val === '0' || val === '0.00') return '0h';
    const num = parseFloat(val);
    const h = Math.floor(num);
    const m = Math.round((num - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // Compute month overview
  const now = new Date();
  const thisMonth = records.filter(r => {
    const d = new Date(r.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const presentDays = thisMonth.filter(r => r.status === 'PRESENT' || r.status === 'HALF_DAY').length;
  const leaveDays = thisMonth.filter(r => r.status === 'LEAVE').length;
  const totalExtra = thisMonth.reduce((sum, r) => sum + parseFloat(r.extra_hours || '0'), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Attendance</h2>
          <p className="text-slate-500">Track your working hours and daily check-ins.</p>
        </div>
        
        {user?.role === 'EMPLOYEE' && (
          <div className="card p-4 flex items-center gap-4 border-slate-200">
            <div className="flex flex-col items-end mr-4 border-r pr-4 border-slate-200">
              <span className="text-sm text-slate-500">Current Status</span>
              <span className={`font-medium ${isCheckedIn ? 'text-green-600' : 'text-slate-900'}`}>
                {isCheckedIn ? 'Checked In' : 'Checked Out'}
              </span>
            </div>
            {isCheckedIn ? (
              <button 
                onClick={handleCheckOut}
                disabled={checkLoading}
                className="btn btn-outline border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 gap-2 px-4 disabled:opacity-50"
              >
                {checkLoading ? <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" /> : <StopCircle className="h-4 w-4" />} Check Out
              </button>
            ) : (
              <button 
                onClick={handleCheckIn}
                disabled={checkLoading}
                className="btn btn-primary bg-green-600 hover:bg-green-700 gap-2 px-4 disabled:opacity-50"
              >
                {checkLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <PlayCircle className="h-4 w-4" />} Check In
              </button>
            )}
          </div>
        )}

        {(user?.role === 'ADMIN' || user?.role === 'HR') && (
          <button className="btn btn-outline gap-2 px-4">
            <Download className="h-4 w-4" /> Export Data
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-5 border-slate-200 col-span-1">
          <h3 className="text-sm font-medium text-slate-500 mb-4">This Month Overview</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Present</span>
                <span className="font-medium text-slate-900">{presentDays} days</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min((presentDays / 22) * 100, 100)}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Leaves Taken</span>
                <span className="font-medium text-slate-900">{leaveDays} days</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${Math.min((leaveDays / 22) * 100, 100)}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Extra Hours</span>
                <span className="font-medium text-slate-900">{formatHours(String(totalExtra))}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-3 card overflow-hidden">
          <div className="p-4 border-b bg-slate-50/50">
            <h3 className="font-medium">Attendance Log {user?.role === 'EMPLOYEE' ? '(Yours)' : '(All Employees)'}</h3>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
              Loading attendance...
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Clock className="mx-auto h-8 w-8 text-slate-400 mb-3" />
              No attendance records found.
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b">
                <tr>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Check In</th>
                  <th className="px-6 py-3 font-medium">Check Out</th>
                  <th className="px-6 py-3 font-medium">Work Hours</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-slate-900">{formatDate(rec.date)}</td>
                    <td className="px-6 py-4 text-slate-600">{formatTime(rec.check_in)}</td>
                    <td className="px-6 py-4 text-slate-600">{formatTime(rec.check_out)}</td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-900">{formatHours(rec.work_hours)}</span>
                      {rec.extra_hours && parseFloat(rec.extra_hours) > 0 && (
                        <span className="ml-2 text-xs text-green-600">+{formatHours(rec.extra_hours)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        rec.status === 'PRESENT' ? 'bg-green-100 text-green-700' :
                        rec.status === 'LEAVE' ? 'bg-blue-100 text-blue-700' :
                        rec.status === 'HALF_DAY' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {rec.status || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
