import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon, Code2, FileText, Compass, BarChart2, ArrowRight } from 'lucide-react';

export default function Dashboard(): React.JSX.Element {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
              E
            </div>
            <span className="font-bold text-lg text-slate-900">EduBot AI</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
              {user?.role}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <UserIcon className="w-4 h-4 text-slate-400" />
              <span>{user?.name}</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition border border-rose-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Hub Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.name}!</h1>
          <p className="text-slate-600 text-sm mt-1">
            Central Hub — Select a module below to start your placement preparation.
          </p>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Module 1: Coding Practice Tracker (ACTIVE) */}
          <Link
            to="/coding"
            className="p-6 bg-white rounded-xl border border-indigo-200 shadow-sm hover:border-indigo-600 hover:shadow-md transition flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900">Coding Practice Tracker</h3>
              <p className="text-xs text-slate-500 mt-1">Log problems, view streak & topic summary</p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-600">
              <span>Open Module</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Module 2: Resume Builder */}
          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm opacity-80">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900">Resume Builder</h3>
            <p className="text-xs text-slate-500 mt-1">Live editor with 60s auto-save & PDF export (Step 5)</p>
          </div>

          {/* Module 3: Mock Interview & Aptitude */}
          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm opacity-80">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900">Mock Interview & Aptitude</h3>
            <p className="text-xs text-slate-500 mt-1">Timed assessments & company interview prep (Step 6)</p>
          </div>

          {/* Module 4: Recommendations & Analytics */}
          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm opacity-80">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <BarChart2 className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900">Recommendations & Analytics</h3>
            <p className="text-xs text-slate-500 mt-1">Weak-topic insights and progress metrics (Step 7)</p>
          </div>
        </div>
      </main>
    </div>
  );
}