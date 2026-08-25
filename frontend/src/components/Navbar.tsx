import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Code2, 
  FileText, 
  Compass, 
  LogOut, 
  User as UserIcon,
  ShieldAlert
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
      isActive
        ? 'bg-indigo-50 text-indigo-600'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 group-hover:bg-indigo-700 text-white flex items-center justify-center font-black text-base transition">
              E
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight text-slate-900 leading-tight">
                EduBot AI
              </span>
              <span className="text-[10px] text-slate-400 font-medium leading-none">
                Placement Prep
              </span>
            </div>
          </NavLink>

          {/* Nav Links for Students */}
          {user?.role === 'Student' && (
            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/dashboard" className={navItemClass}>
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </NavLink>

              <NavLink to="/coding" className={navItemClass}>
                <Code2 className="w-4 h-4" />
                <span>Coding Tracker</span>
              </NavLink>

              <NavLink to="/resume" className={navItemClass}>
                <FileText className="w-4 h-4" />
                <span>Resume Builder</span>
              </NavLink>

              <NavLink to="/practice" className={navItemClass}>
                <Compass className="w-4 h-4" />
                <span>Interview & Aptitude</span>
              </NavLink>
            </nav>
          )}

          {/* Admin Indicator */}
          {user?.role === 'Admin' && (
            <span className="text-xs px-2.5 py-1 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin Control Center</span>
            </span>
          )}
        </div>

        {/* User Pill & Sign Out */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-800">{user?.name}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-bold">
              {user?.role}
            </span>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out of EduBot AI"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition border border-rose-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};