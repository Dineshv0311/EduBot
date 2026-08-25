import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Code2,
  FileText,
  Compass,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  X,
  Target,
  Loader2
} from 'lucide-react';

interface Recommendation {
  recommendation_id: number;
  topic: string;
  reason: string;
  recommendation_type: string;
  generated_at: string;
  status: string;
}

interface DashboardData {
  readiness_score: number;
  breakdown: {
    coding_score: number;
    resume_score: number;
    aptitude_score: number;
    interview_score: number;
  };
  stats: {
    coding: { total_solved: number; correct: number; incorrect: number };
    resume: { has_summary: boolean; project_count: number; skill_count: number };
    interview: { total_attempts: number; avg_score: number; best_score: number };
    aptitude: { total_attempts: number; avg_score: number; best_score: number };
  };
  recommendations: Recommendation[];
}

export default function Dashboard(): React.JSX.Element {
  const { user, token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/dashboard/summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load dashboard metrics.');
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const dismissRecommendation = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:5000/api/dashboard/recommendation/${id}/dismiss`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                recommendations: prev.recommendations.filter((r) => r.recommendation_id !== id)
              }
            : null
        );
      }
    } catch (err) {
      console.error('Failed to dismiss recommendation', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading Placement Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* TOP HERO: Placement Readiness Scorecard */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-700/50 border border-indigo-500/30 text-xs font-semibold text-indigo-200">
              <Target className="w-3.5 h-3.5 text-indigo-300" />
              <span>Placement Readiness Analytics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-indigo-100 text-sm max-w-2xl leading-relaxed">
              Your placement readiness score is computed across all 4 operational modules. Complete recommended actions below to boost your benchmark score.
            </p>

            {/* Progress Breakdown Bars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                <span className="text-[11px] text-indigo-200 uppercase font-semibold">Coding (25%)</span>
                <p className="text-lg font-bold mt-0.5">{data?.breakdown.coding_score} / 25</p>
              </div>
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                <span className="text-[11px] text-indigo-200 uppercase font-semibold">Resume (25%)</span>
                <p className="text-lg font-bold mt-0.5">{data?.breakdown.resume_score} / 25</p>
              </div>
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                <span className="text-[11px] text-indigo-200 uppercase font-semibold">Aptitude (25%)</span>
                <p className="text-lg font-bold mt-0.5">{data?.breakdown.aptitude_score} / 25</p>
              </div>
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                <span className="text-[11px] text-indigo-200 uppercase font-semibold">Interview (25%)</span>
                <p className="text-lg font-bold mt-0.5">{data?.breakdown.interview_score} / 25</p>
              </div>
            </div>
          </div>

          {/* Score Gauge */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-white/5 rounded-2xl border border-white/10">
            <div className="relative flex items-center justify-center">
              <div className="w-32 h-32 rounded-full border-8 border-indigo-400/30 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-4xl font-black">{data?.readiness_score || 0}</span>
                  <span className="text-xs text-indigo-300 block font-semibold">%</span>
                </div>
              </div>
            </div>
            <span className="mt-3 text-xs font-bold uppercase tracking-wider text-indigo-200">
              Placement Index
            </span>
          </div>
        </div>
      </div>

      {/* RECOMMENDATIONS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">EduBot AI Prep Guidance & Recommendations</h2>
              <p className="text-xs text-slate-500">Automated weak-area insights generated from your practice sessions</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
            {data?.recommendations.length || 0} Active Actions
          </span>
        </div>

        {(!data?.recommendations || data.recommendations.length === 0) ? (
          <div className="p-6 text-center text-slate-500 text-sm bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Great job! No urgent prep weaknesses detected. Keep practicing daily.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.recommendations.map((rec) => (
              <div
                key={rec.recommendation_id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3 hover:border-indigo-300 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
                      {rec.topic}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 font-medium">
                      {rec.recommendation_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{rec.reason}</p>
                </div>

                <button
                  onClick={() => dismissRecommendation(rec.recommendation_id)}
                  title="Dismiss recommendation"
                  className="text-slate-400 hover:text-slate-600 p-1 rounded transition flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODULE TILES */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
          Placement Modules
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/coding"
            className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-indigo-600 hover:shadow-md transition flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Coding Practice Tracker</h3>
              <p className="text-xs text-slate-500 mt-1">
                Log DSA problems, track accuracy rates and streak maintenance.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Solved: <strong>{data?.stats.coding.total_solved || 0}</strong></span>
                <span className="text-emerald-600">Correct: <strong>{data?.stats.coding.correct || 0}</strong></span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-600">
              <span>Go to Tracker</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            to="/resume"
            className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-emerald-600 hover:shadow-md transition flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Resume Builder</h3>
              <p className="text-xs text-slate-500 mt-1">
                Structured editor with 60s auto-save and one-click PDF export.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Projects: <strong>{data?.stats.resume.project_count || 0}</strong></span>
                <span>Skills: <strong>{data?.stats.resume.skill_count || 0}</strong></span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <span>Edit Resume</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            to="/practice"
            className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-amber-600 hover:shadow-md transition flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Mock Interview & Aptitude</h3>
              <p className="text-xs text-slate-500 mt-1">
                Company tracks and timed tests with automated scoring.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Interview Avg: <strong>{data?.stats.interview.avg_score || 0}%</strong></span>
                <span>Aptitude Avg: <strong>{data?.stats.aptitude.avg_score || 0}%</strong></span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-amber-600">
              <span>Start Practice</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}