import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    role: 'EMPLOYEE'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Connect to Admin API to create employee
    console.log('Creating user', formData);
    navigate('/employees');
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="card p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Onboard New Employee
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Create an account for a new employee. They will receive an email with their system-generated Login ID and a temporary password.
          </p>
        </div>
        <form className="space-y-6" onSubmit={handleSignUp}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-slate-700">First Name</label>
              <input
                type="text" name="firstName" id="firstName" required
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                value={formData.firstName} onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-slate-700">Last Name</label>
              <input
                type="text" name="lastName" id="lastName" required
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                value={formData.lastName} onChange={handleChange}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email Address</label>
              <input
                type="email" name="email" id="email" required
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                value={formData.email} onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-slate-700">Department</label>
              <input
                type="text" name="department" id="department" required
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                value={formData.department} onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-slate-700">System Role</label>
              <select
                id="role" name="role"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                value={formData.role} onChange={handleChange}
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="HR">HR Officer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-outline px-4 py-2">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary px-4 py-2">
              Create Employee
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
