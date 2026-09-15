'use client';

import React, { useState } from 'react';
import { Shield, Lock, Phone, ArrowRight, CheckCircle2, AlertCircle, Building, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ApiClient } from '@/services/apiClient';

interface LoginPageProps {
  onLoginSuccess: (user: { name: string; role: string; emailOrPhone?: string; businessName?: string }) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'activate'>('login');

  // Login State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);

  // Activation State
  const [ownerName, setOwnerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [activateIdentifier, setActivateIdentifier] = useState('');
  const [activatePassword, setActivatePassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showActivatePassword, setShowActivatePassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      await ApiClient.login(identifier, password, rememberDevice);
      const me = await ApiClient.getMe();

      onLoginSuccess({
        name: me.business?.owner_name || 'Owner',
        role: me.role === 'owner' ? 'Business Owner & Manager' : me.role,
        emailOrPhone: me.email_or_phone,
        businessName: me.business?.business_name,
      });
    } catch (err: any) {
      console.warn('API Login error:', err);
      setError(err.message || 'Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!ownerName.trim() || !businessName.trim() || !activateIdentifier.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (activatePassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter passwords.');
      return;
    }

    if (activatePassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      await ApiClient.activateAccount({
        ownerName: ownerName.trim(),
        businessName: businessName.trim(),
        emailOrPhone: activateIdentifier.trim(),
        password: activatePassword,
        confirmPassword: confirmPassword,
      }, rememberDevice);

      const me = await ApiClient.getMe();

      onLoginSuccess({
        name: me.business?.owner_name || ownerName.trim(),
        role: 'Business Owner & Manager',
        emailOrPhone: me.email_or_phone,
        businessName: me.business?.business_name || businessName.trim(),
      });
    } catch (err: any) {
      setError(err.message || 'Account activation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden select-none font-sans">
      {/* Background Logistics Abstract Route SVG Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
            </pattern>
            <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#0284c7" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <path
            d="M -100 150 Q 200 80 500 300 T 1200 400"
            fill="none"
            stroke="url(#routeGrad)"
            strokeWidth="3"
            strokeDasharray="12 6"
            className="animate-pulse"
          />
        </svg>
      </div>

      {/* Top Header */}
      <header className="relative z-10 pt-[max(1rem,env(safe-area-inset-top))] px-6 max-w-7xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-emerald-950/50">
            🐔
          </div>
          <div>
            <span className="font-black text-lg tracking-tight text-white block leading-none">
              Indian Chicken Center
            </span>
            <span className="text-xs text-emerald-400 font-semibold tracking-wider uppercase">
              Wholesale Distribution SaaS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-full backdrop-blur-md">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Secure Business Access</span>
          <span className="sm:hidden">v1.0</span>
        </div>
      </header>

      {/* Main Login / Activation Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-5">

          {mode === 'login' ? (
            <>
              {/* Heading */}
              <div className="text-center space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Sign In
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  Enter credentials to access live business & fleet operations
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* LOGIN FORM */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Mobile Number
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                    <input
                      type="tel"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full h-12 pl-10 pr-4 bg-slate-950/80 border border-slate-800 rounded-xl text-white font-semibold text-base focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-600"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-slate-300 uppercase tracking-wider">Password</label>
                    <button
                      type="button"
                      onClick={() => alert('Password reset link sent to registered owner phone number.')}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full h-12 pl-10 pr-12 bg-slate-950/80 border border-slate-800 rounded-xl text-white font-semibold text-base focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-600"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 text-slate-400 hover:text-white transition-colors cursor-pointer touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={rememberDevice}
                      onChange={(e) => setRememberDevice(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Remember this device</span>
                  </label>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    isLoading={isLoading}
                    icon={<ArrowRight className="w-4 h-4" />}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 text-base shadow-lg shadow-emerald-950/60 touch-manipulation min-h-[44px]"
                  >
                    Sign In to Dashboard
                  </Button>
                </div>
              </form>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => { setMode('activate'); setError(null); setSuccessMsg(null); }}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  Create Business Account
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Heading */}
              <div className="text-center space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Create Business Account
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  Create your initial business owner account
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* ACTIVATION FORM */}
              <form onSubmit={handleActivateSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Owner Full Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Umarabba"
                      className="w-full h-12 pl-10 pr-4 bg-slate-950/80 border border-slate-800 rounded-xl text-white font-semibold text-base focus:border-emerald-500 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Business Name
                  </label>
                  <div className="relative flex items-center">
                    <Building className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Indian Chicken Center"
                      className="w-full h-12 pl-10 pr-4 bg-slate-950/80 border border-slate-800 rounded-xl text-white font-semibold text-base focus:border-emerald-500 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Mobile Number
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                    <input
                      type="tel"
                      value={activateIdentifier}
                      onChange={(e) => setActivateIdentifier(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full h-12 pl-10 pr-4 bg-slate-950/80 border border-slate-800 rounded-xl text-white font-semibold text-base focus:border-emerald-500 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Create Password
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showActivatePassword ? 'text' : 'password'}
                        value={activatePassword}
                        onChange={(e) => setActivatePassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full h-12 pl-3 pr-10 bg-slate-950/80 border border-slate-800 rounded-xl text-white font-semibold text-base focus:border-emerald-500 outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowActivatePassword((v) => !v)}
                        aria-label={showActivatePassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                      >
                        {showActivatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Confirm Password
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full h-12 pl-3 pr-10 bg-slate-950/80 border border-slate-800 rounded-xl text-white font-semibold text-base focus:border-emerald-500 outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    isLoading={isLoading}
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 text-base shadow-lg shadow-emerald-950/60 touch-manipulation min-h-[44px]"
                  >
                    Create Account
                  </Button>
                </div>
              </form>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                  className="text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Back to Sign In
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 pb-[max(1rem,env(safe-area-inset-bottom))] px-6 py-4 text-center text-xs text-slate-500 border-t border-slate-900/60">
        Indian Chicken Center Platform © 2026 • Encrypted SaaS Operations System
      </footer>
    </div>
  );
};
