import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Briefcase, Mail, Phone, MapPin, Heart, BookOpen, Lock, Save } from 'lucide-react';
import { useParams } from 'react-router-dom';

export const Profile = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'PERSONAL' | 'SALARY' | 'SECURITY'>('PERSONAL');
  
  // For mock UI purposes, assume viewing own profile if no ID is passed, else viewing someone else's.
  const isViewingOwn = !id || id === user?.id;
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'HR';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex justify-between items-end pb-6">
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-3xl font-bold border-4 border-white shadow-sm">
            {isViewingOwn ? user?.name.substring(0, 2).toUpperCase() : 'AS'}
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{isViewingOwn ? user?.name : 'Alice Smith'}</h2>
            <p className="text-slate-500 flex items-center gap-2 mt-1">
              <Briefcase className="h-4 w-4" /> {isViewingOwn ? user?.role : 'Senior Developer'}
            </p>
          </div>
        </div>
        {(isViewingOwn || isAdmin) && (
          <button className="btn btn-primary px-4 py-2 gap-2">
            <Save className="h-4 w-4" /> Save Profile
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
                <label className="block text-xs text-slate-500 mb-1">Email</label>
                <div className="flex items-center gap-2 text-sm font-medium"><Mail className="h-4 w-4 text-slate-400"/> {isViewingOwn ? user?.email : 'alice@dayflow.com'}</div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Phone</label>
                <div className="flex items-center gap-2 text-sm font-medium"><Phone className="h-4 w-4 text-slate-400"/> +1 234 567 890</div>
              </div>
              <div className="col-span-2 mt-2">
                <label className="block text-xs text-slate-500 mb-1">Address</label>
                <input type="text" defaultValue="123 Tech Avenue, Silicon Valley, CA" disabled={!isViewingOwn && !isAdmin} className="w-full text-sm font-medium border-0 border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:ring-0 bg-transparent px-0"/>
              </div>
            </div>
          </div>
          <div className="card p-6 space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">About & Culture</h3>
            <div>
              <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1"><Heart className="h-3 w-3"/> What I love about my job</label>
              <textarea disabled={!isViewingOwn && !isAdmin} className="w-full text-sm p-2 border border-transparent hover:border-slate-200 focus:border-blue-500 rounded-md bg-slate-50/50 resize-none h-20" defaultValue="Building scalable infrastructure and helping junior devs grow."/>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1"><BookOpen className="h-3 w-3"/> Skills & Certs</label>
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">React</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">Python</span>
                <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded">+ AWS Certified</span>
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="p-4 bg-slate-50 rounded-lg">
              <label className="block text-xs text-slate-500 uppercase tracking-wider">Base Wage</label>
              <input type="text" defaultValue="$8,500.00" disabled={!isAdmin} className={`w-full text-2xl font-bold mt-1 bg-transparent border-0 p-0 focus:ring-0 ${isAdmin ? 'border-b border-dashed border-slate-400 hover:border-blue-500 text-blue-600' : 'text-slate-900'}`}/>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <label className="block text-xs text-slate-500 uppercase tracking-wider">House Rent Allowance</label>
              <input type="text" defaultValue="$1,200.00" disabled={!isAdmin} className="w-full text-lg font-semibold mt-1 bg-transparent border-0 p-0 focus:ring-0 text-slate-700"/>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <label className="block text-xs text-slate-500 uppercase tracking-wider">Provident Fund (PF)</label>
              <input type="text" defaultValue="-$425.00" disabled={!isAdmin} className="w-full text-lg font-semibold mt-1 bg-transparent border-0 p-0 focus:ring-0 text-red-600"/>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
