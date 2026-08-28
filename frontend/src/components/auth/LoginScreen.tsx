'use client';

import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight, UserCheck, X, Building } from 'lucide-react';

interface LoginProps {
  onClose: () => void;
  onLoginSuccess: (email: string, role: string) => void;
  lang?: 'en' | 'hi';
}

export const LoginScreen: React.FC<LoginProps> = ({
  onClose,
  onLoginSuccess,
  lang = 'en',
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('citizen');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginSuccess(email || 'officer@ndma.gov.in', role);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#CBD5E1] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7 space-y-4 relative animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#6B7280] hover:text-[#1F2937] p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
          aria-label="Close login"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Government Identity Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#0F4C81] text-white flex items-center justify-center mx-auto shadow-md border border-[#0C3D68]">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#1F2937] tracking-tight">
              {lang === 'hi' ? 'आपदा मित्र • राष्ट्रीय पोर्टल' : 'Apda Mitra • Official Access Portal'}
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {lang === 'hi'
                ? 'राष्ट्रीय आपदा प्रबंधन प्राधिकरण (NDMA) प्रमाणित'
                : 'National Disaster Management Authority (NDMA)'}
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#4B5563] block mb-1">
              {lang === 'hi' ? 'आधिकारिक ईमेल / यूजर आईडी' : 'Official Email / Gov ID'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-3.5" />
              <input
                type="email"
                placeholder="officer@ndma.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F8FAFC] text-[#1F2937] text-xs pl-10 pr-3.5 py-3 rounded-xl border border-[#CBD5E1] focus:outline-none focus:border-[#0F4C81] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#4B5563] block mb-1">
              {lang === 'hi' ? 'पासवर्ड' : 'Secure Password'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-3.5" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F8FAFC] text-[#1F2937] text-xs pl-10 pr-3.5 py-3 rounded-xl border border-[#CBD5E1] focus:outline-none focus:border-[#0F4C81] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#4B5563] block mb-1">
              {lang === 'hi' ? 'भूमिका चुनें' : 'Access Role'}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-[#F8FAFC] text-[#1F2937] text-xs p-3 rounded-xl border border-[#CBD5E1] focus:outline-none focus:border-[#0F4C81]"
            >
              <option value="citizen">👤 Citizen / Public Tourist Access</option>
              <option value="officer">🛡️ District EOC Command Officer</option>
              <option value="state_officer">🏛️ State Disaster Authority (SDMA)</option>
            </select>
          </div>

          <button
            type="submit"
            className="apda-btn-primary w-full py-3.5 text-xs sm:text-sm font-bold shadow-md cursor-pointer flex items-center justify-center space-x-2"
          >
            <span>{lang === 'hi' ? 'सुरक्षित प्रमाणीकरण लॉगिन' : 'Sign In to Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs">
          <button
            onClick={onClose}
            className="text-[#0F4C81] font-bold hover:underline cursor-pointer"
          >
            {lang === 'hi' ? 'अतिथि नागरिक के रूप में जारी रखें' : 'Continue as Guest Citizen'}
          </button>
          <span className="text-[10px] text-[#6B7280]">Govt of India MoES</span>
        </div>
      </div>
    </div>
  );
};
