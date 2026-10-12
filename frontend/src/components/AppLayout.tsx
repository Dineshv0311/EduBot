import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { AiHelperBot } from './AiHelperBot';
import { useAuth } from '../context/AuthContext';

export const AppLayout: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      <Navbar />
      <div className="flex-1">
        <Outlet />
      </div>
      {/* AI Helper Agent: Floating side bot strictly for student portal */}
      {user?.role === 'Student' && <AiHelperBot />}
    </div>
  );
};