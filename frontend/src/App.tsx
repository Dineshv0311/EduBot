import React, { useState, useEffect } from 'react';

interface HealthResponse {
  status: 'ok' | 'error';
  server_time?: string;
  message?: string;
}

export default function App(): React.JSX.Element {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/health')
      .then((res) => res.json())
      .then((data: HealthResponse) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setHealth({ status: 'error', message: err.message });
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 border border-slate-200">
        <h1 className="text-2xl font-bold text-indigo-600 mb-2">EduBot AI (TypeScript)</h1>
        <p className="text-slate-600 text-sm mb-6">Step 1 — Environment & DB verification</p>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm">
          <p className="font-semibold text-slate-700">Backend API Status:</p>
          {loading ? (
            <p className="text-amber-600 mt-1">Connecting to backend...</p>
          ) : health?.status === 'ok' ? (
            <p className="text-emerald-600 font-medium mt-1">
              Connected (Server Time: {health.server_time ? new Date(health.server_time).toLocaleTimeString() : 'N/A'})
            </p>
          ) : (
            <p className="text-rose-600 font-medium mt-1">
              Connection Failed: {health?.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}