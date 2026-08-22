import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type Role } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight } from 'lucide-react';

export const SignIn = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Generate deterministic bubbles to avoid re-render jumps
  const bubbles = React.useMemo(() => [...Array(20)].map((_, i) => ({
    id: i,
    size: Math.random() * 150 + 50,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    duration: Math.random() * 15 + 15,
    delay: Math.random() * 5,
    color: i % 3 === 0 ? 'bg-indigo-500/30' : i % 3 === 1 ? 'bg-violet-500/30' : 'bg-fuchsia-500/30',
    moveX: Math.random() * 300 - 150,
    moveY: Math.random() * 300 - 150,
  })), []);

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [trail, setTrail] = useState<{ x: number, y: number, id: number }[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePosition({ x, y });
    
    const newPoint = { x, y, id: Date.now() + Math.random() };
    setTrail(prev => [...prev, newPoint]);
    
    // Auto-remove point to create fading comet tail effect
    setTimeout(() => {
      setTrail(prev => prev.filter(p => p.id !== newPoint.id));
    }, 400); // Tail length duration
  };

  const handleMouseLeave = () => {
    setTrail([]);
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      let role: Role = 'EMPLOYEE';
      if (email.includes('admin')) role = 'ADMIN';
      if (email.includes('hr')) role = 'HR';
      
      login(role);
      navigate('/');
    }, 800);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="min-h-screen flex items-center justify-center bg-indigo-950 relative overflow-hidden px-4 sm:px-6 lg:px-8"
    >
      
      {/* Comet Tail Tracker (Continuous Glowing Line over entire page) */}
      <svg className="absolute inset-0 pointer-events-none z-50 w-full h-full">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        {trail.length > 1 && (
          <polyline
            points={trail.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="rgba(255, 255, 255, 0.9)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            className="mix-blend-screen"
            style={{
              transition: 'opacity 0.2s',
              opacity: trail.length > 2 ? 1 : 0
            }}
          />
        )}
      </svg>

      {/* Animated Floating Bubbles Background (Glowing on dark bg) */}
      {bubbles.map(bubble => (
        <motion.div 
          key={bubble.id}
          className={`absolute rounded-full mix-blend-screen filter blur-[12px] ${bubble.color}`}
          style={{
            width: bubble.size,
            height: bubble.size,
            left: bubble.left,
            top: bubble.top,
          }}
          animate={{
            y: [0, bubble.moveY, 0],
            x: [0, bubble.moveX, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: bubble.duration, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: bubble.delay 
          }}
        />
      ))}

      {/* Decorative Grid Overlay for texture */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>

      <motion.div 
        className="w-full max-w-md relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div 
          variants={itemVariants} 
          className="card p-8 shadow-[0_0_40px_rgba(0,0,0,0.3)] border-white/20 bg-white/95 backdrop-blur-2xl relative overflow-hidden group"
        >
          
          {/* Slick Internal Animated Lights - Faster & Brighter */}
          <motion.div
            animate={{ rotate: [0, 360], scale: [1, 1.4, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute -top-20 -left-20 w-80 h-80 bg-indigo-400/50 rounded-full mix-blend-multiply filter blur-[40px] pointer-events-none"
          />
          <motion.div
            animate={{ rotate: [360, 0], scale: [1, 1.6, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-20 -right-20 w-[22rem] h-[22rem] bg-fuchsia-400/50 rounded-full mix-blend-multiply filter blur-[40px] pointer-events-none"
          />
          <motion.div
            animate={{ y: [0, -40, 0], opacity: [0.3, 0.7, 0.3], x: [0, 30, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/4 w-40 h-40 bg-emerald-400/40 rounded-full mix-blend-multiply filter blur-[30px] pointer-events-none"
          />

          <div className="relative z-10">
            <div className="text-center mb-8">
            <div className="mx-auto flex h-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/30 px-4 w-auto inline-flex">
              <span className="text-lg font-bold tracking-tight">Dayflow</span>
            </div>
            <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Please sign in to your Dayflow account.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSignIn}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white/50 focus:bg-white"
                  placeholder="admin@test.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white/50 focus:bg-white"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 cursor-pointer">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Forgot password?
                </a>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg shadow-indigo-500/25 disabled:opacity-70 transition-all"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in to Dayflow
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </motion.button>
          </form>
          
          <div className="mt-6 text-center text-xs text-slate-500 bg-slate-50/80 rounded-lg p-3 border border-slate-100">
            <span className="font-semibold text-slate-700">Demo Roles:</span><br/>
            Use <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-indigo-700">admin@test.com</code> for Admin/HR view.<br/>
            Use <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-indigo-700">user@test.com</code> for Employee view.
          </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};
