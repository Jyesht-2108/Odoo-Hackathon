import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Save, CheckCircle, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { api, ApiError } from '../lib/api';

interface CreatedResult {
  login_id: string;
  generated_password: string;
  employee_name: string;
}

export const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    department: '',
    designation: '',
    role: 'EMPLOYEE',
    date_of_joining: new Date().toISOString().split('T')[0],
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CreatedResult | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPreviewUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post<{
        employee: { first_name: string; last_name: string };
        user: { login_id: string };
        generated_password: string;
      }>('/employees', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        department: formData.department || undefined,
        designation: formData.designation || undefined,
        role: formData.role,
        date_of_joining: formData.date_of_joining || undefined,
      });

      setResult({
        login_id: response.user.login_id,
        generated_password: response.generated_password,
        employee_name: `${response.employee.first_name} ${response.employee.last_name}`,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create employee. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Success state — show the generated credentials
  if (result) {
    return (
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-lg mx-auto py-16 space-y-6">
        <motion.div variants={itemVariants} className="card p-8 text-center space-y-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
            <CheckCircle className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Employee Created!</h2>
            <p className="text-slate-500 mt-2">{result.employee_name} has been onboarded successfully.</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-6 space-y-4 text-left">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Login ID</label>
              <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-4 py-2.5">
                <code className="text-sm font-mono font-semibold text-indigo-700">{result.login_id}</code>
                <button onClick={() => copyToClipboard(result.login_id)} className="text-slate-400 hover:text-slate-600">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Temporary Password</label>
              <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-4 py-2.5">
                <code className="text-sm font-mono font-semibold text-indigo-700">{result.generated_password}</code>
                <button onClick={() => copyToClipboard(result.generated_password)} className="text-slate-400 hover:text-slate-600">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 border border-amber-100">
              ⚠️ Share these credentials securely. The employee will be required to change their password on first login.
            </p>
          </div>

          <div className="flex gap-3 justify-center pt-2">
            <button onClick={() => { setResult(null); setFormData({ first_name: '', last_name: '', email: '', department: '', designation: '', role: 'EMPLOYEE', date_of_joining: new Date().toISOString().split('T')[0] }); }} className="btn btn-outline px-4 py-2">
              Onboard Another
            </button>
            <button onClick={() => navigate('/employees')} className="btn btn-primary px-4 py-2">
              View Directory
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-4xl mx-auto py-8 space-y-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between border-b border-slate-200/60 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Onboard New Employee</h2>
          <p className="mt-2 text-sm text-slate-600">Create an account for a new employee. They will receive a system-generated Login ID and a temporary password.</p>
        </div>
      </motion.div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <motion.div variants={itemVariants} className="md:col-span-2 card p-8">
          <form className="space-y-6" onSubmit={handleSignUp}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-slate-700">First Name</label>
                <input
                  type="text" name="first_name" id="first_name" required
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                  value={formData.first_name} onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-slate-700">Last Name</label>
                <input
                  type="text" name="last_name" id="last_name" required
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                  value={formData.last_name} onChange={handleChange}
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
                  type="text" name="department" id="department"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                  value={formData.department} onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="designation" className="block text-sm font-medium text-slate-700">Designation</label>
                <input
                  type="text" name="designation" id="designation"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                  value={formData.designation} onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="date_of_joining" className="block text-sm font-medium text-slate-700">Date of Joining</label>
                <input
                  type="date" name="date_of_joining" id="date_of_joining"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                  value={formData.date_of_joining} onChange={handleChange}
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
              <button type="submit" disabled={isLoading} className="btn btn-primary px-4 py-2 flex items-center gap-2 disabled:opacity-70">
                {isLoading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
                ) : (
                  <><Save className="h-4 w-4" /> Create Employee</>
                )}
              </button>
            </div>
          </form>
        </motion.div>

        <motion.div variants={itemVariants} className="md:col-span-1">
          <div className="card p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative group cursor-pointer">
              <div className="h-32 w-32 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden hover:bg-slate-100 transition-colors">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="text-slate-400 flex flex-col items-center">
                    <Upload className="h-8 w-8 mb-2" />
                    <span className="text-xs font-medium">Upload Photo</span>
                  </div>
                )}
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} id="avatar-upload" />
              <label htmlFor="avatar-upload" className="absolute inset-0 cursor-pointer"></label>
            </div>
            <p className="text-xs text-slate-500 px-4">
              Allowed *.jpeg, *.jpg, *.png, *.gif<br />Max size of 3.1 MB
            </p>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
