import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, ShieldAlert, Database } from 'lucide-react';

export default function AdminDashboard(): React.JSX.Element {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-lg">
              A
            </div>
            <span className="font-bold text-lg">EduBot AI — Admin Panel</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 font-semibold border border-rose-800">
              Admin: {user?.name}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 rounded-lg transition border border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="flex items-center gap-3 text-slate-900 font-bold text-lg mb-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            <span>Process 5.0 Admin Management System</span>
          </div>
          <p className="text-slate-600 text-sm">
            This workspace is gated strictly to Admin accounts. You will manage companies, interview questions, and aptitude test banks here in Step 8.
          </p>
        </div>

        <div className="p-8 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-center">
          <Database className="w-10 h-10 text-slate-400 mb-2" />
          <p className="text-slate-700 font-medium">Admin Content Manager</p>
          <p className="text-slate-500 text-xs mt-1">Ready for Step 8 implementation</p>
        </div>
      </main>
    </div>
  );
}