import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Flame, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  PlusCircle, 
  Layers, 
  BookOpen,
  Loader2
} from 'lucide-react';

interface Activity {
  activity_id: number;
  problem_name: string;
  topic: string;
  completion_status: 'Correct' | 'Incorrect' | 'In Progress';
  activity_date: string;
}

interface TopicSummary {
  topic: string;
  total: string;
  correct_count: string;
  incorrect_count: string;
  in_progress_count: string;
}

interface Stats {
  streak: number;
  totals: {
    total_solved: string;
    total_correct: string;
    total_incorrect: string;
  };
  topicSummary: TopicSummary[];
}

const PREDEFINED_TOPICS = [
  'Arrays',
  'Strings',
  'Linked Lists',
  'Trees & Graphs',
  'Dynamic Programming',
  'Sorting & Searching',
  'Recursion & Backtracking',
  'Stack & Queue'
];

export default function CodingTracker(): React.JSX.Element {
  const { token } = useAuth();
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [problemName, setProblemName] = useState('');
  const [topic, setTopic] = useState(PREDEFINED_TOPICS[0]);
  const [status, setStatus] = useState<'Correct' | 'Incorrect' | 'In Progress'>('Correct');

  const fetchData = async () => {
    try {
      setError(null);
      const [actsRes, statsRes] = await Promise.all([
        fetch('http://localhost:5000/api/coding-activity', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/coding-activity/stats', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (!actsRes.ok || !statsRes.ok) {
        throw new Error('Failed to retrieve coding activity logs.');
      }

      const actsData = await actsRes.json();
      const statsData = await statsRes.json();

      setActivities(actsData.activities || []);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:5000/api/coding-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          problem_name: problemName.trim(),
          topic,
          completion_status: status
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit problem log.');
      }

      setProblemName('');
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading Coding Tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="text-lg font-bold text-slate-900">Coding Practice Tracker</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center gap-1">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>{stats?.streak || 0} Day Streak</span>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        {/* Metrics Overview Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Streak</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.streak || 0} Days</p>
            </div>
          </div>

          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Logged</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.totals.total_solved || 0}</p>
            </div>
          </div>

          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Correct Solved</p>
              <p className="text-2xl font-bold text-emerald-600">{stats?.totals.total_correct || 0}</p>
            </div>
          </div>

          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Needs Review</p>
              <p className="text-2xl font-bold text-rose-600">{stats?.totals.total_incorrect || 0}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Log Activity Form & Topic Summary */}
          <div className="space-y-6">
            {/* Form */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <PlusCircle className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Log Problem Activity</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Problem Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Two Sum, LRU Cache"
                    value={problemName}
                    onChange={(e) => setProblemName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Topic Category
                  </label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {PREDEFINED_TOPICS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Completion Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setStatus('Correct')}
                      className={`py-2 text-xs font-semibold rounded-lg border transition ${
                        status === 'Correct'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      Correct
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('Incorrect')}
                      className={`py-2 text-xs font-semibold rounded-lg border transition ${
                        status === 'Incorrect'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      Incorrect
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('In Progress')}
                      className={`py-2 text-xs font-semibold rounded-lg border transition ${
                        status === 'In Progress'
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      In Progress
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record Activity'}
                </button>
              </form>
            </div>

            {/* Topic-wise Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Topic Summary</h2>
              </div>

              {!stats?.topicSummary || stats.topicSummary.length === 0 ? (
                <p className="text-xs text-slate-500">No topic data recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {stats.topicSummary.map((ts) => {
                    const total = parseInt(ts.total, 10);
                    const correct = parseInt(ts.correct_count, 10);
                    const rate = total > 0 ? Math.round((correct / total) * 100) : 0;

                    return (
                      <div key={ts.topic} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-800 mb-1">
                          <span>{ts.topic}</span>
                          <span className="text-slate-500">{correct}/{total} ({rate}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Activity History List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-900">Activity History</h2>
                <p className="text-xs text-slate-500 mt-0.5">Chronological record of completed and attempted problems</p>
              </div>

              {activities.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No practice sessions logged yet. Record your first problem on the left!
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activities.map((act) => (
                    <div key={act.activity_id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {act.completion_status === 'Correct' && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          )}
                          {act.completion_status === 'Incorrect' && (
                            <XCircle className="w-5 h-5 text-rose-500" />
                          )}
                          {act.completion_status === 'In Progress' && (
                            <Clock className="w-5 h-5 text-amber-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{act.problem_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                              {act.topic}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(act.activity_date).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          act.completion_status === 'Correct'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : act.completion_status === 'Incorrect'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {act.completion_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}