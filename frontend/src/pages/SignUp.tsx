import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Save } from 'lucide-react';
import { motion } from 'framer-motion';

export const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    role: 'EMPLOYEE'
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Creating user', formData);
    navigate('/employees');
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-4xl mx-auto py-8 space-y-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between border-b border-slate-200/60 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Onboard New Employee</h2>
          <p className="mt-2 text-sm text-slate-600">Create an account for a new employee. They will receive an email with their system-generated Login ID and a temporary password.</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <motion.div variants={itemVariants} className="md:col-span-2 card p-8">
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
              <button type="submit" className="btn btn-primary px-4 py-2 flex items-center gap-2">
                <Save className="h-4 w-4" /> Create Employee
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
