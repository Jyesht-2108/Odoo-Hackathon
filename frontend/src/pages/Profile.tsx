import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Briefcase, Mail, Phone, MapPin, Heart, BookOpen, Lock, Save } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';

interface EmployeeData {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  department: string | null;
  designation: string | null;
  photo_url: string | null;
  dob: string | null;
  address: string | null;
  phone: string | null;
  marital_status: string | null;
  blood_group: string | null;
  nationality: string | null;
  date_of_joining: string | null;
  about: string | null;
  skills: any;
  interests: any;
  certifications: any;
}

interface SalaryData {
  id: string;
  employee_id: string;
  monthly_wage: string | null;
  working_days_per_week: number | null;
  basic_pct: string | null;
  hra_pct: string | null;
  standard_allowance: string | null;
  leave_travel_allowance: string | null;
  fixed_allowance: string | null;
  pf_pct: string | null;
  professional_tax: string | null;
}

export const Profile = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'PERSONAL' | 'SALARY' | 'SECURITY'>('PERSONAL');
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [salary, setSalary] = useState<SalaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editFields, setEditFields] = useState<Partial<EmployeeData>>({});
  
  const isViewingOwn = !id || id === user?.employee_id;
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'HR';
  const profileId = id || user?.employee_id;

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    api.get<EmployeeData>(`/employees/${profileId}`)
      .then(data => {
        setEmployee(data);
        setEditFields({});
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch salary (may 404 if not set)
    api.get<SalaryData>(`/salary/${profileId}`)
      .then(data => setSalary(data))
      .catch(() => setSalary(null));
  }, [profileId]);

  const handleSave = async () => {
    if (!profileId || Object.keys(editFields).length === 0) return;
    setSaving(true);
    try {
      const updated = await api.patch<EmployeeData>(`/employees/${profileId}`, editFields);
      setEmployee(updated);
      setEditFields({});
    } catch (err: any) {
      alert(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: keyof EmployeeData, value: string) => {
    setEditFields(prev => ({ ...prev, [key]: value }));
  };

  const getVal = (key: keyof EmployeeData) => {
    if (key in editFields) return (editFields as any)[key] || '';
    return (employee as any)?.[key] || '';
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-slate-500">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
        Loading profile...
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12 text-slate-500">
        <User className="mx-auto h-8 w-8 text-slate-400 mb-3" />
        <p>Employee profile not found.</p>
      </div>
    );
  }

  const canEdit = isViewingOwn || isAdmin;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex justify-between items-end pb-6">
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-3xl font-bold border-4 border-white shadow-sm">
            {employee.first_name[0]}{employee.last_name[0]}
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{employee.first_name} {employee.last_name}</h2>
            <p className="text-slate-500 flex items-center gap-2 mt-1">
              <Briefcase className="h-4 w-4" /> {employee.designation || employee.department || 'Employee'}
            </p>
          </div>
        </div>
        {canEdit && Object.keys(editFields).length > 0 && (
          <button onClick={handleSave} disabled={saving} className="btn btn-primary px-4 py-2 gap-2 disabled:opacity-70">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
            Save Profile
          </button>
        )}
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('PERSONAL')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'PERSONAL' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Personal Information
          </button>
          <button
            onClick={() => setActiveTab('SALARY')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'SALARY' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Salary & Compensation
          </button>
          {isViewingOwn && (
            <button
              onClick={() => setActiveTab('SECURITY')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'SECURITY' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Security Settings
            </button>
          )}
        </nav>
      </div>

      {activeTab === 'PERSONAL' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6 space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Basic Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Phone</label>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-slate-400"/>
                  <input
                    type="text"
                    value={getVal('phone')}
                    onChange={e => updateField('phone', e.target.value)}
                    disabled={!canEdit}
                    className="border-0 border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:ring-0 bg-transparent px-0 text-sm font-medium w-full"
                    placeholder="Not set"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nationality</label>
                <div className="text-sm font-medium">{employee.nationality || 'Not set'}</div>
              </div>
              <div className="col-span-2 mt-2">
                <label className="block text-xs text-slate-500 mb-1">Address</label>
                <input
                  type="text"
                  value={getVal('address')}
                  onChange={e => updateField('address', e.target.value)}
                  disabled={!canEdit}
                  className="w-full text-sm font-medium border-0 border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:ring-0 bg-transparent px-0"
                  placeholder="Not set"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Date of Birth</label>
                <div className="text-sm font-medium">{employee.dob || 'Not set'}</div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Blood Group</label>
                <div className="text-sm font-medium">{employee.blood_group || 'Not set'}</div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Marital Status</label>
                <div className="text-sm font-medium">{employee.marital_status || 'Not set'}</div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Date of Joining</label>
                <div className="text-sm font-medium">{employee.date_of_joining || 'Not set'}</div>
              </div>
            </div>
          </div>
          <div className="card p-6 space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">About & Culture</h3>
            <div>
              <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1"><Heart className="h-3 w-3"/> About</label>
              <textarea
                disabled={!isAdmin && !isViewingOwn}
                value={getVal('about')}
                onChange={e => updateField('about', e.target.value)}
                className="w-full text-sm p-2 border border-transparent hover:border-slate-200 focus:border-blue-500 rounded-md bg-slate-50/50 resize-none h-20"
                placeholder="Tell us about yourself..."
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1"><BookOpen className="h-3 w-3"/> Skills & Certs</label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {Array.isArray(employee.skills)
                  ? employee.skills.map((s: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">{s}</span>
                    ))
                  : <span className="text-sm text-slate-400">No skills listed</span>
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'SALARY' && (
        <div className="card p-6">
          <div className="flex justify-between items-center border-b pb-4 mb-4">
            <h3 className="font-semibold text-lg">Compensation Breakdown</h3>
            {!isAdmin && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">Read Only</span>}
          </div>
          {salary ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="p-4 bg-slate-50 rounded-lg">
                <label className="block text-xs text-slate-500 uppercase tracking-wider">Monthly Wage</label>
                <div className={`text-2xl font-bold mt-1 ${isAdmin ? 'text-blue-600' : 'text-slate-900'}`}>
                  ${parseFloat(salary.monthly_wage || '0').toLocaleString()}
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <label className="block text-xs text-slate-500 uppercase tracking-wider">Basic %</label>
                <div className="text-lg font-semibold mt-1 text-slate-700">{salary.basic_pct || '—'}%</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <label className="block text-xs text-slate-500 uppercase tracking-wider">HRA %</label>
                <div className="text-lg font-semibold mt-1 text-slate-700">{salary.hra_pct || '—'}%</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <label className="block text-xs text-slate-500 uppercase tracking-wider">Standard Allowance</label>
                <div className="text-lg font-semibold mt-1 text-slate-700">${parseFloat(salary.standard_allowance || '0').toLocaleString()}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <label className="block text-xs text-slate-500 uppercase tracking-wider">PF %</label>
                <div className="text-lg font-semibold mt-1 text-red-600">{salary.pf_pct || '—'}%</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <label className="block text-xs text-slate-500 uppercase tracking-wider">Professional Tax</label>
                <div className="text-lg font-semibold mt-1 text-red-600">-${parseFloat(salary.professional_tax || '0').toLocaleString()}</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No salary information configured yet.
            </div>
          )}
        </div>
      )}

    </div>
  );
};
