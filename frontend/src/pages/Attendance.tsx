import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, Download, PlayCircle, StopCircle } from 'lucide-react';

const MOCK_ATTENDANCE = [
  { date: 'Aug 24, 2026', in: '09:00 AM', out: '06:05 PM', workHours: '9h 5m', extra: '5m', status: 'Present' },
  { date: 'Aug 23, 2026', in: '09:15 AM', out: '06:30 PM', workHours: '9h 15m', extra: '15m', status: 'Present' },
  { date: 'Aug 22, 2026', in: '-', out: '-', workHours: '0h', extra: '0h', status: 'Leave' },
];

export const Attendance = () => {
  const { user } = useAuth();
  const [isCheckedIn, setIsCheckedIn] = useState(false);

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
                onClick={() => setIsCheckedIn(false)}
                className="btn btn-outline border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 gap-2 px-4"
              >
                <StopCircle className="h-4 w-4" /> Check Out
              </button>
            ) : (
              <button 
                onClick={() => setIsCheckedIn(true)}
                className="btn btn-primary bg-green-600 hover:bg-green-700 gap-2 px-4"
              >
                <PlayCircle className="h-4 w-4" /> Check In
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
                <span className="font-medium text-slate-900">18 days</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '80%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Leaves Taken</span>
                <span className="font-medium text-slate-900">2 days</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-blue-400 h-2 rounded-full" style={{ width: '10%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Extra Hours</span>
                <span className="font-medium text-slate-900">4h 30m</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-3 card overflow-hidden">
          <div className="p-4 border-b bg-slate-50/50">
            <h3 className="font-medium">Attendance Log {user?.role === 'EMPLOYEE' ? '(Yours)' : '(All Employees)'}</h3>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                  <th className="px-6 py-3 font-medium">Employee</th>
                )}
                <th className="px-6 py-3 font-medium">Check In</th>
                <th className="px-6 py-3 font-medium">Check Out</th>
                <th className="px-6 py-3 font-medium">Work Hours</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_ATTENDANCE.map((rec, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 text-slate-900">{rec.date}</td>
                  {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                    <td className="px-6 py-4 font-medium text-slate-900">Alice Smith</td>
                  )}
                  <td className="px-6 py-4 text-slate-600">{rec.in}</td>
                  <td className="px-6 py-4 text-slate-600">{rec.out}</td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-900">{rec.workHours}</span>
                    {rec.extra !== '0h' && <span className="ml-2 text-xs text-green-600">+{rec.extra}</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      rec.status === 'Present' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {rec.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
